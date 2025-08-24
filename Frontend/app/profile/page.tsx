"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function ProfilePage() {
  // Get user from your auth context
  const { user, signOut } = useAuth();

  // Local states for editable fields
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  // No real saving logic since you requested no DB saving
  const handleSave = () => {
    alert("Profile saving not implemented.");
  };

  return (
    <div className="min-h-screen bg-background flex justify-center p-4">
      <Card className="max-w-md w-full shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <img
              src="/profile-pic.jpg"
              alt="Profile Picture"
              className="w-32 h-32 rounded-full object-cover"
            />
            <div className="w-full">
              <Label htmlFor="name" className="text-card-foreground">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            <div className="w-full">
              <Label htmlFor="email" className="text-card-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleSave} className="flex-1">
              Save Profile
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => signOut && signOut()}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
