import { OPPORTUNITY_FIELDS } from "./constants";

// FILE_UPLOAD fields the team fills in (as opposed to Formation Documents /
// Identification Documents, which the client uploads from their own portal).
export const STAFF_FILE_FIELDS: { key: keyof typeof OPPORTUNITY_FIELDS; label: string }[] = [
  { key: "einConfirmationLetter", label: "EIN Confirmation Letter" },
  { key: "rtSubmissionConfirmation", label: "RT Submission Confirmation" },
  { key: "salesTaxSubmissionConfirmation", label: "Sales Tax Submission Confirmation" },
];

export type StaffFieldType = "text" | "date" | "select" | "number";

export type StaffFieldConfig = {
  key: keyof typeof OPPORTUNITY_FIELDS;
  dbColumn: string;
  label: string;
  type: StaffFieldType;
  options?: string[];
};

export const STAFF_FIELD_GROUPS: { title: string; fields: StaffFieldConfig[] }[] = [
  {
    title: "Business",
    fields: [
      { key: "businessName", dbColumn: "business_name", label: "Business Name", type: "text" },
      { key: "mailingAddress", dbColumn: "mailing_address", label: "Mailing Address", type: "text" },
      { key: "physicalAddress", dbColumn: "physical_address", label: "Physical Address", type: "text" },
    ],
  },
  {
    title: "Sunbiz",
    fields: [
      { key: "sunbizFilingConfirmation", dbColumn: "sunbiz_filing_confirmation", label: "Filing Confirmation", type: "text" },
      { key: "sunbizTrackingNumber", dbColumn: "sunbiz_tracking_number", label: "Tracking Number", type: "text" },
      { key: "sunbizFilingDate", dbColumn: "sunbiz_filing_date", label: "Filing Date", type: "date" },
      { key: "sunbizApproved", dbColumn: "sunbiz_approved", label: "Approved?", type: "select", options: ["Pending", "Approved", "Rejected"] },
    ],
  },
  {
    title: "EIN",
    fields: [{ key: "ein", dbColumn: "ein", label: "EIN", type: "text" }],
  },
  {
    title: "Sales Tax",
    fields: [
      { key: "salesTaxApproved", dbColumn: "sales_tax_approved", label: "Approved?", type: "select", options: ["Pending", "Approved", "Rejected"] },
      { key: "salesTaxCertificateNumber", dbColumn: "sales_tax_certificate_number", label: "Certificate Number", type: "text" },
      { key: "businessPartnerNumber", dbColumn: "business_partner_number", label: "Business Partner Number", type: "text" },
      { key: "salesTaxFilingFrequency", dbColumn: "sales_tax_filing_frequency", label: "Filing Frequency", type: "select", options: ["Monthly", "Quarterly", "Annual"] },
      { key: "salesTaxSubmissionDate", dbColumn: "sales_tax_submission_date", label: "Submission Date", type: "date" },
    ],
  },
  {
    title: "eFileSalesTax",
    fields: [
      { key: "efileSalesTaxUsername", dbColumn: "efilesalestax_username", label: "Username", type: "text" },
      { key: "efileSalesTaxRegistrationStatus", dbColumn: "efilesalestax_registration_status", label: "Registration Status", type: "select", options: ["Pending", "Active"] },
    ],
  },
  {
    title: "Reemployment Tax (RT)",
    fields: [
      { key: "rtApproved", dbColumn: "rt_approved", label: "Approved?", type: "select", options: ["Pending", "Approved", "Rejected"] },
      { key: "rtAccountNumber", dbColumn: "rt_account_number", label: "Account Number", type: "text" },
      { key: "rtFilingFrequency", dbColumn: "rt_filing_frequency", label: "Filing Frequency", type: "select", options: ["Monthly", "Quarterly", "Annual"] },
      { key: "rtSubmissionDate", dbColumn: "rt_submission_date", label: "Submission Date", type: "date" },
    ],
  },
  {
    title: "Payroll (SurePayroll)",
    fields: [
      { key: "surePayrollSetupCompletion", dbColumn: "surepayroll_setup_completion", label: "Setup Completion", type: "select", options: ["Pending", "Complete"] },
      { key: "surePayrollDepositSchedule", dbColumn: "surepayroll_deposit_schedule", label: "Deposit Schedule", type: "text" },
      { key: "payrollFilingFrequency", dbColumn: "payroll_filing_frequency", label: "Filing Frequency", type: "select", options: ["Weekly", "Bi-Weekly", "Monthly"] },
      { key: "payrollProcessingDate", dbColumn: "payroll_processing_date", label: "Processing Date", type: "date" },
    ],
  },
  {
    title: "Bookkeeping",
    fields: [
      {
        key: "bookkeepingStatus",
        dbColumn: "bookkeeping_status",
        label: "Bookkeeping Status",
        type: "select",
        options: ["Statements Pending", "Data Entry", "Reconciliation", "Final Review", "Locked"],
      },
      { key: "currentMonth", dbColumn: "current_month", label: "Current Month", type: "text" },
      { key: "statementsReceived", dbColumn: "statements_received", label: "Statements Received?", type: "select", options: ["Yes", "No"] },
      { key: "reconciliationDifference", dbColumn: "reconciliation_difference", label: "Reconciliation Difference", type: "number" },
      { key: "monthLocked", dbColumn: "month_locked", label: "Month Locked?", type: "select", options: ["Yes", "No"] },
      { key: "monthLockedDate", dbColumn: "month_locked_date", label: "Month Locked Date", type: "date" },
    ],
  },
];
