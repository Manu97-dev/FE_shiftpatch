import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/contexts/auth.context'
import { nurseKeys } from '../../nurses/api/nurses.keys'
import { shiftKeys } from '../api/shifts.keys'
import { cancelShift } from '../api/shifts.api'

export function useCancelShift() {
  const { session } = useAuth()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (shiftId: string) => {
      if (!session) throw new Error('No active session')
      return cancelShift(shiftId, session.token)
    },
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: nurseKeys.myShifts(session?.user.id), refetchType: 'all' }),
        client.invalidateQueries({ queryKey: shiftKeys.available(session?.user.id), refetchType: 'all' }),
      ])
    },
  })
}
