import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/contexts/auth.context'
import { fetchAgencyShifts, fetchOwnAgency } from '../api/agencies.api'
import { agencyKeys } from '../api/agencies.keys'
export function useAgencyShifts(agencyId: string) {
  const { session } = useAuth()
  return useQuery({ queryKey: agencyKeys.shifts(session?.user.id, agencyId), queryFn: ({ signal }) => fetchAgencyShifts(agencyId, session!.token, signal), enabled: session?.user.role === 'agency', retry: false })
}

export function useOwnAgency() {
  const { session } = useAuth()
  return useQuery({ queryKey: agencyKeys.own(session?.user.id), queryFn: ({ signal }) => fetchOwnAgency(session!.token, signal), enabled: session?.user.role === 'agency', retry: false })
}
