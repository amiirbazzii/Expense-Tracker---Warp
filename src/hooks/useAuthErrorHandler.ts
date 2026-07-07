import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle authentication errors and automatically logout users
 * when their token becomes invalid
 */
export function useAuthErrorHandler() {
  const { token, logout } = useAuth();
  const router = useRouter();

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
      
      // Client-side redirect — keeps the SPA alive and works offline
      router.push('/login');
      return true; // Indicates the error was handled
    }
    
    return false; // Indicates the error was not an auth error
  };

  return {
    handleAuthError,
    isAuthenticated: !!token
  };
}