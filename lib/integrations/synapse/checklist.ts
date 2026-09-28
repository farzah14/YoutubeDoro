import { createHash } from "node:crypto";

export function synapseChecklistPrefix(sourceUserId: string): string {
  return `synapse:${createHash("sha256").update(sourceUserId).digest("hex")}:subtask:`;
}

export function sourceSubtaskId(sourceKey: string, prefix: string): string | null {
  const id = sourceKey.startsWith(prefix) ? sourceKey.slice(prefix.length) : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}
