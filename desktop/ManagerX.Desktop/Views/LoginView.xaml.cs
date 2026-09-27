using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using ManagerX.Services;
using UserControl = System.Windows.Controls.UserControl;
using KeyEventArgs = System.Windows.Input.KeyEventArgs;

namespace ManagerX.Views;

public partial class LoginView : UserControl
{
    public event Action? OnLoginSuccess;

    public LoginView()
    {
        InitializeComponent();
        Loaded += LoginView_Loaded;
    }

    private void LoginView_Loaded(object sender, RoutedEventArgs e)
    {
        var saved = StorageService.LoadCredentials();
        if (saved != null)
        {
            if (!string.IsNullOrWhiteSpace(saved.ServerUrl))
                ServerUrlInput.Text = saved.ServerUrl;
            if (!string.IsNullOrWhiteSpace(saved.Email))
                EmailInput.Text = saved.Email;
            if (!string.IsNullOrWhiteSpace(saved.Password))
                PasswordInput.Password = saved.Password;
            RememberMeCheck.IsChecked = saved.RememberMe;

            if (!string.IsNullOrWhiteSpace(saved.Email) && string.IsNullOrWhiteSpace(saved.Password))
            {
                PasswordInput.Focus();
                return;
            }
        }
        EmailInput.Focus();
    }

    private void PasswordInput_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            ExecuteLogin();
        }
    }

    private void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        ExecuteLogin();
    }

    private async void ExecuteLogin()
    {
        ErrorBorder.Visibility = Visibility.Collapsed;
        var email = EmailInput.Text.Trim();
        var password = PasswordInput.Password;
        var serverUrl = ServerUrlInput.Text.Trim();
        var remember = RememberMeCheck.IsChecked ?? true;

        if (string.IsNullOrWhiteSpace(email))
        {
            ShowError("Please enter your email address.");
            EmailInput.Focus();
            return;
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            ShowError("Please enter your password.");
            PasswordInput.Focus();
            return;
        }

        LoginButton.IsEnabled = false;
        LoginButton.Content = "Signing In...";

        try
        {
            await App.AuthService.LoginAsync(email, password, serverUrl, remember);
            OnLoginSuccess?.Invoke();
        }
        catch (Exception ex)
        {
            ShowError(ex.Message);
        }
        finally
        {
            LoginButton.IsEnabled = true;
            LoginButton.Content = "Sign In";
        }
    }

    private void ShowError(string message)
    {
        ErrorText.Text = message;
        ErrorBorder.Visibility = Visibility.Visible;
    }
}
