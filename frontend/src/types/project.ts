export type TaskStatus = "backlog" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskData {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  estimated_hours: number;
  due_date?: string | null;
  checklist?: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export type ProjectBillingType = "hourly" | "fixed" | "internal";
export type ProjectStatus = "active" | "completed" | "on_hold" | "archived";

export interface ProjectClientInfo {
  id: string;
  company_name: string;
  contact_person: string;
  currency_code: string;
  hourly_rate: number;
}

export interface ProjectData {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  billing_type: ProjectBillingType;
  hourly_rate?: number | null;
  budget_amount?: number | null;
  status: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
  client?: ProjectClientInfo | null;
  tasks?: TaskData[];
  task_count: number;
  active_task_count: number;
  completed_task_count: number;
}
