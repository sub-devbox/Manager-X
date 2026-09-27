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

public class SavedCredentials
{
    public string ServerUrl { get; set; } = "http://localhost:8000/api/v1";
    public string Email { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool RememberMe { get; set; } = true;
}
