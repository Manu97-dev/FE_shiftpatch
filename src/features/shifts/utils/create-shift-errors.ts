import { ApiError } from '../../../shared/api/client'
export function createShiftErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'The shift details were rejected. Review the fields and try again.'
    if (error.status === 401) return 'Your session has expired. Sign in again to create a shift.'
    if (error.status === 403) return 'Your agency access has changed or been revoked. Refresh the dashboard before creating a shift.'
  }
  return 'We could not confirm whether the shift was created. Close the form and refresh the list before trying again to avoid duplicates.'
}
