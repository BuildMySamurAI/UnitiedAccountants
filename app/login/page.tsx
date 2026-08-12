import { PortalLoginForm } from "@/components/portal-login-form";

export default function LoginPage() {
  return (
    <PortalLoginForm
      subtitle="Client Portal"
      roleTable={["profiles", "managers"]}
      redirectPath="/dashboard"
      noAccessMessage="This account doesn't have client portal access."
      footerNote="New clients receive a portal invite by email from their accountant."
    />
  );
}
