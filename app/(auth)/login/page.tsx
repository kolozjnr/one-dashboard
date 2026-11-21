import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login | Metrispot",
};

export default function LoginPage() {
  return <LoginForm />;
}
