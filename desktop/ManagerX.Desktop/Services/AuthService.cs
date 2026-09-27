using System;
using System.Threading.Tasks;
using ManagerX.Models;

namespace ManagerX.Services;

public class AuthService
{
    private readonly ApiClient _apiClient;

    public UserDto? CurrentUser { get; private set; }
    public string? CurrentToken { get; private set; }
    public string ServerUrl { get; private set; } = "http://localhost:8000/api/v1";

    public event Action<UserDto?>? AuthStateChanged;

    public AuthService(ApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    public async Task<bool> TryAutoLoginAsync()
    {
        var saved = StorageService.LoadCredentials();
        if (saved == null || string.IsNullOrWhiteSpace(saved.AccessToken))
        {
            return false;
        }

        try
        {
            ServerUrl = saved.ServerUrl;
            _apiClient.UpdateBaseUrl(saved.ServerUrl);
            _apiClient.SetBearerToken(saved.AccessToken);

            var user = await _apiClient.GetAsync<UserDto>("/auth/me");
            if (user != null && user.IsActive)
            {
                CurrentUser = user;
                CurrentToken = saved.AccessToken;
                AuthStateChanged?.Invoke(CurrentUser);
                return true;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Auto-login failed: {ex.Message}");
        }

        _apiClient.SetBearerToken(null);
        return false;
    }

    public async Task<UserDto> LoginAsync(string email, string password, string serverUrl, bool rememberMe)
    {
        ServerUrl = serverUrl.TrimEnd('/');
        _apiClient.UpdateBaseUrl(ServerUrl);

        var loginReq = new UserLoginRequest
        {
            Email = email.Trim(),
            Password = password,
        };

        var tokenRes = await _apiClient.PostAsync<UserLoginRequest, TokenResponse>("/auth/login", loginReq);
        if (tokenRes == null || string.IsNullOrWhiteSpace(tokenRes.AccessToken))
        {
            throw new Exception("Received empty token from server.");
        }

        CurrentToken = tokenRes.AccessToken;
        CurrentUser = tokenRes.User;
        _apiClient.SetBearerToken(CurrentToken);

        if (rememberMe)
        {
            var expiry = DateTime.UtcNow.AddSeconds(tokenRes.ExpiresInSeconds > 0 ? tokenRes.ExpiresInSeconds : 86400);
            StorageService.SaveCredentials(new SavedCredentials
            {
                ServerUrl = ServerUrl,
                Email = email.Trim(),
                AccessToken = CurrentToken,
                ExpiresAtUtc = expiry,
                RememberMe = true,
            });
        }
        else
        {
            StorageService.ClearCredentials();
        }

        AuthStateChanged?.Invoke(CurrentUser);
        return CurrentUser!;
    }

    public async Task LogoutAsync()
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(CurrentToken))
            {
                await _apiClient.PostAsync<object?>("/auth/logout", null);
            }
        }
        catch {}

        CurrentToken = null;
        CurrentUser = null;
        _apiClient.SetBearerToken(null);
        StorageService.ClearCredentials();

        AuthStateChanged?.Invoke(null);
    }
}
