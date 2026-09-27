using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ManagerX.Services;

public class ApiClient
{
    private readonly HttpClient _http;
    private string _baseUrl;

    public ApiClient(string baseUrl = "http://localhost:8000/api/v1")
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
    }

    public void UpdateBaseUrl(string baseUrl)
    {
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public void SetBearerToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            _http.DefaultRequestHeaders.Authorization = null;
        }
        else
        {
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    public async Task<T?> GetAsync<T>(string endpoint)
    {
        var url = $"{_baseUrl}/{endpoint.TrimStart('/')}";
        var res = await _http.GetAsync(url);
        var content = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
        {
            throw new ApiException((int)res.StatusCode, ParseError(content));
        }

        return JsonSerializer.Deserialize<T>(content);
    }

    public async Task<TRes?> PostAsync<TReq, TRes>(string endpoint, TReq data)
    {
        var url = $"{_baseUrl}/{endpoint.TrimStart('/')}";
        var json = JsonSerializer.Serialize(data);
        using var stringContent = new StringContent(json, Encoding.UTF8, "application/json");

        var res = await _http.PostAsync(url, stringContent);
        var content = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
        {
            throw new ApiException((int)res.StatusCode, ParseError(content));
        }

        return JsonSerializer.Deserialize<TRes>(content);
    }

    public async Task PostAsync<TReq>(string endpoint, TReq data)
    {
        var url = $"{_baseUrl}/{endpoint.TrimStart('/')}";
        var json = JsonSerializer.Serialize(data);
        using var stringContent = new StringContent(json, Encoding.UTF8, "application/json");

        var res = await _http.PostAsync(url, stringContent);
        var content = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
        {
            throw new ApiException((int)res.StatusCode, ParseError(content));
        }
    }

    private static string ParseError(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("detail", out var detail))
            {
                if (detail.ValueKind == JsonValueKind.String)
                {
                    return detail.GetString() ?? "Unknown API Error";
                }
                return detail.ToString();
            }
        }
        catch {}

        return string.IsNullOrWhiteSpace(json) ? "Server returned an error" : json;
    }
}

public class ApiException : Exception
{
    public int StatusCode { get; }

    public ApiException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}
