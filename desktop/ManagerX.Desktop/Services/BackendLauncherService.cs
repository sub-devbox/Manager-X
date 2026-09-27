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
            var healthUrl = cleanBase.EndsWith("/api/v1", StringComparison.OrdinalIgnoreCase)
                ? $"{cleanBase}/health"
                : $"{cleanBase}/api/v1/health";

            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(timeoutMs));
            var response = await _probeClient.GetAsync(healthUrl, cts.Token);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

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

    public static async Task<bool> CheckFrontendHealthAsync(string host, int port, int timeoutMs = 2000)
    {
        try
        {
            var url = $"http://{host}:{port}";
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(timeoutMs));
            var response = await _probeClient.GetAsync(url, cts.Token);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public static string FindDefaultPythonPath()
    {
        var saved = StorageService.LoadBackendSettings();
        if (!string.IsNullOrWhiteSpace(saved?.PythonPath) && File.Exists(saved.PythonPath))
        {
            return saved.PythonPath;
        }

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
        var saved = StorageService.LoadBackendSettings();
        if (!string.IsNullOrWhiteSpace(saved?.BackendDir) && Directory.Exists(saved.BackendDir))
        {
            if (File.Exists(Path.Combine(saved.BackendDir, "app", "main.py")))
            {
                return saved.BackendDir;
            }
        }

        if (!string.IsNullOrWhiteSpace(pythonPath) && File.Exists(pythonPath))
        {
            try
            {
                var dir = new FileInfo(pythonPath).Directory;
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

    public static string FindDefaultFrontendPath()
    {
        var saved = StorageService.LoadBackendSettings();
        if (!string.IsNullOrWhiteSpace(saved?.FrontendDir) && Directory.Exists(saved.FrontendDir))
        {
            if (File.Exists(Path.Combine(saved.FrontendDir, "package.json")))
            {
                return saved.FrontendDir;
            }
        }

        var currentDir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
        for (int i = 0; i < 6 && currentDir != null; i++)
        {
            var frontendDir = Path.Combine(currentDir.FullName, "frontend");
            if (Directory.Exists(frontendDir) && File.Exists(Path.Combine(frontendDir, "package.json")))
            {
                return Path.GetFullPath(frontendDir);
            }
            currentDir = currentDir.Parent;
        }

        var workingDir = new DirectoryInfo(Environment.CurrentDirectory);
        for (int i = 0; i < 4 && workingDir != null; i++)
        {
            var frontendDir = Path.Combine(workingDir.FullName, "frontend");
            if (Directory.Exists(frontendDir) && File.Exists(Path.Combine(frontendDir, "package.json")))
            {
                return Path.GetFullPath(frontendDir);
            }
            workingDir = workingDir.Parent;
        }

        return string.Empty;
    }

    public static void StartBackend(string pythonPath, string backendDir, int port, bool reload)
    {
        StartBackend(pythonPath, backendDir, "127.0.0.1", port, reload, runSilently: true);
    }

    public static void StartBackend(string pythonPath, string backendDir, string host, int port, bool reload, bool runSilently)
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
        var uvicornArgs = $"-m uvicorn app.main:app --host {host} --port {port} {reloadArg}".Trim();

        var psi = new ProcessStartInfo
        {
            WorkingDirectory = backendDir
        };

        if (runSilently)
        {
            // Direct executable launch - avoids cmd.exe quote-stripping issues
            psi.FileName = pythonPath;
            psi.Arguments = uvicornArgs;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
        }
        else
        {
            psi.FileName = "cmd.exe";
            psi.Arguments = $"/c start \"ManagerX-Backend\" \"{pythonPath}\" {uvicornArgs}";
            psi.UseShellExecute = true;
            psi.CreateNoWindow = false;
        }

        Process.Start(psi);
    }

    public static void StartFrontend(string frontendDir, string host, int port, bool runSilently)
    {
        var saved = StorageService.LoadBackendSettings();
        var backendHost = !string.IsNullOrWhiteSpace(saved?.Host) ? saved.Host : "127.0.0.1";
        var backendPort = saved?.Port > 0 ? saved.Port : 8000;
        StartFrontend(frontendDir, host, port, backendHost, backendPort, runSilently);
    }

    public static void StartFrontend(string frontendDir, string host, int port, string backendHost, int backendPort, bool runSilently)
    {
        if (!Directory.Exists(frontendDir))
        {
            throw new DirectoryNotFoundException($"Frontend directory not found at: {frontendDir}");
        }

        // Sync root .env file so Next.js reads the correct backend port and url
        SyncEnvFile(backendHost, backendPort, port);

        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            WorkingDirectory = frontendDir
        };

        // Explicit environment overrides for Next.js dev server
        psi.Environment["PORT"] = port.ToString();
        psi.Environment["FRONTEND_PORT"] = port.ToString();
        psi.Environment["BACKEND_PORT"] = backendPort.ToString();
        psi.Environment["BACKEND_URL"] = $"http://{backendHost}:{backendPort}";

        if (runSilently)
        {
            psi.Arguments = $"/c npm run dev -- -p {port} -H {host}";
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
        }
        else
        {
            psi.Arguments = $"/c start \"ManagerX-Frontend\" cmd /k \"npm run dev -- -p {port} -H {host}\"";
            psi.UseShellExecute = true;
            psi.CreateNoWindow = false;
        }

        Process.Start(psi);
    }

    public static void SyncEnvFile(string backendHost, int backendPort, int frontendPort)
    {
        try
        {
            var envPath = FindEnvFilePath();
            if (!string.IsNullOrEmpty(envPath) && File.Exists(envPath))
            {
                UpdateEnvFile(envPath, backendHost, backendPort, frontendPort);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to sync .env file: {ex.Message}");
        }
    }

    public static string? FindEnvFilePath()
    {
        // 1. Check relative to saved Backend or Frontend directory
        var saved = StorageService.LoadBackendSettings();
        if (!string.IsNullOrWhiteSpace(saved?.BackendDir) && Directory.Exists(saved.BackendDir))
        {
            var parent = Directory.GetParent(saved.BackendDir);
            if (parent != null)
            {
                var candidate = Path.Combine(parent.FullName, ".env");
                if (File.Exists(candidate)) return candidate;
            }
        }

        if (!string.IsNullOrWhiteSpace(saved?.FrontendDir) && Directory.Exists(saved.FrontendDir))
        {
            var parent = Directory.GetParent(saved.FrontendDir);
            if (parent != null)
            {
                var candidate = Path.Combine(parent.FullName, ".env");
                if (File.Exists(candidate)) return candidate;
            }
        }

        // 2. Check upward from application base directory
        var baseDir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
        for (int i = 0; i < 6 && baseDir != null; i++)
        {
            var envPath = Path.Combine(baseDir.FullName, ".env");
            if (File.Exists(envPath)) return envPath;
            baseDir = baseDir.Parent;
        }

        // 3. Check upward from current working directory
        var workingDir = new DirectoryInfo(Environment.CurrentDirectory);
        for (int i = 0; i < 4 && workingDir != null; i++)
        {
            var envPath = Path.Combine(workingDir.FullName, ".env");
            if (File.Exists(envPath)) return envPath;
            workingDir = workingDir.Parent;
        }

        return null;
    }

    private static void UpdateEnvFile(string filePath, string backendHost, int backendPort, int frontendPort)
    {
        var lines = File.ReadAllLines(filePath);
        var newLines = new System.Collections.Generic.List<string>();
        var keysSeen = new System.Collections.Generic.HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("#") || string.IsNullOrWhiteSpace(trimmed))
            {
                newLines.Add(line);
                continue;
            }

            var eqIdx = trimmed.IndexOf('=');
            if (eqIdx == -1)
            {
                newLines.Add(line);
                continue;
            }

            var key = trimmed.Substring(0, eqIdx).Trim();

            if (key.Equals("BACKEND_PORT", StringComparison.OrdinalIgnoreCase))
            {
                newLines.Add($"BACKEND_PORT={backendPort}");
                keysSeen.Add("BACKEND_PORT");
            }
            else if (key.Equals("FRONTEND_PORT", StringComparison.OrdinalIgnoreCase))
            {
                newLines.Add($"FRONTEND_PORT={frontendPort}");
                keysSeen.Add("FRONTEND_PORT");
            }
            else if (key.Equals("BACKEND_URL", StringComparison.OrdinalIgnoreCase))
            {
                newLines.Add($"BACKEND_URL=http://{backendHost}:{backendPort}");
                keysSeen.Add("BACKEND_URL");
            }
            else if (key.Equals("CORS_ORIGINS", StringComparison.OrdinalIgnoreCase))
            {
                // Ensure dynamic ports are included in CORS_ORIGINS list
                var existingVal = trimmed.Substring(eqIdx + 1).Trim();
                var origins = new System.Collections.Generic.HashSet<string>(
                    existingVal.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries),
                    StringComparer.OrdinalIgnoreCase);

                origins.Add($"http://localhost:{frontendPort}");
                origins.Add($"http://127.0.0.1:{frontendPort}");
                origins.Add($"http://localhost:{backendPort}");
                origins.Add($"http://127.0.0.1:{backendPort}");

                newLines.Add($"CORS_ORIGINS={string.Join(",", origins)}");
                keysSeen.Add("CORS_ORIGINS");
            }
            else
            {
                newLines.Add(line); // Preserve secret keys, database paths, and other variables untouched
            }
        }

        if (!keysSeen.Contains("BACKEND_PORT")) newLines.Add($"BACKEND_PORT={backendPort}");
        if (!keysSeen.Contains("FRONTEND_PORT")) newLines.Add($"FRONTEND_PORT={frontendPort}");
        if (!keysSeen.Contains("BACKEND_URL")) newLines.Add($"BACKEND_URL=http://{backendHost}:{backendPort}");

        // Atomic write to prevent file corruption
        var tempPath = filePath + ".tmp";
        File.WriteAllLines(tempPath, newLines);
        File.Move(tempPath, filePath, overwrite: true);
    }

    public static async Task StopServiceByPortAsync(int port)
    {
        if (port < 1 || port > 65535) return;

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c for /f \"tokens=5\" %a in ('netstat -aon ^| findstr /r \":{port}.*LISTENING\"') do taskkill /F /T /PID %a >nul 2>&1",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            using var proc = Process.Start(psi);
            if (proc != null)
            {
                await proc.WaitForExitAsync();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to stop service on port {port}: {ex.Message}");
        }
    }

    public static async Task StopAllServicesAsync(int backendPort = 8000, int frontendPort = 3000)
    {
        await StopServiceByPortAsync(backendPort);
        await StopServiceByPortAsync(frontendPort);

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c taskkill /FI \"WINDOWTITLE eq ManagerX-Backend*\" /T /F >nul 2>&1 & taskkill /FI \"WINDOWTITLE eq ManagerX-Frontend*\" /T /F >nul 2>&1",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            using var proc = Process.Start(psi);
            if (proc != null)
            {
                await proc.WaitForExitAsync();
            }
        }
        catch {}
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
