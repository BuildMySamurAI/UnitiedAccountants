import { OPPORTUNITY_FIELDS } from "./constants";

// FILE_UPLOAD fields the team fills in (as opposed to Formation Documents /
// Identification Documents, which the client uploads from their own portal).
export const STAFF_FILE_FIELDS: { key: keyof typeof OPPORTUNITY_FIELDS; label: string }[] = [
  { key: "einConfirmationLetter", label: "EIN Confirmation Letter" },
  { key: "rtSubmissionConfirmation", label: "RT Submission Confirmation" },
  { key: "salesTaxSubmissionConfirmation", label: "Sales Tax Submission Confirmation" },
];

// "ssn"/"ein" render as a plain text input locked to a digit-only mask
// (###-##-#### / ##-#######) - see lib/masked-input.ts. The formatted
// value, hyphens included, is what actually gets saved.
export type StaffFieldType = "text" | "date" | "select" | "number" | "ssn" | "ein";

export type StaffFieldConfig = {
  key: keyof typeof OPPORTUNITY_FIELDS;
  dbColumn: string;
  label: string;
  type: StaffFieldType;
  options?: string[];
  // Shown (and saved as) this value when the field has never been touched -
  // for fields where "blank" and a real option mean the same thing, so the
  // dropdown should say so rather than showing a misleading "--".
  defaultValue?: string;
};

export type StaffFieldGroup = {
  title: string;
  fields: StaffFieldConfig[];
  // When set, this group (and its fields) only shows once the named
  // opportunity field reads "Yes" - lets Sales Tax/Payroll/RT/Bookkeeping
  // behave like the add/remove Services system: hidden and reminder-free
  // until a client actually has that service.
  serviceFlag?: keyof typeof OPPORTUNITY_FIELDS;
};

export const STAFF_FIELD_GROUPS: StaffFieldGroup[] = [
  {
    title: "Business",
    fields: [
      { key: "businessName", dbColumn: "business_name", label: "Business Name", type: "text" },
      { key: "mailingAddress", dbColumn: "mailing_address", label: "Mailing Address", type: "text" },
      { key: "physicalAddress", dbColumn: "physical_address", label: "Physical Address", type: "text" },
    ],
  },
  {
    title: "Active Services",
    fields: [
      { key: "salesTaxServiceEnabled", dbColumn: "sales_tax_service_enabled", label: "Sales Tax", type: "select", options: ["No", "Yes"] },
      { key: "payrollServiceEnabled", dbColumn: "payroll_service_enabled", label: "Payroll", type: "select", options: ["No", "Yes"] },
      { key: "rtServiceEnabled", dbColumn: "rt_service_enabled", label: "Reemployment Tax (RT)", type: "select", options: ["No", "Yes"] },
      { key: "bookkeepingServiceEnabled", dbColumn: "bookkeeping_service_enabled", label: "Bookkeeping", type: "select", options: ["No", "Yes"] },
    ],
  },
  {
    title: "Sunbiz",
    fields: [
      { key: "sunbizTrackingNumber", dbColumn: "sunbiz_tracking_number", label: "Tracking Number", type: "text" },
      { key: "sunbizFilingDate", dbColumn: "sunbiz_filing_date", label: "Filing Date", type: "date" },
      { key: "sunbizApproved", dbColumn: "sunbiz_approved", label: "Approved?", type: "select", options: ["Pending", "Approved", "Rejected"] },
    ],
  },
  {
    title: "EIN / SSN",
    fields: [
      { key: "ein", dbColumn: "ein", label: "EIN", type: "ein" },
      { key: "ssn", dbColumn: "ssn", label: "SSN", type: "ssn" },
    ],
  },
  {
    title: "Income Tax",
    fields: [
      {
        key: "entityType",
        dbColumn: "entity_type",
        label: "Entity Type",
        type: "select",
        options: ["S-Corp", "C-Corp", "Partnership", "Individual"],
      },
      {
        key: "extensionFiled",
        dbColumn: "extension_filed",
        label: "Extension Filed This Year?",
        type: "select",
        options: ["No", "Yes"],
        defaultValue: "No",
      },
    ],
  },
  {
    title: "Sales Tax",
    serviceFlag: "salesTaxServiceEnabled",
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
    serviceFlag: "salesTaxServiceEnabled",
    fields: [
      { key: "efileSalesTaxAdded", dbColumn: "efilesalestax_added", label: "Added?", type: "select", options: ["No", "Yes"] },
      { key: "efileSalesTaxRegistrationStatus", dbColumn: "efilesalestax_registration_status", label: "Registration Status", type: "select", options: ["Pending", "Active", "Inactive"] },
    ],
  },
  {
    title: "Reemployment Tax (RT)",
    serviceFlag: "rtServiceEnabled",
    fields: [
      { key: "rtApproved", dbColumn: "rt_approved", label: "Approved?", type: "select", options: ["Pending", "Approved", "Rejected"] },
      { key: "rtAccountNumber", dbColumn: "rt_account_number", label: "Account Number", type: "text" },
      { key: "rtFilingFrequency", dbColumn: "rt_filing_frequency", label: "Filing Frequency", type: "select", options: ["Monthly", "Quarterly", "Annual"] },
      { key: "rtSubmissionDate", dbColumn: "rt_submission_date", label: "Submission Date", type: "date" },
    ],
  },
  {
    title: "Payroll (SurePayroll)",
    serviceFlag: "payrollServiceEnabled",
    fields: [
      { key: "surePayrollSetupCompletion", dbColumn: "surepayroll_setup_completion", label: "Setup Completion", type: "select", options: ["Pending", "Complete"] },
      { key: "payrollFilingFrequency", dbColumn: "payroll_filing_frequency", label: "Filing Frequency", type: "select", options: ["Weekly", "Bi-Weekly", "Monthly"] },
      { key: "payrollProcessingDate", dbColumn: "payroll_processing_date", label: "Processing Date", type: "date" },
    ],
  },
  {
    title: "Bookkeeping",
    serviceFlag: "bookkeepingServiceEnabled",
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
      { key: "reconciliationCompletionDate", dbColumn: "reconciliation_completion_date", label: "Reconciliation Completion Date", type: "date" },
    ],
  },
];
