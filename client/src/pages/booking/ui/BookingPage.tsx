import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Container, Grid, Paper, Stack, Text, Title } from '@mantine/core'
import {
  errorMessage,
  eventTypeSlotsList,
  eventTypesList,
  unwrap,
} from '../../../shared/api'
import type { Day, EventType, Slot } from '../../../shared/api'
import { currentTimeString, todayString } from '../../../shared/lib'
import { ListState } from '../../../shared/ui'
import {
  countAvailable,
  firstAvailableDate,
  isSlotFree,
} from '../lib/slots'
import { BookingActions } from './BookingActions'
import { CalendarPanel } from './CalendarPanel'
import { ConfirmPanel } from './ConfirmPanel'
import { EventTypePicker } from './EventTypePicker'
import { InfoPanel } from './InfoPanel'
import { SlotsPanel } from './SlotsPanel'
import { SuccessPanel } from './SuccessPanel'

// Экран записи на звонок. Шаги гостевого потока — состояния одного маршрута
// `/booking`; этот срез покрывает выбор типа, даты и слота. Выбор живёт в
// состоянии страницы, не в URL: перезагрузка — чистый старт.
export function BookingPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [typesError, setTypesError] = useState<string | null>(null)

  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(
    null,
  )
  const [slotsDays, setSlotsDays] = useState<Day[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  // Шаг гостевого потока — состояние страницы, не URL: `/booking` — один маршрут.
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select')
  // Имя и email живут на странице: после `409` гость возвращается к выбору слота,
  // и форма подтверждения должна открыться с уже введёнными данными.
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  // Текущий момент — состояние, а не снимок при рендере: тик перерисовывает
  // страницу, и прошедшие слоты перестают быть свободными без перезагрузки.
  const [now, setNow] = useState(() => new Date())
  const today = todayString(now)
  const nowTime = currentTimeString(now)

  const slotsRequestId = useRef(0)
  // Дата, для которой загружена текущая сетка: после полуночи окно записи
  // сдвигается, и его нужно запросить заново.
  const loadedDate = useRef<string | null>(null)
  const selectedDateRef = useRef<string | null>(null)

  const selectedEventType =
    eventTypes.find((eventType) => eventType.id === selectedEventTypeId) ?? null
  const selectedDay =
    slotsDays.find((day) => day.date === selectedDate) ?? null
  // Снимок выбранного слота мог устареть после фонового обновления: сверяем его
  // с актуальной сеткой по `start`, а не доверяем сохранённому объекту.
  const gridSlot =
    selectedSlot !== null && selectedDay !== null
      ? (selectedDay.slots.find((slot) => slot.start === selectedSlot.start) ??
        null)
      : null
  // Выбранный слот действителен, только пока он свободен в текущей сетке и по
  // текущему времени. Истёкший или занятый слот не считается выбранным:
  // «Продолжить» гаснет, а панель «Информация» показывает «Время не выбрано».
  const activeSlot =
    gridSlot !== null &&
    selectedDate !== null &&
    isSlotFree(gridSlot, selectedDate, today, nowTime)
      ? gridSlot
      : null

  // Первый setState — уже после `await`: правило react(set-state-in-effect)
  // не срабатывает.
  const loadEventTypes = useCallback(async () => {
    try {
      const data = await unwrap(eventTypesList({ throwOnError: true }))
      setEventTypes(data.eventTypes)
      setTypesError(null)
    } catch (caught) {
      setTypesError(errorMessage(caught, 'Не удалось загрузить типы событий'))
    } finally {
      setTypesLoading(false)
    }
  }, [])

  const loadSlots = useCallback(
    async (id: number, { silent = false }: { silent?: boolean } = {}) => {
      // Номер запроса: при быстрой смене типа ответ на прежний тип приходит позже
      // и не должен перетирать сетку нового.
      const requestId = slotsRequestId.current + 1
      slotsRequestId.current = requestId

      try {
        const data = await unwrap(
          eventTypeSlotsList({ path: { id: String(id) }, throwOnError: true }),
        )
        if (requestId !== slotsRequestId.current) return

        // Свежий момент после ответа: дата подсветки и часы не расходятся.
        const loadedAt = new Date()
        const loadedToday = todayString(loadedAt)
        const loadedNow = currentTimeString(loadedAt)

        setSlotsDays(data.days)
        setNow(loadedAt)
        loadedDate.current = loadedToday

        // Дата подсвечивается сама, только если ещё не выбрана: смена типа
        // сохраняет выбранную дату, а слот сбрасывает. После полуночи прежняя
        // дата выпадает из окна — берём первый свободный день нового окна.
        const previousDate = selectedDateRef.current
        const nextDate =
          previousDate !== null &&
          data.days.some((day) => day.date === previousDate)
            ? previousDate
            : firstAvailableDate(data.days, loadedToday, loadedNow)

        if (nextDate !== previousDate) {
          selectedDateRef.current = nextDate
          setSelectedSlot(null)
        }
        setSelectedDate(nextDate)
        setSlotsError(null)
      } catch (caught) {
        if (requestId !== slotsRequestId.current) return
        // Фоновое обновление не затирает рабочую сетку ошибкой.
        if (!silent) {
          setSlotsError(errorMessage(caught, 'Не удалось загрузить слоты'))
        }
      } finally {
        if (requestId === slotsRequestId.current) setSlotsLoading(false)
      }
    },
    [],
  )

  const reloadEventTypes = useCallback(() => {
    setTypesLoading(true)
    setTypesError(null)
    void loadEventTypes()
  }, [loadEventTypes])

  const reloadSlots = useCallback(() => {
    if (selectedEventTypeId === null) return
    setSlotsLoading(true)
    setSlotsError(null)
    void loadSlots(selectedEventTypeId)
  }, [loadSlots, selectedEventTypeId])

  // Слот заняли, пока гость заполнял форму: возвращаем к выбору слота, сбрасываем
  // слот и перезагружаем сетку. Тип, дата, имя и email сохраняются — гость
  // выбирает новый слот и продолжает, не вводя данные заново.
  const handleSlotTaken = useCallback(() => {
    setSelectedSlot(null)
    setStep('select')
    reloadSlots()
  }, [reloadSlots])

  // Успех: показываем карточку подтверждения. Слот не сбрасываем — его сбросит
  // «Забронировать ещё», когда гость вернётся к выбору.
  const handleSuccess = useCallback(() => setStep('success'), [])

  // «Забронировать ещё»: возврат к выбору, тип и дата сохраняются, слот и данные
  // гостя сбрасываются, сетка перезагружается (только что забронированный слот —
  // «Занято»).
  const handleBookAgain = useCallback(() => {
    setSelectedSlot(null)
    setGuestName('')
    setGuestEmail('')
    setStep('select')
    reloadSlots()
  }, [reloadSlots])

  const selectEventType = useCallback(
    (id: number) => {
      if (id === selectedEventTypeId) return
      setSelectedEventTypeId(id)
      setSelectedSlot(null)
      setSlotsDays([])
      setSlotsLoading(true)
      setSlotsError(null)
      setStep('select')
    },
    [selectedEventTypeId],
  )

  const selectDate = useCallback((date: string) => {
    selectedDateRef.current = date
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep('select')
  }, [])

  // Выбор слота всегда возвращает на шаг выбора: после истечения слота на
  // подтверждении «Продолжить» нужно нажать заново.
  const selectSlot = useCallback((slot: Slot) => {
    setSelectedSlot(slot)
    setStep('select')
  }, [])

  // Значения формы подтверждения поднимаются на страницу, чтобы пережить
  // возврат к выбору слота.
  const handleGuestChange = useCallback(
    (values: { guestName: string; guestEmail: string }) => {
      setGuestName(values.guestName)
      setGuestEmail(values.guestEmail)
    },
    [],
  )

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- первичная загрузка списка; состояние ставится уже после await
    void loadEventTypes()
  }, [loadEventTypes])

  useEffect(() => {
    if (selectedEventTypeId === null) return
    // oxlint-disable-next-line react/set-state-in-effect -- сетка слотов выбранного типа; состояние ставится уже после await
    void loadSlots(selectedEventTypeId)
  }, [selectedEventTypeId, loadSlots])

  // Часы страницы: не реже раза в минуту пересчитываем свободность слотов.
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  // Полночь: окно записи сдвинулось — при следующем тике перезапрашиваем сетку.
  useEffect(() => {
    if (selectedEventTypeId === null) return
    if (loadedDate.current === null || loadedDate.current === today) return
    // oxlint-disable-next-line react/set-state-in-effect -- состояние ставится уже после await фонового запроса
    void loadSlots(selectedEventTypeId, { silent: true })
  }, [today, selectedEventTypeId, loadSlots])

  // Возврат фокуса или видимости вкладки: обновляем часы и занятость без
  // спиннера. Сбой фонового запроса не затирает рабочую сетку ошибкой.
  useEffect(() => {
    const refresh = () => {
      setNow(new Date())
      if (selectedEventTypeId === null) return
      void loadSlots(selectedEventTypeId, { silent: true })
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [loadSlots, selectedEventTypeId])

  // Почему сохранённый выбор больше не доступен: время слота прошло или его
  // заняли после фонового обновления — это разные сообщения. Имя и email
  // остаются в состоянии страницы, гость выбирает другой слот.
  const unavailableReason =
    selectedSlot !== null && selectedDate !== null && activeSlot === null
      ? selectedDate === today && selectedSlot.start <= nowTime
        ? 'expired'
        : 'taken'
      : null
  const freeCount = selectedDay ? countAvailable(selectedDay, today, nowTime) : 0
  const canContinue =
    selectedEventType !== null && selectedDate !== null && activeSlot !== null

  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>Запись на звонок</Title>

        <ListState
          loading={typesLoading}
          error={typesError}
          onRetry={reloadEventTypes}
        >
          <EventTypePicker
            eventTypes={eventTypes}
            selectedId={selectedEventTypeId}
            onSelect={selectEventType}
            onReload={reloadEventTypes}
          />
        </ListState>

        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <InfoPanel
              eventType={selectedEventType}
              selectedDate={selectedDate}
              selectedSlot={activeSlot}
              freeCount={freeCount}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            {typesError ? null : selectedEventType === null ? (
              <Paper radius="lg" p="xl" shadow="sm" withBorder h="100%">
                <Stack justify="space-between" h="100%" gap="md">
                  <Text c="dimmed">Выберите тип события</Text>
                  <BookingActions canContinue={false} />
                </Stack>
              </Paper>
            ) : step === 'success' ? (
              <SuccessPanel onBookAgain={handleBookAgain} />
            ) : step === 'confirm' &&
              selectedDate !== null &&
              activeSlot !== null ? (
              <ConfirmPanel
                eventType={selectedEventType}
                date={selectedDate}
                slot={activeSlot}
                guestName={guestName}
                guestEmail={guestEmail}
                onGuestChange={handleGuestChange}
                onEdit={() => setStep('select')}
                onSlotTaken={handleSlotTaken}
                onSuccess={handleSuccess}
              />
            ) : (
              <Stack gap="md">
                {unavailableReason !== null && (
                  <Alert
                    color="yellow"
                    title={
                      unavailableReason === 'expired'
                        ? 'Время слота прошло'
                        : 'Слот занят'
                    }
                  >
                    {unavailableReason === 'expired'
                      ? 'Это время уже прошло. Выберите другой слот.'
                      : 'Это время уже занято. Выберите другой слот.'}
                  </Alert>
                )}
                <ListState
                  loading={slotsLoading}
                  error={slotsError}
                  onRetry={reloadSlots}
                >
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <CalendarPanel
                        days={slotsDays}
                        selectedDate={selectedDate}
                        onSelectDate={selectDate}
                        today={today}
                        now={nowTime}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <SlotsPanel
                        day={selectedDay}
                        selectedDate={selectedDate}
                        selectedSlot={activeSlot}
                        onSelectSlot={selectSlot}
                        canContinue={canContinue}
                        onContinue={() => setStep('confirm')}
                        today={today}
                        now={nowTime}
                      />
                    </Grid.Col>
                  </Grid>
                </ListState>
              </Stack>
            )}
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}
