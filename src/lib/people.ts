// Stable demo profile photos (local files in /public/people and /public/project).
// Every person photo in the app resolves through these helpers so a missing or
// broken database URL can never render a broken-image icon: `personPhoto`
// picks a role-appropriate local photo when the URL is empty, and the onError
// handlers swap the <img> to the same local photo when a URL fails to load.

const PEOPLE = '/people';
const PROJECT = '/project';

/** Role → local demo profile photo. Distinct realistic people per profession. */
export const DEMO_PHOTOS: Record<string, string> = {
  engineer: `${PEOPLE}/engineer-1.jpg`,
  civil_engineer: `${PEOPLE}/engineer-1.jpg`,
  structural_engineer: `${PEOPLE}/engineer-3.jpg`,
  electrical_engineer: `${PEOPLE}/engineer-7.jpg`,
  architect: `${PEOPLE}/engineer-4.jpg`,
  plumber: `${PEOPLE}/plumber-1.jpg`,
  electrician: `${PEOPLE}/electrician-1.jpg`,
  mechanic: `${PEOPLE}/mechanic-1.jpg`,
  carpenter: `${PEOPLE}/carpenter-1.jpg`,
  mason: `${PEOPLE}/mason-1.jpg`,
  painter: `${PEOPLE}/painter-1.jpg`,
  contractor: `${PEOPLE}/contractor-1.jpg`,
  site_supervisor: `${PEOPLE}/supervisor-1.jpg`,
  supervisor: `${PEOPLE}/supervisor-1.jpg`,
  project_manager: `${PEOPLE}/pm-1.jpg`,
  pm: `${PEOPLE}/pm-1.jpg`,
  homeowner: `${PEOPLE}/homeowner-1.jpg`,
  client: `${PEOPLE}/homeowner-2.jpg`,
  material_shop: `${PEOPLE}/shop-1.jpg`,
  shop: `${PEOPLE}/shop-1.jpg`,
  admin: `${PEOPLE}/admin-1.jpg`,
  worker: `${PEOPLE}/man-1.jpg`,
  woman: `${PEOPLE}/woman-1.jpg`,
  man: `${PEOPLE}/man-1.jpg`,
};

/** Generic demo portraits when no specific role is known. */
export const DEFAULT_PHOTO = `${PEOPLE}/man-1.jpg`;
export const DEFAULT_MAN_PHOTO = `${PEOPLE}/man-1.jpg`;
export const DEFAULT_WOMAN_PHOTO = `${PEOPLE}/woman-1.jpg`;

/** Non-person fallbacks for project / evidence / material images. */
export const PROJECT_PHOTO_FALLBACK = `${PROJECT}/construction-2.jpg`;
export const MATERIAL_PHOTO_FALLBACK = `${PROJECT}/materials-1.jpg`;

/** Local demo photo for a profession/role (falls back to a generic portrait). */
export function photoForRole(role?: string | null): string {
  if (role && DEMO_PHOTOS[role]) return DEMO_PHOTOS[role];
  return DEFAULT_PHOTO;
}

/**
 * Resolve a person photo: use the provided URL when it is a non-empty string,
 * otherwise fall back to a role-appropriate demo photo.
 */
export function personPhoto(url?: string | null, role?: string | null): string {
  if (url && typeof url === 'string' && url.trim() !== '') return url.trim();
  return photoForRole(role);
}

/**
 * onError handler for person images: swaps a failed image to a local
 * role-appropriate demo photo exactly once (no infinite retry loop).
 */
export function onPersonImgError(e: React.SyntheticEvent<HTMLImageElement>, role?: string | null): void {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = photoForRole(role);
}

/** onError handler for project/portfolio/evidence images. */
export function onProjectImgError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = PROJECT_PHOTO_FALLBACK;
}

/** onError handler for material/product images. */
export function onMaterialImgError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = MATERIAL_PHOTO_FALLBACK;
}