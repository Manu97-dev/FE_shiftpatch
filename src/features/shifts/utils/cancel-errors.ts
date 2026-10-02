import { ApiError } from '../../../shared/api/client'

export function cancelErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: return 'This cancellation request is invalid. Refresh your shifts and try again.'
      case 401: return 'Your session has expired. Sign in again to cancel a shift.'
      case 403: return 'You can only cancel a shift assigned to you. Refresh your shifts before trying again.'
      case 404: return 'This shift no longer exists. The list has been refreshed.'
      case 409: return 'This shift has already been reopened. The list has been refreshed.'
    }
  }
  return 'We could not confirm your cancellation. Close this dialog and refresh your shifts before trying again.'
}
