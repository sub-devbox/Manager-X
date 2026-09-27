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
    private Forms.NotifyIcon? _notifyIcon;
    private bool _isMiniMode = false;
    private bool _isPinned = false;
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

        App.AuthService.AuthStateChanged += OnAuthStateChanged;
        App.TimerService.Ticked += OnTimerTicked;
        App.TimerService.StateChanged += OnTimerStateChanged;

        // Attempt silent auto-login via DPAPI saved credentials
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

    private void ExitApplication()
    {
        _notifyIcon?.Dispose();
        _notifyIcon = null;
        System.Windows.Application.Current.Shutdown();
    }

    private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        // If timer is running or user closes window, minimize to tray instead of quitting
        if (App.TimerService.IsRunning || App.TimerService.ElapsedSeconds > 0)
        {
            e.Cancel = true;
            Hide();
            _notifyIcon?.ShowBalloonTip(2000, "Manager X - Time Tracker", "Timer is still running in background. Click tray icon to restore.", Forms.ToolTipIcon.Info);
        }
        else
        {
            _notifyIcon?.Dispose();
            _notifyIcon = null;
        }
    }

    private void OnAuthStateChanged(UserDto? user)
    {
        Dispatcher.Invoke(() =>
        {
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

    private void ShowLoginView()
    {
        if (_loginView == null)
        {
            _loginView = new LoginView();
            _loginView.OnLoginSuccess += () => ShowTrackerView();
        }
        MainContent.Content = _loginView;
    }

    private void ShowTrackerView()
    {
        if (_trackerView == null)
        {
            _trackerView = new TrackerView();
            _trackerView.RequestMiniMode += SwitchToMiniMode;
        }
        MainContent.Content = _trackerView;
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
        Opacity = 0.5; // 50% transparency as requested

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
        Topmost = _isPinned;
        Opacity = 1.0;
    }

    private void MainWindow_MouseEnter(object sender, MouseEventArgs e)
    {
        if (_isMiniMode)
        {
            // Smoothly elevate opacity on mouse hover for easy interaction
            Opacity = 0.95;
        }
    }

    private void MainWindow_MouseLeave(object sender, MouseEventArgs e)
    {
        if (_isMiniMode)
        {
            // Return to 50% transparency
            Opacity = 0.5;
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

    private void TitlePinButton_Click(object sender, RoutedEventArgs e)
    {
        _isPinned = !_isPinned;
        Topmost = _isPinned;
        TitlePinButton.Foreground = _isPinned
            ? (System.Windows.Media.Brush)FindResource("AccentBlueBrush")
            : (System.Windows.Media.Brush)FindResource("TextMutedBrush");
    }

    private void TitleMinimize_Click(object sender, RoutedEventArgs e)
    {
        Hide();
        _notifyIcon?.ShowBalloonTip(1500, "Manager X", "Minimized to tray.", Forms.ToolTipIcon.Info);
    }

    private void TitleClose_Click(object sender, RoutedEventArgs e)
    {
        if (App.TimerService.IsRunning)
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
