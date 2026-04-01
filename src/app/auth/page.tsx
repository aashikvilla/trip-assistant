import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a Vibe Trip account.",
};

export default function AuthRoutePage() {
  return <AuthPage />;
}
