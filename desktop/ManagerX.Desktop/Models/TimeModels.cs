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

    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public string? UpdatedAt { get; set; }

    [JsonPropertyName("hourly_rate")]
    public double? HourlyRate { get; set; }

    [JsonIgnore]
    public double DurationHours => Math.Round(DurationSeconds / 3600.0, 2);

    [JsonIgnore]
    public bool IsToday
    {
        get
        {
            var today = DateTime.Today;
            var todayStr = today.ToString("yyyy-MM-dd");

            if (!string.IsNullOrWhiteSpace(StartTime))
            {
                if (DateTimeOffset.TryParse(StartTime, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dto))
                {
                    if (dto.ToLocalTime().Date == today || dto.UtcDateTime.Date == DateTime.UtcNow.Date)
                        return true;
                }
                else if (DateTime.TryParse(StartTime, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dt))
                {
                    if (dt.Date == today || dt.Date == DateTime.UtcNow.Date ||
                        DateTime.SpecifyKind(dt, DateTimeKind.Utc).ToLocalTime().Date == today)
                        return true;
                }

                if (StartTime.StartsWith(todayStr, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            if (!string.IsNullOrWhiteSpace(CreatedAt))
            {
                if (DateTimeOffset.TryParse(CreatedAt, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dtoCreated))
                {
                    if (dtoCreated.ToLocalTime().Date == today || dtoCreated.UtcDateTime.Date == DateTime.UtcNow.Date)
                        return true;
                }
                else if (DateTime.TryParse(CreatedAt, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dtCreated))
                {
                    if (dtCreated.Date == today || dtCreated.Date == DateTime.UtcNow.Date ||
                        DateTime.SpecifyKind(dtCreated, DateTimeKind.Utc).ToLocalTime().Date == today)
                        return true;
                }

                if (CreatedAt.StartsWith(todayStr, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }
    }

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

public class TimeEntryUpdateRequest
{
    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Description { get; set; }

    [JsonPropertyName("duration_seconds")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? DurationSeconds { get; set; }

    [JsonPropertyName("is_billable")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? IsBillable { get; set; }
}
