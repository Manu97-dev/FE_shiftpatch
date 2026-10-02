import { nurseKeys } from '../api/nurses.keys'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/contexts/auth.context'
import { fetchMyShifts } from '../api/nurses.api'

export function useMyShifts() {
  const { session } = useAuth()
  return useQuery({
    queryKey: nurseKeys.myShifts(session?.user.id),
    queryFn: ({ signal }) => fetchMyShifts(session!.token, signal),
    enabled: session?.user.role === 'nurse',
    retry: false,
  })
}
