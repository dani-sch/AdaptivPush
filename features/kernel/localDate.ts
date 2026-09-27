export type LocalDate = string & { readonly __brand: 'LocalDate' };

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function asLocalDate(value: string): LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) throw new Error('LocalDate must be YYYY-MM-DD');
  const [yStr, mStr, dStr] = value.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || y < 1900 || y > 9999) throw new Error('LocalDate year out of range');
  if (!(m >= 1 && m <= 12)) throw new Error('LocalDate month out of range');
  if (!(d >= 1 && d <= 31)) throw new Error('LocalDate day out of range');
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) {
    throw new Error('LocalDate is not a real calendar date');
  }
  return value as LocalDate;
}

export function localDateToParts(value: LocalDate) {
  const [y, m, d] = value.split('-').map((s) => Number(s));
  return { year: y, month: m, day: d };
}

export function validateTimeZone(timeZone: string): void {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false });
    dtf.formatToParts(new Date());
  } catch (err) {
    throw new Error(`Invalid IANA time zone: ${timeZone}`);
  }
}

function formatLocalParts(epochMs: number, dtf: Intl.DateTimeFormat) {
  const parts = dtf.formatToParts(new Date(epochMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return {
    year: Number(get('year') ?? 0),
    month: Number(get('month') ?? 0),
    day: Number(get('day') ?? 0),
    hour: Number(get('hour') ?? 0),
    minute: Number(get('minute') ?? 0),
    second: Number(get('second') ?? 0),
  };
}

export function toUtcDateFromLocal(value: LocalDate, timeZone: string, time = '00:00') {
  validateTimeZone(timeZone);
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('time must be HH:MM');
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('hour out of range');
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('minute out of range');
  const { year, month, day } = localDateToParts(value);

  const target = { year, month, day, hour, minute, second: 0 };
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const candidates: number[] = [];
  // Offset candidates cover the IANA UTC-12 through UTC+14 range, including quarter-hour offsets.
  for (let offsetMin = -12 * 60; offsetMin <= 14 * 60; offsetMin += 15) {
    const epochGuess = Date.UTC(year, month - 1, day, hour, minute) - offsetMin * 60000;
    const parts = formatLocalParts(epochGuess, dtf);
    if (
      parts.year === target.year &&
      parts.month === target.month &&
      parts.day === target.day &&
      parts.hour === target.hour &&
      parts.minute === target.minute
    ) {
      candidates.push(epochGuess);
    }
  }

  if (candidates.length === 0) {
    throw new Error('Local time falls in a DST gap and is invalid in the specified timezone');
  }
  candidates.sort((a, b) => a - b);
  const chosen = candidates[0];
  return new Date(chosen);
}

export const LOCAL_DATE_MIN = asLocalDate('1900-01-01');
export const LOCAL_DATE_MAX = asLocalDate('9999-12-31');
