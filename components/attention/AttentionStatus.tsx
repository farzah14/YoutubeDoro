import type { AttentionMonitorStatus } from "@/lib/attention/attentionMonitor";

interface AttentionStatusProps {
  status: AttentionMonitorStatus;
}

const labels: Record<Exclude<AttentionMonitorStatus, "idle">, string> = {
  starting: "Camera starting",
  focused: "Focused",
  away: "Look back",
  blocked: "Camera blocked",
  unavailable: "Unavailable",
};

export function AttentionStatus({ status }: AttentionStatusProps) {
  if (status === "idle") return null;

  return (
    <p className="focus-dashboard__attention" role="status" aria-live="polite">
      {labels[status]}
    </p>
  );
}
