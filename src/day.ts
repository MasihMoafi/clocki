// The focus day follows local time: it starts at local midnight, and a session running across midnight is split there.

export interface DaySession {
  start: number;
  end: number | null;
}
export interface DayState {
  date: string;
  sessions: DaySession[];
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** The local calendar date, `YYYY-MM-DD`. */
export function localDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The state for `now`: unchanged on the same day; otherwise a new day whose total starts at zero. A session still
 * running carries on from local midnight, so yesterday's total stays yesterday's.
 */
export function rollover<T extends DayState>(state: T, now: Date = new Date()): T {
  const today = localDate(now);
  if (state.date === today) return state;
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const last = state.sessions[state.sessions.length - 1];
  const running = !!last && last.end === null;
  return { ...state, date: today, sessions: running ? [{ start: midnight.getTime(), end: null }] : [] };
}
