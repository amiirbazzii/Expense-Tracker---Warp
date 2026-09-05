"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineTokenManager } from "@/lib/auth/OfflineTokenManager";
import { clearLocalUserData } from "@/lib/localDataReset";
import { syncEngine } from "@/lib/sync/SyncEngine";
import { connectivity } from "@/lib/connectivity";

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

        // Online validation with a 2-second timeout.
        //
        // `user` is captured by this closure, so the interval below can never
        // observe a newer value — the effect re-runs instead when the query
        // resolves. Both handles are cleared on every path so repeated runs
        // don't leak timers.
        let checkInterval: ReturnType<typeof setInterval> | undefined;
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

        const validationPromise = new Promise<boolean>((resolve) => {
          if (user !== undefined) {
            resolve(true);
          } else {
            checkInterval = setInterval(() => {
              if (user !== undefined) {
                resolve(true);
              }
            }, 100);
          }
        });

        const timeoutPromise = new Promise<boolean>((resolve) => {
          timeoutHandle = setTimeout(() => resolve(false), 2000);
        });

        try {
          const validatedInTime = await Promise.race([validationPromise, timeoutPromise]);
          if (checkInterval !== undefined) clearInterval(checkInterval);
          if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);

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
                // Drop the offline identity too, or the app keeps rendering as
                // signed in (ProtectedRoute accepts the offline user) with sync
                // stopped and no way to re-authenticate. Local data and the
                // pending queue stay on disk for the next sign-in.
                setOfflineUser(null);
                setIsOfflineMode(false);
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
          if (checkInterval !== undefined) clearInterval(checkInterval);
          if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
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
    // Revoke the session on the server when it can be reached. The Convex
    // client queues mutations while disconnected and the promise never settles,
    // so awaiting it offline (or on a stalled connection) hung the sign-out
    // forever with no feedback. Offline, skip the call: the local session is
    // cleared below and the token is rotated by the next sign-in anyway.
    if (token && connectivity.isOnline) {
      try {
        await Promise.race([
          logoutMutation({ token }),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    setToken(null);
    localStorage.removeItem("auth-token");
    localStorage.removeItem("cached-user-id");
    await offlineTokenManager.clearToken();
    // Drop the locally cached financial data too — it is not scoped per user,
    // so leaving it behind exposes it to the next account signed in on this
    // device. This is the one place the pending queue is wiped: an explicit
    // sign-out. A rejected/expired token only pauses sync (OfflineFirstWrapper).
    await syncEngine.clearAndStop();
    await clearLocalUserData();
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
