using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using ManagerX.Models;
using ManagerX.Services;

namespace ManagerX.Views;

public partial class TrackerView : UserControl
{
    private List<ProjectDto> _allProjects = new();
    private List<TaskDto> _allTasks = new();
    private bool _isPinned = false;

    public TrackerView()
    {
        InitializeComponent();
        Loaded += TrackerView_Loaded;
        Unloaded += TrackerView_Unloaded;
    }

    private void TrackerView_Loaded(object sender, RoutedEventArgs e)
    {
        App.TimerService.Ticked += OnTimerTicked;
        App.TimerService.StateChanged += OnTimerStateChanged;

        if (App.AuthService.CurrentUser != null)
        {
            UserEmailText.Text = App.AuthService.CurrentUser.FullName ?? App.AuthService.CurrentUser.Email;
        }

        UpdateTimerUi(App.TimerService.ElapsedSeconds, App.TimerService.IsRunning);
        _ = LoadDataAsync();
    }

    private void TrackerView_Unloaded(object sender, RoutedEventArgs e)
    {
        App.TimerService.Ticked -= OnTimerTicked;
        App.TimerService.StateChanged -= OnTimerStateChanged;
    }

    private void OnTimerTicked(int elapsedSeconds)
    {
        Dispatcher.Invoke(() =>
        {
            TimerDigitsText.Text = FormatSeconds(elapsedSeconds);
        });
    }

    private void OnTimerStateChanged(bool isRunning)
    {
        Dispatcher.Invoke(() =>
        {
            UpdateTimerUi(App.TimerService.ElapsedSeconds, isRunning);
        });
    }

    private void UpdateTimerUi(int seconds, bool isRunning)
    {
        TimerDigitsText.Text = FormatSeconds(seconds);

        if (isRunning)
        {
            TimerStatusText.Text = "RUNNING";
            TimerStatusText.Foreground = (Brush)FindResource("AccentEmeraldBrush");
            TimerStatusBadge.Background = new SolidColorBrush(Color.FromArgb(30, 16, 185, 129));
            TimerStatusBadge.BorderBrush = (Brush)FindResource("AccentEmeraldBrush");

            StartPauseButton.Content = "⏸ Pause";
            StartPauseButton.Style = (Style)FindResource("SecondaryButton");
            StopSaveButton.IsEnabled = seconds > 0;
            ResetButton.IsEnabled = true;
            ActiveTaskLabel.Text = $"{App.TimerService.TaskTitle} • {App.TimerService.ProjectTitle}";
        }
        else if (seconds > 0)
        {
            TimerStatusText.Text = "PAUSED";
            TimerStatusText.Foreground = (Brush)FindResource("AccentAmberBrush");
            TimerStatusBadge.Background = new SolidColorBrush(Color.FromArgb(30, 245, 158, 11));
            TimerStatusBadge.BorderBrush = (Brush)FindResource("AccentAmberBrush");

            StartPauseButton.Content = "▶ Resume";
            StartPauseButton.Style = (Style)FindResource("PrimaryButton");
            StopSaveButton.IsEnabled = true;
            ResetButton.IsEnabled = true;
            ActiveTaskLabel.Text = $"{App.TimerService.TaskTitle} • {App.TimerService.ProjectTitle}";
        }
        else
        {
            TimerStatusText.Text = "IDLE";
            TimerStatusText.Foreground = (Brush)FindResource("TextDimBrush");
            TimerStatusBadge.Background = (Brush)FindResource("BgSurfaceSubtleBrush");
            TimerStatusBadge.BorderBrush = (Brush)FindResource("BorderSubtleBrush");

            StartPauseButton.Content = "▶ Start Timer";
            StartPauseButton.Style = (Style)FindResource("PrimaryButton");
            StopSaveButton.IsEnabled = false;
            ResetButton.IsEnabled = false;
            ActiveTaskLabel.Text = "Select a task below and press Start";
        }
    }

    private async Task LoadDataAsync()
    {
        try
        {
            var projectsTask = App.ApiClient.GetAsync<List<ProjectDto>>("/projects");
            var tasksTask = App.ApiClient.GetAsync<List<TaskDto>>("/tasks");
            var entriesTask = App.ApiClient.GetAsync<List<TimeEntryDto>>("/time-entries");

            await Task.WhenAll(projectsTask, tasksTask, entriesTask);

            _allProjects = projectsTask.Result ?? new List<ProjectDto>();
            _allTasks = tasksTask.Result ?? new List<TaskDto>();
            var entries = entriesTask.Result ?? new List<TimeEntryDto>();

            // Populate Projects dropdown
            ProjectCombo.Items.Clear();
            var allProjectsOption = new ProjectDto { Id = "", Name = "-- All Projects --" };
            ProjectCombo.Items.Add(allProjectsOption);
            foreach (var p in _allProjects)
            {
                ProjectCombo.Items.Add(p);
            }
            ProjectCombo.SelectedIndex = 0;

            RefreshTasksList();
            PopulateTodayEntries(entries);
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to refresh data: {ex.Message}", isError: true);
        }
    }

    private void ProjectCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        RefreshTasksList();
    }

    private void RefreshTasksList()
    {
        var selectedProject = ProjectCombo.SelectedItem as ProjectDto;
        TaskCombo.Items.Clear();

        IEnumerable<TaskDto> filtered = _allTasks;
        if (selectedProject != null && !string.IsNullOrEmpty(selectedProject.Id))
        {
            filtered = _allTasks.Where(t => t.ProjectId == selectedProject.Id);
        }

        foreach (var task in filtered)
        {
            TaskCombo.Items.Add(task);
        }

        if (TaskCombo.Items.Count > 0)
        {
            TaskCombo.SelectedIndex = 0;
        }
    }

    private void PopulateTodayEntries(List<TimeEntryDto> entries)
    {
        var todayStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var todayEntries = entries
            .Where(e => !string.IsNullOrEmpty(e.StartTime) && e.StartTime.StartsWith(todayStr))
            .OrderByDescending(e => e.StartTime)
            .ToList();

        RecentEntriesList.ItemsSource = todayEntries;
        NoEntriesText.Visibility = todayEntries.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        var totalSeconds = todayEntries.Sum(e => e.DurationSeconds);
        var totalHours = totalSeconds / 3600.0;
        TodayTotalHoursText.Text = $"Total: {totalHours:F1} hrs";
    }

    private void StartPauseButton_Click(object sender, RoutedEventArgs e)
    {
        if (App.TimerService.IsRunning)
        {
            App.TimerService.Pause();
        }
        else if (App.TimerService.ElapsedSeconds > 0)
        {
            App.TimerService.Resume();
        }
        else
        {
            // Start new timer session
            var selectedTask = TaskCombo.SelectedItem as TaskDto;
            if (selectedTask == null)
            {
                ShowNotice("Please select a task first.", isError: true);
                TaskCombo.Focus();
                return;
            }

            var proj = _allProjects.FirstOrDefault(p => p.Id == selectedTask.ProjectId);
            var projName = proj?.Name ?? selectedTask.ProjectName ?? "Active Project";

            App.TimerService.Start(selectedTask.Id, selectedTask.ProjectId, selectedTask.Title, projName);
            ShowNotice($"Timer started for {selectedTask.Title}");
        }
    }

    private async void StopSaveButton_Click(object sender, RoutedEventArgs e)
    {
        var seconds = App.TimerService.ElapsedSeconds;
        var taskId = App.TimerService.TaskId;
        var projectId = App.TimerService.ProjectId;
        var startUtc = App.TimerService.StartTimeUtc ?? DateTime.UtcNow.AddSeconds(-seconds);
        var description = DescriptionInput.Text.Trim();

        if (string.IsNullOrEmpty(taskId))
        {
            var selectedTask = TaskCombo.SelectedItem as TaskDto;
            taskId = selectedTask?.Id;
            projectId = selectedTask?.ProjectId;
        }

        if (string.IsNullOrEmpty(taskId))
        {
            ShowNotice("Cannot save time entry: no task selected.", isError: true);
            return;
        }

        if (seconds < 1)
        {
            App.TimerService.Reset();
            return;
        }

        StopSaveButton.IsEnabled = false;
        try
        {
            var payload = new TimeEntryCreateRequest
            {
                TaskId = taskId,
                ProjectId = projectId,
                Description = string.IsNullOrEmpty(description) ? $"Logged via Manager-X Desktop" : description,
                StartTime = startUtc.ToString("o"),
                EndTime = DateTime.UtcNow.ToString("o"),
                DurationSeconds = seconds,
                IsBillable = true,
            };

            await App.ApiClient.PostAsync("/time-entries", payload);
            App.TimerService.Reset();
            DescriptionInput.Text = "";

            ShowNotice($"Logged {FormatSeconds(seconds)} to task successfully!");
            await LoadDataAsync();
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to log time: {ex.Message}", isError: true);
        }
        finally
        {
            StopSaveButton.IsEnabled = true;
        }
    }

    private void ResetButton_Click(object sender, RoutedEventArgs e)
    {
        if (MessageBox.Show("Are you sure you want to discard this timer?", "Discard Timer", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
        {
            App.TimerService.Reset();
            ShowNotice("Timer reset.");
        }
    }

    private async void ManualLogButton_Click(object sender, RoutedEventArgs e)
    {
        var selectedTask = TaskCombo.SelectedItem as TaskDto;
        if (selectedTask == null)
        {
            ShowNotice("Please select a task first.", isError: true);
            TaskCombo.Focus();
            return;
        }

        var input = ManualHoursInput.Text.Trim();
        if (!double.TryParse(input, NumberStyles.Any, CultureInfo.InvariantCulture, out var hours) || hours <= 0)
        {
            ShowNotice("Please enter a valid positive number of hours (e.g. 1.5).", isError: true);
            ManualHoursInput.Focus();
            return;
        }

        var seconds = (int)(hours * 3600);
        var description = DescriptionInput.Text.Trim();
        var now = DateTime.UtcNow;

        ManualLogButton.IsEnabled = false;
        try
        {
            var payload = new TimeEntryCreateRequest
            {
                TaskId = selectedTask.Id,
                ProjectId = selectedTask.ProjectId,
                Description = string.IsNullOrEmpty(description) ? $"Manual log via Desktop ({hours}h)" : description,
                StartTime = now.AddSeconds(-seconds).ToString("o"),
                EndTime = now.ToString("o"),
                DurationSeconds = seconds,
                IsBillable = true,
            };

            await App.ApiClient.PostAsync("/time-entries", payload);
            ManualHoursInput.Text = "";
            DescriptionInput.Text = "";

            ShowNotice($"Manually logged {hours:F1} hrs ({FormatSeconds(seconds)})!");
            await LoadDataAsync();
        }
        catch (Exception ex)
        {
            ShowNotice($"Manual log failed: {ex.Message}", isError: true);
        }
        finally
        {
            ManualLogButton.IsEnabled = true;
        }
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        RefreshButton.IsEnabled = false;
        await LoadDataAsync();
        RefreshButton.IsEnabled = true;
        ShowNotice("Data refreshed.");
    }

    private void PinButton_Click(object sender, RoutedEventArgs e)
    {
        var win = Window.GetWindow(this);
        if (win != null)
        {
            _isPinned = !_isPinned;
            win.Topmost = _isPinned;
            PinButton.Content = _isPinned ? "📌 Pinned" : "📌 Pin";
            PinButton.Style = _isPinned ? (Style)FindResource("PrimaryButton") : (Style)FindResource("SecondaryButton");
        }
    }

    private async void LogoutButton_Click(object sender, RoutedEventArgs e)
    {
        if (App.TimerService.IsRunning)
        {
            if (MessageBox.Show("A timer is currently running. Discard and sign out?", "Confirm Sign Out", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes)
            {
                return;
            }
            App.TimerService.Reset();
        }

        await App.AuthService.LogoutAsync();
    }

    private void ShowNotice(string message, bool isError = false)
    {
        NoticeText.Text = message;
        if (isError)
        {
            NoticeBorder.Background = new SolidColorBrush(Color.FromArgb(40, 244, 63, 94));
            NoticeBorder.BorderBrush = (Brush)FindResource("AccentRoseBrush");
            NoticeText.Foreground = (Brush)FindResource("AccentRoseBrush");
        }
        else
        {
            NoticeBorder.Background = new SolidColorBrush(Color.FromArgb(40, 16, 185, 129));
            NoticeBorder.BorderBrush = (Brush)FindResource("AccentEmeraldBrush");
            NoticeText.Foreground = (Brush)FindResource("AccentEmeraldBrush");
        }
        NoticeBorder.Visibility = Visibility.Visible;
    }

    private static string FormatSeconds(int totalSeconds)
    {
        var hours = totalSeconds / 3600;
        var minutes = (totalSeconds % 3600) / 60;
        var seconds = totalSeconds % 60;
        return $"{hours:D2}:{minutes:D2}:{seconds:D2}";
    }
}
