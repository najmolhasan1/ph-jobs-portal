// "Today" is judged in Bangladesh time, whatever timezone the server runs in.
const TZ = "Asia/Dhaka";
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in Dhaka time. */
export function dhakaDay(d: Date): string {
  return fmt.format(d);
}

export function isTodayInDhaka(d: Date | undefined): boolean {
  return Boolean(d) && dhakaDay(d!) === dhakaDay(new Date());
}

/** Midnight today, Dhaka time (UTC+6, no DST). */
export function startOfTodayDhaka(): Date {
  return new Date(`${dhakaDay(new Date())}T00:00:00+06:00`);
}

/**
 * How far back a check collects posts (Dhaka calendar days, today included). Posts stay on the
 * portal once stored; this only decides how old a post may be when it's first picked up, so a
 * worker that was off for a while catches up on what it missed.
 */
export const INGEST_DAYS = Number(process.env.INGEST_DAYS) || 3;

/** Start of the day `daysAgo` days back, Dhaka time. */
export function startOfDayDhaka(daysAgo: number): Date {
  return new Date(startOfTodayDhaka().getTime() - daysAgo * 864e5);
}
