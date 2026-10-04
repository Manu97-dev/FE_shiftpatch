import { describe, expect, it } from 'vitest'
import { agencyShiftsResponseSchema } from './agencies.schemas'

describe('agency shifts acceptance response', () => {
  it('accepts the exact response without top-level agencyName', () => {
    const response = { agencyId: '10000000-0000-4000-8000-000000000001', shifts: [] }
    expect(agencyShiftsResponseSchema.parse(response)).toEqual(response)
  })
  it('rejects shifts belonging to a different agency', () => {
    expect(agencyShiftsResponseSchema.safeParse({ agencyId: '10000000-0000-4000-8000-000000000001', shifts: [{
      id: '40000000-0000-4000-8000-000000000001', agencyId: '10000000-0000-4000-8000-000000000002', agencyName: 'Other', role: 'RN', date: '2099-01-01', startTime: '19:00', endTime: '07:00', status: 'open', claimedBy: null,
    }] }).success).toBe(false)
  })
})
