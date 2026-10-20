"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { ApiError, apiRequest, API_BASE } from "@/lib/api-client"
import type { UserProfile, UserRole } from "@/types/api"

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithGoogle: (credential: string) => Promise<void>
  signInWithMock: (role?: UserRole, customData?: Partial<UserProfile>) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  error: string | null
}

// --------------------------------------------------------------------------
// Context
// --------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch current user from /api/me
  const refreshUser = useCallback(async () => {
    try {
      const profile = await apiRequest<UserProfile>("/api/me")
      setUser(profile)
      setError(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("techxetra_mock_user")
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Definitely unauthenticated
        setUser(null)
        setError(null)
      } else if (err instanceof ApiError && err.code === "NETWORK_ERROR") {
        // Backend offline (only restore cached mock in local development)
        if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
          const cached = localStorage.getItem("techxetra_mock_user")
          if (cached) {
            try {
              setUser(JSON.parse(cached))
              setError(null)
              return
            } catch {
              localStorage.removeItem("techxetra_mock_user")
            }
          }
        }
        setUser(null)
        console.warn(`[AuthProvider] Backend offline (${API_BASE}) — running in guest mode.`)
      } else {
        // Real server error (500, 502, etc.)
        const errorMsg =
          err instanceof ApiError ? err.message : "Failed to verify session"
        setError(errorMsg)
        setUser(null)
        console.warn("[AuthProvider] Session check error:", err)
      }
    }
  }, [])

  // Initial session check on mount
  useEffect(() => {
    let isSubscribed = true

    const checkSessionOnMount = async () => {
      try {
        const profile = await apiRequest<UserProfile>("/api/me")
        if (isSubscribed) {
          setUser(profile)
          setError(null)
          if (typeof window !== "undefined") {
            localStorage.removeItem("techxetra_mock_user")
          }
        }
      } catch (err) {
        if (!isSubscribed) return
        if (err instanceof ApiError && err.status === 401) {
          setUser(null)
          setError(null)
        } else if (err instanceof ApiError && err.code === "NETWORK_ERROR") {
          if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
            const cached = localStorage.getItem("techxetra_mock_user")
            if (cached) {
              try {
                setUser(JSON.parse(cached))
                setError(null)
                return
              } catch {
                localStorage.removeItem("techxetra_mock_user")
              }
            }
          }
          setUser(null)
          console.warn(`[AuthProvider] Backend offline (${API_BASE}) — running in guest mode.`)
        } else {
          const errorMsg =
            err instanceof ApiError ? err.message : "Failed to verify session"
          setError(errorMsg)
          setUser(null)
          console.warn("[AuthProvider] Session check error:", err)
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
        }
      }
    }

    checkSessionOnMount()

    return () => {
      isSubscribed = false
    }
  }, [])

  // Instant demo/development sign-in (strictly disabled in production)
  const signInWithMock = useCallback(
    (role?: UserRole, customData: Partial<UserProfile> = {}) => {
      if (process.env.NODE_ENV === "production") {
        console.warn("[AuthProvider] Mock login is disabled in production builds.")
        return
      }

      const devRole: UserRole =
        (process.env.NEXT_PUBLIC_DEV_USER_ROLE as UserRole) ||
        role ||
        "PARTICIPANT"

      const mockProfile: UserProfile = {
        id: `usr_${Date.now()}`,
        email:
          devRole === "SUPER_ADMIN"
            ? "admin@techxetra.in"
            : devRole === "LEAD" || devRole === "VOLUNTEER"
              ? "staff@techxetra.in"
              : "participant@tezu.ac.in",
        name:
          devRole === "SUPER_ADMIN"
            ? "Admin User"
            : devRole === "LEAD" || devRole === "VOLUNTEER"
              ? "Scanner Staff"
              : "Fest Attendee",
        avatar_url: null,
        phone: "+91 9876543210",
        is_student: true,
        institution_name: "Tezpur University",
        institution_id: "CSB22001",
        student_fields_locked: false,
        role: devRole,
        can_review_payments: devRole === "SUPER_ADMIN" || devRole === "LEAD",
        profile_complete: true,
        missing_fields: [],
        ...customData,
      }
      setUser(mockProfile)
      if (typeof window !== "undefined") {
        localStorage.setItem("techxetra_mock_user", JSON.stringify(mockProfile))
      }
    },
    []
  )

  // Exchange Google ID token for a session cookie
  const signInWithGoogle = useCallback(
    async (credential: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await apiRequest("/api/auth/google", {
          method: "POST",
          body: JSON.stringify({ id_token: credential }),
        })
        await refreshUser()
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Sign-in failed. Please try again."
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [refreshUser]
  )

  // Revoke session
  const signOut = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" })
    } catch {
      // Ignore logout errors — clear client state regardless
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("techxetra_mock_user")
      }
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        signInWithGoogle,
        signInWithMock,
        signOut,
        refreshUser,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>")
  }
  return ctx
}
