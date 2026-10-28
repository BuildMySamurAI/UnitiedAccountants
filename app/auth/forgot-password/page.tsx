import { headers } from "next/headers";
import ForgotPasswordForm from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  // Same host rule the middleware uses to pick the right login page.
  const host = (await headers()).get("host") ?? "";
  const internalDomain = process.env.NEXT_PUBLIC_INTERNAL_PORTAL_DOMAIN;
  const loginPath = internalDomain && host.startsWith(internalDomain) ? "/internal/login" : "/login";

  return <ForgotPasswordForm loginPath={loginPath} />;
}
