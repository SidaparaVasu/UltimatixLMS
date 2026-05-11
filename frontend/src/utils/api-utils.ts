import { useNotificationStore } from '@/stores/notificationStore';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Handles standardized backend responses and triggers global toasts.
 * Returns the data payload if successful, or null if failed.
 */
export const handleApiResponse = <T>(response: ApiResponse<T>, notify: boolean = true): T | null => {
  const { showNotification } = useNotificationStore.getState();

  if (response.success) {
    if (notify && response.message) {
      showNotification(response.message, 'success');
    }
    return response.data ?? (true as unknown as T);
  } else {
    // If field-level validation errors are present, surface them directly
    // instead of the generic "Validation failed" message.
    let errorMsg = response.message || 'An unexpected error occurred.';
    if (response.errors) {
      const fieldMessages = Object.values(response.errors).flat();
      if (fieldMessages.length > 0) {
        errorMsg = fieldMessages.join(' ');
      }
      console.error('API Validation Errors:', response.errors);
    }
    if (notify) {
      showNotification(errorMsg, 'error');
    }
    return null;
  }
};

/**
 * Standard error handler for caught exceptions in API calls.
 * For validation errors (400), surfaces field-level messages from `errors`
 * instead of the generic top-level message.
 */
export const handleApiError = (error: any) => {
  const { showNotification } = useNotificationStore.getState();

  const data = error.response?.data;

  // If the backend returned field-level validation errors, join and show them
  if (data?.errors) {
    const fieldMessages = Object.values(data.errors as Record<string, string[]>).flat();
    if (fieldMessages.length > 0) {
      showNotification(fieldMessages.join(' '), 'error');
      throw error;
    }
  }

  const message = data?.message || error.message || 'Connection to server failed.';
  showNotification(message, 'error');
  
  throw error;
};
