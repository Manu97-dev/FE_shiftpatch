import { apiRequest } from '../../../shared/api/client'
import { agencyShiftsResponseSchema, ownAgencySchema } from './agencies.schemas'
export async function fetchAgencyShifts(agencyId: string, token: string, signal?: AbortSignal) {
  const response = agencyShiftsResponseSchema.refine((data) => data.agencyId === agencyId).parse(await apiRequest(`/agencies/${encodeURIComponent(agencyId)}/shifts`, { token, signal, cache: 'no-store' }))
  // Preserve the view model title using the authorized agency discovery endpoint.
  const own = await fetchOwnAgency(token, signal)
  return { ...response, agencyName: own.agency?.id === agencyId ? own.agency.name : response.shifts[0]?.agencyName ?? 'Agency shifts' }
}

export async function fetchOwnAgency(token: string, signal?: AbortSignal) {
  return ownAgencySchema.parse(await apiRequest('/agencies', { token, signal, cache: 'no-store' }))
}
