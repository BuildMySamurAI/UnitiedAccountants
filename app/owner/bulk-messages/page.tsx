import { supabaseServer } from "@/lib/supabase/server";
import { getBulkMessageRecipients } from "@/lib/bulk-messages";
import { BulkMessageForm } from "@/components/console/bulk-message-form";
import { ConsoleTopBar } from "@/components/console/ui";

export default async function OwnerBulkMessagesPage() {
  const supabase = await supabaseServer();
  const recipients = await getBulkMessageRecipients(supabase);

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Bulk messages" }]} />
      <div className="wrap">
        <h2 className="page">Bulk messages</h2>
        <p className="sub">Filter clients by tag, then send one text or email to everyone selected. Clients marked opted-out are skipped automatically.</p>
        <BulkMessageForm recipients={recipients} />
      </div>
    </>
  );
}
