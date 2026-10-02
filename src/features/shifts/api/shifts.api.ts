import { apiRequest } from '../../../shared/api/client'
import { shiftsResponseSchema } from './shifts.schemas'

export async function fetchAvailableShifts(token: string, signal?: AbortSignal) {
  return shiftsResponseSchema.parse(await apiRequest('/shifts/available', { token, signal, cache: 'no-store' }))
}
