import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar } from "@/components/console/ui";
import { BulkServiceForm } from "./bulk-service-form";

export default async function BulkServicesPage() {
  const supabase = await supabaseServer();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, profiles(first_name, last_name, status)")
    .order("business_name", { ascending: true });

  const { data: services } = await supabase
    .from("company_services")
    .select("company_id, service_type, subtype, status");

  // Inactive clients aren't generating new recurring work, so they don't
  // show up as bulk-creation targets - still reachable individually from
  // their own company page if genuinely needed.
  const rows = (companies ?? [])
    .filter((c) => (c.profiles as unknown as { status?: string } | null)?.status !== "Inactive")
    .map((c) => {
      const profile = c.profiles as unknown as { first_name: string; last_name: string } | null;
      return {
        id: c.id,
        businessName: c.business_name ?? "Unnamed company",
        clientName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Unknown client",
      };
    });

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Bulk deadlines" }]} />
      <div className="wrap">
        <h2 className="page">Bulk deadline creation</h2>
        <p className="sub">
          Pick a service, optionally set a shared deadline, then select every company it applies to and add it in one
          step. Companies that already have this exact service active are skipped automatically.
        </p>
        <BulkServiceForm companies={rows} existingServices={services ?? []} />
      </div>
    </>
  );
}
