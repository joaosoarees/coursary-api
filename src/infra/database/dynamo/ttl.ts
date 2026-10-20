export const PENDING_TTL_DAYS = 3;

const SECONDS_PER_DAY = 24 * 60 * 60;

export function expiresAtFromNow(days: number, now = Date.now()): number {
  return Math.floor(now / 1000) + days * SECONDS_PER_DAY;
}

export function nowInSeconds(now = Date.now()): number {
  return Math.floor(now / 1000);
}
