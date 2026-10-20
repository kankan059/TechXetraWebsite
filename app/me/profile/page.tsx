"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ProfileCompletionModal } from "@/components/auth/ProfileCompletionModal"
import { useAuth } from "@/lib/auth-context"

/**
 * /me/profile — renders the full-screen Profile Completion Modal.
 * On save or dismiss, redirects to /me.
 */
export default function EditProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent">
      <ProfileCompletionModal
        isOpen={true}
        onClose={() => router.push("/me")}
      />
    </div>
  )
}
