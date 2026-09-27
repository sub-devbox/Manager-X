using System.Windows;
using ManagerX.Services;

namespace ManagerX;

public partial class App : Application
{
    public static ApiClient ApiClient { get; private set; } = null!;
    public static AuthService AuthService { get; private set; } = null!;
    public static TimerService TimerService { get; private set; } = null!;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        ApiClient = new ApiClient();
        AuthService = new AuthService(ApiClient);
        TimerService = new TimerService();
    }
}
