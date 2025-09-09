"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasSetTimeout, setHasSetTimeout] = useState(false);

  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);

  const user = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");

  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem("auth-token");
    if (savedToken) {
      setToken(savedToken);
    }
    setInitialLoad(false);
  }, []);

  // Update loading state when user query resolves or when we have no token
  useEffect(() => {
    if (!initialLoad) {
      if (!token) {
        // No token, not loading
        setLoading(false);
        setHasSetTimeout(false);
      } else {
        // Have token - check if user query has resolved
        if (user !== undefined) {
          // Query resolved (either with user data or null)
          if (user === null) {
            // User query returned null - token is invalid
            console.warn('Token appears to be invalid, clearing auth state');
            setToken(null);
            localStorage.removeItem('auth-token');
          }
          setLoading(false);
          setHasSetTimeout(false);
        } else if (!hasSetTimeout) {
          // Check if we're offline
          if (!navigator.onLine) {
            // If offline and we have a token, assume user is authenticated
            console.log('AuthContext: Offline mode - keeping token and stopping loading');
            setLoading(false);
            setHasSetTimeout(false);
            return;
          }
          
          // Query still loading and we haven't set a timeout yet
          setHasSetTimeout(true);
          const timeoutId = setTimeout(() => {
            console.warn('Auth query timeout after 5 seconds, checking if offline');
            if (!navigator.onLine) {
              // If offline, keep the token and stop loading
              console.log('AuthContext: Timeout while offline - keeping authentication state');
              setLoading(false);
            } else {
              // If online but query failed, token may be invalid
              console.warn('Clearing invalid token after timeout');
              setToken(null);
              localStorage.removeItem('auth-token');
              setLoading(false);
            }
            setHasSetTimeout(false);
          }, 5000); // Reduced to 5 seconds for faster response
          
          return () => {
            clearTimeout(timeoutId);
            setHasSetTimeout(false);
          };
        }
      }
    }
  }, [token, user, initialLoad, hasSetTimeout]);

  const login = async (username: string, password: string) => {
    try {
      const result = await loginMutation({ username, password });
      setToken(result.token);
      localStorage.setItem("auth-token", result.token);
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const result = await registerMutation({ username, password });
      setToken(result.token);
      localStorage.setItem("auth-token", result.token);
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
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        token,
        login,
        register,
        logout,
        loading,
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
