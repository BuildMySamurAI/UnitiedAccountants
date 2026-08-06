"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ConsoleLogout() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      title="Sign out"
      style={{
        marginLeft: "auto",
        flex: "none",
        width: 28,
        height: 28,
        padding: 0,
        borderRadius: 7,
        display: "grid",
        placeItems: "center",
        color: "#9db5ab",
        background: "transparent",
        transition: "background .13s, color .13s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#1d3229";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#9db5ab";
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}
