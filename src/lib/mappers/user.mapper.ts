import { User, UserRole } from '@/types';
import { ApiUser } from '@/types/api.types';
import { calculateRank } from '@/lib/gamification';

function mapUserRole(apiUser: ApiUser): UserRole {
  if (apiUser.is_platform_admin) return 'SuperAdmin';

  const membership = apiUser.organizations?.find(o => o.status === 'active');
  if (!membership) return 'Subscriber';

  switch (membership.role) {
    case 'owner':
    case 'admin':
      return 'Admin';
    case 'facilitador':
      return 'Admin';
    case 'participante':
    default:
      return 'Participant';
  }
}

export function mapApiUserToUser(apiUser: ApiUser): User {
  const activeMembership = apiUser.organizations?.find(o => o.status === 'active');
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
    avatarUrl: apiUser.avatar_url || undefined,
    lastConnection: apiUser.updated_at || new Date().toISOString(),
  };
}
