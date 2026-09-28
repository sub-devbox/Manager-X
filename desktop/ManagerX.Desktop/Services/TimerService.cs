using System;
using System.Windows.Threading;

namespace ManagerX.Services;

public class TimerService
{
    private readonly DispatcherTimer _timer;
    private DateTime? _startedAtUtc;
    private TimeSpan _accumulatedTime = TimeSpan.Zero;

    public bool IsRunning { get; private set; }
    public int ElapsedSeconds => Math.Max(0, (int)(_accumulatedTime + (_startedAtUtc.HasValue ? DateTime.UtcNow - _startedAtUtc.Value : TimeSpan.Zero)).TotalSeconds);

    public string? TaskId { get; private set; }
    public string? ProjectId { get; private set; }
    public string TaskTitle { get; private set; } = "No task selected";
    public string ProjectTitle { get; private set; } = "Idle";
    public DateTime? StartTimeUtc { get; private set; }

    public event Action<int>? Ticked;
    public event Action<bool>? StateChanged;

    public TimerService()
    {
        _timer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(500)
        };
        _timer.Tick += (s, e) =>
        {
            if (IsRunning)
            {
                Ticked?.Invoke(ElapsedSeconds);
            }
        };
    }

    public void Start(string taskId, string? projectId, string taskTitle, string projectTitle)
    {
        TaskId = taskId;
        ProjectId = projectId;
        TaskTitle = taskTitle;
        ProjectTitle = projectTitle;
        _accumulatedTime = TimeSpan.Zero;
        _startedAtUtc = DateTime.UtcNow;
        StartTimeUtc = DateTime.UtcNow;
        IsRunning = true;
        _timer.Start();

        StateChanged?.Invoke(IsRunning);
        Ticked?.Invoke(ElapsedSeconds);
    }

    public void Pause()
    {
        if (!IsRunning) return;

        if (_startedAtUtc.HasValue)
        {
            _accumulatedTime += DateTime.UtcNow - _startedAtUtc.Value;
            _startedAtUtc = null;
        }

        IsRunning = false;
        _timer.Stop();
        StateChanged?.Invoke(IsRunning);
        Ticked?.Invoke(ElapsedSeconds);
    }

    public void Resume()
    {
        if (IsRunning) return;

        _startedAtUtc = DateTime.UtcNow;
        IsRunning = true;
        _timer.Start();
        StateChanged?.Invoke(IsRunning);
        Ticked?.Invoke(ElapsedSeconds);
    }

    public void Reset()
    {
        IsRunning = false;
        _timer.Stop();
        _startedAtUtc = null;
        _accumulatedTime = TimeSpan.Zero;
        TaskId = null;
        ProjectId = null;
        TaskTitle = "No task selected";
        ProjectTitle = "Idle";
        StartTimeUtc = null;

        StateChanged?.Invoke(IsRunning);
        Ticked?.Invoke(0);
    }
}
