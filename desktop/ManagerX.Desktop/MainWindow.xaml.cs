using System;
using System.IO;
using System.Windows;
using System.Windows.Input;
using ManagerX.Models;
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
    private double _previousWidth = 460;
    private double _previousHeight = 720;
    private double _previousLeft = 100;
    private double _previousTop = 100;

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

        await CheckBackendAndInitializeAsync();
    }

    private async Task CheckBackendAndInitializeAsync()
    {
        LoadingOverlay.Visibility = Visibility.Visible;
        LoadingStatusText.Text = "Checking backend service...";

        var saved = StorageService.LoadCredentials();
        var serverUrl = !string.IsNullOrWhiteSpace(saved?.ServerUrl) ? saved.ServerUrl : App.AuthService.ServerUrl;

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
                App.ApiClient.UpdateBaseUrl(url);
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
            contextMenu.Items.Add("Start / Pause Timer", null, (s, e) => ToggleTimerFromTray());
            contextMenu.Items.Add("Stop & Save Timer", null, (s, e) => StopTimerFromTray());
            contextMenu.Items.Add(new Forms.ToolStripSeparator());
            contextMenu.Items.Add("Log Out", null, async (s, e) => await Dispatcher.InvokeAsync(ConfirmAndLogoutAsync));
            contextMenu.Items.Add("Exit", null, (s, e) => ExitApplication());

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

    private void ExitApplication()
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

        Width = _previousWidth > 380 ? _previousWidth : 460;
        Height = _previousHeight > 400 ? _previousHeight : 720;
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
            ExitApplication();
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

    private static string FormatSeconds(int totalSeconds)
    {
        var hours = totalSeconds / 3600;
        var minutes = (totalSeconds % 3600) / 60;
        var seconds = totalSeconds % 60;
        return $"{hours:D2}:{minutes:D2}:{seconds:D2}";
    }
}
