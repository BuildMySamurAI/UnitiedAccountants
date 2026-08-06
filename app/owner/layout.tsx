import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { supabaseServer } from "@/lib/supabase/server";
import { Sidebar } from "./_components/sidebar";
import { initialsFor } from "./_components/ui";
import "./console.css";

const inter = Inter({ subsets: ["latin"], variable: "--console-font-sans" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--console-font-serif" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--console-font-mono" });

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owner } = user
    ? await supabase.from("owners").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const ownerName = owner?.full_name ?? user?.email ?? "Owner";
  const ownerEmail = user?.email ?? "";

  return (
    <div className={`console ${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <Sidebar ownerName={ownerName} ownerEmail={ownerEmail} ownerInitials={initialsFor(ownerName)} />
      <main>{children}</main>
    </div>
  );
}
