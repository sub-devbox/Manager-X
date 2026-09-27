using System.Text.Json.Serialization;

namespace ManagerX.Models;

public class TimeEntryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("task_id")]
    public string TaskId { get; set; } = string.Empty;

    [JsonPropertyName("project_id")]
    public string? ProjectId { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("start_time")]
    public string StartTime { get; set; } = string.Empty;

    [JsonPropertyName("end_time")]
    public string? EndTime { get; set; }

    [JsonPropertyName("duration_seconds")]
    public int DurationSeconds { get; set; }

    [JsonPropertyName("is_billable")]
    public bool IsBillable { get; set; } = true;

    [JsonPropertyName("task_title")]
    public string? TaskTitle { get; set; }

    [JsonPropertyName("project_name")]
    public string? ProjectName { get; set; }

    public string FormattedDuration
    {
        get
        {
            var h = DurationSeconds / 3600;
            var m = (DurationSeconds % 3600) / 60;
            var s = DurationSeconds % 60;
            return $"{h:D2}:{m:D2}:{s:D2}";
        }
    }
}

public class TimeEntryCreateRequest
{
    [JsonPropertyName("task_id")]
    public string TaskId { get; set; } = string.Empty;

    [JsonPropertyName("project_id")]
    public string? ProjectId { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("start_time")]
    public string StartTime { get; set; } = string.Empty;

    [JsonPropertyName("end_time")]
    public string? EndTime { get; set; }

    [JsonPropertyName("duration_seconds")]
    public int DurationSeconds { get; set; }

    [JsonPropertyName("is_billable")]
    public bool IsBillable { get; set; } = true;
}
