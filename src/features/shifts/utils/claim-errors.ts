import { ApiError } from '../../../shared/api/client'

export function claimErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400: return 'This shift request is invalid. Refresh the list and try again.'
      case 401: return 'Your session has expired. Sign in again to claim a shift.'
      case 403: return error.message === 'Credential expired, cannot claim shift'
        ? 'Your credentials have expired. You cannot claim this shift.'
        : 'Your account is not permitted to claim this shift. Please contact your administrator.'
      case 404: return 'This shift is no longer available. The list has been refreshed.'
      case 409: return error.message === 'Shift has started, cannot claim shift'
        ? 'This shift has already started and can no longer be claimed.'
        : 'Another nurse has already claimed this shift. The list has been refreshed.'
      default: return 'We could not confirm your claim. Close this dialog and refresh your shifts before trying again.'
    }
  }
  return 'We could not confirm your claim. Check your connection, then close this dialog and refresh your shifts before trying again.'
}
