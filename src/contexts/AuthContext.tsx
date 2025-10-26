"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineTokenManager } from "@/lib/auth/OfflineTokenManager";

interface User {
  _id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isOfflineMode: boolean;
  offlineGracePeriodWarning: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasSetTimeout, setHasSetTimeout] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineGracePeriodWarning, setOfflineGracePeriodWarning] = useState<string | null>(null);
  const [offlineUser, setOfflineUser] = useState<User | null>(null);

  const isOnline = useOnlineStatus();

  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);

  const user = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");

  // Initialize: Check for offline token first, then online validation
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Step 1: Check for offline token immediately
        const validation = await offlineTokenManager.validateToken();
        
        if (validation.isValid && validation.token) {
          // We have a valid offline token - login instantly
          const decryptedToken = await offlineTokenManager.getDecryptedAuthToken();
          if (decryptedToken) {
            setToken(decryptedToken);
            
            // Set offline user info immediately
            setOfflineUser({
              _id: validation.token.userId,
              username: validation.token.username
            });
            
            // Check if in grace period
            if (validation.isInGracePeriod) {
              setOfflineGracePeriodWarning(
                `You're in offline mode. Please reconnect soon to verify your account.`
              );
            }
            
            console.log('Offline login successful - instant access granted');
          }
        } else {
          // No valid offline token - check localStorage for backward compatibility
          const savedToken = localStorage.getItem("auth-token");
          if (savedToken) {
            setToken(savedToken);
          }
        }
      } catch (error) {
        console.error('Failed to initialize offline auth:', error);
        // Fallback to localStorage
        const savedToken = localStorage.getItem("auth-token");
        if (savedToken) {
          setToken(savedToken);
        }
      } finally {
        setInitialLoad(false);
      }
    };

    initializeAuth();
  }, []);

  // Background validation with 2-second timeout
  useEffect(() => {
    if (!initialLoad && token) {
      const validateInBackground = async () => {
        // If offline, skip online validation
        if (!isOnline) {
          console.log('Offline mode - skipping online validation');
          setIsOfflineMode(true);
          setLoading(false);
          return;
        }

        // Online validation with 2-second timeout
        const validationPromise = new Promise<boolean>((resolve) => {
          if (user !== undefined) {
            resolve(true);
          } else {
            // Wait for user query to resolve
            const checkInterval = setInterval(() => {
              if (user !== undefined) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 100);
          }
        });

        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 2000);
        });

        try {
          const validatedInTime = await Promise.race([validationPromise, timeoutPromise]);

          if (validatedInTime && user !== undefined) {
            if (user === null) {
              // Token is invalid
              console.warn('Token validation failed - invalid token');
              // Don't clear token immediately if offline
              if (!isOnline) {
                setIsOfflineMode(true);
              } else {
                setToken(null);
                localStorage.removeItem('auth-token');
                await offlineTokenManager.clearToken();
              }
            } else if (user) {
              // Successful validation - refresh offline token
              console.log('Token validated successfully');
              setIsOfflineMode(false);
              setOfflineGracePeriodWarning(null);
              await offlineTokenManager.updateLastValidated();
              await offlineTokenManager.refreshToken();
              localStorage.setItem('cached-user-id', user._id);
            }
          } else {
            // Timeout - continue in offline mode
            console.log('Validation timeout - continuing in offline mode');
            setIsOfflineMode(true);
          }
        } catch (error) {
          console.error('Background validation error:', error);
          setIsOfflineMode(true);
        } finally {
          setLoading(false);
        }
      };

      validateInBackground();
    } else if (!initialLoad && !token) {
      setLoading(false);
    }
  }, [token, user, initialLoad, isOnline]);

  const login = async (username: string, password: string) => {
    try {
      const result = await loginMutation({ username, password });
      setToken(result.token);
      localStorage.setItem("auth-token", result.token);
      
      // Save offline token for future offline access
      // We'll get the user ID from the query after login
      const tempUserId = result.userId || 'temp_user';
      await offlineTokenManager.saveToken(tempUserId, username, result.token);
      
      setIsOfflineMode(false);
      setOfflineGracePeriodWarning(null);
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const result = await registerMutation({ username, password });
      setToken(result.token);
      localStorage.setItem("auth-token", result.token);
      
      // Save offline token
      const tempUserId = result.userId || 'temp_user';
      await offlineTokenManager.saveToken(tempUserId, username, result.token);
      
      setIsOfflineMode(false);
      setOfflineGracePeriodWarning(null);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    setToken(null);
    localStorage.removeItem("auth-token");
    localStorage.removeItem("cached-user-id");
    await offlineTokenManager.clearToken();
    setIsOfflineMode(false);
    setOfflineGracePeriodWarning(null);
    setOfflineUser(null);
  };

  // Use offline user if in offline mode and no online user available
  const effectiveUser = user || (isOfflineMode ? offlineUser : null);

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        token,
        login,
        register,
        logout,
        loading,
        isOfflineMode,
        offlineGracePeriodWarning,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
