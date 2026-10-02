import { apiRequest } from '../../../shared/api/client'
import { shiftSummarySchema } from './admin.schemas'
export async function fetchShiftSummary(token: string, signal?: AbortSignal) {
  return shiftSummarySchema.parse(await apiRequest('/admin/shifts/summary', { token, signal, cache: 'no-store' }))
}
