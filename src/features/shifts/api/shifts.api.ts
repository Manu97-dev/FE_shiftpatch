import type { CreateShiftInput } from './create-shift.schemas'
import { apiRequest } from '../../../shared/api/client'
import { cancelledShiftSchema, shiftSchema, shiftsResponseSchema } from './shifts.schemas'

export async function fetchAvailableShifts(token: string, signal?: AbortSignal) {
  return shiftsResponseSchema.parse(await apiRequest('/shifts/available', { token, signal, cache: 'no-store' }))
}

export async function claimShift(shiftId: string, token: string) {
  return shiftSchema.refine((shift) => shift.id === shiftId && shift.status === 'filled' && shift.claimedBy !== null)
    .parse(await apiRequest(`/shifts/${encodeURIComponent(shiftId)}/claim`, { method: 'POST', token }))
}

export async function cancelShift(shiftId: string, token: string) {
  return cancelledShiftSchema.refine((shift) => shift.id === shiftId && shift.status === 'open' && shift.claimedBy === null && shift.cancellation.reason === 'advance')
    .parse(await apiRequest(`/shifts/${encodeURIComponent(shiftId)}/cancel`, {
      method: 'POST', token, body: JSON.stringify({ reason: 'advance' }),
    }))
}

export async function createShift(input: CreateShiftInput, token: string, agencyId: string) {
  const { role, date, startTime, endTime } = input
  return shiftSchema.refine((shift) => shift.agencyId === agencyId && shift.status === 'open' && shift.claimedBy === null)
    .parse(await apiRequest('/shifts', { method: 'POST', token, body: JSON.stringify({ role, date, startTime, endTime }) }))
}

export interface ShiftFilters {
  agencyId?: string
  status?: 'open' | 'filled'
  dateFrom?: string
  dateTo?: string
}
export async function fetchShifts(token: string, filters: ShiftFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  const query = params.toString()
  return shiftsResponseSchema.parse(await apiRequest(`/shifts${query ? `?${query}` : ''}`, { token, signal, cache: 'no-store' }))
}
