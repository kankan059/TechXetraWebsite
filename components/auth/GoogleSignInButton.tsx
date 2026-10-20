"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string
              size?: string
              shape?: string
              width?: number
              text?: string
            }
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  onError?: (message: string) => void
  width?: number
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  width = 280,
}: GoogleSignInButtonProps) {
  const { signInWithGoogle, signInWithMock } = useAuth()
  const buttonRef = useRef<HTMLDivElement>(null)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
  const hasClientId = Boolean(clientId)
  const isDev = process.env.NODE_ENV === "development"

  const [isLoadingScript, setIsLoadingScript] = useState(hasClientId)

  useEffect(() => {
    if (!clientId) return

    const initButton = () => {
      if (!window.google || !buttonRef.current) return
      setIsLoadingScript(false)

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              await signInWithGoogle(credential)
              onSuccess?.()
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : "Sign-in failed"
              onError?.(msg)
            }
          },
          auto_select: false,
        })

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          width,
          text: "continue_with",
        })
      } catch (err) {
        console.error("[GoogleSignInButton] Failed to initialize Google button:", err)
      }
    }

    if (window.google) {
      initButton()
      return
    }

    const existing = document.getElementById("google-gsi-script")
    if (!existing) {
      const script = document.createElement("script")
      script.id = "google-gsi-script"
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = initButton
      script.onerror = () => {
        setIsLoadingScript(false)
        console.warn("[GoogleSignInButton] Could not load Google GSI script.")
      }
      document.head.appendChild(script)
    } else {
      existing.addEventListener("load", initButton)
    }
  }, [clientId, signInWithGoogle, onSuccess, onError, width])

  const handleDevSignIn = () => {
    if (isDev) {
      signInWithMock()
      onSuccess?.()
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      {hasClientId ? (
        <>
          {isLoadingScript && (
            <div className="flex h-10 w-[280px] items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-white/50">
              Loading Google Sign-In...
            </div>
          )}
          <div
            ref={buttonRef}
            className={isLoadingScript ? "hidden" : "block"}
            aria-label="Sign in with Google"
          />
        </>
      ) : isDev ? (
        <button
          type="button"
          onClick={handleDevSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-5 py-3 text-xs font-semibold tracking-wider text-black transition hover:bg-zinc-100 active:scale-[0.99] shadow-lg"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          CONTINUE WITH GOOGLE
        </button>
      ) : (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-xs text-red-400">
          Google authentication is currently unavailable.
        </div>
      )}
    </div>
  )
}
