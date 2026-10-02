export const adminKeys = { agencies: (userId?: string) => ['admin', userId, 'agencies'] as const, summary: (userId?: string) => ['admin', userId, 'shift-summary'] as const }
