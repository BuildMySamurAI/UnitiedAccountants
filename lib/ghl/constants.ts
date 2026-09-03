export const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;

export const PIPELINE_NEW_CORP_ONBOARDING = process.env.GHL_PIPELINE_ID_NEW_CORP_ONBOARDING!;
export const STAGE_CLIENT_ONBOARDING = process.env.GHL_STAGE_ID_CLIENT_ONBOARDING!;
export const STAGE_ACTIVE_CLIENT = process.env.GHL_STAGE_ID_ACTIVE_CLIENT!;

// Full, ordered stage list for the "New Corporation Onboarding" pipeline -
// confirmed live against GET /opportunities/pipelines. Only the first and
// last stage had env vars (used by the onboarding automation and the
// monthly bookkeeping reset cron); the other four are only needed for
// display (Owner Portal pipeline board / stage-progress UI), so they're
// plain constants rather than more env vars.
export const PIPELINE_STAGES: { id: string; name: string }[] = [
  { id: STAGE_CLIENT_ONBOARDING, name: "Client Onboarding" },
  { id: "c87d3617-5254-4dc8-8e51-e7e52771ac84", name: "Sunbiz Filed" },
  { id: "ed62c2e6-5d2b-4b77-abc3-cbc019670e15", name: "EIN Applied" },
  { id: "adb1f932-c97e-4305-8901-03675f9d2511", name: "Tax Registrations In Progress" },
  { id: "08555784-1bd3-46a6-b028-7c2cc5af3a1b", name: "QC Review" },
  { id: STAGE_ACTIVE_CLIENT, name: "Active Client" },
];

export const STAGE_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.name])
);

// Opportunity ("Company" folder) custom field IDs - the full set that exists in GHL today.
export const OPPORTUNITY_FIELDS = {
  businessName: "mEvLRfYUrxzyDjVhAtvJ",
  mailingAddress: "1EyFMcLHH1WozOzU5cum",
  physicalAddress: "HywP1jrFgQ9ehKqTC7vt",

  // "Personal (Individual tax filer)" vs "Company" - drives whether EIN vs
  // SSN shows, and whether Sunbiz/RT/Sales Tax show at all. See
  // lib/company-type.ts for the shared check.
  companyType: "1DalSqa43QviILrynLD0",

  // Gate whether the Sales Tax/eFileSalesTax, Reemployment Tax, Payroll, and
  // Bookkeeping sections show at all for this company, and whether the
  // recurring cron jobs touch it - a company with a service disabled (or
  // never configured) shows none of that service's fields and gets no
  // reminders/resets for it.
  salesTaxServiceEnabled: "R1d9A9PLHTYBX6JRokn6",
  payrollServiceEnabled: "XTcs0UF7cK1pfNQLFF6C",
  rtServiceEnabled: "3Oyl9Qsf56PZjy9Bkpuv",
  bookkeepingServiceEnabled: "dN8LRoZx286xjJJlR18I",
  incomeTaxServiceEnabled: "kgusHT4KZSQNF82d5zWy",

  // Multi-select filled at intake (own /onboard form or the GHL-native
  // intake the webhook covers) - seeds the 5 *ServiceEnabled toggles above
  // once, at provisioning time. Not read again after that; the individual
  // toggles are the live source of truth from then on. See
  // lib/service-intake-mapping.ts.
  services: "QzREHxnFZD2pUDBAHnWp",

  sunbizFilingConfirmation: "gMhB9YzSsTeqzsCUB2Dt", // deprecated - dropped from the portal, Tracking Number is the field of record
  sunbizTrackingNumber: "WTatASHPcFGXlMm8HHRA",
  sunbizFilingDate: "a78nLwymbfHD1hm0JMTK",
  sunbizApproved: "qaOpgpL3o9yv5Wfm8FAT", // staff-only

  ein: "cPbSWM1vaC6CLWvehERg",
  ssn: "xZPVCLn4yPzyzk7CmONK", // same access as EIN - locked to a ##-#######/###-##-#### input mask in the portal
  einConfirmationLetter: "nci8nYSyy5LshVKeyZoJ",

  salesTaxApproved: "1NKpsNTRzmcZUE2UeZyX", // staff-only
  salesTaxCertificateNumber: "adCFusjOTTwOePfB3UcV",
  businessPartnerNumber: "NHxg7HEgLIFaWhPthla0",
  salesTaxFilingFrequency: "8wzFFhRmkdIkHtxv1yai",
  salesTaxSubmissionDate: "vr6v8girO2GHnm2DjOMX",
  salesTaxSubmissionConfirmation: "w4AvyypIJ50lq5tCdOP4", // staff-only (submission evidence)

  efileSalesTaxUsername: "iwKOpsBZGfeY0TW6lsOu", // deprecated - replaced by efileSalesTaxAdded + the login fields below, kept only for old data
  efileSalesTaxRegistrationStatus: "B1Ryhj4z95LwJPi9HKp0",
  efileSalesTaxAdded: "Y8mXXuhbcsh7L8v11P0M",
  efileSalesTaxLoginUsername: "kn5nTu4QzT2G3j9XusXO", // deprecated - a shared login is used across all clients, no per-client credentials needed
  efileSalesTaxLoginPassword: "XGigDhKf0EQX6Qo3RUeO", // deprecated - see above

  goingOutOfBusiness: "Wum75P8m1dTgqRlvyu0w",

  rtApproved: "Petf6B0LYZ6z2VuMDMyI", // staff-only
  rtAccountNumber: "h3gTWpy0InQqVtaUhwEW",
  rtFilingFrequency: "HkdVE8nHkndzKXZeFYU2",
  rtSubmissionDate: "6w4szppXfswjNVNDGHda",
  rtSubmissionConfirmation: "OkwhlaCkynglKmUEcqjq", // staff-only (submission evidence)

  surePayrollSetupCompletion: "aUcn14Xy7laNQtJsT4Jg",
  surePayrollDepositSchedule: "Nup3ISSNtUuauubXqZhO", // deprecated - dropped from the portal
  payrollFilingFrequency: "2IhPRSJDQj7EoJRgVNlE",
  payrollProcessingDate: "ciHIXqMhD8dahIgXk54m",

  qcPassed: "kVk6K53hS2ywO2kb65Ui", // staff-only

  entityType: "OySYfwIBU9554h2DC0S0",
  extensionFiled: "z7ymOfUbchKEV4fnLaCY", // resets to "No" every Jan 1 - see lib/tax-extension-reset.ts

  formationDocuments: "bKfDCsrQ5N0W0RwJf9uh",
  identificationDocuments: "AcPHKSJf6FZKBm6ZtuR1",

  assignedTeamMember: "hx6HNi8gvVE7d10ytrEc",
  assignedTeamMemberEmail: "duZEwKTuC4zUKbKPryHJ",

  bookkeepingStatus: "VeEBAYcwkpj4103RygCn", // staff-only
  currentMonth: "OLXSJwc0VEJ3tV6w5tNe", // staff-only
  statementsReceived: "m8qPGSSYJ3DTlpPUXsMM", // staff-only
  reconciliationDifference: "Wlxq7oTIc09cG1Zw3sXJ", // staff-only
  monthLocked: "mT4RHjsk0gaaGFVAYwlG", // deprecated - replaced by reconciliationCompletionDate
  monthLockedDate: "DLRCD86Gmf0QqpYJnkRy", // deprecated - replaced by reconciliationCompletionDate
  reconciliationCompletionDate: "tJzPaVIMCBLDFXryEX3i", // staff-only - set = cycle closed for this month, matches the old monthLocked's role

  // Monthly bookkeeping documents - only shown while the cycle is open
  // (reconciliationCompletionDate not yet set). Client-uploaded only:
  bankStatements: "BdqzzVPAacG1wcc4iKsj",
  creditCardStatement: "y3sU5jMXSTMTa4c7pF9B",
  merchantStatement: "coKSbtVdVtf00P2AU1bR",
  cashExpensesReport: "KACvQ07zVam2TMH9kYTJ",
  // Shared - both client and team can upload to these:
  corpRenewals: "7jvemGT5cgxZKtaUfYL0",
  salesTaxDocuments: "YbkydfG9j77CVU3KfQz1",
  payrollDocuments: "6WBCf7I96jCu9fYCS2M1",
  foodPermit: "dDr9xyquPr1ZtXsPdKA8",
  dbprLicenses: "vLv7bBsYfkCmD5e4DSyf",
  incomeTax: "ersAfkThqjdVGCN8xnIh",
  businessTaxReceipt: "S2a1zDztsw89x9G7x0wA",
} as const;

// Fields that are staff-only - never shown to the client, even read-only.
export const STAFF_ONLY_OPPORTUNITY_FIELDS = new Set<string>([
  OPPORTUNITY_FIELDS.sunbizApproved,
  OPPORTUNITY_FIELDS.salesTaxApproved,
  OPPORTUNITY_FIELDS.salesTaxSubmissionConfirmation,
  OPPORTUNITY_FIELDS.rtApproved,
  OPPORTUNITY_FIELDS.rtSubmissionConfirmation,
  OPPORTUNITY_FIELDS.qcPassed,
  OPPORTUNITY_FIELDS.bookkeepingStatus,
  OPPORTUNITY_FIELDS.currentMonth,
  OPPORTUNITY_FIELDS.statementsReceived,
  OPPORTUNITY_FIELDS.reconciliationDifference,
  OPPORTUNITY_FIELDS.reconciliationCompletionDate,
]);

export const CONTACT_FIELDS = {
  portalAccountCreated: "3Aw517NYJwWjca61Ew1l",
  portalUserId: "kyH2FKErus5BGdfOEUea",
  clientStatus: "0ieb5a1p1EvrVkmvTrVl",
} as const;
