"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { auth } from "@/lib/firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth"

interface User {
  id: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // listen to firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        }
        setUser(userData)
        localStorage.setItem("medextract_user", JSON.stringify(userData))
      } else {
        setUser(null)
        localStorage.removeItem("medextract_user")
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (error) {
      console.error("SignIn Error:", error)
      return false
    }
  }

  const signUp = async (email: string, password: string): Promise<boolean> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      return true
    } catch (error) {
      console.error("SignUp Error:", error)
      return false
    }
  }

  const signOut = () => {
    firebaseSignOut(auth)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}


