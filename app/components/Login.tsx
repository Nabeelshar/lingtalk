"use client";

import { useState, useEffect } from "react";
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
import { Moon, Sun, Loader2 } from "lucide-react";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

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
    <div className="min-h-screen w-full max-w-2xl mx-auto px-2 py-4 sm:p-4">
      <Card className="mx-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 sm:px-6">
          <CardTitle>{isSignUp ? "Sign Up" : "Login"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <CardDescription className="mb-4">
            {isSignUp
              ? "Create a new account to start chatting"
              : "Welcome back! Please enter your details"}
          </CardDescription>
          {message.text && (
            <div
              className={`mb-4 p-3 rounded-md ${
                message.type === "success"
                  ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300"
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isSignUp ? (
                "Sign Up"
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="px-4 sm:px-6">
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
    </div>
  );
}
