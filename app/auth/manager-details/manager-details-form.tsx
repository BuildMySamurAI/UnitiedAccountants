"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function ManagerDetailsForm({ email, invitedName }: { email: string; invitedName: string }) {
  const router = useRouter();
  const [legalName, setLegalName] = useState(invitedName);
  const [ssn, setSsn] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session has expired. Please use the invite link again.");
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("managers")
      .update({
        legal_name: legalName.trim(),
        ssn: ssn.trim(),
        date_of_birth: dateOfBirth,
        phone: phone.trim(),
        address: address.trim(),
        status: "details_submitted",
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/auth/set-password");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-white text-lg font-semibold mb-4">
            UA
          </span>
          <h1 className="text-xl font-semibold text-slate-900">Complete your details</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            A few more details before you set your password.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" value={email} disabled readOnly className="bg-slate-50 text-slate-500" />
            <Field label="Full Legal Name" required value={legalName} onChange={(e) => setLegalName(e.target.value)} autoFocus />
            <Field label="Social Security Number" required value={ssn} onChange={(e) => setSsn(e.target.value)} placeholder="XXX-XX-XXXX" />
            <Field label="Date of Birth" type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            <Field label="Phone Number" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Field label="Address" required value={address} onChange={(e) => setAddress(e.target.value)} />
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Saving..." : "Continue"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
