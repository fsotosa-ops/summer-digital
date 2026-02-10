/**
 * API DTOs (Data Transfer Objects).
 *
 * Estas interfaces reflejan exactamente la estructura de los datos que vienen del Backend.
 * NO usar estas interfaces directamente en componentes de React; deben ser transformadas
 * por mappers/adapters a los modelos de dominio de la aplicación antes de su uso.
 */

// --- Auth DTOs ---

export interface ApiLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: ApiUser;
}

export interface ApiOAuthUrlResponse {
  url: string;
}

export interface ApiRegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface ApiPasswordResetRequest {
  email: string;
}

// --- Organization DTOs ---

export type ApiOrgType = 'community' | 'provider' | 'sponsor' | 'enterprise';

export interface ApiOrganization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  type: ApiOrgType;
  settings?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiOrgCreate {
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  type?: ApiOrgType;
  settings?: Record<string, unknown> | null;
  owner_user_id?: string | null;
}

export interface ApiOrgUpdate {
  name?: string | null;
  description?: string | null;
  logo_url?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface ApiMemberInvite {
  email: string;
  role?: ApiMemberRole;
}

export type ApiMemberRole = 'owner' | 'admin' | 'facilitador' | 'participante';
export type ApiMembershipStatus = 'active' | 'invited' | 'suspended' | 'inactive';

export interface ApiOrgMembership {
  id: string;
  organization_id: string;
  role: ApiMemberRole;
  status: ApiMembershipStatus;
  joined_at?: string | null;
  organization_name?: string | null;
  organization_slug?: string | null;
}

// --- User DTOs ---

export type ApiAccountStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted';

export interface ApiUser {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_platform_admin: boolean;
  status?: ApiAccountStatus;
  created_at?: string | null;
  updated_at?: string | null;
  organizations: ApiOrgMembership[];
}

// --- Admin User Management DTOs ---

export interface ApiPaginatedUsersResponse {
  users: ApiUser[];
  count: number;
}

export interface ApiAdminUserUpdate {
  full_name?: string;
  status?: ApiAccountStatus;
  is_platform_admin?: boolean;
}

// --- Journey & Steps DTOs ---

export type ApiStepType =
  | 'survey'
  | 'event_attendance'
  | 'content_view'
  | 'milestone'
  | 'social_interaction'
  | 'resource_consumption';

export interface ApiJourneyStep {
  id: string;
  journey_id: string;
  title: string;
  type: ApiStepType;
  order_index: number;
  config: Record<string, unknown>;
  gamification_rules: Record<string, unknown>;
}

export interface ApiJourney {
  id: string;
  title: string;
  description?: string | null;
  organization_id: string;
  is_active: boolean;
  category?: string | null;
  steps?: ApiJourneyStep[];
}

// --- Enrollment & Progress DTOs ---

export type ApiEnrollmentStatus = 'active' | 'completed' | 'dropped' | string;

export interface ApiEnrollment {
  id: string;
  user_id: string;
  journey_id: string;
  organization_id?: string | null;
  status: ApiEnrollmentStatus;
  current_step_index: number;
  progress_percentage: number;
  started_at: string;
  completed_at?: string | null;
}

export type ApiStepStatus = 'locked' | 'available' | 'completed';

export interface ApiStepProgress {
  step_id: string;
  title: string;
  type: string;
  order_index: number;
  status: ApiStepStatus;
  completed_at?: string | null;
  points_earned: number;
}

// --- Admin Journey DTOs ---

export interface ApiJourneyAdminRead {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_steps: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
}

export interface ApiJourneyCreate {
  title: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ApiJourneyUpdate {
  title?: string;
  slug?: string;
  description?: string | null;
  category?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// --- Organization Member DTOs ---

export interface ApiMemberResponse {
  id: string;
  organization_id: string;
  user_id: string;
  role: ApiMemberRole;
  status: ApiMembershipStatus;
  joined_at?: string | null;
  user?: {
    id: string;
    email: string;
    full_name?: string | null;
    is_platform_admin?: boolean;
  };
}

export interface ApiMemberUpdate {
  role?: ApiMemberRole | null;
  status?: ApiMembershipStatus | null;
}

export interface ApiMemberAdd {
  email: string;
  role?: ApiMemberRole;
}

export interface ApiBulkMemberItem {
  email: string;
  role?: ApiMemberRole;
}

export interface ApiBulkMemberAdd {
  members: ApiBulkMemberItem[];
}

export interface ApiBulkMemberResultItem {
  email: string;
  success: boolean;
  error?: string | null;
  member?: ApiMemberResponse | null;
}

export interface ApiBulkMemberAddResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: ApiBulkMemberResultItem[];
}

// --- Admin Step DTOs ---

export interface ApiStepAdminRead {
  id: string;
  journey_id: string;
  title: string;
  type: ApiStepType;
  order_index: number;
  config: Record<string, unknown>;
  gamification_rules: ApiGamificationRules;
  created_at: string;
  updated_at: string;
  total_completions: number;
  average_points: number;
}

export interface ApiGamificationRules {
  base_points?: number;
  bonus_rules?: Record<string, unknown>;
}

export interface ApiStepCreate {
  title: string;
  type: ApiStepType;
  order_index?: number | null;
  config?: Record<string, unknown>;
  gamification_rules?: ApiGamificationRules;
}

export interface ApiStepUpdate {
  title?: string | null;
  type?: ApiStepType | null;
  config?: Record<string, unknown> | null;
  gamification_rules?: ApiGamificationRules | null;
}

export interface ApiStepReorderItem {
  step_id: string;
  new_index: number;
}

export interface ApiStepReorderRequest {
  steps: ApiStepReorderItem[];
}

// --- Journey-Organization DTOs ---

export interface ApiJourneyOrganizationRead {
  id: string;
  journey_id: string;
  organization_id: string;
  assigned_at: string;
  assigned_by?: string | null;
}

export interface ApiJourneyOrganizationsResponse {
  journey_id: string;
  organizations: ApiJourneyOrganizationRead[];
  total: number;
}

export interface ApiJourneyOrganizationAssign {
  organization_ids: string[];
}

export interface ApiJourneyOrganizationUnassign {
  organization_ids: string[];
}

// --- Enrollment DTOs ---

export interface ApiEnrollmentCreate {
  journey_id: string;
  metadata?: Record<string, unknown>;
}

export interface ApiEnrollmentResponse {
  id: string;
  user_id: string;
  journey_id: string;
  status: string;
  current_step_index: number;
  progress_percentage: number;
  started_at: string;
  completed_at?: string | null;
}

// --- Journey Read (public) ---

export interface ApiJourneyRead {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  is_active: boolean;
  total_steps: number;
}

// --- Gamification DTOs ---

export interface ApiLevelRead {
  id: string;
  organization_id?: string | null;
  name: string;
  min_points: number;
  icon_url?: string | null;
  benefits: Record<string, unknown>;
  created_at: string;
}

export interface ApiLevelCreate {
  name: string;
  min_points: number;
  icon_url?: string | null;
  benefits?: Record<string, unknown>;
}

export interface ApiLevelUpdate {
  name?: string | null;
  min_points?: number | null;
  icon_url?: string | null;
  benefits?: Record<string, unknown> | null;
}

export interface ApiRewardRead {
  id: string;
  organization_id?: string | null;
  name: string;
  description?: string | null;
  type: string;
  icon_url?: string | null;
  unlock_condition: Record<string, unknown>;
}

export interface ApiRewardCreate {
  name: string;
  description?: string | null;
  type: string;
  icon_url?: string | null;
  unlock_condition?: Record<string, unknown>;
}

export interface ApiRewardUpdate {
  name?: string | null;
  description?: string | null;
  type?: string | null;
  icon_url?: string | null;
  unlock_condition?: Record<string, unknown> | null;
}

export interface ApiUserRewardRead {
  id: string;
  user_id: string;
  reward_id: string;
  earned_at: string;
  journey_id?: string | null;
  metadata: Record<string, unknown>;
  reward?: ApiRewardRead | null;
}

export interface ApiActivityRead {
  id: string;
  user_id: string;
  type: string;
  points_awarded: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiUserPointsSummary {
  total_points: number;
  current_level?: ApiLevelRead | null;
  next_level?: ApiLevelRead | null;
  points_to_next_level?: number | null;
  rewards: ApiUserRewardRead[];
  recent_activities: ApiActivityRead[];
}

export interface ApiUserRewardGrant {
  user_id: string;
  reward_id: string;
  journey_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ApiStepCompleteResponse {
  step_id: string;
  completed_at: string;
  enrollment_progress: number;
  points_earned: number;
}
