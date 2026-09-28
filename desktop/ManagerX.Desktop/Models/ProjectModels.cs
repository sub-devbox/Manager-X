using System.Text.Json.Serialization;

namespace ManagerX.Models;

public class ProjectDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("client_id")]
    public string ClientId { get; set; } = string.Empty;

    [JsonPropertyName("client")]
    public ClientDto? Client { get; set; }

    public override string ToString() => Name;
}

public class ClientDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("company_name")]
    public string CompanyName { get; set; } = string.Empty;

    public override string ToString() => CompanyName;
}

public class TaskDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "backlog";

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "medium";

    [JsonPropertyName("project_id")]
    public string ProjectId { get; set; } = string.Empty;

    [JsonPropertyName("project_name")]
    public string? ProjectName { get; set; }

    [JsonPropertyName("client_name")]
    public string? ClientName { get; set; }

    [JsonPropertyName("estimated_hours")]
    public double EstimatedHours { get; set; }

    [JsonPropertyName("due_date")]
    public string? DueDate { get; set; }

    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }

    [JsonIgnore]
    public bool IsOverdue { get; set; }

    [JsonIgnore]
    public string ScheduleBadgeText { get; set; } = string.Empty;

    [JsonIgnore]
    public string ScheduleBadgeBgColor { get; set; } = "#38151E";

    [JsonIgnore]
    public string ScheduleBadgeBorderColor { get; set; } = "#F43F5E";

    [JsonIgnore]
    public string BadgeVisibility => !string.IsNullOrEmpty(ScheduleBadgeText) ? "Visible" : "Collapsed";

    public override string ToString() => Title;
}

public class TaskStatusUpdateRequest
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "done";
}

public class ProjectCreateRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("client_id")]
    public string ClientId { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("billing_type")]
    public string BillingType { get; set; } = "hourly";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";
}

public class TaskCreateRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("project_id")]
    public string ProjectId { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("estimated_hours")]
    public double EstimatedHours { get; set; } = 0.0;

    [JsonPropertyName("due_date")]
    public string? DueDate { get; set; }
}
