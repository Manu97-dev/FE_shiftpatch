import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/contexts/auth.context'
import { fetchShifts, type ShiftFilters } from '../../shifts/api/shifts.api'
import { shiftKeys } from '../../shifts/api/shifts.keys'
import { fetchShiftSummary } from '../api/admin.api'
import { adminKeys } from '../api/admin.keys'
export function useAdminShifts(filters: ShiftFilters = {}) {
  const { session } = useAuth()
  return useQuery({ queryKey: shiftKeys.list(session?.user.id, filters), queryFn: ({ signal }) => fetchShifts(session!.token, filters, signal), enabled: session?.user.role === 'admin', retry: false })
}
export function useAdminSummary() {
  const { session } = useAuth()
  return useQuery({ queryKey: adminKeys.summary(session?.user.id), queryFn: ({ signal }) => fetchShiftSummary(session!.token, signal), enabled: session?.user.role === 'admin', retry: false })
}
