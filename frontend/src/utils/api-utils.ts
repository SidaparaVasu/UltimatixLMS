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
export const handleApiResponse = <T>(response: ApiResponse<T>): T | null => {
  const { showNotification } = useNotificationStore.getState();

  if (response.success) {
    if (response.message) {
      showNotification(response.message, 'success');
    }
    return response.data ?? (true as unknown as T);
  } else {
    const errorMsg = response.message || 'An unexpected error occurred.';
    showNotification(errorMsg, 'error');
    
    // Log detailed validation errors if present
    if (response.errors) {
      console.error('API Validation Errors:', response.errors);
    }
    return null;
  }
};

/**
 * Standard error handler for caught exceptions in API calls.
 */
export const handleApiError = (error: any) => {
  const { showNotification } = useNotificationStore.getState();
  
  const message = error.response?.data?.message || error.message || 'Connection to server failed.';
  showNotification(message, 'error');
  
  throw error;
};
