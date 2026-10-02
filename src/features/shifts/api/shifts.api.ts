import { apiRequest } from '../../../shared/api/client'
import { shiftSchema, shiftsResponseSchema } from './shifts.schemas'

export async function fetchAvailableShifts(token: string, signal?: AbortSignal) {
  return shiftsResponseSchema.parse(await apiRequest('/shifts/available', { token, signal, cache: 'no-store' }))
}

export async function claimShift(shiftId: string, token: string) {
  return shiftSchema.refine((shift) => shift.id === shiftId && shift.status === 'filled' && shift.claimedBy !== null)
    .parse(await apiRequest(`/shifts/${encodeURIComponent(shiftId)}/claim`, { method: 'POST', token }))
}
