import { User, UserRole } from '@/types';
import { ApiUser, ApiOrgMembership } from '@/types/api.types';
import { calculateRank } from '@/lib/gamification';

const ROLE_PRIORITY: Record<string, number> = {
  owner: 4, admin: 3, facilitador: 2, participante: 1,
};

function findBestMembership(orgs: ApiOrgMembership[] | undefined): ApiOrgMembership | undefined {
  if (!orgs) return undefined;
  const active = orgs.filter(o => o.status === 'active');
  if (active.length === 0) return undefined;
  return active.sort((a, b) => {
    const roleDiff = (ROLE_PRIORITY[b.role] ?? 0) - (ROLE_PRIORITY[a.role] ?? 0);
    if (roleDiff !== 0) return roleDiff;
    // Tiebreak: oldest joined_at first (original membership over auto-assigned)
    const aTime = a.joined_at ? new Date(a.joined_at).getTime() : Infinity;
    const bTime = b.joined_at ? new Date(b.joined_at).getTime() : Infinity;
    return aTime - bTime;
  })[0];
}

function mapUserRole(apiUser: ApiUser): UserRole {
  if (apiUser.is_platform_admin) return 'SuperAdmin';

  const best = findBestMembership(apiUser.organizations);
  if (!best) return 'Subscriber';

  switch (best.role) {
    case 'owner':
    case 'admin':
    case 'facilitador':
      return 'Admin';
    case 'participante':
    default:
      return 'Participant';
  }
}

export function mapApiUserToUser(apiUser: ApiUser): User {
  const activeMembership = findBestMembership(apiUser.organizations);
  const oasisScore = 0;

  return {
    id: apiUser.id,
    name: apiUser.full_name || apiUser.email.split('@')[0],
    email: apiUser.email,
    role: mapUserRole(apiUser),
    oasisScore,
    rank: calculateRank(oasisScore),
    medals: [],
    organizationId: activeMembership?.organization_id,
    organizationSlug: activeMembership?.organization_slug || undefined,
    avatarUrl: apiUser.avatar_url || undefined,
    lastConnection: apiUser.updated_at || new Date().toISOString(),
  };
}
