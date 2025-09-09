import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook to handle authentication errors and automatically logout users
 * when their token becomes invalid
 */
export function useAuthErrorHandler() {
  const { token, logout } = useAuth();

  const handleAuthError = async (error: any) => {
    // Check if the error is an authentication error
    if (error?.message?.includes('Authentication required') || 
        error?.message?.includes('authentication') ||
        (error?.status === 401)) {
      
      console.warn('Authentication error detected, logging out user');
      toast.error('Your session has expired. Please log in again.');
      
      try {
        await logout();
      } catch (logoutError) {
        console.error('Error during logout:', logoutError);
      }
      
      // Force redirect to login page
      window.location.href = '/login';
      return true; // Indicates the error was handled
    }
    
    return false; // Indicates the error was not an auth error
  };

  return {
    handleAuthError,
    isAuthenticated: !!token
  };
}