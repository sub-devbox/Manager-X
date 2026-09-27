using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace ManagerX.Services;

public static class BackendLauncherService
{
    private static readonly HttpClient _probeClient = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };

    public static async Task<bool> CheckHealthAsync(string baseUrl, int timeoutMs = 2000)
    {
        if (string.IsNullOrWhiteSpace(baseUrl)) return false;

        try
        {
            var cleanBase = baseUrl.TrimEnd('/');
            // Try checking /api/v1/health or /health depending on format
            var healthUrl = cleanBase.EndsWith("/api/v1", StringComparison.OrdinalIgnoreCase)
                ? $"{cleanBase}/health"
                : $"{cleanBase}/api/v1/health";

            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(timeoutMs));
            var response = await _probeClient.GetAsync(healthUrl, cts.Token);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            // Fallback: check root /health
            var rootUri = new Uri(cleanBase);
            var rootHealth = $"{rootUri.Scheme}://{rootUri.Authority}/health";
            if (rootHealth != healthUrl)
            {
                using var cts2 = new CancellationTokenSource(TimeSpan.FromMilliseconds(timeoutMs));
                var res2 = await _probeClient.GetAsync(rootHealth, cts2.Token);
                return res2.IsSuccessStatusCode;
            }
        }
        catch
        {
            // Unreachable or connection refused
        }

        return false;
    }

    public static string FindDefaultPythonPath()
    {
        // 1. Check saved settings
        var saved = StorageService.LoadBackendSettings();
        if (!string.IsNullOrWhiteSpace(saved?.PythonPath) && File.Exists(saved.PythonPath))
        {
            return saved.PythonPath;
        }

        // 2. Search upwards from AppDomain BaseDirectory
        var currentDir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
        for (int i = 0; i < 6 && currentDir != null; i++)
        {
            var candidate = Path.Combine(currentDir.FullName, "backend", "venv", "Scripts", "python.exe");
            if (File.Exists(candidate))
            {
                return Path.GetFullPath(candidate);
            }

            var candidateVenv = Path.Combine(currentDir.FullName, "venv", "Scripts", "python.exe");
            if (File.Exists(candidateVenv))
            {
                return Path.GetFullPath(candidateVenv);
            }

            currentDir = currentDir.Parent;
        }

        // 3. Search upwards from CurrentDirectory
        var workingDir = new DirectoryInfo(Environment.CurrentDirectory);
        for (int i = 0; i < 4 && workingDir != null; i++)
        {
            var candidate = Path.Combine(workingDir.FullName, "backend", "venv", "Scripts", "python.exe");
            if (File.Exists(candidate))
            {
                return Path.GetFullPath(candidate);
            }
            workingDir = workingDir.Parent;
        }

        return string.Empty;
    }

    public static string ResolveBackendDirectory(string pythonPath)
    {
        // 1. Check saved settings
        var saved = StorageService.LoadBackendSettings();
        if (!string.IsNullOrWhiteSpace(saved?.BackendDir) && Directory.Exists(saved.BackendDir))
        {
            if (File.Exists(Path.Combine(saved.BackendDir, "app", "main.py")))
            {
                return saved.BackendDir;
            }
        }

        // 2. Derive from pythonPath
        if (!string.IsNullOrWhiteSpace(pythonPath) && File.Exists(pythonPath))
        {
            try
            {
                var dir = new FileInfo(pythonPath).Directory; // e.g. Scripts
                while (dir != null)
                {
                    if (File.Exists(Path.Combine(dir.FullName, "app", "main.py")))
                    {
                        return dir.FullName;
                    }
                    dir = dir.Parent;
                }
            }
            catch {}
        }

        // 3. Search upwards from BaseDirectory
        var currentDir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
        for (int i = 0; i < 6 && currentDir != null; i++)
        {
            var backendDir = Path.Combine(currentDir.FullName, "backend");
            if (Directory.Exists(backendDir) && File.Exists(Path.Combine(backendDir, "app", "main.py")))
            {
                return Path.GetFullPath(backendDir);
            }
            currentDir = currentDir.Parent;
        }

        return string.Empty;
    }

    public static void StartBackend(string pythonPath, string backendDir, int port, bool reload)
    {
        if (!File.Exists(pythonPath))
        {
            throw new FileNotFoundException($"Python executable not found at: {pythonPath}");
        }

        if (!Directory.Exists(backendDir))
        {
            throw new DirectoryNotFoundException($"Backend directory not found at: {backendDir}");
        }

        var reloadArg = reload ? "--reload" : "";
        var command = $"cd /d \"{backendDir}\" && \"{pythonPath}\" -m uvicorn app.main:app --host 127.0.0.1 --port {port} {reloadArg}".Trim();

        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c start \"ManagerX-Backend\" cmd /k \"{command}\"",
            UseShellExecute = true,
            CreateNoWindow = false,
            WorkingDirectory = backendDir
        };

        Process.Start(psi);
    }

    public static async Task<bool> WaitForHealthyAsync(
        string baseUrl,
        int maxRetries = 20,
        int intervalMs = 1000,
        IProgress<(int current, int max, string status)>? progress = null,
        CancellationToken ct = default)
    {
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            if (ct.IsCancellationRequested) return false;

            progress?.Report((attempt, maxRetries, $"Attempt {attempt}/{maxRetries}: Checking backend health..."));

            var isHealthy = await CheckHealthAsync(baseUrl, 1200);
            if (isHealthy)
            {
                progress?.Report((attempt, maxRetries, "Backend is healthy and ready!"));
                return true;
            }

            try
            {
                await Task.Delay(intervalMs, ct);
            }
            catch (TaskCanceledException)
            {
                return false;
            }
        }

        return false;
    }
}
