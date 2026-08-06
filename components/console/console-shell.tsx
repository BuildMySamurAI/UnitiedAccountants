import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Sidebar, type NavGroup } from "./sidebar";
import "./console.css";

const inter = Inter({ subsets: ["latin"], variable: "--console-font-sans" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--console-font-serif" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--console-font-mono" });

export function ConsoleShell({
  subtitle,
  navGroups,
  userName,
  userEmail,
  userInitials,
  children,
}: {
  subtitle: string;
  navGroups: NavGroup[];
  userName: string;
  userEmail: string;
  userInitials: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`console ${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <Sidebar subtitle={subtitle} navGroups={navGroups} userName={userName} userEmail={userEmail} userInitials={userInitials} />
      <main>{children}</main>
    </div>
  );
}
