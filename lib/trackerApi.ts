import type {
  BrowserMigrationPayload,
  LearningSession,
  MigrationSummary,
  SessionFilters,
  TrackerTask,
} from "@/types/tracker";

export class TrackerApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "TrackerApiError";
  }
}

export async function trackerFetch<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // A non-JSON response is still represented by the HTTP failure below.
  }
  if (!response.ok) {
    const record = body && typeof body === "object" ? body as { error?: string; details?: unknown } : {};
    throw new TrackerApiError(response.status, record.error || "Tracker request failed", record.details);
  }
  return body as T;
}

export const trackerApi = {
  listTasks: () => trackerFetch<{ tasks: TrackerTask[] }>("/api/tracker/tasks"),
  createTask: (input: unknown) => trackerFetch<{ task: TrackerTask }>("/api/tracker/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (id: string, input: unknown) => trackerFetch<{ task: TrackerTask }>(`/api/tracker/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteTask: (id: string) => trackerFetch<{ deleted: boolean; linkedSessions: number }>(`/api/tracker/tasks/${id}`, { method: "DELETE" }),
  createSubtask: (taskId: string, input: unknown) => trackerFetch<{ subtask: unknown }>(`/api/tracker/tasks/${taskId}/subtasks`, { method: "POST", body: JSON.stringify(input) }),
  updateSubtask: (id: string, input: unknown) => trackerFetch<{ subtask: unknown }>(`/api/tracker/subtasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteSubtask: (id: string) => trackerFetch<{ deleted: boolean }>(`/api/tracker/subtasks/${id}`, { method: "DELETE" }),
  listSessions: (filters: SessionFilters = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    if (filters.taskId) query.set("taskId", filters.taskId);
    if (filters.limit) query.set("limit", String(filters.limit));
    return trackerFetch<{ sessions: LearningSession[] }>(`/api/tracker/sessions${query.size ? `?${query}` : ""}`, { signal });
  },
  createSession: (input: unknown) => trackerFetch<{ session: LearningSession }>("/api/tracker/sessions", { method: "POST", body: JSON.stringify(input) }),
  updateSession: (id: string, input: unknown) => trackerFetch<{ session: LearningSession }>(`/api/tracker/sessions/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteSession: (id: string) => trackerFetch<{ deleted: boolean }>(`/api/tracker/sessions/${id}`, { method: "DELETE" }),
  recoverSessions: () => trackerFetch<{ sessions: LearningSession[] }>("/api/tracker/sessions/recover", { method: "POST" }),
  migrate: (payload: BrowserMigrationPayload) => trackerFetch<{ summary: MigrationSummary }>("/api/tracker/migration", { method: "POST", body: JSON.stringify(payload) }),
};
