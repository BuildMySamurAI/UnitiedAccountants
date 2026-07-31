import { OPPORTUNITY_FIELDS } from "./constants";

export type BookkeepingFileField = {
  key: keyof typeof OPPORTUNITY_FIELDS;
  label: string;
  fieldKey: string; // used as files.field_key when the client uploads via Storage
};

// Client uploads these; team can only view them.
export const CLIENT_BOOKKEEPING_FILE_FIELDS: BookkeepingFileField[] = [
  { key: "bankStatements", label: "Bank Statements", fieldKey: "bank_statements" },
  { key: "creditCardStatement", label: "Credit Card Statement", fieldKey: "credit_card_statement" },
  { key: "merchantStatement", label: "Merchant Statement", fieldKey: "merchant_statement" },
  { key: "cashExpensesReport", label: "Cash Expenses Report", fieldKey: "cash_expenses_report" },
];

// Both the client and the team can upload to these.
export const SHARED_BOOKKEEPING_FILE_FIELDS: BookkeepingFileField[] = [
  { key: "corpRenewals", label: "Corp Renewals", fieldKey: "corp_renewals" },
  { key: "salesTaxDocuments", label: "Sales Tax", fieldKey: "sales_tax_documents" },
  { key: "payrollDocuments", label: "Payroll", fieldKey: "payroll_documents" },
  { key: "foodPermit", label: "Food Permit", fieldKey: "food_permit" },
  { key: "dbprLicenses", label: "DBPR Licenses", fieldKey: "dbpr_licenses" },
  { key: "incomeTax", label: "Income Tax", fieldKey: "income_tax" },
  { key: "businessTaxReceipt", label: "Business Tax Receipt", fieldKey: "business_tax_receipt" },
];
