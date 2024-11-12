"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LoginComponent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          `${username}@example.com`,
          password
        );
        await setDoc(doc(db, "users", userCredential.user.uid), {
          username,
          language,
        });
        setMessage({ text: "Account created successfully!", type: "success" });
      } else {
        await signInWithEmailAndPassword(
          auth,
          `${username}@example.com`,
          password
        );
        setMessage({ text: "Logged in successfully!", type: "success" });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage({
        text: "An error occurred during authentication. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isSignUp ? "Sign Up" : "Login"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Create a new account to start chatting"
            : "Welcome back! Please enter your details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message.text && (
          <div
            className={`mb-4 p-2 rounded ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="language">Preferred Language</Label>
              <Select value={language} onValueChange={setLanguage} required>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select your preferred language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp
            ? "Already have an account? Login"
            : "Don't have an account? Sign Up"}
        </Button>
      </CardFooter>
    </Card>
  );
}
