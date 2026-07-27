"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember } from "./actions";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function InviteTeamMemberForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setResult(null);
    const res = await inviteTeamMember(formData);
    setResult(res);
    setSubmitting(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field name="fullName" label="Full Name" required />
        <Field name="email" label="Email" type="email" required />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Sending invite..." : "Invite team member"}
      </Button>
      {result?.ok && <p className="text-sm text-emerald-700">Invite sent.</p>}
      {result && !result.ok && <p className="text-sm text-red-600">{result.error}</p>}
    </form>
  );
}
