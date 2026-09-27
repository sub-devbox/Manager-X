using System.Text.Json.Serialization;

namespace ManagerX.Models;

public class UserLoginRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}

public class TokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("token_type")]
    public string TokenType { get; set; } = "bearer";

    [JsonPropertyName("expires_in_seconds")]
    public int ExpiresInSeconds { get; set; }

    [JsonPropertyName("user")]
    public UserDto? User { get; set; }
}

public class UserDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string? FullName { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("is_superuser")]
    public bool IsSuperuser { get; set; }
}

public enum ConnectionMode
{
    LocalDevelopment,
    RemoteServer
}

public class SavedCredentials
{
    public string ServerUrl { get; set; } = "http://localhost:8000/api/v1";
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool RememberMe { get; set; } = true;
}

public class BackendSettings
{
    public ConnectionMode Mode { get; set; } = ConnectionMode.LocalDevelopment;
    public string RemoteServerUrl { get; set; } = string.Empty;
    public string RemoteWebUrl { get; set; } = string.Empty;

    public string PythonPath { get; set; } = string.Empty;
    public string Host { get; set; } = "127.0.0.1";
    public int Port { get; set; } = 8000;
    public string BackendDir { get; set; } = string.Empty;
    public bool AutoReload { get; set; } = true;

    public string FrontendDir { get; set; } = string.Empty;
    public string FrontendHost { get; set; } = "localhost";
    public int FrontendPort { get; set; } = 3000;

    public bool RunSilently { get; set; } = true;
}

