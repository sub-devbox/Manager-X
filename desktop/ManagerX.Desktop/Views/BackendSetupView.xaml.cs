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
using FolderBrowserDialog = System.Windows.Forms.FolderBrowserDialog;

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
            if (!string.IsNullOrWhiteSpace(saved.PythonPath)) PythonPathInput.Text = saved.PythonPath;
            if (!string.IsNullOrWhiteSpace(saved.Host)) HostInput.Text = saved.Host;
            if (saved.Port > 0) PortInput.Text = saved.Port.ToString();
            ReloadCheck.IsChecked = saved.AutoReload;

            if (!string.IsNullOrWhiteSpace(saved.FrontendDir)) FrontendDirInput.Text = saved.FrontendDir;
            if (!string.IsNullOrWhiteSpace(saved.FrontendHost)) FrontendHostInput.Text = saved.FrontendHost;
            if (saved.FrontendPort > 0) FrontendPortInput.Text = saved.FrontendPort.ToString();

            SilentModeCheck.IsChecked = saved.RunSilently;
        }

        // Auto-discover if fields are blank
        if (string.IsNullOrWhiteSpace(PythonPathInput.Text))
        {
            var discovered = BackendLauncherService.FindDefaultPythonPath();
            if (!string.IsNullOrWhiteSpace(discovered))
            {
                PythonPathInput.Text = discovered;
            }
        }

        if (string.IsNullOrWhiteSpace(FrontendDirInput.Text))
        {
            var discoveredFrontend = BackendLauncherService.FindDefaultFrontendPath();
            if (!string.IsNullOrWhiteSpace(discoveredFrontend))
            {
                FrontendDirInput.Text = discoveredFrontend;
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
        }
    }

    private void BrowseFrontendButton_Click(object sender, RoutedEventArgs e)
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Select Manager-X Frontend Directory (containing package.json)",
            UseDescriptionForTitle = true
        };

        if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
        {
            FrontendDirInput.Text = dialog.SelectedPath;
        }
    }

    private async void LaunchAllButton_Click(object sender, RoutedEventArgs e)
    {
        await LaunchServicesAsync(launchFrontend: true);
    }

    private async void LaunchBackendOnlyButton_Click(object sender, RoutedEventArgs e)
    {
        await LaunchServicesAsync(launchFrontend: false);
    }

    private async Task LaunchServicesAsync(bool launchFrontend)
    {
        HideError();

        var pythonPath = PythonPathInput.Text.Trim();
        if (string.IsNullOrWhiteSpace(pythonPath) || !File.Exists(pythonPath))
        {
            ShowError("Please select a valid python.exe file in backend venv.");
            return;
        }

        if (!int.TryParse(PortInput.Text.Trim(), out var backendPort) || backendPort < 1 || backendPort > 65535)
        {
            ShowError("Please enter a valid backend port number (e.g. 8000).");
            return;
        }

        var host = string.IsNullOrWhiteSpace(HostInput.Text) ? "127.0.0.1" : HostInput.Text.Trim();
        var reload = ReloadCheck.IsChecked ?? true;
        var runSilently = SilentModeCheck.IsChecked ?? true;

        var backendDir = BackendLauncherService.ResolveBackendDirectory(pythonPath);
        if (string.IsNullOrWhiteSpace(backendDir) || !Directory.Exists(backendDir))
        {
            ShowError("Could not locate the 'backend' folder with app/main.py.");
            return;
        }

        // Frontend validation
        var frontendDir = FrontendDirInput.Text.Trim();
        var frontendHost = string.IsNullOrWhiteSpace(FrontendHostInput.Text) ? "localhost" : FrontendHostInput.Text.Trim();
        if (!int.TryParse(FrontendPortInput.Text.Trim(), out var frontendPort) || frontendPort < 1 || frontendPort > 65535)
        {
            frontendPort = 3000;
        }

        // Save preferences
        StorageService.SaveBackendSettings(new BackendSettings
        {
            PythonPath = pythonPath,
            Host = host,
            Port = backendPort,
            BackendDir = backendDir,
            AutoReload = reload,
            FrontendDir = frontendDir,
            FrontendHost = frontendHost,
            FrontendPort = frontendPort,
            RunSilently = runSilently
        });

        // Surgically sync .env with updated ports
        BackendLauncherService.SyncEnvFile(host, backendPort, frontendPort);

        SetLaunchingState(true);
        StatusText.Text = $"Launching backend on {host}:{backendPort}...";

        try
        {
            // 1. Launch Backend
            BackendLauncherService.StartBackend(pythonPath, backendDir, host, backendPort, reload, runSilently);

            // 2. Launch Frontend (if requested and directory valid)
            if (launchFrontend && !string.IsNullOrWhiteSpace(frontendDir) && Directory.Exists(frontendDir))
            {
                StatusText.Text = "Launching backend & frontend services...";
                BackendLauncherService.StartFrontend(frontendDir, frontendHost, frontendPort, host, backendPort, runSilently);
            }

            var baseUrl = $"http://{host}:{backendPort}/api/v1";
            var targetHealthUrl = $"http://{host}:{backendPort}";

            _pollCts = new CancellationTokenSource();
            var progress = new Progress<(int current, int max, string status)>(p =>
            {
                StatusText.Text = $"Starting services ({p.current}/{p.max})... Waiting for backend...";
            });

            var isHealthy = await BackendLauncherService.WaitForHealthyAsync(targetHealthUrl, maxRetries: 20, intervalMs: 1000, progress, _pollCts.Token);
            if (isHealthy)
            {
                StatusText.Text = "Connected successfully!";
                await Task.Delay(300);
                OnBackendReady?.Invoke(baseUrl);
            }
            else
            {
                ShowError($"Backend did not respond on http://{host}:{backendPort}/health within 20s.\n\nPlease check that the port is not blocked and dependencies are installed.");
            }
        }
        catch (Exception ex)
        {
            ShowError($"Failed to launch services: {ex.Message}");
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
            ShowError("Please enter a valid backend port number.");
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
                await Task.Delay(250);
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
                await Task.Delay(250);
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
        LaunchAllButton.IsEnabled = !isLaunching;
        LaunchBackendOnlyButton.IsEnabled = !isLaunching;
        CheckAgainButton.IsEnabled = !isLaunching;
        BrowsePythonButton.IsEnabled = !isLaunching;
        BrowseFrontendButton.IsEnabled = !isLaunching;
        PythonPathInput.IsEnabled = !isLaunching;
        PortInput.IsEnabled = !isLaunching;
        HostInput.IsEnabled = !isLaunching;
        FrontendDirInput.IsEnabled = !isLaunching;
        FrontendPortInput.IsEnabled = !isLaunching;
        FrontendHostInput.IsEnabled = !isLaunching;
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
