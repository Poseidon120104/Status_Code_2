"use client"

import type React from "react"
import { useState, useRef } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Stethoscope, Mail, Lock, Upload, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isAuthenticated, signIn, signUp, signOut, user, isLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningIn(true)
    const success = isSignUpMode ? await signUp(email, password) : await signIn(email, password)
    if (!success) {
      toast({
        title: `${isSignUpMode ? "Sign up" : "Sign in"} failed`,
        description: "Please check your credentials and try again.",
        variant: "destructive",
      })
    } else if (isSignUpMode) {
      localStorage.setItem("userEmail", email)
      toast({
        title: "Account created successfully!",
        description: "Welcome to MedExtract.",
      })
    } else {
      localStorage.setItem("userEmail", email)
    }
    setIsSigningIn(false)
  }

  const handleImageExtraction = async (file: File) => {
    setIsExtracting(true)
    const startTime = performance.now();
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("string", localStorage.getItem("userEmail") ?? "")

      for (const pair of formData.entries()) {
        console.log(pair[0] + ", " + pair)
      }

      const response = await axios.post("http://10.50.49.41:5001/api/prescriptions", formData, {
        headers: {},
      })
      const endTime = performance.now() // End timer
      const durationMs = endTime - startTime
      console.log(`Extraction time: ${durationMs.toFixed(2)} ms`)
      localStorage.setItem("lastExtractionTimeMs", durationMs.toString())
      setExtractedData(response.data)
      toast({
        title: "Extraction Successful!",
        description: "Redirecting to manual entry with extracted data...",
      })
      const medsArray = response.data?.data?.medicines || []
      localStorage.setItem("extractedMedicines", JSON.stringify(medsArray))
      setTimeout(() => router.push("/manual"), 100)
    } catch (error: any) {
      toast({
        title: "Extraction Failed",
        description:
          error.response?.data?.message || "Failed to process the image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      })
      return
    }
    handleImageExtraction(file)
  }

  const handleExtractionClick = () => {
    fileInputRef.current?.click()
  }

  const handleSignOut = () => {
    signOut()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Stethoscope className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-card-foreground">
                MedExtract Dashboard
              </CardTitle>
              <p className="text-muted-foreground">
                Welcome back, {user?.name}! Choose how you'd like to manage prescriptions
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Extract from image */}
                <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6 text-center space-y-3">
                    <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto">
                      <Stethoscope className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-card-foreground">Extract from Image</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload prescription images and automatically extract medicine details
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      className="w-full"
                      onClick={handleExtractionClick}
                      disabled={isExtracting}
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Start Extraction
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Manual entry */}
                <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6 text-center space-y-3">
                    <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-card-foreground">Manual Entry</h3>
                    <p className="text-sm text-muted-foreground">
                      Manually add and manage prescription medicines
                    </p>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => (window.location.href = "/manual")}
                    >
                      Add Manually
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Display extracted data */}
              {extractedData && (
                <Card className="border-border bg-green-50 dark:bg-green-950">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800 dark:text-green-200">
                      Extracted Medicine Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <pre className="text-sm overflow-x-auto text-green-700 dark:text-green-300 bg-white dark:bg-green-900 p-3 rounded border">
                        {JSON.stringify(extractedData, null, 2)}
                      </pre>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              JSON.stringify(extractedData, null, 2)
                            )
                          }
                        >
                          Copy JSON
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExtractedData(null)}
                        >
                          Clear Results
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Stethoscope className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-card-foreground">
              MedExtract
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {isSignUpMode
                ? "Create your account to get started"
                : "Sign in to manage your prescriptions"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-card-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-card-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn
                ? isSignUpMode
                  ? "Creating account..."
                  : "Signing in..."
                : isSignUpMode
                ? "Sign Up"
                : "Sign In"}
            </Button>
          </form>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUpMode ? "Already have an account?" : "Don't have an account?"}
            </p>
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => setIsSignUpMode(!isSignUpMode)}
            >
              {isSignUpMode ? "Sign in here" : "Sign up here"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
