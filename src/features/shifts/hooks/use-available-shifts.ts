import { shiftKeys } from '../api/shifts.keys'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/contexts/auth.context'
import { fetchAvailableShifts } from '../api/shifts.api'

export function useAvailableShifts() {
  const { session } = useAuth()
  return useQuery({
    queryKey: shiftKeys.available(session?.user.id),
    queryFn: ({ signal }) => fetchAvailableShifts(session!.token, signal),
    enabled: session?.user.role === 'nurse',
    retry: false,
  })
}
