import type { Metadata } from "next";
import { AuthPlaceholder } from "@/components/AuthPlaceholder";

export const metadata: Metadata = { title: "Log in — Career Radar" };

export default function LoginPage() {
  return <AuthPlaceholder mode="login" />;
}
