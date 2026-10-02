import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import { agencyKeys } from '../../agencies/api/agencies.keys'
import { fetchOwnAgency } from '../../agencies/api/agencies.api'
import { createShift } from '../api/shifts.api'
import type { CreateShiftInput } from '../api/create-shift.schemas'
export function useCreateShift(agencyId: string) {
  const { session } = useAuth()
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: CreateShiftInput) => {
      if (session?.user.role !== 'agency') throw new ApiError(403, 'Forbidden')
      const current = await fetchOwnAgency(session.token)
      if (current.agency?.id !== agencyId) throw new ApiError(403, 'Agency membership changed')
      return createShift(input, session.token, agencyId)
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: agencyKeys.shifts(session?.user.id, agencyId), refetchType: 'all' }),
        client.invalidateQueries({ queryKey: ['shifts'], refetchType: 'all' }),
      ])
    },
    onError: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: agencyKeys.own(session?.user.id), refetchType: 'all' }),
        client.invalidateQueries({ queryKey: agencyKeys.shifts(session?.user.id, agencyId), refetchType: 'all' }),
        client.invalidateQueries({ queryKey: ['shifts'], refetchType: 'all' }),
      ])
    },
  })
}
