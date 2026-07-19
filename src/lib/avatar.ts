// Shared avatar-initials logic — was copy-pasted identically across 5
// components (admin overview/subscriptions/permissions/restaurants views,
// dashboard staff-management). Name-based: callers that only have an email
// (e.g. staff-management's invited-but-unnamed team members) derive a
// display name first (see displayNameOf in staff-management.tsx) and pass
// that in, rather than this module guessing at email formats.
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
