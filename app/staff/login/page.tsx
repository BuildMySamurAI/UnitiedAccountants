import { PortalLoginForm } from "@/components/portal-login-form";

export default function StaffLoginPage() {
  return (
    <PortalLoginForm
      subtitle="Team Portal"
      roleTable="team_members"
      redirectPath="/staff"
      noAccessMessage="This account doesn't have Team Portal access."
    />
  );
}
