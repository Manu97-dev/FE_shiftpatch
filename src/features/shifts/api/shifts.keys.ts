import type { ShiftFilters } from './shifts.api'
export const shiftKeys = {
  list: (userId?: string, filters: ShiftFilters = {}) => ['shifts', userId, 'list', filters] as const,
  available: (userId?: string) => ['shifts', userId, 'available'] as const,
}
