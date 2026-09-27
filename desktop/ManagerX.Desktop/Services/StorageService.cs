using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ManagerX.Models;

namespace ManagerX.Services;

public class StorageService
{
    private static readonly string AppDataFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ManagerX"
    );

    private static readonly string CredentialsFilePath = Path.Combine(AppDataFolder, "credentials.dat");

    public static void SaveCredentials(SavedCredentials creds)
    {
        try
        {
            if (!Directory.Exists(AppDataFolder))
            {
                Directory.CreateDirectory(AppDataFolder);
            }

            var json = JsonSerializer.Serialize(creds);
            var plainBytes = Encoding.UTF8.GetBytes(json);

            // Encrypt using Windows DPAPI (tied to current Windows user)
            var cipherBytes = ProtectedData.Protect(
                plainBytes,
                optionalEntropy: null,
                scope: DataProtectionScope.CurrentUser
            );

            File.WriteAllBytes(CredentialsFilePath, cipherBytes);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to save credentials: {ex.Message}");
        }
    }

    public static SavedCredentials? LoadCredentials()
    {
        try
        {
            if (!File.Exists(CredentialsFilePath))
            {
                return null;
            }

            var cipherBytes = File.ReadAllBytes(CredentialsFilePath);
            var plainBytes = ProtectedData.Unprotect(
                cipherBytes,
                optionalEntropy: null,
                scope: DataProtectionScope.CurrentUser
            );

            var json = Encoding.UTF8.GetString(plainBytes);
            return JsonSerializer.Deserialize<SavedCredentials>(json);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to load credentials: {ex.Message}");
            return null;
        }
    }

    public static void ClearCredentials()
    {
        try
        {
            if (File.Exists(CredentialsFilePath))
            {
                File.Delete(CredentialsFilePath);
            }
        }
        catch {}
    }
}
