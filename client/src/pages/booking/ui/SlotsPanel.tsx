import { Box, Button, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core'
import type { Day, Slot } from '../../../shared/api'
import { formatSlotRange } from '../../../shared/lib'
import { isSlotFree, visibleSlots } from '../lib/slots'
import { BookingActions } from './BookingActions'

type SlotsPanelProps = {
  day: Day | null
  selectedDate: string | null
  selectedSlot: Slot | null
  onSelectSlot: (slot: Slot) => void
  canContinue: boolean
  onContinue: () => void
  today: string
  now: string
}

// Панель «Статус слотов»: строки «09:00 - 09:30» со статусом «Свободно»/«Занято».
// Занятые приглушены и некликабельны, но из списка не исчезают; прошедшие
// сегодняшние слоты не выводятся вовсе. Внизу — «Назад» на лендинг и
// «Продолжить», активная только при выбранных типе, дате и свободном слоте.
export function SlotsPanel({
  day,
  selectedDate,
  selectedSlot,
  onSelectSlot,
  canContinue,
  onContinue,
  today,
  now,
}: SlotsPanelProps) {
  return (
    <Paper
      component="section"
      aria-label="Статус слотов"
      radius="lg"
      p="lg"
      shadow="sm"
      withBorder
      h="100%"
    >
      <Stack justify="space-between" h="100%" gap="md">
        <Box>
          {!day || !selectedDate ? (
            <Text c="dimmed">Выберите дату в календаре.</Text>
          ) : (
            <ScrollArea h={320} type="auto">
              <Stack gap="xs">
                {visibleSlots(day, today, now).map((slot) => {
                  const free = isSlotFree(slot, day.date, today, now)
                  const selected = selectedSlot?.start === slot.start

                  return (
                    <Group
                      key={slot.start}
                      justify="space-between"
                      wrap="nowrap"
                      gap="sm"
                    >
                      <Button
                        variant={selected ? 'filled' : 'light'}
                        color={selected ? 'orange' : 'gray'}
                        disabled={!free}
                        onClick={() => onSelectSlot(slot)}
                      >
                        {formatSlotRange(slot.start, slot.end)}
                      </Button>
                      <Text size="sm" c={free ? 'green' : 'dimmed'}>
                        {free ? 'Свободно' : 'Занято'}
                      </Text>
                    </Group>
                  )
                })}
              </Stack>
            </ScrollArea>
          )}
        </Box>

        <BookingActions canContinue={canContinue} onContinue={onContinue} />
      </Stack>
    </Paper>
  )
}
