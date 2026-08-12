export type ReplayMode = "free" | "paid" | "restricted" | "unavailable";
export type EventState = "upcoming" | "live" | "replay" | "ended";

export function getEventState(
  event: { startDate: Date; replayAvailable: boolean; replayMode: ReplayMode },
  now = new Date()
): EventState {
  const start = event.startDate.getTime();
  const liveWindowEnd = start + 3 * 60 * 60 * 1000;
  if (now.getTime() < start) return "upcoming";
  if (now.getTime() < liveWindowEnd) return "live";
  if (event.replayAvailable && event.replayMode !== "unavailable") return "replay";
  return "ended";
}

export function safeStudentName(name: string | null) {
  if (!name?.trim()) return "BuduTech Student";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

export function referralAttributionIssue(input: {
  referrerUserId: number | null;
  currentUserId: number;
  alreadyAttributed: boolean;
  hasExistingRecord: boolean;
}) {
  if (!input.referrerUserId) return "invalid" as const;
  if (input.referrerUserId === input.currentUserId) return "self" as const;
  if (input.alreadyAttributed || input.hasExistingRecord) return "duplicate" as const;
  return null;
}
