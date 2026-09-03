"use client";

import { useState } from "react";
import { submitOnboardingForm, type OnboardResult } from "./actions";
import { SERVICE_INTAKE_OPTIONS } from "@/lib/service-intake-mapping";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function OnboardPage() {
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setResult(null);
    const res = await submitOnboardingForm(formData);
    setResult(res);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white text-lg font-semibold mb-4">
            UA
          </span>
          <h1 className="text-xl font-semibold text-slate-900">New Corporation Onboarding</h1>
          <p className="text-sm text-slate-500 mt-1">Tell us about you and your new business</p>
        </div>

        <Card className="p-6">
          <form action={handleSubmit} className="space-y-6">
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Contact
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <Field name="firstName" label="First Name" required />
                <Field name="lastName" label="Last Name" required />
              </div>
              <Field name="email" label="Email" type="email" required />
              <Field name="phone" label="Phone" type="tel" />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Company
              </legend>
              <Field name="businessName" label="Business Name" required />
              <Field name="mailingAddress" label="Mailing Address" />
              <Field name="physicalAddress" label="Physical Address" />
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Services
              </legend>
              <p className="text-xs text-slate-500">Which of these do you need? Only what's checked will show up in your portal.</p>
              <div className="space-y-2">
                {SERVICE_INTAKE_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="services" value={option} className="rounded border-slate-300" />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </Card>

        {result?.ok && (
          <p className="mt-6 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3">
            Opportunity created. A portal invite has been sent if this was a new client.
          </p>
        )}
        {result && !result.ok && (
          <p className="mt-6 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{result.error}</p>
        )}
      </div>
    </main>
  );
}
