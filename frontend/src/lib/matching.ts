import type { Engineer, ProfessionalProfile, ProjectRequirement, MatchResult, MatchFactor, ProfessionalMatchResult } from './types';

// Weights — transparent, explainable, swappable for ML models later
export const MATCH_WEIGHTS = {
  budgetFit: 0.25,
  location: 0.20,
  experience: 0.15,
  specialization: 0.15,
  pastPerformance: 0.15,
  timeline: 0.10,
} as const;

export const TRUST_WEIGHTS = {
  verification: 0.20,
  projectHistory: 0.20,
  quality: 0.20,
  onTime: 0.15,
  budgetAdherence: 0.15,
  verifiedReviews: 0.10,
} as const;

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function budgetFitScore(engineer: Engineer, budget: number, area: number): { score: number; reason: string } {
  const engMin = engineer.price_min ?? engineer.price_per_sqft * area * 0.7;
  const engMax = engineer.price_max ?? engineer.price_per_sqft * area * 1.3;
  const estCost = engineer.price_per_sqft * area;
  if (budget >= engMin && budget <= engMax) {
    return { score: 95, reason: `Your budget of ₹${budget.toLocaleString('en-IN')} falls within this engineer's typical range (₹${engMin.toLocaleString('en-IN')}–₹${engMax.toLocaleString('en-IN')}).` };
  }
  if (estCost <= budget * 1.1 && estCost >= budget * 0.85) {
    return { score: 88, reason: `Estimated cost (₹${estCost.toLocaleString('en-IN')}) is close to your budget (₹${budget.toLocaleString('en-IN')}).` };
  }
  if (estCost > budget) {
    const over = Math.round(((estCost - budget) / budget) * 100);
    return { score: clamp(80 - over), reason: `Estimated cost (₹${estCost.toLocaleString('en-IN')}) exceeds your budget by ${over}%.` };
  }
  const under = Math.round(((budget - estCost) / budget) * 100);
  return { score: clamp(90 - under * 0.5), reason: `Estimated cost (₹${estCost.toLocaleString('en-IN')}) is ${under}% below your budget — good value.` };
}

function locationScore(engineer: Engineer, location: string): { score: number; reason: string } {
  const eng = engineer.location.toLowerCase();
  const req = location.toLowerCase();
  if (eng === req) return { score: 100, reason: `Engineer is based in ${engineer.location}, matching your project location exactly.` };
  if (eng.includes(req) || req.includes(eng)) return { score: 95, reason: `Engineer operates in ${engineer.location}, within your region (${location}).` };
  const tnCities = ['coimbatore', 'chennai', 'madurai', 'salem', 'pollachi'];
  const kaCities = ['bengaluru', 'bangalore', 'mysuru', 'mangalore'];
  const sameRegion =
    (tnCities.some((c) => eng.includes(c)) && tnCities.some((c) => req.includes(c))) ||
    (kaCities.some((c) => eng.includes(c)) && kaCities.some((c) => req.includes(c)));
  if (sameRegion) return { score: 85, reason: `Engineer is in ${engineer.location}, within the same region as ${location}.` };
  return { score: 60, reason: `Engineer is in ${engineer.location}, a different city from ${location}. Travel costs may apply.` };
}

function experienceScore(engineer: Engineer): { score: number; reason: string } {
  const exp = engineer.experience_years;
  const projects = engineer.projects_completed;
  let score = clamp(60 + exp * 2.5);
  if (exp >= 10) score = clamp(score + 10);
  if (projects >= 40) score = clamp(score + 5);
  return {
    score: clamp(score),
    reason: `${engineer.name} has ${exp} years of experience and ${projects} completed projects.`,
  };
}

function specializationScore(engineer: Engineer, req: ProjectRequirement): { score: number; reason: string } {
  const specs = engineer.specializations.map((s) => s.toLowerCase());
  const houseType = req.house_type.toLowerCase();
  const style = req.construction_style.toLowerCase();
  let matches = 0;
  const matched: string[] = [];
  if (specs.includes(houseType)) { matches++; matched.push(req.house_type); }
  if (specs.includes(style)) { matches++; matched.push(req.construction_style); }
  if (specs.includes('residential')) { matches += 0.5; matched.push('Residential'); }
  const score = clamp(60 + matches * 18);
  const reason = matches >= 2
    ? `Specializes in ${matched.join(', ')} — directly matching your requirements.`
    : matches >= 1
    ? `Specializes in ${matched.join(', ')}, partially matching your ${req.house_type} ${req.construction_style} project.`
    : `General residential engineer; no direct specialization match for ${req.house_type} ${req.construction_style}.`;
  return { score, reason };
}

function pastPerformanceScore(engineer: Engineer): { score: number; reason: string } {
  const onTime = engineer.on_time_pct;
  const budget = engineer.budget_adherence_pct;
  const quality = engineer.quality_score;
  const avg = Math.round((onTime + budget + quality) / 3);
  return {
    score: avg,
    reason: `On-time ${onTime}%, budget adherence ${budget}%, quality ${quality}/100 — averaging ${avg}/100.`,
  };
}

function timelineScore(engineer: Engineer, req: ProjectRequirement): { score: number; reason: string } {
  if (!req.expected_completion) return { score: 80, reason: 'No specific timeline provided; engineer availability is good.' };
  if (engineer.availability === 'Busy') return { score: 65, reason: 'Engineer is currently marked as Busy — timeline fit may be tight.' };
  if (engineer.availability === 'Available') return { score: 90, reason: 'Engineer is Available and can start per your timeline.' };
  return { score: 75, reason: `Engineer availability: ${engineer.availability}.` };
}

export function calculateMatch(engineer: Engineer, req: ProjectRequirement): MatchResult {
  const budget = budgetFitScore(engineer, req.budget, req.area_sqft);
  const location = locationScore(engineer, req.location);
  const experience = experienceScore(engineer);
  const specialization = specializationScore(engineer, req);
  const performance = pastPerformanceScore(engineer);
  const timeline = timelineScore(engineer, req);

  const factors: MatchFactor[] = [
    { label: 'Budget Fit', score: budget.score, weight: MATCH_WEIGHTS.budgetFit, weighted: 0, reason: budget.reason },
    { label: 'Location', score: location.score, weight: MATCH_WEIGHTS.location, weighted: 0, reason: location.reason },
    { label: 'Experience', score: experience.score, weight: MATCH_WEIGHTS.experience, weighted: 0, reason: experience.reason },
    { label: 'Specialization', score: specialization.score, weight: MATCH_WEIGHTS.specialization, weighted: 0, reason: specialization.reason },
    { label: 'Past Performance', score: performance.score, weight: MATCH_WEIGHTS.pastPerformance, weighted: 0, reason: performance.reason },
    { label: 'Timeline Fit', score: timeline.score, weight: MATCH_WEIGHTS.timeline, weighted: 0, reason: timeline.reason },
  ];

  factors.forEach((f) => { f.weighted = Math.round(f.score * f.weight); });
  const overallScore = Math.round(factors.reduce((sum, f) => sum + f.weighted, 0));

  const topFactors = [...factors].sort((a, b) => b.weighted - a.weighted).slice(0, 3);
  const explanation = `Recommended because ${engineer.name} has completed ${engineer.projects_completed} ${engineer.specializations[0]?.toLowerCase() ?? 'residential'} projects, operates in ${engineer.location}, fits your estimated budget and maintains ${engineer.on_time_pct}% on-time performance. Strongest factors: ${topFactors.map((f) => `${f.label} (${f.score}%)`).join(', ')}.`;

  return { engineer, overallScore, factors, explanation };
}

export function rankEngineers(engineers: Engineer[], req: ProjectRequirement): MatchResult[] {
  return engineers
    .map((e) => calculateMatch(e, req))
    .sort((a, b) => b.overallScore - a.overallScore);
}

// ============================================================
// Professional matching (plumbers, electricians, carpenters,
// masons, painters, fabricators, HVAC, material shops).
// Honest weighted scoring from real profile data only — when a
// field is missing the factor scores neutrally with an explicit
// "Not enough data" reason instead of inventing a value.
// ============================================================

export const PROFESSIONAL_MATCH_WEIGHTS = {
  location: 0.25,
  experience: 0.20,
  specialization: 0.20,
  reputation: 0.15,
  availability: 0.10,
  verification: 0.10,
} as const;

function professionalLocationScore(profile: ProfessionalProfile, location: string): { score: number; reason: string } {
  const loc = profile.location.toLowerCase();
  const area = (profile.service_area ?? '').toLowerCase();
  const req = location.toLowerCase();
  const covers = area && (area.includes(req) || req.split(',').some((t) => area.includes(lowerTrim(t))));
  if (loc === req) return { score: 100, reason: `Professional is based in ${profile.location}, matching your project location exactly.` };
  if (covers) return { score: 95, reason: `Service area (${profile.service_area}) covers ${location}.` };
  if (loc.includes(req) || req.includes(loc)) return { score: 90, reason: `Professional operates in ${profile.location}, within your region (${location}).` };
  const tnCities = ['coimbatore', 'chennai', 'madurai', 'salem', 'pollachi', 'tiruppur', 'erode', 'mettupalayam'];
  const kaCities = ['bengaluru', 'bangalore', 'mysuru', 'mangalore'];
  const sameRegion =
    (tnCities.some((c) => loc.includes(c)) && tnCities.some((c) => req.includes(c))) ||
    (kaCities.some((c) => loc.includes(c)) && kaCities.some((c) => req.includes(c)));
  if (sameRegion) return { score: 85, reason: `Professional is in ${profile.location}, within the same region as ${location}.` };
  return { score: 60, reason: `Professional is in ${profile.location}, a different city from ${location}. Travel costs may apply.` };
}

function lowerTrim(s: string): string {
  return s.trim().toLowerCase();
}

function professionalExperienceScore(profile: ProfessionalProfile): { score: number; reason: string } {
  const exp = profile.experience_years;
  const projects = profile.projects_completed;
  if (exp <= 0 && projects <= 0) {
    return { score: 55, reason: 'Not enough data — no experience or completed projects recorded yet.' };
  }
  let score = clamp(60 + exp * 2);
  if (exp >= 8) score = clamp(score + 8);
  if (projects >= 50) score = clamp(score + 5);
  if (projects >= 100) score = clamp(score + 3);
  return {
    score: clamp(score),
    reason: `${profile.name} has ${exp} years of experience and ${projects} completed projects.`,
  };
}

function professionalSpecializationScore(profile: ProfessionalProfile, req: ProjectRequirement): { score: number; reason: string } {
  const specs = profile.specializations.map((s) => s.toLowerCase());
  const skills = profile.skills.map((s) => s.toLowerCase());
  const all = [...specs, ...skills];
  if (all.length === 0) {
    return { score: 55, reason: 'Not enough data — no skills or specializations recorded yet.' };
  }
  let matches = 0;
  const matched: string[] = [];
  const houseType = req.house_type.toLowerCase();
  const style = req.construction_style.toLowerCase();
  if (specs.some((s) => s.includes(houseType) || houseType.includes(s))) { matches++; matched.push(req.house_type); }
  if (specs.some((s) => s.includes(style) || style.includes(s))) { matches++; matched.push(req.construction_style); }
  if (specs.some((s) => s.includes('residential') || s.includes('home') || s.includes('house'))) { matches += 0.5; matched.push('Residential'); }
  const score = clamp(60 + matches * 16);
  const reason = matches >= 1
    ? `Specializes in ${matched.join(', ')} — relevant to your ${req.house_type} ${req.construction_style} project.`
    : `Recorded skills (${all.slice(0, 3).join(', ')}) are general ${profile.profession.replace('_', ' ')} work; no direct match to ${req.house_type} ${req.construction_style} recorded.`;
  return { score, reason };
}

function professionalReputationScore(profile: ProfessionalProfile): { score: number; reason: string } {
  const rating = Number(profile.rating) || 0;
  const reviews = profile.reviews_count || 0;
  if (rating <= 0 || reviews <= 0) {
    return { score: 55, reason: 'Not enough data — no verified ratings or reviews recorded yet.' };
  }
  const score = clamp(Math.round((rating / 5) * 100) + Math.min(10, reviews));
  return {
    score: clamp(score),
    reason: `${rating.toFixed(1)}★ average across ${reviews} reviews — a real recorded reputation.`,
  };
}

function professionalAvailabilityScore(profile: ProfessionalProfile): { score: number; reason: string } {
  const a = profile.availability;
  if (!a) return { score: 60, reason: 'Not enough data — availability not recorded.' };
  if (a === 'Available') return { score: 90, reason: 'Marked as Available — can start per your timeline.' };
  if (a === 'Busy') return { score: 60, reason: 'Currently marked as Busy — timeline fit may be tight.' };
  return { score: 75, reason: `Availability: ${a}.` };
}

function professionalVerificationScore(profile: ProfessionalProfile): { score: number; reason: string } {
  const v = profile.verification_status;
  if (v === 'verified') return { score: 100, reason: 'Verification status is Verified — identity and credentials checked.' };
  if (v === 'pending') return { score: 70, reason: 'Verification is Pending — credentials not yet fully checked.' };
  if (v === 'rejected') return { score: 40, reason: 'Verification was Rejected — review before engaging.' };
  return { score: 60, reason: 'Not enough data — verification status not recorded.' };
}

export function calculateProfessionalMatch(profile: ProfessionalProfile, req: ProjectRequirement): ProfessionalMatchResult {
  const location = professionalLocationScore(profile, req.location);
  const experience = professionalExperienceScore(profile);
  const specialization = professionalSpecializationScore(profile, req);
  const reputation = professionalReputationScore(profile);
  const availability = professionalAvailabilityScore(profile);
  const verification = professionalVerificationScore(profile);

  const factors: MatchFactor[] = [
    { label: 'Location / Service Area', score: location.score, weight: PROFESSIONAL_MATCH_WEIGHTS.location, weighted: 0, reason: location.reason },
    { label: 'Experience', score: experience.score, weight: PROFESSIONAL_MATCH_WEIGHTS.experience, weighted: 0, reason: experience.reason },
    { label: 'Specialization', score: specialization.score, weight: PROFESSIONAL_MATCH_WEIGHTS.specialization, weighted: 0, reason: specialization.reason },
    { label: 'Reputation', score: reputation.score, weight: PROFESSIONAL_MATCH_WEIGHTS.reputation, weighted: 0, reason: reputation.reason },
    { label: 'Availability', score: availability.score, weight: PROFESSIONAL_MATCH_WEIGHTS.availability, weighted: 0, reason: availability.reason },
    { label: 'Verification', score: verification.score, weight: PROFESSIONAL_MATCH_WEIGHTS.verification, weighted: 0, reason: verification.reason },
  ];

  factors.forEach((f) => { f.weighted = Math.round(f.score * f.weight); });
  const overallScore = Math.round(factors.reduce((sum, f) => sum + f.weighted, 0));

  const topFactors = [...factors].sort((a, b) => b.weighted - a.weighted).slice(0, 3);
  const explanation = `Recommended ${profile.profession.replace('_', ' ')} for this project: ${profile.name} (${profile.business_name ?? 'independent'}) serves ${profile.service_area ?? profile.location} with ${profile.experience_years} years of experience and ${profile.projects_completed} completed projects. Strongest factors: ${topFactors.map((f) => `${f.label} (${f.score}%)`).join(', ')}.`;

  return { profile, overallScore, factors, explanation };
}

export function rankProfessionals(profiles: ProfessionalProfile[], req: ProjectRequirement): ProfessionalMatchResult[] {
  return profiles
    .map((p) => calculateProfessionalMatch(p, req))
    .sort((a, b) => b.overallScore - a.overallScore);
}

export function trustLevel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  return 'Needs Improvement';
}

export function riskLevelColor(level: string): string {
  switch (level) {
    case 'low': return 'emerald';
    case 'medium': return 'amber';
    case 'high': return 'rose';
    default: return 'navy';
  }
}
