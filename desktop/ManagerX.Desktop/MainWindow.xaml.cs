using System;
using System.IO;
using System.Windows;
using System.Windows.Input;
using ManagerX.Models;
using ManagerX.Services;
using ManagerX.Views;
using Forms = System.Windows.Forms;
using MouseEventArgs = System.Windows.Input.MouseEventArgs;

namespace ManagerX;

public partial class MainWindow : Window
{
    private LoginView? _loginView;
    private TrackerView? _trackerView;
    private BackendSetupView? _backendSetupView;
    private Forms.NotifyIcon? _notifyIcon;
    private IntPtr _hwnd = IntPtr.Zero;
    private bool _isMiniMode = false;
    private double _previousWidth = 390;
    private double _previousHeight = 620;
    private double _previousLeft = 100;
    private double _previousTop = 100;

    private System.Windows.Threading.DispatcherTimer? _statusTimer;
    private bool _isBackendOnline = false;
    private bool _isFrontendOnline = false;
    private bool _isRemoteMode = false;
    private string _remoteApiUrl = string.Empty;
    private string _remoteWebUrl = string.Empty;
    private int _currentBackendPort = 8000;
    private int _currentFrontendPort = 3000;
    private string _currentBackendHost = "127.0.0.1";
    private string _currentFrontendHost = "localhost";

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        Closing += MainWindow_Closing;

        MouseEnter += MainWindow_MouseEnter;
        MouseLeave += MainWindow_MouseLeave;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        InitializeTrayIcon();

        // Native Windows handle and message hook for OS shutdown prevention
        var helper = new System.Windows.Interop.WindowInteropHelper(this);
        _hwnd = helper.Handle;
        var source = System.Windows.Interop.HwndSource.FromHwnd(_hwnd);
        source?.AddHook(HwndMessageHook);

        System.Windows.Application.Current.SessionEnding += OnSessionEnding;

        App.AuthService.AuthStateChanged += OnAuthStateChanged;
        App.TimerService.Ticked += OnTimerTicked;
        App.TimerService.StateChanged += OnTimerStateChanged;

        // Periodic poller for API & Web frontend service health
        _statusTimer = new System.Windows.Threading.DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(8)
        };
        _statusTimer.Tick += async (s, ev) => await UpdateServiceBadgesAsync();
        _statusTimer.Start();

        await CheckBackendAndInitializeAsync();
        await UpdateServiceBadgesAsync();
    }

    private async Task CheckBackendAndInitializeAsync()
    {
        LoadingOverlay.Visibility = Visibility.Visible;
        LoadingStatusText.Text = "Checking service connection...";

        var backendSettings = StorageService.LoadBackendSettings();
        string serverUrl;

        if (backendSettings?.Mode == ConnectionMode.RemoteServer && !string.IsNullOrWhiteSpace(backendSettings.RemoteServerUrl))
        {
            _isRemoteMode = true;
            _remoteApiUrl = backendSettings.RemoteServerUrl;
            _remoteWebUrl = backendSettings.RemoteWebUrl;
            serverUrl = _remoteApiUrl;
        }
        else if (backendSettings != null && backendSettings.Port > 0)
        {
            _isRemoteMode = false;
            var host = !string.IsNullOrWhiteSpace(backendSettings.Host) ? backendSettings.Host : "127.0.0.1";
            serverUrl = $"http://{host}:{backendSettings.Port}/api/v1";
        }
        else
        {
            _isRemoteMode = false;
            var saved = StorageService.LoadCredentials();
            serverUrl = !string.IsNullOrWhiteSpace(saved?.ServerUrl) ? saved.ServerUrl : App.AuthService.ServerUrl;
        }

        App.AuthService.UpdateServerUrl(serverUrl);

        var isHealthy = await BackendLauncherService.CheckHealthAsync(serverUrl);
        if (!isHealthy)
        {
            LoadingOverlay.Visibility = Visibility.Collapsed;
            ShowBackendSetupView();
            return;
        }

        LoadingStatusText.Text = "Connecting...";
        var success = await App.AuthService.TryAutoLoginAsync();
        LoadingOverlay.Visibility = Visibility.Collapsed;

        if (success)
        {
            ShowTrackerView();
        }
        else
        {
            ShowLoginView();
        }
    }

    private void ShowBackendSetupView()
    {
        UpdateWindowTitle(null);
        TitleRefreshButton.Visibility = Visibility.Collapsed;
        TitleLogoutButton.Visibility = Visibility.Collapsed;
        _trackerView = null;

        if (_backendSetupView == null)
        {
            _backendSetupView = new BackendSetupView();
            _backendSetupView.OnBackendReady += async (url) =>
            {
                App.AuthService.UpdateServerUrl(url);
                await UpdateServiceBadgesAsync();

                LoadingOverlay.Visibility = Visibility.Visible;
                LoadingStatusText.Text = "Connecting...";

                var autoLogin = await App.AuthService.TryAutoLoginAsync();
                LoadingOverlay.Visibility = Visibility.Collapsed;

                if (autoLogin)
                {
                    ShowTrackerView();
                }
                else
                {
                    ShowLoginView();
                }
            };
        }

        MainContent.Content = _backendSetupView;
    }

    private void InitializeTrayIcon()
    {
        try
        {
            _notifyIcon = new Forms.NotifyIcon
            {
                Text = "Manager X - Time Tracker",
                Visible = true
            };

            try
            {
                var sri = System.Windows.Application.GetResourceStream(new Uri("pack://application:,,,/app.ico"));
                if (sri != null)
                {
                    using var stream = sri.Stream;
                    _notifyIcon.Icon = new System.Drawing.Icon(stream);
                }
                else
                {
                    _notifyIcon.Icon = System.Drawing.Icon.ExtractAssociatedIcon(Environment.ProcessPath ?? "") 
                                       ?? System.Drawing.SystemIcons.Application;
                }
            }
            catch
            {
                _notifyIcon.Icon = System.Drawing.SystemIcons.Application;
            }

            var contextMenu = new Forms.ContextMenuStrip();
            contextMenu.Items.Add("Show Manager X", null, (s, e) => RestoreFromTray());
            contextMenu.Items.Add("Open Web App", null, (s, e) => OpenInBrowser($"http://{_currentFrontendHost}:{_currentFrontendPort}"));
            contextMenu.Items.Add("Open API Docs (Swagger)", null, (s, e) => OpenInBrowser($"http://{_currentBackendHost}:{_currentBackendPort}/docs"));
            contextMenu.Items.Add(new Forms.ToolStripSeparator());
            contextMenu.Items.Add("Start / Pause Timer", null, (s, e) => ToggleTimerFromTray());
            contextMenu.Items.Add("Stop & Save Timer", null, (s, e) => StopTimerFromTray());
            contextMenu.Items.Add(new Forms.ToolStripSeparator());
            contextMenu.Items.Add("Stop All Servers", null, async (s, e) =>
            {
                await BackendLauncherService.StopAllServicesAsync(_currentBackendPort, _currentFrontendPort);
                await UpdateServiceBadgesAsync();
            });
            contextMenu.Items.Add("Log Out", null, async (s, e) => await Dispatcher.InvokeAsync(ConfirmAndLogoutAsync));
            contextMenu.Items.Add("Exit", null, async (s, e) => await Dispatcher.InvokeAsync(ExitApplicationAsync));

            _notifyIcon.ContextMenuStrip = contextMenu;
            _notifyIcon.DoubleClick += (s, e) => RestoreFromTray();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to initialize NotifyIcon: {ex.Message}");
        }
    }

    private void RestoreFromTray()
    {
        Show();
        WindowState = WindowState.Normal;
        Activate();
        Focus();
    }

    private void ToggleTimerFromTray()
    {
        if (App.TimerService.IsRunning)
        {
            App.TimerService.Pause();
        }
        else if (App.TimerService.ElapsedSeconds > 0)
        {
            App.TimerService.Resume();
        }
        else
        {
            RestoreFromTray();
        }
    }

    private void StopTimerFromTray()
    {
        if (App.TimerService.ElapsedSeconds > 0)
        {
            RestoreFromTray();
            _trackerView?.TriggerStopAndLog();
        }
    }

    private static bool IsTimerActive()
    {
        return App.TimerService.IsRunning || App.TimerService.ElapsedSeconds > 0;
    }

    private void OnSessionEnding(object sender, SessionEndingCancelEventArgs e)
    {
        if (IsTimerActive())
        {
            e.Cancel = true;
            ShutdownPreventionService.EnableShutdownBlock(_hwnd);
        }
    }

    private IntPtr HwndMessageHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        return ShutdownPreventionService.WindowProcHook(hwnd, msg, wParam, lParam, ref handled, IsTimerActive);
    }

    private async Task ExitApplicationAsync()
    {
        if (IsTimerActive())
        {
            RestoreFromTray();
            var res = System.Windows.MessageBox.Show(
                "A timer is currently active. Exiting now will discard unsaved time tracking.\n\nAre you sure you want to stop the timer and exit?",
                "Confirm Exit - Manager X",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning);

            if (res != MessageBoxResult.Yes) return;
            App.TimerService.Reset();
        }

        if (!_isRemoteMode && (_isBackendOnline || _isFrontendOnline))
        {
            var stopServers = System.Windows.MessageBox.Show(
                "Do you also want to stop the local background servers (API & Frontend) before exiting?",
                "Safely Shutdown Servers - Manager X",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (stopServers == MessageBoxResult.Yes)
            {
                Hide();
                _notifyIcon?.ShowBalloonTip(1500, "Manager X", "Stopping local background servers...", Forms.ToolTipIcon.Info);

                try
                {
                    // Run shutdown on background thread with safety timeout so UI never freezes
                    await Task.Run(async () =>
                    {
                        var stopTask = BackendLauncherService.StopAllServicesAsync(_currentBackendPort, _currentFrontendPort);
                        await Task.WhenAny(stopTask, Task.Delay(4000)).ConfigureAwait(false);
                    }).ConfigureAwait(false);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error during server shutdown: {ex.Message}");
                }
            }
        }

        _statusTimer?.Stop();
        ShutdownPreventionService.DisableShutdownBlock(_hwnd);
        _notifyIcon?.Dispose();
        _notifyIcon = null;
        System.Windows.Application.Current.Shutdown();
    }

    private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        // If timer is running or user closes window, minimize to tray instead of quitting
        if (IsTimerActive())
        {
            e.Cancel = true;
            Hide();
            _notifyIcon?.ShowBalloonTip(2000, "Manager X - Time Tracker", "Timer is actively running in background. Click tray icon to restore.", Forms.ToolTipIcon.Info);
        }
        else
        {
            _statusTimer?.Stop();
            ShutdownPreventionService.DisableShutdownBlock(_hwnd);
            _notifyIcon?.Dispose();
            _notifyIcon = null;
        }
    }

    private void OnAuthStateChanged(UserDto? user)
    {
        Dispatcher.Invoke(() =>
        {
            UpdateWindowTitle(user);
            if (user != null)
            {
                ShowTrackerView();
            }
            else
            {
                RestoreFullMode();
                ShowLoginView();
            }
        });
    }

    private void UpdateWindowTitle(UserDto? user)
    {
        var title = "Manager X - Time Tracker";
        if (user != null)
        {
            var loginId = !string.IsNullOrWhiteSpace(user.Email) ? user.Email : user.FullName;
            title = $"Manager X - Time Tracker | {loginId}";
        }
        Title = title;
        TitleText.Text = title;
    }

    private void ShowLoginView()
    {
        UpdateWindowTitle(null);
        TitleRefreshButton.Visibility = Visibility.Collapsed;
        TitleLogoutButton.Visibility = Visibility.Collapsed;
        _trackerView = null; // Reset TrackerView so subsequent login fetches fresh user data
        if (_loginView == null)
        {
            _loginView = new LoginView();
            _loginView.OnLoginSuccess += () => ShowTrackerView();
            _loginView.RequestSwitchServer += () => ShowBackendSetupView();
        }
        MainContent.Content = _loginView;
    }

    private void ShowTrackerView()
    {
        UpdateWindowTitle(App.AuthService.CurrentUser);
        TitleRefreshButton.Visibility = Visibility.Visible;
        TitleLogoutButton.Visibility = Visibility.Visible;
        if (_trackerView == null)
        {
            _trackerView = new TrackerView();
            _trackerView.RequestMiniMode += SwitchToMiniMode;
        }
        MainContent.Content = _trackerView;
    }

    private async void TitleRefreshButton_Click(object sender, RoutedEventArgs e)
    {
        if (_trackerView != null)
        {
            TitleRefreshButton.IsEnabled = false;
            try
            {
                await _trackerView.RefreshDataAsync();
            }
            finally
            {
                TitleRefreshButton.IsEnabled = true;
            }
        }
    }

    private async void TitleLogoutButton_Click(object sender, RoutedEventArgs e)
    {
        await ConfirmAndLogoutAsync();
    }

    public async Task ConfirmAndLogoutAsync()
    {
        if (App.TimerService.IsRunning || App.TimerService.ElapsedSeconds > 0)
        {
            var res = System.Windows.MessageBox.Show(
                "A timer is currently active. Logging out will stop and reset the timer without saving.\n\nDo you want to log out?",
                "Confirm Log Out",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning);

            if (res != MessageBoxResult.Yes) return;

            App.TimerService.Reset();
        }

        await App.AuthService.LogoutAsync();
    }

    private void OnTimerTicked(int seconds)
    {
        Dispatcher.Invoke(() =>
        {
            MiniDigitsText.Text = FormatSeconds(seconds);
        });
    }

    private void OnTimerStateChanged(bool isRunning)
    {
        Dispatcher.Invoke(() =>
        {
            if (isRunning || App.TimerService.ElapsedSeconds > 0)
            {
                ShutdownPreventionService.EnableShutdownBlock(_hwnd);
            }
            else
            {
                ShutdownPreventionService.DisableShutdownBlock(_hwnd);
            }

            if (isRunning && !_isMiniMode)
            {
                // Auto switch to compact floating mini-widget mode when timer starts
                SwitchToMiniMode();
            }
            else if (!isRunning && App.TimerService.ElapsedSeconds == 0 && _isMiniMode)
            {
                // Restore when timer stops/resets
                RestoreFullMode();
            }

            MiniPauseButton.Content = isRunning ? "⏸" : "▶";
            MiniTaskTitle.Text = App.TimerService.TaskTitle;
            MiniProjectTitle.Text = App.TimerService.ProjectTitle;
        });
    }

    public void SwitchToMiniMode()
    {
        if (_isMiniMode) return;

        _previousWidth = Width;
        _previousHeight = Height;
        _previousLeft = Left;
        _previousTop = Top;

        _isMiniMode = true;
        FullModeContainer.Visibility = Visibility.Collapsed;
        MiniWidgetContainer.Visibility = Visibility.Visible;

        Width = 360;
        Height = 68;
        Topmost = true;
        Opacity = 0.8; // 80% opacity as requested

        MiniTaskTitle.Text = App.TimerService.TaskTitle;
        MiniProjectTitle.Text = App.TimerService.ProjectTitle;
        MiniDigitsText.Text = FormatSeconds(App.TimerService.ElapsedSeconds);
        MiniPauseButton.Content = App.TimerService.IsRunning ? "⏸" : "▶";
    }

    public void RestoreFullMode()
    {
        if (!_isMiniMode) return;

        _isMiniMode = false;
        MiniWidgetContainer.Visibility = Visibility.Collapsed;
        FullModeContainer.Visibility = Visibility.Visible;

        Width = _previousWidth > 320 ? _previousWidth : 390;
        Height = _previousHeight > 380 ? _previousHeight : 620;
        Topmost = false;
        Opacity = 1.0;
    }

    private void MainWindow_MouseEnter(object sender, MouseEventArgs e)
    {
        if (_isMiniMode)
        {
            Opacity = 1.0;
        }
    }

    private void MainWindow_MouseLeave(object sender, MouseEventArgs e)
    {
        if (_isMiniMode)
        {
            // Return to 80% opacity
            Opacity = 0.8;
        }
    }

    private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void MiniWidget_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void TitleMinimize_Click(object sender, RoutedEventArgs e)
    {
        Hide();
        _notifyIcon?.ShowBalloonTip(1500, "Manager X", "Minimized to tray.", Forms.ToolTipIcon.Info);
    }

    private void TitleClose_Click(object sender, RoutedEventArgs e)
    {
        if (IsTimerActive())
        {
            Hide();
            _notifyIcon?.ShowBalloonTip(2000, "Manager X", "Timer active. Minimized to system tray.", Forms.ToolTipIcon.Info);
        }
        else
        {
            _ = ExitApplicationAsync();
        }
    }

    private void MiniPauseButton_Click(object sender, RoutedEventArgs e)
    {
        if (App.TimerService.IsRunning)
        {
            App.TimerService.Pause();
        }
        else
        {
            App.TimerService.Resume();
        }
    }

    private void MiniStopButton_Click(object sender, RoutedEventArgs e)
    {
        RestoreFullMode();
        _trackerView?.TriggerStopAndLog();
    }

    private void MiniExpandButton_Click(object sender, RoutedEventArgs e)
    {
        RestoreFullMode();
    }

    public async Task UpdateServiceBadgesAsync()
    {
        var settings = StorageService.LoadBackendSettings();
        if (settings != null)
        {
            _isRemoteMode = settings.Mode == ConnectionMode.RemoteServer;
            _remoteApiUrl = !string.IsNullOrWhiteSpace(settings.RemoteServerUrl) ? settings.RemoteServerUrl : string.Empty;
            _remoteWebUrl = !string.IsNullOrWhiteSpace(settings.RemoteWebUrl) ? settings.RemoteWebUrl : string.Empty;

            _currentBackendPort = settings.Port > 0 ? settings.Port : 8000;
            _currentBackendHost = !string.IsNullOrWhiteSpace(settings.Host) ? settings.Host : "127.0.0.1";
            _currentFrontendPort = settings.FrontendPort > 0 ? settings.FrontendPort : 3000;
            _currentFrontendHost = !string.IsNullOrWhiteSpace(settings.FrontendHost) ? settings.FrontendHost : "localhost";
        }

        string backendProbeUrl;
        string hostDisplayName;

        if (_isRemoteMode && !string.IsNullOrWhiteSpace(_remoteApiUrl))
        {
            backendProbeUrl = _remoteApiUrl;
            hostDisplayName = Uri.TryCreate(_remoteApiUrl, UriKind.Absolute, out var u) ? u.Host : "Cloud";
            _isBackendOnline = await BackendLauncherService.CheckHealthAsync(backendProbeUrl);
            _isFrontendOnline = !string.IsNullOrWhiteSpace(_remoteWebUrl) && await BackendLauncherService.CheckHealthAsync(_remoteWebUrl);
        }
        else
        {
            backendProbeUrl = $"http://{_currentBackendHost}:{_currentBackendPort}";
            hostDisplayName = $"{_currentBackendPort}";
            _isBackendOnline = await BackendLauncherService.CheckHealthAsync(backendProbeUrl);
            _isFrontendOnline = await BackendLauncherService.CheckFrontendHealthAsync(_currentFrontendHost, _currentFrontendPort);
        }

        Dispatcher.Invoke(() =>
        {
            var greenBrush = (System.Windows.Media.Brush)FindResource("AccentEmeraldBrush");
            var redBrush = (System.Windows.Media.Brush)FindResource("AccentRoseBrush");
            var textMain = (System.Windows.Media.Brush)FindResource("TextMainBrush");
            var textMuted = (System.Windows.Media.Brush)FindResource("TextMutedBrush");

            // Update Backend Pill
            ApiStatusDot.Fill = _isBackendOnline ? greenBrush : redBrush;
            ApiStatusText.Text = _isRemoteMode ? $"API: {hostDisplayName}" : $"API: {_currentBackendPort}";
            ApiStatusText.Foreground = _isBackendOnline ? textMain : textMuted;
            ApiStatusBadge.ToolTip = _isBackendOnline
                ? (_isRemoteMode ? $"Cloud API Online - Click to open Swagger Docs ({_remoteApiUrl}/docs)" : $"Backend API Online - Click to open Swagger Docs (http://{_currentBackendHost}:{_currentBackendPort}/docs)")
                : (_isRemoteMode ? $"Cloud API Offline ({hostDisplayName}) - Click to configure connection" : $"Backend API Offline - Click to configure / launch");

            // Update Frontend Pill
            WebStatusDot.Fill = _isFrontendOnline ? greenBrush : redBrush;
            WebStatusText.Text = _isRemoteMode ? "Web: Cloud" : $"Web: {_currentFrontendPort}";
            WebStatusText.Foreground = _isFrontendOnline ? textMain : textMuted;
            WebStatusBadge.ToolTip = _isFrontendOnline
                ? (_isRemoteMode ? $"Cloud Web Dashboard Online - Click to open ({_remoteWebUrl})" : $"Frontend Web Online - Click to open Web App (http://{_currentFrontendHost}:{_currentFrontendPort})")
                : (_isRemoteMode ? "Cloud Web Dashboard Offline / Unconfigured" : $"Frontend Web Offline - Click to configure / launch");

            if (_isRemoteMode)
            {
                StopServicesButton.Content = "⚙ Server";
                StopServicesButton.ToolTip = "Switch or reconfigure remote server connection";
                StopServicesButton.IsEnabled = true;
                StopServicesButton.Opacity = 1.0;
            }
            else
            {
                StopServicesButton.Content = "🛑 Stop All";
                StopServicesButton.ToolTip = "Safely stop all background services (Backend & Frontend)";
                StopServicesButton.IsEnabled = _isBackendOnline || _isFrontendOnline;
                StopServicesButton.Opacity = (_isBackendOnline || _isFrontendOnline) ? 1.0 : 0.5;
            }
        });
    }

    private void ApiStatusBadge_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (_isBackendOnline)
        {
            var url = _isRemoteMode 
                ? (_remoteApiUrl.TrimEnd('/') + "/docs")
                : $"http://{_currentBackendHost}:{_currentBackendPort}/docs";
            OpenInBrowser(url);
        }
        else
        {
            var msg = _isRemoteMode
                ? $"Remote API ({_remoteApiUrl}) appears offline.\n\nWould you like to open Connection Setup?"
                : $"Backend service on port {_currentBackendPort} appears offline.\n\nWould you like to open the Service Setup window to launch it?";

            var res = System.Windows.MessageBox.Show(msg, "Service Offline", MessageBoxButton.YesNo, MessageBoxImage.Information);
            if (res == MessageBoxResult.Yes)
            {
                ShowBackendSetupView();
            }
        }
    }

    private void WebStatusBadge_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (_isFrontendOnline)
        {
            var url = _isRemoteMode ? _remoteWebUrl : $"http://{_currentFrontendHost}:{_currentFrontendPort}";
            if (!string.IsNullOrWhiteSpace(url))
            {
                OpenInBrowser(url);
            }
        }
        else
        {
            var msg = _isRemoteMode
                ? "Remote web dashboard is offline or URL not set.\n\nWould you like to open Connection Setup?"
                : $"Frontend web service on port {_currentFrontendPort} appears offline.\n\nWould you like to open the Service Setup window to launch it?";

            var res = System.Windows.MessageBox.Show(msg, "Web Offline", MessageBoxButton.YesNo, MessageBoxImage.Information);
            if (res == MessageBoxResult.Yes)
            {
                ShowBackendSetupView();
            }
        }
    }

    private async void StopServicesButton_Click(object sender, RoutedEventArgs e)
    {
        if (_isRemoteMode)
        {
            ShowBackendSetupView();
            return;
        }

        var res = System.Windows.MessageBox.Show(
            $"Are you sure you want to stop both the Backend (Port {_currentBackendPort}) and Frontend (Port {_currentFrontendPort}) background services?",
            "Safely Stop Servers",
            MessageBoxButton.YesNo,
            MessageBoxImage.Question);

        if (res != MessageBoxResult.Yes) return;

        StopServicesButton.IsEnabled = false;
        try
        {
            await BackendLauncherService.StopAllServicesAsync(_currentBackendPort, _currentFrontendPort);
            await UpdateServiceBadgesAsync();
            _notifyIcon?.ShowBalloonTip(2000, "Manager X", "Backend and Frontend services stopped successfully.", Forms.ToolTipIcon.Info);
        }
        finally
        {
            StopServicesButton.IsEnabled = true;
        }
    }

    private static void OpenInBrowser(string url)
    {
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            System.Windows.MessageBox.Show($"Unable to open browser: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private static string FormatSeconds(int totalSeconds)
    {
        var hours = totalSeconds / 3600;
        var minutes = (totalSeconds % 3600) / 60;
        var seconds = totalSeconds % 60;
        return $"{hours:D2}:{minutes:D2}:{seconds:D2}";
    }
}
