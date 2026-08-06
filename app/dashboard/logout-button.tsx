"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    // "/" is host-aware (see app/page.tsx + middleware): it lands on /login
    // for the client domain and /internal/login for the owner/team domain,
    // so this one redirect is correct from every portal.
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={handleLogout} className="text-sm px-3.5 py-2">
      Sign out
    </Button>
  );
}
