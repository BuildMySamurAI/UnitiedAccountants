import { ProfileAutoSaveField } from "./profile-auto-save-field";

type ContactDetails = { first_name: string | null; last_name: string | null; phone: string | null };
type OwnerInfo = { owner_legal_name: string | null; owner_ssn: string | null; owner_date_of_birth: string | null; owner_address: string | null };

// Email is deliberately excluded - it's the Supabase Auth login identifier,
// changing it needs the dedicated auth email-change flow, not a plain edit.
export function ContactDetailsCard({ profileId, profile }: { profileId: string; profile: ContactDetails }) {
  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Contact Details</h3>
      </header>
      <ProfileAutoSaveField profileId={profileId} fieldKey="firstName" label="First Name" initialValue={profile.first_name ?? ""} />
      <ProfileAutoSaveField profileId={profileId} fieldKey="lastName" label="Last Name" initialValue={profile.last_name ?? ""} />
      <ProfileAutoSaveField profileId={profileId} fieldKey="phone" label="Phone" initialValue={profile.phone ?? ""} type="tel" />
    </div>
  );
}

export function OwnerInformationCard({ profileId, profile }: { profileId: string; profile: OwnerInfo }) {
  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Owner Information</h3>
        <span className="hint">visible to the client and staff - not tied to portal access</span>
      </header>
      <ProfileAutoSaveField profileId={profileId} fieldKey="ownerLegalName" label="Owner Legal Name" initialValue={profile.owner_legal_name ?? ""} />
      <ProfileAutoSaveField profileId={profileId} fieldKey="ownerSsn" label="SSN" initialValue={profile.owner_ssn ?? ""} />
      <ProfileAutoSaveField profileId={profileId} fieldKey="ownerDateOfBirth" label="Date of Birth" initialValue={profile.owner_date_of_birth ?? ""} type="date" />
      <ProfileAutoSaveField profileId={profileId} fieldKey="ownerAddress" label="Home Address" initialValue={profile.owner_address ?? ""} />
    </div>
  );
}

export function ContactInfoPanel({ profileId, profile }: { profileId: string; profile: ContactDetails & OwnerInfo }) {
  return (
    <>
      <ContactDetailsCard profileId={profileId} profile={profile} />
      <OwnerInformationCard profileId={profileId} profile={profile} />
    </>
  );
}
