import type { Metadata } from "next";
import { AuthPlaceholder } from "@/components/AuthPlaceholder";

export const metadata: Metadata = { title: "Sign up — Career Radar" };

export default function SignupPage() {
  return <AuthPlaceholder mode="signup" />;
}
