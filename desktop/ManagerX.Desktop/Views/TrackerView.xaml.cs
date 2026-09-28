using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using ManagerX.Models;
using ManagerX.Services;
using UserControl = System.Windows.Controls.UserControl;
using KeyEventArgs = System.Windows.Input.KeyEventArgs;
using Button = System.Windows.Controls.Button;
using Brush = System.Windows.Media.Brush;
using Color = System.Windows.Media.Color;
using MessageBox = System.Windows.MessageBox;
using MessageBoxButton = System.Windows.MessageBoxButton;
using MessageBoxResult = System.Windows.MessageBoxResult;
using MessageBoxImage = System.Windows.MessageBoxImage;

namespace ManagerX.Views;

public partial class TrackerView : UserControl
{
    public event Action? RequestMiniMode;

    private List<ProjectDto> _allProjects = new();
    private List<TaskDto> _allTasks = new();
    private List<ClientDto> _allClients = new();
    private List<TimeEntryDto> _todayEntries = new();
    private TimeEntryDto? _editingEntry;

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

        UpdateTimerUi(App.TimerService.ElapsedSeconds, App.TimerService.IsRunning);
        _ = LoadInitialDataAsync();
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
            StartPauseButton.IsEnabled = true;
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
            StartPauseButton.IsEnabled = true;
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

            // Strictly require both Project and Task to be selected
            var hasTask = (TaskCombo.SelectedItem as TaskDto) != null;
            StartPauseButton.IsEnabled = hasTask;
            StopSaveButton.IsEnabled = false;
            ResetButton.IsEnabled = false;
            ActiveTaskLabel.Text = hasTask ? "Ready to start timer" : "Select a project and task to start timer";
        }
    }

    public async Task RefreshDataAsync()
    {
        await LoadInitialDataAsync();
        ShowNotice("Data refreshed.");
    }

    private async Task LoadInitialDataAsync()
    {
        try
        {
            var projTask = App.ApiClient.GetAsync<List<ProjectDto>>("/projects");
            var taskTask = App.ApiClient.GetAsync<List<TaskDto>>("/tasks");
            var clientsTask = App.ApiClient.GetAsync<List<ClientDto>>("/clients");
            var entriesTask = App.ApiClient.GetAsync<List<TimeEntryDto>>("/time-entries");

            await Task.WhenAll(projTask, taskTask, clientsTask, entriesTask);

            _allProjects = projTask.Result ?? new List<ProjectDto>();
            _allTasks = taskTask.Result ?? new List<TaskDto>();
            _allClients = clientsTask.Result ?? new List<ClientDto>();
            var entries = entriesTask.Result ?? new List<TimeEntryDto>();

            PopulateProjectsCombo();
            RefreshScheduleAndMetrics(entries);
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to load data: {ex.Message}", isError: true);
        }
    }

    private void PopulateProjectsCombo(string? filter = null)
    {
        ProjectCombo.Items.Clear();

        IEnumerable<ProjectDto> matches = _allProjects;
        if (!string.IsNullOrWhiteSpace(filter))
        {
            matches = _allProjects.Where(p => p.Name.Contains(filter, StringComparison.OrdinalIgnoreCase));
        }

        var list = matches.ToList();
        foreach (var p in list)
        {
            ProjectCombo.Items.Add(p);
        }

        // Quick create if typed query does not match any project
        if (!string.IsNullOrWhiteSpace(filter) && !list.Any(p => p.Name.Equals(filter, StringComparison.OrdinalIgnoreCase)))
        {
            var createPlaceholder = new ProjectDto { Id = "__CREATE__", Name = $"➕ Create \"{filter}\"" };
            ProjectCombo.Items.Add(createPlaceholder);
        }
    }

    private void ProjectCombo_KeyUp(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter || e.Key == Key.Down || e.Key == Key.Up) return;
        var text = ProjectCombo.Text.Trim();
        PopulateProjectsCombo(text);
        ProjectCombo.IsDropDownOpen = true;
    }

    private void ProjectCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        var selected = ProjectCombo.SelectedItem as ProjectDto;
        if (selected == null)
        {
            TaskCombo.IsEnabled = false;
            NewTaskHeaderButton.IsEnabled = false;
            TaskCombo.Items.Clear();
            UpdateTimerUi(App.TimerService.ElapsedSeconds, App.TimerService.IsRunning);
            return;
        }

        if (selected.Id == "__CREATE__")
        {
            var nameToCreate = selected.Name.Replace("➕ Create \"", "").TrimEnd('"');
            OpenNewProjectModal(nameToCreate);
            return;
        }

        // Enable Task Selection
        TaskCombo.IsEnabled = true;
        NewTaskHeaderButton.IsEnabled = true;
        PopulateTasksCombo();
    }

    private void PopulateTasksCombo(string? filter = null)
    {
        var selectedProject = ProjectCombo.SelectedItem as ProjectDto;
        if (selectedProject == null) return;

        TaskCombo.Items.Clear();
        var projectTasks = _allTasks.Where(t => t.ProjectId == selectedProject.Id);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            projectTasks = projectTasks.Where(t => t.Title.Contains(filter, StringComparison.OrdinalIgnoreCase));
        }

        var list = projectTasks.ToList();
        foreach (var t in list)
        {
            TaskCombo.Items.Add(t);
        }

        // Quick create task option if typed query has no match
        if (!string.IsNullOrWhiteSpace(filter) && !list.Any(t => t.Title.Equals(filter, StringComparison.OrdinalIgnoreCase)))
        {
            var createPlaceholder = new TaskDto { Id = "__CREATE__", Title = $"➕ Create \"{filter}\"" };
            TaskCombo.Items.Add(createPlaceholder);
        }

        if (TaskCombo.Items.Count > 0 && string.IsNullOrWhiteSpace(filter))
        {
            TaskCombo.SelectedIndex = 0;
        }

        UpdateTimerUi(App.TimerService.ElapsedSeconds, App.TimerService.IsRunning);
    }

    private void TaskCombo_KeyUp(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter || e.Key == Key.Down || e.Key == Key.Up) return;
        var text = TaskCombo.Text.Trim();
        PopulateTasksCombo(text);
        TaskCombo.IsDropDownOpen = true;
    }

    private void TaskCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        var selected = TaskCombo.SelectedItem as TaskDto;
        if (selected != null && selected.Id == "__CREATE__")
        {
            var titleToCreate = selected.Title.Replace("➕ Create \"", "").TrimEnd('"');
            OpenNewTaskModal(titleToCreate);
            return;
        }

        UpdateTimerUi(App.TimerService.ElapsedSeconds, App.TimerService.IsRunning);
    }

    private void RefreshScheduleAndMetrics(List<TimeEntryDto>? entries = null)
    {
        var today = DateTime.Today.ToString("yyyy-MM-dd");

        if (entries != null)
        {
            _todayEntries = entries
                .Where(e => !string.IsNullOrEmpty(e.StartTime) && e.StartTime.StartsWith(today))
                .OrderByDescending(e => e.StartTime)
                .ToList();
        }

        // 1. Tasks due today
        var scheduledToday = _allTasks
            .Where(t => !string.IsNullOrEmpty(t.DueDate) && t.DueDate.StartsWith(today))
            .ToList();

        foreach (var t in scheduledToday)
        {
            t.IsOverdue = false;
            t.ScheduleBadgeText = t.Status == "done" ? "DONE" : "TODAY";
            t.ScheduleBadgeBgColor = t.Status == "done" ? "#143023" : "#1B2F4A";
            t.ScheduleBadgeBorderColor = t.Status == "done" ? "#10B981" : "#3B82F6";
        }

        // 2. Pending / Overdue tasks from previous days (not completed)
        var pendingPrevious = _allTasks
            .Where(t => t.Status != "done" &&
                        ((!string.IsNullOrEmpty(t.DueDate) && string.Compare(t.DueDate.Substring(0, Math.Min(10, t.DueDate.Length)), today, StringComparison.OrdinalIgnoreCase) < 0) ||
                         (string.IsNullOrEmpty(t.DueDate) && !string.IsNullOrEmpty(t.CreatedAt) && string.Compare(t.CreatedAt.Substring(0, Math.Min(10, t.CreatedAt.Length)), today, StringComparison.OrdinalIgnoreCase) < 0)))
            .OrderBy(t => t.DueDate ?? t.CreatedAt)
            .ToList();

        foreach (var t in pendingPrevious)
        {
            t.IsOverdue = true;
            var dateStr = !string.IsNullOrEmpty(t.DueDate) ? t.DueDate.Substring(0, Math.Min(10, t.DueDate.Length)) : "PREV";
            t.ScheduleBadgeText = $"PENDING ({dateStr})";
            t.ScheduleBadgeBgColor = "#38151E";
            t.ScheduleBadgeBorderColor = "#F43F5E";
        }

        // Combine: overdue/pending first, then today's scheduled
        var combinedSchedule = new List<TaskDto>();
        combinedSchedule.AddRange(pendingPrevious);
        combinedSchedule.AddRange(scheduledToday.Where(t => !pendingPrevious.Any(p => p.Id == t.Id)));

        // 1. Metrics
        var totalEstHours = combinedSchedule.Sum(t => t.EstimatedHours);
        var totalTrackedSeconds = _todayEntries.Sum(e => e.DurationSeconds);
        var totalTrackedHours = totalTrackedSeconds / 3600.0;

        EstTimeTodayText.Text = $"{totalEstHours:F1} hrs";
        TrackedTodayText.Text = $"{totalTrackedHours:F1} hrs";

        // 2. Schedule List
        TodayScheduleList.ItemsSource = null;
        TodayScheduleList.ItemsSource = combinedSchedule;

        if (pendingPrevious.Count > 0)
        {
            ScheduleCountText.Text = $"{combinedSchedule.Count} task(s) ({pendingPrevious.Count} pending)";
        }
        else
        {
            ScheduleCountText.Text = $"{combinedSchedule.Count} task(s) due";
        }

        NoScheduleText.Visibility = combinedSchedule.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        // 3. Activity Button Label
        ViewTodayActivityButton.Content = $"📋 View Today's Activity & Logs ({_todayEntries.Count})";
        ModalEntriesList.ItemsSource = null;
        ModalEntriesList.ItemsSource = _todayEntries;
        NoModalEntriesText.Visibility = _todayEntries.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private async void CompleteScheduledTask_Click(object sender, RoutedEventArgs e)
    {
        var button = sender as Button;
        var task = button?.Tag as TaskDto;
        if (task == null) return;

        button.IsEnabled = false;
        try
        {
            var req = new TaskStatusUpdateRequest { Status = "done" };
            await App.ApiClient.PatchAsync<TaskStatusUpdateRequest, TaskDto>($"/tasks/{task.Id}/status", req);
            task.Status = "done";
            ShowNotice($"Task \"{task.Title}\" marked as completed!");
            RefreshScheduleAndMetrics();
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to mark complete: {ex.Message}", isError: true);
            button.IsEnabled = true;
        }
    }

    private void StartScheduledTask_Click(object sender, RoutedEventArgs e)
    {
        var button = sender as Button;
        var task = button?.Tag as TaskDto;
        if (task == null) return;

        // Auto select project
        var proj = _allProjects.FirstOrDefault(p => p.Id == task.ProjectId);
        if (proj != null)
        {
            ProjectCombo.SelectedItem = proj;
            TaskCombo.SelectedItem = task;
        }

        // Start Timer immediately and request mini-mode
        var projName = proj?.Name ?? task.ProjectName ?? "Active Project";
        App.TimerService.Start(task.Id, task.ProjectId, task.Title, projName);
        ShowNotice($"Timer started for {task.Title}");
        RequestMiniMode?.Invoke();
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
            RequestMiniMode?.Invoke();
        }
        else
        {
            var selectedTask = TaskCombo.SelectedItem as TaskDto;
            var selectedProject = ProjectCombo.SelectedItem as ProjectDto;
            if (selectedTask == null || selectedProject == null)
            {
                ShowNotice("Please select a project and a task before starting.", isError: true);
                return;
            }

            App.TimerService.Start(selectedTask.Id, selectedProject.Id, selectedTask.Title, selectedProject.Name);
            ShowNotice($"Timer started for {selectedTask.Title}");
            RequestMiniMode?.Invoke();
        }
    }

    public void TriggerStopAndLog()
    {
        StopSaveButton_Click(this, new RoutedEventArgs());
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
                Description = string.IsNullOrEmpty(description) ? "Logged via Manager X Desktop" : description,
                StartTime = startUtc.ToString("o"),
                EndTime = DateTime.UtcNow.ToString("o"),
                DurationSeconds = seconds,
                IsBillable = true,
            };

            await App.ApiClient.PostAsync("/time-entries", payload);
            App.TimerService.Reset();
            DescriptionInput.Text = "";

            ShowNotice($"Logged {FormatSeconds(seconds)} successfully!");
            await ReloadEntriesAsync();
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
        if (MessageBox.Show("Are you sure you want to discard this timer session?", "Reset Timer", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
        {
            App.TimerService.Reset();
            ShowNotice("Timer reset.");
        }
    }

    private async Task ReloadEntriesAsync()
    {
        try
        {
            var entries = await App.ApiClient.GetAsync<List<TimeEntryDto>>("/time-entries");
            RefreshScheduleAndMetrics(entries);
        }
        catch {}
    }

    // --- TODAY'S ACTIVITY MODAL ---
    private void ViewTodayActivityButton_Click(object sender, RoutedEventArgs e)
    {
        ActivityModalOverlay.Visibility = Visibility.Visible;
    }

    private void CloseActivityModal_Click(object sender, RoutedEventArgs e)
    {
        ActivityModalOverlay.Visibility = Visibility.Collapsed;
    }

    private void EditEntry_Click(object sender, RoutedEventArgs e)
    {
        var button = sender as Button;
        var entry = button?.Tag as TimeEntryDto;
        if (entry == null) return;

        _editingEntry = entry;
        EditDurationMinutesInput.Text = (entry.DurationSeconds / 60).ToString();
        EditDescriptionInput.Text = entry.Description ?? "";
        EditEntryOverlay.Visibility = Visibility.Visible;
    }

    private void CancelEditEntry_Click(object sender, RoutedEventArgs e)
    {
        _editingEntry = null;
        EditEntryOverlay.Visibility = Visibility.Collapsed;
    }

    private async void SaveEditEntry_Click(object sender, RoutedEventArgs e)
    {
        if (_editingEntry == null) return;

        if (!int.TryParse(EditDurationMinutesInput.Text.Trim(), out var minutes) || minutes < 0)
        {
            ShowNotice("Please enter a valid duration in minutes.", isError: true);
            return;
        }

        try
        {
            var payload = new TimeEntryUpdateRequest
            {
                DurationSeconds = minutes * 60,
                Description = EditDescriptionInput.Text.Trim(),
            };

            await App.ApiClient.PatchAsync<TimeEntryUpdateRequest, TimeEntryDto>($"/time-entries/{_editingEntry.Id}", payload);
            EditEntryOverlay.Visibility = Visibility.Collapsed;
            _editingEntry = null;
            ShowNotice("Time entry updated.");
            await ReloadEntriesAsync();
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to update entry: {ex.Message}", isError: true);
        }
    }

    private async void DeleteEntry_Click(object sender, RoutedEventArgs e)
    {
        var button = sender as Button;
        var entry = button?.Tag as TimeEntryDto;
        if (entry == null) return;

        if (MessageBox.Show($"Are you sure you want to delete this {entry.FormattedDuration} time log?", "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes)
        {
            return;
        }

        try
        {
            await App.ApiClient.DeleteAsync($"/time-entries/{entry.Id}");
            ShowNotice("Time entry deleted.");
            await ReloadEntriesAsync();
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to delete entry: {ex.Message}", isError: true);
        }
    }

    // --- CREATE PROJECT MODAL ---
    private void NewProjectButton_Click(object sender, RoutedEventArgs e)
    {
        OpenNewProjectModal();
    }

    private void OpenNewProjectModal(string? prefillName = null)
    {
        NewProjectNameInput.Text = prefillName ?? "";
        NewProjectClientCombo.Items.Clear();

        foreach (var c in _allClients)
        {
            NewProjectClientCombo.Items.Add(c);
        }

        if (NewProjectClientCombo.Items.Count > 0)
        {
            NewProjectClientCombo.SelectedIndex = 0;
        }

        NewProjectOverlay.Visibility = Visibility.Visible;
        NewProjectNameInput.Focus();
    }

    private void CancelNewProject_Click(object sender, RoutedEventArgs e)
    {
        NewProjectOverlay.Visibility = Visibility.Collapsed;
    }

    private async void SubmitNewProject_Click(object sender, RoutedEventArgs e)
    {
        var name = NewProjectNameInput.Text.Trim();
        var client = NewProjectClientCombo.SelectedItem as ClientDto;

        if (string.IsNullOrWhiteSpace(name))
        {
            ShowNotice("Project name is required.", isError: true);
            return;
        }

        if (client == null)
        {
            ShowNotice("Please select a client for this project.", isError: true);
            return;
        }

        SubmitNewProjectButton.IsEnabled = false;
        try
        {
            var req = new ProjectCreateRequest
            {
                Name = name,
                ClientId = client.Id,
            };

            var created = await App.ApiClient.PostAsync<ProjectCreateRequest, ProjectDto>("/projects", req);
            if (created != null)
            {
                _allProjects.Add(created);
                PopulateProjectsCombo();
                ProjectCombo.SelectedItem = created;
                NewProjectOverlay.Visibility = Visibility.Collapsed;
                ShowNotice($"Project \"{created.Name}\" created!");
            }
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to create project: {ex.Message}", isError: true);
        }
        finally
        {
            SubmitNewProjectButton.IsEnabled = true;
        }
    }

    // --- CREATE TASK MODAL ---
    private void NewTaskButton_Click(object sender, RoutedEventArgs e)
    {
        OpenNewTaskModal();
    }

    private void OpenNewTaskModal(string? prefillTitle = null)
    {
        var project = ProjectCombo.SelectedItem as ProjectDto;
        if (project == null)
        {
            ShowNotice("Please select a project first.", isError: true);
            return;
        }

        NewTaskTitleInput.Text = prefillTitle ?? "";
        NewTaskEstHoursInput.Text = "1.0";
        NewTaskOverlay.Visibility = Visibility.Visible;
        NewTaskTitleInput.Focus();
    }

    private void CancelNewTask_Click(object sender, RoutedEventArgs e)
    {
        NewTaskOverlay.Visibility = Visibility.Collapsed;
    }

    private async void SubmitNewTask_Click(object sender, RoutedEventArgs e)
    {
        var project = ProjectCombo.SelectedItem as ProjectDto;
        if (project == null) return;

        var title = NewTaskTitleInput.Text.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            ShowNotice("Task title is required.", isError: true);
            return;
        }

        double.TryParse(NewTaskEstHoursInput.Text.Trim(), NumberStyles.Any, CultureInfo.InvariantCulture, out var estHours);

        SubmitNewTaskButton.IsEnabled = false;
        try
        {
            var req = new TaskCreateRequest
            {
                Title = title,
                ProjectId = project.Id,
                EstimatedHours = estHours,
                DueDate = DateTime.Today.ToString("yyyy-MM-dd"),
            };

            var created = await App.ApiClient.PostAsync<TaskCreateRequest, TaskDto>("/tasks", req);
            if (created != null)
            {
                created.ProjectName = project.Name;
                _allTasks.Add(created);
                PopulateTasksCombo();
                TaskCombo.SelectedItem = created;
                NewTaskOverlay.Visibility = Visibility.Collapsed;
                ShowNotice($"Task \"{created.Title}\" created!");
                RefreshScheduleAndMetrics();
            }
        }
        catch (Exception ex)
        {
            ShowNotice($"Failed to create task: {ex.Message}", isError: true);
        }
        finally
        {
            SubmitNewTaskButton.IsEnabled = true;
        }
    }

    private void NoticeClose_Click(object sender, RoutedEventArgs e)
    {
        NoticeBorder.Visibility = Visibility.Collapsed;
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
