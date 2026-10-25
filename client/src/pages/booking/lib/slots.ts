import type { Day, Slot } from '../../../shared/api'

// Единственное определение свободного слота: сервер не пометил его занятым, а
// сегодняшний слот ещё не начался. `today` и `now` — локальные настенные часы,
// поэтому слот перестаёт быть свободным сам по себе, без перезагрузки страницы.
export function isSlotFree(
  slot: Slot,
  date: string,
  today: string,
  now: string,
): boolean {
  return slot.available && (date !== today || slot.start > now)
}

// Свободные слоты дня — по тому же определению, что и у списка.
export function countAvailable(day: Day, today: string, now: string): number {
  return day.slots.filter((slot) => isSlotFree(slot, day.date, today, now))
    .length
}

// Первый день окна, в котором есть свободный слот, — его календарь подсвечивает
// сам, как только выбран тип. Нет ни одного — подсвечивать нечего.
export function firstAvailableDate(
  days: Day[],
  today: string,
  now: string,
): string | null {
  return (
    days.find((day) =>
      day.slots.some((slot) => isSlotFree(slot, day.date, today, now)),
    )?.date ?? null
  )
}

// Слоты дня для показа. Прошедшие сегодняшние слоты не выводятся вовсе:
// они не Занятые, а недоступные по времени, и третьего ярлыка для них нет.
// Занятые слоты остаются в списке — их видно, но выбрать нельзя.
export function visibleSlots(day: Day, today: string, now: string): Slot[] {
  if (day.date !== today) return day.slots
  return day.slots.filter((slot) => slot.start > now)
}
