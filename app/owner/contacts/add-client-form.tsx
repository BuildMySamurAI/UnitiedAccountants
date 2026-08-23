"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addClientManually } from "./add-client-actions";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);

    const result = await addClientManually({
      firstName: String(formData.get("firstName") || ""),
      lastName: String(formData.get("lastName") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      businessName: String(formData.get("businessName") || ""),
      mailingAddress: String(formData.get("mailingAddress") || ""),
      physicalAddress: String(formData.get("physicalAddress") || ""),
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(`/owner/contacts/${result.profileId}/${result.companyId}`);
  }

  if (!open) {
    return (
      <button className="cbtn" onClick={() => setOpen(true)}>
        + Add client
      </button>
    );
  }

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Add a client</h3>
        <span className="hint">creates the CRM contact, opportunity, and portal login</span>
      </header>
      <form action={handleSubmit} className="space-y-4" style={{ padding: 15 }}>
        <div className="grid grid-cols-2 gap-4">
          <Field name="firstName" label="First Name" required />
          <Field name="lastName" label="Last Name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="phone" label="Phone" type="tel" />
          <Field name="businessName" label="Business Name" required />
          <Field name="mailingAddress" label="Mailing Address" />
          <Field name="physicalAddress" label="Physical Address" />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add client"}
          </Button>
          <button type="button" className="cbtn ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
