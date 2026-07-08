"use client";

import { useCallback, useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function LoginPage() {
  const [showSignIn, setShowSignIn] = useState(false);

  const switchToSignUp = useCallback(() => setShowSignIn(false), []);
  const switchToSignIn = useCallback(() => setShowSignIn(true), []);

  return showSignIn ? (
    <SignInForm onSwitchToSignUp={switchToSignUp} />
  ) : (
    <SignUpForm onSwitchToSignIn={switchToSignIn} />
  );
}
