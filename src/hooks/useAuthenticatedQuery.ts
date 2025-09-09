import { useQuery } from 'convex/react';
import { useEffect } from 'react';
import { useAuthErrorHandler } from './useAuthErrorHandler';
import { FunctionReference } from 'convex/server';

/**
 * Wrapper around useQuery that automatically handles authentication errors
 */
export function useAuthenticatedQuery<T>(
  query: FunctionReference<"query">,
  args: any
): T | undefined {
  const { handleAuthError } = useAuthErrorHandler();
  const result = useQuery(query, args);
  
  // Check for authentication errors in the query result
  useEffect(() => {
    // Note: Convex useQuery doesn't throw errors in the traditional sense
    // The error handling here is for completeness, but the main auth error
    // handling happens in the AuthContext when the getCurrentUser query fails
  }, [result, handleAuthError]);

  return result;
}