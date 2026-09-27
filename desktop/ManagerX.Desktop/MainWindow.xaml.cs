using System.Windows;
using ManagerX.Models;
using ManagerX.Views;

namespace ManagerX;

public partial class MainWindow : Window
{
    private LoginView? _loginView;
    private TrackerView? _trackerView;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        App.AuthService.AuthStateChanged += OnAuthStateChanged;

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
        _trackerView = new TrackerView();
        MainContent.Content = _trackerView;
    }
}
