export const agencyKeys = {
  own: (userId?: string) => ['agencies', userId, 'own'] as const,
  shifts: (userId?: string, agencyId?: string) => ['agencies', userId, agencyId, 'shifts'] as const,
}
