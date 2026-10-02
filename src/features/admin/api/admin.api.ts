import { apiRequest } from '../../../shared/api/client'
import { shiftSummarySchema, adminAgenciesSchema, adminAgencySchema, adminAgencyMemberSchema } from './admin.schemas'
export async function fetchShiftSummary(token: string, signal?: AbortSignal) {
  return shiftSummarySchema.parse(await apiRequest('/admin/shifts/summary', { token, signal, cache: 'no-store' }))
}

export async function fetchAdminAgencies(token: string, signal?: AbortSignal) {
  return adminAgenciesSchema.parse(await apiRequest('/admin/agencies', { token, signal, cache: 'no-store' }))
}
export async function createAdminAgency(input: { name: string; contactEmail: string }, token: string) {
  return adminAgencySchema.parse(await apiRequest('/admin/agencies', { method: 'POST', token, body: JSON.stringify(input) }))
}
export async function createAdminAgencyMember(agencyId: string, input: { name: string; email: string; password: string; role: 'owner' | 'manager' }, token: string) {
  return adminAgencyMemberSchema.parse(await apiRequest(`/admin/agencies/${encodeURIComponent(agencyId)}/members`, { method: 'POST', token, body: JSON.stringify(input) }))
}
