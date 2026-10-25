// Время как локальное настенное (ADR 0002): даты — строки `YYYY-MM-DD`,
// время суток — минуты от полуночи. Никаких конверсий между таймзонами.

// Рабочий день — константа 09:00–18:00 (docs/spec.md).
export const WORKDAY_START_MINUTES = 9 * 60;
export const WORKDAY_END_MINUTES = 18 * 60;

// Окно записи — 14 календарных дней `[сегодня … сегодня + 13]`.
export const BOOKING_WINDOW_DAYS = 14;

// Длительность слота — константа: слоты по 30 минут (docs/spec.md). И она же —
// длина интервала брони; отдельного поля длительности у типа события нет.
export const SLOT_MINUTES = 30;

// Локальная календарная дата (`YYYY-MM-DD`) инстанта.
export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Минуты от полуночи инстанта — «сейчас» на настенных часах.
export function toMinutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Прибавляет дни к дате `YYYY-MM-DD`. Арифметика ведётся в UTC, чтобы переход
// на летнее время не сдвигал календарный день.
export function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, '0');

  return `${shifted.getUTCFullYear()}-${shiftedMonth}-${shiftedDay}`;
}

// Существует ли календарная дата `YYYY-MM-DD`: схема проверяет только форму
// строки, поэтому `2026-10-32` или `2026-02-30` нужно отсекать отдельно.
export function isCalendarDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) return false;

  // День 0 следующего месяца — последний день текущего. `setUTCFullYear`
  // (а не `Date.UTC`) нужен, чтобы годы 0–99 не превращались в 1900–1999.
  const lastDayOfMonth = new Date(0);
  lastDayOfMonth.setUTCFullYear(year, month, 0);

  return day <= lastDayOfMonth.getUTCDate();
}

// `HH:MM` → минуты от полуночи. Формат гарантирован схемой контракта,
// поэтому разбор без проверок.
export function parseTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);

  return hours * 60 + minutes;
}

// Минуты от полуночи → `HH:MM`.
export function toTimeString(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');

  return `${hours}:${mins}`;
}
