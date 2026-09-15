import type { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";

// The 4 independently-assignable services - Payroll and RT share one
// combined assignment, matching how "Payroll/RT" is already treated as one
// thing elsewhere in the portal (the intake Services field). Shown
// unconditionally regardless of whether that service is currently turned
// on for the company - who's responsible for it is worth tracking even
// before the service itself is active.
export const ASSIGNABLE_SERVICES = [
  {
    key: "bookkeeping",
    label: "Bookkeeping",
    nameField: "bookkeepingAssignedName",
    emailField: "bookkeepingAssignedEmail",
    dbColumn: "bookkeeping_assigned_team_member_id",
  },
  {
    key: "salesTax",
    label: "Sales Tax",
    nameField: "salesTaxAssignedName",
    emailField: "salesTaxAssignedEmail",
    dbColumn: "sales_tax_assigned_team_member_id",
  },
  {
    key: "payrollRt",
    label: "Payroll/RT",
    nameField: "payrollRtAssignedName",
    emailField: "payrollRtAssignedEmail",
    dbColumn: "payroll_rt_assigned_team_member_id",
  },
  {
    key: "incomeTax",
    label: "Income Tax",
    nameField: "incomeTaxAssignedName",
    emailField: "incomeTaxAssignedEmail",
    dbColumn: "income_tax_assigned_team_member_id",
  },
] as const satisfies {
  key: string;
  label: string;
  nameField: keyof typeof OPPORTUNITY_FIELDS;
  emailField: keyof typeof OPPORTUNITY_FIELDS;
  dbColumn: string;
}[];

export type AssignableServiceKey = (typeof ASSIGNABLE_SERVICES)[number]["key"];
