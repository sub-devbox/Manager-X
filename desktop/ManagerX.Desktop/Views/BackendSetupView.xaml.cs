using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using ManagerX.Models;
using ManagerX.Services;
using Microsoft.Win32;
using UserControl = System.Windows.Controls.UserControl;
using OpenFileDialog = Microsoft.Win32.OpenFileDialog;

namespace ManagerX.Views;

public partial class BackendSetupView : UserControl
{
    public event Action<string>? OnBackendReady;

    private CancellationTokenSource? _pollCts;

    public BackendSetupView()
    {
        InitializeComponent();
        Loaded += BackendSetupView_Loaded;
    }

    private void BackendSetupView_Loaded(object sender, RoutedEventArgs e)
    {
        var saved = StorageService.LoadBackendSettings();
        if (saved != null)
        {
            if (!string.IsNullOrWhiteSpace(saved.PythonPath))
            {
                PythonPathInput.Text = saved.PythonPath;
            }
            if (saved.Port > 0)
            {
                PortInput.Text = saved.Port.ToString();
            }
            ReloadCheck.IsChecked = saved.AutoReload;
        }

        // If Python path still blank, auto-discover
        if (string.IsNullOrWhiteSpace(PythonPathInput.Text))
        {
            var discovered = BackendLauncherService.FindDefaultPythonPath();
            if (!string.IsNullOrWhiteSpace(discovered))
            {
                PythonPathInput.Text = discovered;
                PythonHintText.Text = "✓ Auto-detected from project virtual environment";
                PythonHintText.Foreground = (System.Windows.Media.Brush)FindResource("AccentEmeraldBrush");
            }
            else
            {
                PythonHintText.Text = "Please locate python.exe in backend\\venv\\Scripts";
                PythonHintText.Foreground = (System.Windows.Media.Brush)FindResource("TextDimBrush");
            }
        }
    }

    private void BrowsePythonButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Title = "Select Python Executable in Virtual Environment",
            Filter = "Python Executable (python.exe)|python.exe|All Executables (*.exe)|*.exe",
            FileName = "python.exe"
        };

        if (dialog.ShowDialog() == true)
        {
            PythonPathInput.Text = dialog.FileName;
            PythonHintText.Text = "Custom Python interpreter selected";
            PythonHintText.Foreground = (System.Windows.Media.Brush)FindResource("TextMutedBrush");
        }
    }

    private async void LaunchButton_Click(object sender, RoutedEventArgs e)
    {
        HideError();

        var pythonPath = PythonPathInput.Text.Trim();
        if (string.IsNullOrWhiteSpace(pythonPath) || !File.Exists(pythonPath))
        {
            ShowError("Please select a valid python.exe file.");
            return;
        }

        if (!int.TryParse(PortInput.Text.Trim(), out var port) || port < 1 || port > 65535)
        {
            ShowError("Please enter a valid port number (e.g. 8000).");
            return;
        }

        var host = string.IsNullOrWhiteSpace(HostInput.Text) ? "127.0.0.1" : HostInput.Text.Trim();
        var reload = ReloadCheck.IsChecked ?? true;

        var backendDir = BackendLauncherService.ResolveBackendDirectory(pythonPath);
        if (string.IsNullOrWhiteSpace(backendDir) || !Directory.Exists(backendDir))
        {
            ShowError("Could not locate the 'backend' folder with app/main.py. Make sure the backend project structure is intact.");
            return;
        }

        // Save preferences
        StorageService.SaveBackendSettings(new BackendSettings
        {
            PythonPath = pythonPath,
            Port = port,
            BackendDir = backendDir,
            AutoReload = reload
        });

        SetLaunchingState(true);
        StatusText.Text = $"Launching backend on {host}:{port}...";

        try
        {
            BackendLauncherService.StartBackend(pythonPath, backendDir, port, reload);

            var baseUrl = $"http://{host}:{port}/api/v1";
            var targetHealthUrl = $"http://{host}:{port}";

            _pollCts = new CancellationTokenSource();
            var progress = new Progress<(int current, int max, string status)>(p =>
            {
                StatusText.Text = $"Starting server ({p.current}/{p.max})... Waiting for health check...";
            });

            var isHealthy = await BackendLauncherService.WaitForHealthyAsync(targetHealthUrl, maxRetries: 20, intervalMs: 1000, progress, _pollCts.Token);
            if (isHealthy)
            {
                StatusText.Text = "Backend connected successfully!";
                await Task.Delay(400);
                OnBackendReady?.Invoke(baseUrl);
            }
            else
            {
                ShowError($"Backend did not respond on http://{host}:{port}/health within 20s.\n\nPlease check the opened terminal console ('ManagerX-Backend') for error tracebacks, missing dependencies, or port conflicts.");
            }
        }
        catch (Exception ex)
        {
            ShowError($"Failed to launch backend: {ex.Message}");
        }
        finally
        {
            SetLaunchingState(false);
        }
    }

    private async void CheckAgainButton_Click(object sender, RoutedEventArgs e)
    {
        HideError();

        if (!int.TryParse(PortInput.Text.Trim(), out var port) || port < 1 || port > 65535)
        {
            ShowError("Please enter a valid port number.");
            return;
        }

        var host = string.IsNullOrWhiteSpace(HostInput.Text) ? "127.0.0.1" : HostInput.Text.Trim();
        var baseUrl = $"http://{host}:{port}/api/v1";

        SetLaunchingState(true);
        StatusText.Text = $"Probing http://{host}:{port}/health...";

        try
        {
            var isHealthy = await BackendLauncherService.CheckHealthAsync($"http://{host}:{port}", 2500);
            if (isHealthy)
            {
                StatusText.Text = "Backend is online!";
                await Task.Delay(300);
                OnBackendReady?.Invoke(baseUrl);
            }
            else
            {
                ShowError($"No response from backend on http://{host}:{port}. Is the server running?");
            }
        }
        catch (Exception ex)
        {
            ShowError($"Connection error: {ex.Message}");
        }
        finally
        {
            SetLaunchingState(false);
        }
    }

    private async void ConnectCustomButton_Click(object sender, RoutedEventArgs e)
    {
        HideError();
        var customUrl = CustomUrlInput.Text.Trim();
        if (string.IsNullOrWhiteSpace(customUrl))
        {
            ShowError("Please enter a valid URL.");
            return;
        }

        SetLaunchingState(true);
        StatusText.Text = $"Connecting to {customUrl}...";

        try
        {
            var isHealthy = await BackendLauncherService.CheckHealthAsync(customUrl, 3000);
            if (isHealthy)
            {
                StatusText.Text = "Server connected!";
                await Task.Delay(300);
                OnBackendReady?.Invoke(customUrl);
            }
            else
            {
                ShowError($"Server at '{customUrl}' did not respond with healthy status.");
            }
        }
        catch (Exception ex)
        {
            ShowError($"Failed to connect: {ex.Message}");
        }
        finally
        {
            SetLaunchingState(false);
        }
    }

    private void SetLaunchingState(bool isLaunching)
    {
        LaunchButton.IsEnabled = !isLaunching;
        CheckAgainButton.IsEnabled = !isLaunching;
        BrowsePythonButton.IsEnabled = !isLaunching;
        PythonPathInput.IsEnabled = !isLaunching;
        PortInput.IsEnabled = !isLaunching;
        HostInput.IsEnabled = !isLaunching;
        StatusBorder.Visibility = isLaunching ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ShowError(string message)
    {
        ErrorText.Text = message;
        ErrorBorder.Visibility = Visibility.Visible;
    }

    private void HideError()
    {
        ErrorBorder.Visibility = Visibility.Collapsed;
    }
}
