import type { Day, Slot } from '../../../shared/api'
import {
  countAvailable,
  firstAvailableDate,
  isSlotFree,
  visibleSlots,
} from './slots'

function slot(start: string, available: boolean): Slot {
  return { start, end: `${start.slice(0, 2)}:30`, available }
}

function day(date: string, slots: Slot[]): Day {
  return { date, slots }
}

const TODAY = '2026-10-15'
const TOMORROW = '2026-10-16'

describe('booking slot helpers', () => {
  it('считает слот свободным, только если он не занят и ещё не начался', () => {
    expect(isSlotFree(slot('11:00', true), TODAY, TODAY, '10:59')).toBe(true)
    expect(isSlotFree(slot('11:00', true), TODAY, TODAY, '11:00')).toBe(false)
    expect(isSlotFree(slot('11:00', true), TODAY, TODAY, '11:01')).toBe(false)
    expect(isSlotFree(slot('11:00', false), TODAY, TODAY, '10:59')).toBe(false)
  })

  it('в другие дни свободность зависит только от занятости', () => {
    expect(isSlotFree(slot('09:00', true), TOMORROW, TODAY, '23:59')).toBe(true)
    expect(isSlotFree(slot('09:00', false), TOMORROW, TODAY, '23:59')).toBe(false)
  })

  it('считает свободные слоты дня', () => {
    const d = day(TODAY, [
      slot('09:00', true),
      slot('09:30', false),
      slot('10:00', true),
    ])

    expect(countAvailable(d, TODAY, '09:00')).toBe(1)
  })

  it('не считает свободным сегодняшний слот с началом в прошлом', () => {
    const d = day(TODAY, [slot('11:00', true), slot('12:00', true)])

    expect(countAvailable(d, TODAY, '10:59')).toBe(2)
    expect(countAvailable(d, TODAY, '11:00')).toBe(1)
    expect(countAvailable(d, TODAY, '12:30')).toBe(0)
  })

  it('завтрашние слоты считает независимо от текущего времени', () => {
    const d = day(TOMORROW, [slot('09:00', true), slot('09:30', false)])

    expect(countAvailable(d, TODAY, '23:59')).toBe(1)
  })

  it('находит первый день окна со свободным слотом', () => {
    const days = [
      day(TODAY, [slot('09:00', false)]),
      day(TOMORROW, [slot('09:00', false), slot('09:30', true)]),
      day('2026-10-17', [slot('09:00', true)]),
    ]

    expect(firstAvailableDate(days, TODAY, '09:00')).toBe(TOMORROW)
  })

  it('пропускает сегодняшний день, где все свободные слоты уже прошли', () => {
    const days = [
      day(TODAY, [slot('11:00', true), slot('12:00', true)]),
      day(TOMORROW, [slot('09:00', true)]),
    ]

    expect(firstAvailableDate(days, TODAY, '10:59')).toBe(TODAY)
    expect(firstAvailableDate(days, TODAY, '12:00')).toBe(TOMORROW)
  })

  it('возвращает null, когда свободных слотов нет ни в один день', () => {
    const days = [day(TODAY, [slot('09:00', false)])]

    expect(firstAvailableDate(days, TODAY, '09:00')).toBeNull()
  })

  it('скрывает прошедшие слоты сегодняшнего дня, включая начавшийся', () => {
    const d = day(TODAY, [
      slot('09:00', false),
      slot('10:00', true),
      slot('11:00', true),
    ])

    expect(visibleSlots(d, TODAY, '10:00').map((s) => s.start)).toEqual(['11:00'])
  })

  it('в другие дни показывает все слоты, включая занятые', () => {
    const d = day(TOMORROW, [slot('09:00', false), slot('10:00', true)])

    expect(visibleSlots(d, TODAY, '10:00')).toHaveLength(2)
  })
})
