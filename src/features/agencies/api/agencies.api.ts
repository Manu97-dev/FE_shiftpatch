import { apiRequest } from '../../../shared/api/client'
import { agencyShiftsResponseSchema, ownAgencySchema } from './agencies.schemas'
export async function fetchAgencyShifts(agencyId: string, token: string, signal?: AbortSignal) {
  return agencyShiftsResponseSchema.refine((data) => data.agencyId === agencyId).parse(await apiRequest(`/agencies/${encodeURIComponent(agencyId)}/shifts`, { token, signal, cache: 'no-store' }))
}

export async function fetchOwnAgency(token: string, signal?: AbortSignal) {
  return ownAgencySchema.parse(await apiRequest('/agencies', { token, signal, cache: 'no-store' }))
}
