using System;
using System.Runtime.InteropServices;

namespace ManagerX.Services;

public static class ShutdownPreventionService
{
    private const int WM_QUERYENDSESSION = 0x0011;
    private const int WM_ENDSESSION = 0x0016;

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool ShutdownBlockReasonCreate(IntPtr hWnd, string pwszReason);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool ShutdownBlockReasonDestroy(IntPtr hWnd);

    private static bool _isBlocked = false;

    public static void EnableShutdownBlock(IntPtr hWnd, string reason = "Manager X is actively tracking time. Please stop and save your timer before shutting down.")
    {
        if (hWnd == IntPtr.Zero || _isBlocked) return;

        try
        {
            if (ShutdownBlockReasonCreate(hWnd, reason))
            {
                _isBlocked = true;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to enable shutdown block: {ex.Message}");
        }
    }

    public static void DisableShutdownBlock(IntPtr hWnd)
    {
        if (hWnd == IntPtr.Zero || !_isBlocked) return;

        try
        {
            if (ShutdownBlockReasonDestroy(hWnd))
            {
                _isBlocked = false;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to disable shutdown block: {ex.Message}");
        }
    }

    public static IntPtr WindowProcHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled, Func<bool> isTimerActivePredicate)
    {
        if (msg == WM_QUERYENDSESSION)
        {
            if (isTimerActivePredicate())
            {
                // Reject immediate shutdown query to allow user to save timer
                handled = true;
                return IntPtr.Zero;
            }
        }

        return IntPtr.Zero;
    }
}
