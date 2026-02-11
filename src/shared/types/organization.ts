export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export type OrgRole = 'owner' | 'admin' | 'member';

export interface OrgMember {
  id: number;
  org_id: string;
  user_id: string;
  role: OrgRole;
  joined_at: string;
  // Joined from profiles
  email?: string;
  display_name?: string;
  avatar_url?: string | null;
}

export interface OrgInvite {
  id: string;
  org_id: string;
  invited_email: string;
  invited_by: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  // Joined
  org_name?: string;
}

export interface OrgJoinRequest {
  id: string;
  org_id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  // Joined
  user_email?: string;
  user_display_name?: string;
}
