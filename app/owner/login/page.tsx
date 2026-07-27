import { PortalLoginForm } from "@/components/portal-login-form";

export default function OwnerLoginPage() {
  return (
    <PortalLoginForm
      subtitle="Owner Portal"
      roleTable="owners"
      redirectPath="/owner"
      noAccessMessage="This account doesn't have Owner Portal access."
    />
  );
}
