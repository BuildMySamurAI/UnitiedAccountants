export const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;

export const PIPELINE_NEW_CORP_ONBOARDING = process.env.GHL_PIPELINE_ID_NEW_CORP_ONBOARDING!;
export const STAGE_CLIENT_ONBOARDING = process.env.GHL_STAGE_ID_CLIENT_ONBOARDING!;

// Opportunity ("Company" folder) custom field IDs - the full set that exists in GHL today.
export const OPPORTUNITY_FIELDS = {
  businessName: "mEvLRfYUrxzyDjVhAtvJ",
  mailingAddress: "1EyFMcLHH1WozOzU5cum",
  physicalAddress: "HywP1jrFgQ9ehKqTC7vt",

  sunbizFilingConfirmation: "gMhB9YzSsTeqzsCUB2Dt",
  sunbizTrackingNumber: "WTatASHPcFGXlMm8HHRA",
  sunbizFilingDate: "a78nLwymbfHD1hm0JMTK",
  sunbizApproved: "qaOpgpL3o9yv5Wfm8FAT", // staff-only

  ein: "cPbSWM1vaC6CLWvehERg",
  einConfirmationLetter: "nci8nYSyy5LshVKeyZoJ",

  salesTaxApproved: "1NKpsNTRzmcZUE2UeZyX", // staff-only
  salesTaxCertificateNumber: "adCFusjOTTwOePfB3UcV",
  businessPartnerNumber: "NHxg7HEgLIFaWhPthla0",
  salesTaxFilingFrequency: "8wzFFhRmkdIkHtxv1yai",
  salesTaxSubmissionDate: "vr6v8girO2GHnm2DjOMX",
  salesTaxSubmissionConfirmation: "w4AvyypIJ50lq5tCdOP4", // staff-only (submission evidence)

  efileSalesTaxUsername: "iwKOpsBZGfeY0TW6lsOu",
  efileSalesTaxRegistrationStatus: "B1Ryhj4z95LwJPi9HKp0",

  rtApproved: "Petf6B0LYZ6z2VuMDMyI", // staff-only
  rtAccountNumber: "h3gTWpy0InQqVtaUhwEW",
  rtFilingFrequency: "HkdVE8nHkndzKXZeFYU2",
  rtSubmissionDate: "6w4szppXfswjNVNDGHda",
  rtSubmissionConfirmation: "OkwhlaCkynglKmUEcqjq", // staff-only (submission evidence)

  surePayrollSetupCompletion: "aUcn14Xy7laNQtJsT4Jg",
  surePayrollDepositSchedule: "Nup3ISSNtUuauubXqZhO",
  payrollFilingFrequency: "2IhPRSJDQj7EoJRgVNlE",

  qcPassed: "kVk6K53hS2ywO2kb65Ui", // staff-only

  formationDocuments: "bKfDCsrQ5N0W0RwJf9uh",
  identificationDocuments: "AcPHKSJf6FZKBm6ZtuR1",

  assignedTeamMember: "hx6HNi8gvVE7d10ytrEc",
} as const;

// Fields that are staff-only - never shown to the client, even read-only.
export const STAFF_ONLY_OPPORTUNITY_FIELDS = new Set<string>([
  OPPORTUNITY_FIELDS.sunbizApproved,
  OPPORTUNITY_FIELDS.salesTaxApproved,
  OPPORTUNITY_FIELDS.salesTaxSubmissionConfirmation,
  OPPORTUNITY_FIELDS.rtApproved,
  OPPORTUNITY_FIELDS.rtSubmissionConfirmation,
  OPPORTUNITY_FIELDS.qcPassed,
]);

export const CONTACT_FIELDS = {
  portalAccountCreated: "3Aw517NYJwWjca61Ew1l",
  portalUserId: "kyH2FKErus5BGdfOEUea",
} as const;
