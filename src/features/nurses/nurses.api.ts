import { apiRequest } from '../../shared/api/client'
import { nurseShiftsResponseSchema } from './nurses.schemas'

export async function fetchMyShifts(token: string, signal?: AbortSignal) {
  return nurseShiftsResponseSchema.parse(await apiRequest('/nurses/me/shifts', { token, signal, cache: 'no-store' }))
}
