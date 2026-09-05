import { useCallback, useEffect, useState } from 'react';
import type { Engineer, ProfessionalProfile, UserRole } from './types';
import { fetchEngineerByUserId, fetchProfessionalProfilesForUser } from './data';
import { useAuth } from './auth';
import { personPhoto } from './people';

export type ProfessionalRole = Exclude<UserRole, 'homeowner' | 'admin'>;

export const PROFESSIONAL_ROLES: ProfessionalRole[] = ['engineer', 'plumber', 'electrician', 'material_shop'];

export function isProfessionalRole(role: string): role is ProfessionalRole {
  return PROFESSIONAL_ROLES.includes(role as ProfessionalRole);
}

export function roleLabel(role: ProfessionalRole): string {
  const map: Record<ProfessionalRole, string> = {
    engineer: 'Civil Engineer',
    plumber: 'Plumber',
    electrician: 'Electrician',
    material_shop: 'Material Shop',
  };
  return map[role];
}

export function roleEmoji(role: ProfessionalRole): string {
  const map: Record<ProfessionalRole, string> = {
    engineer: '👷',
    plumber: '🔧',
    electrician: '⚡',
    material_shop: '🏬',
  };
  return map[role];
}

export function roleHomePath(role: ProfessionalRole): string {
  return role === 'engineer' ? '/app/engineer' : `/app/${role}`;
}

/** Maps a UserRole to the route the signed-in user should land on. */
export function roleLandingPath(role: UserRole): string {
  switch (role) {
    case 'engineer': return '/app/engineer';
    case 'plumber': return '/app/plumber';
    case 'electrician': return '/app/electrician';
    case 'material_shop': return '/app/material-shop';
    case 'admin': return '/app/admin';
    default: return '/app/dashboard';
  }
}

/** Engineer rows live in `engineers`; all other professionals in `professional_profiles`. */
export type ProfessionalProfileRow = Engineer | ProfessionalProfile;

export interface UseProfessionalProfileResult {
  profile: ProfessionalProfileRow | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useProfessionalProfile(role: ProfessionalRole): UseProfessionalProfileResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      if (role === 'engineer') {
        setProfile(await fetchEngineerByUserId(user.id));
      } else {
        // A user_id may have more than one profile row (prototype seed data).
        // Prefer the row that matches the signed-in account name.
        const rows = await fetchProfessionalProfilesForUser(user.id);
        const preferred = rows.find((r) => r.name === user.name) ?? rows[0] ?? null;
        setProfile(preferred);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}

export function profileName(p: ProfessionalProfileRow): string {
  if ('business_name' in p && p.business_name) return p.business_name;
  return p.name;
}

export function profileDisplayName(p: ProfessionalProfileRow): string {
  return p.name;
}

export function profilePhoto(p: ProfessionalProfileRow): string {
  return personPhoto('photo_url' in p ? p.photo_url : undefined, 'profession' in p ? p.profession : undefined);
}

export function isVerified(p: ProfessionalProfileRow | null): boolean {
  return p?.verification_status === 'verified';
}
