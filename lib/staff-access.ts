import { ASSIGNABLE_SERVICES, type AssignableServiceKey } from "@/lib/service-assignment";
import { STAFF_FIELD_GROUPS, STAFF_FILE_FIELDS } from "@/lib/ghl/staff-fields";
import { SHARED_BOOKKEEPING_FILE_FIELDS, CLIENT_BOOKKEEPING_FILE_FIELDS } from "@/lib/ghl/bookkeeping-file-fields";
import { FIELD_KEY_BY_ID, type OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";

export type StaffAssignmentContext = {
  assignedServices: Set<AssignableServiceKey>;
  isCompanyLevelAssignee: boolean;
};

type AssignmentColumns = {
  assigned_team_member_id: string | null;
} & Record<(typeof ASSIGNABLE_SERVICES)[number]["dbColumn"], string | null>;

export function staffAssignmentContext(company: AssignmentColumns, staffId: string): StaffAssignmentContext {
  const assignedServices = new Set<AssignableServiceKey>();
  for (const service of ASSIGNABLE_SERVICES) {
    if (company[service.dbColumn] === staffId) assignedServices.add(service.key);
  }
  return { assignedServices, isCompanyLevelAssignee: company.assigned_team_member_id === staffId };
}

// undefined service = general/shared, always visible. The company-level
// assignee is an overseer and sees every service regardless of their
// individual service assignments.
export function canSeeService(service: AssignableServiceKey | undefined, ctx: StaffAssignmentContext): boolean {
  if (!service) return true;
  if (ctx.isCompanyLevelAssignee) return true;
  return ctx.assignedServices.has(service);
}

const BOOKKEEPING_DOCUMENT_KEYS = new Set<string>([
  ...SHARED_BOOKKEEPING_FILE_FIELDS.map((f) => f.key),
  ...CLIENT_BOOKKEEPING_FILE_FIELDS.map((f) => f.key),
]);

// Which assignable service a GHL field belongs to, keyed by its field id
// (what every save/upload action already receives) - undefined for general
// fields not tied to one of the 4 services.
export function fieldAssignableServiceById(ghlFieldId: string): AssignableServiceKey | undefined {
  const key = FIELD_KEY_BY_ID[ghlFieldId];
  if (!key) return undefined;
  if (BOOKKEEPING_DOCUMENT_KEYS.has(key)) return "bookkeeping";
  for (const group of STAFF_FIELD_GROUPS) {
    if (group.fields.some((f) => f.key === key)) return group.assignableService;
  }
  const fileField = STAFF_FILE_FIELDS.find((f) => f.key === key);
  if (fileField) return fileField.assignableService;
  return undefined;
}

export function canEditField(ghlFieldId: string, ctx: StaffAssignmentContext): boolean {
  return canSeeService(fieldAssignableServiceById(ghlFieldId), ctx);
}
