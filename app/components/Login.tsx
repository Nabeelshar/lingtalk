"use client";

import { useState } from "react";
import { auth, db } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
      } else {
        await signInWithEmailAndPassword(
          auth,
          `${username}@example.com`,
          password
        );
      }
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  return (
    <form onSubmit={handleAuth} className="space-y-4">
      <Input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {isSignUp && (
        <Input
          type="text"
          placeholder="Preferred Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          required
        />
      )}
      <Button type="submit">{isSignUp ? "Sign Up" : "Login"}</Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp ? "Switch to Login" : "Switch to Sign Up"}
      </Button>
    </form>
  );
}
