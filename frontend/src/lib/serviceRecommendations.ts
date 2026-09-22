// ============================================================
// UNIFIED AI SERVICE RECOMMENDATIONS
//
// Extends the existing explainable engineer matching to every
// BuildMatch service category:
//   Engineers · Plumbers · Electricians · Carpenters/Woodworkers ·
//   Furniture Providers · Interior Designers · Material Suppliers
//
// Rules inherited from lib/matching.ts:
//   • Only real directory data is scored — location, budget,
//     skills, experience, availability, verification, reviews.
//   • Every recommendation carries a factor-by-factor explanation.
//   • When no (or too little) data exists the category reports
//     `insufficientData: true` — scores are never invented.
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { rankEngineers, rankProfessionals } from './matching';
import { fetchEngineers, fetchProjects, fetchProfessionalProfiles } from './data';
import type {
  Engineer,
  Project,
  ProjectRequirement,
  ProfessionalProfile,
  ProfessionalMatchResult,
  MatchResult,
  ConstructionProfession,
} from './types';

export interface ServiceCategoryDef {
  /** 'engineer' uses the engineers table; others map to professional_profiles.profession. */
  key: 'engineer' | ConstructionProfession;
  label: string;
  /** Singular form for UI copy ("Select a Carpenter"). */
  singular: string;
  emoji: string;
  blurb: string;
}

/** The 7 AI-matched service categories in journey order. */
export const SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  { key: 'engineer', label: 'Engineers', singular: 'Engineer', emoji: '👷', blurb: 'Structural design, planning & supervision' },
  { key: 'plumber', label: 'Plumbers', singular: 'Plumber', emoji: '🔧', blurb: 'Pipes, drainage & fittings' },
  { key: 'electrician', label: 'Electricians', singular: 'Electrician', emoji: '⚡', blurb: 'Wiring, panels, lighting & safety' },
  { key: 'carpenter', label: 'Carpenters / Woodworkers', singular: 'Carpenter / Woodworker', emoji: '🪚', blurb: 'Furniture, doors, frames & interiors' },
  { key: 'furniture_provider', label: 'Furniture Providers', singular: 'Furniture Provider', emoji: '🛋️', blurb: 'Modular kitchens, wardrobes & sofas' },
  { key: 'interior_designer', label: 'Interior Designers', singular: 'Interior Designer', emoji: '🎨', blurb: 'Space planning, colours & turnkey interiors' },
  { key: 'material_shop', label: 'Material Suppliers', singular: 'Material Supplier', emoji: '🏬', blurb: 'Cement, steel, bricks, sand & hardware' },
];

/** A ranked recommendation list for one service category. */
export interface ServiceCategoryResult {
  category: ServiceCategoryDef;
  /** Directory rows considered for this category (0 → insufficient data). */
  dataCount: number;
  insufficientData: boolean;
  /** Ranked recommendations (engineers → MatchResult, professions → ProfessionalMatchResult). */
  engineers: MatchResult[];
  professionals: ProfessionalMatchResult[];
  /** Human-readable note about data availability. */
  dataNote: string;
}

export interface AllServiceRecommendations {
  loading: boolean;
  error: string | null;
  /** Real project requirement used for ranking (active project first, else sensible defaults). */
  requirement: ProjectRequirement;
  requirementSource: 'project' | 'default';
  categories: ServiceCategoryResult[];
}

const DEFAULT_REQ: ProjectRequirement = {
  location: 'Coimbatore',
  budget: 2800000,
  house_type: '2BHK',
  area_sqft: 1500,
  construction_style: 'Modern',
};

export function requirementFromProjects(projects: Project[]): { requirement: ProjectRequirement; source: 'project' | 'default' } {
  const p = projects.find((x) => x.status === 'active') ?? projects[0];
  if (!p) return { requirement: DEFAULT_REQ, source: 'default' };
  return {
    requirement: {
      location: p.location,
      budget: p.budget,
      house_type: p.house_type,
      area_sqft: p.area_sqft,
      construction_style: p.construction_style,
    },
    source: 'project',
  };
}

/** Rank one category from real directory rows. Never fabricates data. */
export function rankServiceCategory(
  category: ServiceCategoryDef,
  engineers: Engineer[],
  profilesByProfession: Map<ConstructionProfession, ProfessionalProfile[]>,
  req: ProjectRequirement
): ServiceCategoryResult {
  if (category.key === 'engineer') {
    const engineerResults = rankEngineers(engineers, req);
    return {
      category,
      dataCount: engineers.length,
      insufficientData: engineers.length === 0,
      engineers: engineerResults.slice(0, 3),
      professionals: [],
      dataNote:
        engineers.length === 0
          ? 'Insufficient data — no engineers are registered in the directory yet.'
          : `Ranked from ${engineers.length} registered engineers using budget, location, experience, specialization, past performance and timeline.`,
    };
  }

  const profiles = profilesByProfession.get(category.key as ConstructionProfession) ?? [];
  const results = rankProfessionals(profiles, req).slice(0, 3);
  return {
    category,
    dataCount: profiles.length,
    insufficientData: profiles.length === 0,
    engineers: [],
    professionals: results,
    dataNote:
      profiles.length === 0
        ? 'Insufficient data — no profiles are recorded for this service yet. Recommendations appear as professionals join and are verified.'
        : `Ranked from ${profiles.length} ${category.label.toLowerCase()} profiles using location, experience, specialization, reputation, availability and verification.`,
  };
}

/**
 * React hook: loads engineers + all professional profiles + projects once,
 * derives the requirement from the user's real project, and ranks all
 * 7 service categories. Existing pages can call this instead of
 * duplicating fetch/score logic.
 */
export function useAllServiceRecommendations(): AllServiceRecommendations & { reload: () => void } {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    projects: Project[];
    engineers: Engineer[];
    profiles: ProfessionalProfile[];
  }>({ loading: true, error: null, projects: [], engineers: [], profiles: [] });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const [eng, prof, proj] = await Promise.all([
          fetchEngineers(),
          fetchProfessionalProfiles(),
          fetchProjects(),
        ]);
        setState({ loading: false, error: null, engineers: eng, profiles: prof, projects: proj });
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Failed to load directory data' }));
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { requirement, source: requirementSource } = requirementFromProjects(state.projects);

  const categories = useMemo<ServiceCategoryResult[]>(() => {
    const byProfession = new Map<ConstructionProfession, ProfessionalProfile[]>();
    for (const p of state.profiles) {
      const arr = byProfession.get(p.profession) ?? [];
      arr.push(p);
      byProfession.set(p.profession, arr);
    }
    return SERVICE_CATEGORIES.map((c) => rankServiceCategory(c, state.engineers, byProfession, requirement));
  }, [state.engineers, state.profiles, requirement]);

  return { loading: state.loading, error: state.error, requirement, requirementSource, categories, reload: load };
}
