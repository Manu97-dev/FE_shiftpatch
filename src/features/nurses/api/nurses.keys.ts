export const nurseKeys = {
  myShifts: (userId?: string) => ['nurses', userId, 'my-shifts'] as const,
}
