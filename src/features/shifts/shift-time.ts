import type { Shift } from './shifts.schemas'

// The API explicitly returns local dates and times in America/Tegucigalpa (UTC-06).
export function shiftTimes(shift: Shift) {
  const start = new Date(`${shift.date}T${shift.startTime}:00-06:00`)
  const end = new Date(`${shift.date}T${shift.endTime}:00-06:00`)
  const overnight = shift.endTime < shift.startTime
  if (overnight) end.setTime(end.getTime() + 24 * 60 * 60 * 1000)
  return { start, end, overnight }
}

export const shiftDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Tegucigalpa', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
})
export const shiftTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Tegucigalpa', hour: 'numeric', minute: '2-digit',
})
