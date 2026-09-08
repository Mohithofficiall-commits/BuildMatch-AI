import { supabase, isSupabaseConfigured } from './supabase';
import type {
  FeedPost, FeedComment, FeedCategory, FeedMediaItem, FeedMention, PostVisibility, AppUser,
} from './types';

// ============================================================
// Category + visibility presentation metadata
// ============================================================

export const FEED_CATEGORIES: { value: FeedCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'project_update', label: 'Project Updates' },
  { value: 'discussion', label: 'Discussions' },
  { value: 'tip', label: 'Tips' },
  { value: 'achievement', label: 'Achievements' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'news', label: 'News' },
];

export const CATEGORY_META: Record<FeedCategory, { label: string; chip: string; dot: string }> = {
  project_update: { label: 'Project Update', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  discussion: { label: 'Discussion', chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  tip: { label: 'Construction Tip', chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  achievement: { label: 'Achievement', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  opportunity: { label: 'Opportunity', chip: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  news: { label: 'News', chip: 'bg-navy-100 text-navy-700', dot: 'bg-navy-500' },
};

export function categoryMeta(category: string): { label: string; chip: string; dot: string } {
  return CATEGORY_META[category as FeedCategory] ?? CATEGORY_META.news;
}

export const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Visible to the whole BuildMatch network' },
  { value: 'connections', label: 'Connections only', hint: 'Professionals you have worked with' },
  { value: 'team', label: 'Project team', hint: 'Only professionals on the tagged project' },
  { value: 'homeowner_team', label: 'Homeowner + project team', hint: 'The homeowner and assigned team' },
  { value: 'private', label: 'Private', hint: 'Only you can see this post' },
];

export function visibilityLabel(v?: string | null): string {
  return VISIBILITY_OPTIONS.find((o) => o.value === v)?.label ?? 'Public';
}

// ============================================================
// Text utilities
// ============================================================

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function extractHashtags(content: string): string[] {
  const tags = content.match(/#([A-Za-z0-9_]+)/g);
  return tags ? [...new Set(tags.map((t) => t.slice(1)))] : [];
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================
// Demo fallback feed + notifications (used until the social_posts
// migration is applied). Clearly structured demo content — never
// mixed with real user data.
// ============================================================

const DEMO_NOW = Date.now();
const hrs = (h: number) => new Date(DEMO_NOW - h * 3600_000).toISOString();

export const DEMO_FEED: FeedPost[] = [
  {
    id: 'demo-post-9', author_user_id: 'a1000000-0000-0000-0000-000000000003',
    author_name: 'Er. S. Karthik', author_role: 'engineer',
    author_title: 'Senior Civil Engineer · Structural & Residential Construction',
    author_photo_url: '/people/engineer-1.jpg', author_verified: true,
    category: 'project_update', image_url: null,
    media: [
      { type: 'image', url: '/project/construction-2.jpg' },
      { type: 'image', url: '/project/materials-1.jpg' },
    ],
    visibility: 'public', location: 'Coimbatore, Tamil Nadu', project_id: 'b1000000-0000-0000-0000-000000000001', project_title: 'Dream Home — 2BHK Modern',
    hashtags: ['SiteProgress', 'StructuralEngineering', 'DreamHome'],
    content: 'First-floor slab is ready for the concrete pour at Dream Home. Reinforcement inspected and signed off this morning — rebar spacing, cover blocks and lapping all within spec. Great coordination with the site crew. #SiteProgress #StructuralEngineering #DreamHome',
    likes_count: 6, comments_count: 3, liked_by_me: false, saved_by_me: false, created_at: hrs(2),
  },
  {
    id: 'demo-post-1', author_user_id: 'a1000000-0000-0000-0000-000000000003',
    author_name: 'Er. S. Karthik', author_role: 'engineer',
    author_title: 'Senior Civil Engineer · Structural & Residential Construction',
    author_photo_url: '/people/engineer-1.jpg', author_verified: true,
    category: 'project_update', image_url: '/project/construction-2.jpg',
    visibility: 'public', location: 'Coimbatore', project_title: 'Dream Home — 2BHK Modern', project_id: 'b1000000-0000-0000-0000-000000000001',
    hashtags: ['ProjectUpdate'],
    content: 'Site update — Dream Home (2BHK Modern), Coimbatore is now at the Roofing milestone at 60% overall progress. Structure phase completed on schedule and the foundation + structure milestones are verified with site evidence. Rajesh is on track with the bathroom plumbing rough-in. Thanks to Nishi Sharma for the seamless coordination! #ProjectUpdate',
    likes_count: 3, comments_count: 2, liked_by_me: false, saved_by_me: false, created_at: hrs(3),
  },
  {
    id: 'demo-post-2', author_user_id: 'a1000000-0000-0000-0000-000000000010',
    author_name: 'Rajesh Kumar', author_role: 'plumber',
    author_title: 'Master Plumber · Rajesh Plumbing Services',
    author_photo_url: '/people/plumber-1.jpg', author_verified: true,
    category: 'tip', image_url: null,
    visibility: 'public', location: 'Coimbatore',
    hashtags: ['Plumbing', 'BathroomDesign'],
    mentions: [{ id: 'a1000000-0000-0000-0000-000000000011', name: 'Suresh Kumar', role: 'electrician' }],
    content: 'Leak-proof bathroom tip: slope the shower floor at 1:60 to the drain and waterproof 300mm up every wall before tiling. Coordinate the drain position with @Suresh Kumar before the slab pour — retrofitting a drain after casting is a nightmare. #Plumbing #BathroomDesign',
    likes_count: 4, comments_count: 1, liked_by_me: false, saved_by_me: false, created_at: hrs(6),
  },
  {
    id: 'demo-post-3', author_user_id: 'a1000000-0000-0000-0000-000000000003',
    author_name: 'Er. S. Karthik', author_role: 'engineer',
    author_title: 'Senior Civil Engineer · Structural & Residential Construction',
    author_photo_url: '/people/engineer-1.jpg', author_verified: true,
    category: 'achievement', image_url: null,
    visibility: 'public',
    hashtags: ['Milestone'],
    content: 'Proud milestone: 48 residential projects delivered across Tamil Nadu with a 94% on-time record and zero complaints logged. Grateful to every homeowner who trusted the process — and to the site teams who made it possible. On to the next 50. #Milestone',
    likes_count: 2, comments_count: 0, liked_by_me: false, saved_by_me: false, created_at: hrs(24),
  },
  {
    id: 'demo-post-4', author_user_id: 'a1000000-0000-0000-0000-000000000001',
    author_name: 'Nishi Sharma', author_role: 'homeowner',
    author_title: 'Homeowner · Dream Home project, Coimbatore',
    author_photo_url: '/people/homeowner-1.jpg', author_verified: false,
    category: 'discussion', image_url: null,
    visibility: 'public',
    content: 'To the incredible team on our Dream Home project — thank you Er. S. Karthik for the transparent milestone updates, and Rajesh for the careful plumbing work. Homeowners: ask for the verified reviews and trust scores before you hire. It makes all the difference.',
    likes_count: 1, comments_count: 0, liked_by_me: false, saved_by_me: false, created_at: hrs(48),
  },
  {
    id: 'demo-post-5', author_user_id: 'a1000000-0000-0000-0000-000000000011',
    author_name: 'Suresh Kumar', author_role: 'electrician',
    author_title: 'Licensed Electrician · Spark Electricals',
    author_photo_url: '/people/electrician-1.jpg', author_verified: true,
    category: 'tip', image_url: null,
    visibility: 'connections', location: 'Coimbatore',
    hashtags: ['ElectricalSafety'],
    content: 'Electrical safety checklist for new homes: (1) dedicated circuits for high-load appliances, (2) 30mA RCCB protection on every distribution board, (3) colour-coded wiring with a proper earthing pit, (4) label every breaker. Safety is not a line item — it is the design. #ElectricalSafety',
    likes_count: 2, comments_count: 0, liked_by_me: false, saved_by_me: false, created_at: hrs(52),
  },
  {
    id: 'demo-post-6', author_user_id: 'a1000000-0000-0000-0000-000000000012',
    author_name: 'Mohan Lal', author_role: 'material_shop',
    author_title: 'BuildMart Supplies · Coimbatore',
    author_photo_url: '/people/shop-1.jpg', author_verified: true,
    category: 'opportunity', image_url: null,
    visibility: 'public', location: 'Coimbatore',
    hashtags: ['Materials', 'SupplyChain'],
    content: 'BuildMart Supplies is now stocking UltraTech 53-grade cement and Fe500D TMT steel at our Coimbatore yard, with same-week delivery to site. Bulk quotes for contractors and engineers available — verified supplier with 4.5★ across 22 reviews. #Materials #SupplyChain',
    likes_count: 2, comments_count: 1, liked_by_me: false, saved_by_me: false, created_at: hrs(72),
  },
  {
    id: 'demo-post-7', author_user_id: 'a1000000-0000-0000-0000-000000000003',
    author_name: 'Er. S. Karthik', author_role: 'engineer',
    author_title: 'Senior Civil Engineer · Structural & Residential Construction',
    author_photo_url: '/people/engineer-1.jpg', author_verified: true,
    category: 'discussion', image_url: null,
    visibility: 'public',
    hashtags: ['StructuralEngineering'],
    content: 'Discussion: precast vs cast-in-situ slabs for 2BHK construction in Coimbatore weather. Precast gives faster cycles and cleaner timelines; cast-in-situ is more forgiving with local labour and site access. What are your experiences with shrinkage cracking either way? Would value inputs from fellow structural engineers. #StructuralEngineering',
    likes_count: 2, comments_count: 1, liked_by_me: false, saved_by_me: false, created_at: hrs(96),
  },
  {
    id: 'demo-post-8', author_user_id: 'a1000000-0000-0000-0000-000000000002',
    author_name: 'BuildMatch Team', author_role: 'admin',
    author_title: 'BuildMatch AI · Platform Team',
    author_photo_url: '/people/admin-1.jpg', author_verified: true,
    category: 'news', image_url: null,
    visibility: 'public',
    content: 'BuildMatch tip: keep your certificates current in Verification to keep the Verified badge visible on your profile and in homeowner search results. Verification requests are reviewed by our admin team — upload identity + credential documents from your Verification tab.',
    likes_count: 0, comments_count: 0, liked_by_me: false, saved_by_me: false, created_at: hrs(120),
  },
];

export const DEMO_COMMENTS: Record<string, FeedComment[]> = {
  'demo-post-9': [
    {
      id: 'demo-c5', post_id: 'demo-post-9', author_user_id: 'a1000000-0000-0000-0000-000000000011',
      author_name: 'Suresh Kumar', author_role: 'electrician', author_photo_url: '/people/electrician-1.jpg',
      content: 'Clean rebar work. Conduit first-fix for the first floor is done on my side — ready for the pour.', created_at: hrs(1),
    },
    {
      id: 'demo-c6', post_id: 'demo-post-9', parent_id: 'demo-c5', author_user_id: 'a1000000-0000-0000-0000-000000000003',
      author_name: 'Er. S. Karthik', author_role: 'engineer', author_photo_url: '/people/engineer-1.jpg',
      content: 'Thanks Suresh — pour is planned for Thursday 6am, weather permitting.', created_at: hrs(0.5),
    },
  ],
  'demo-post-1': [
    {
      id: 'demo-c1', post_id: 'demo-post-1', author_user_id: 'a1000000-0000-0000-0000-000000000010',
      author_name: 'Rajesh Kumar', author_role: 'plumber', author_photo_url: '/people/plumber-1.jpg',
      content: 'Roofing looks great, Karthik! Bathroom plumbing rough-in is complete and ready for your inspection.', created_at: hrs(2),
    },
    {
      id: 'demo-c2', post_id: 'demo-post-1', parent_id: 'demo-c1', author_user_id: 'a1000000-0000-0000-0000-000000000003',
      author_name: 'Er. S. Karthik', author_role: 'engineer', author_photo_url: '/people/engineer-1.jpg',
      content: 'Perfect — will walk it during Thursday site visit.', created_at: hrs(1.5),
    },
    {
      id: 'demo-c7', post_id: 'demo-post-1', author_user_id: 'a1000000-0000-0000-0000-000000000011',
      author_name: 'Suresh Kumar', author_role: 'electrician', author_photo_url: '/people/electrician-1.jpg',
      content: 'Nice progress — I will be on site Thursday for the electrical first-fix walkthrough.', created_at: hrs(1),
    },
  ],
  'demo-post-6': [
    {
      id: 'demo-c3', post_id: 'demo-post-6', author_user_id: 'a1000000-0000-0000-0000-000000000003',
      author_name: 'Er. S. Karthik', author_role: 'engineer', author_photo_url: '/people/engineer-1.jpg',
      content: 'Booked a bulk quote for the Dream Home roofing phase — delivery expected next week.', created_at: hrs(70),
    },
  ],
  'demo-post-7': [
    {
      id: 'demo-c4', post_id: 'demo-post-7', author_user_id: 'a1000000-0000-0000-0000-000000000012',
      author_name: 'Mohan Lal', author_role: 'material_shop', author_photo_url: '/people/shop-1.jpg',
      content: 'We supply both. Precast gives cleaner timelines; cast-in-situ is more forgiving for local labour. Happy to quote either for your next project.', created_at: hrs(94),
    },
  ],
  'demo-post-2': [
    {
      id: 'demo-c8', post_id: 'demo-post-2', author_user_id: 'a1000000-0000-0000-0000-000000000003',
      author_name: 'Er. S. Karthik', author_role: 'engineer', author_photo_url: '/people/engineer-1.jpg',
      content: 'Noted for the current project — drain position confirmed before the slab pour.', created_at: hrs(5),
    },
  ],
};

export interface DemoNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  created_at: string;
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  { id: 'demo-n1', type: 'like', title: 'Suresh Kumar liked your post', message: 'Suresh Kumar liked your project update “First-floor slab ready for pour”.', read: false, link: '/app/engineer', created_at: hrs(2) },
  { id: 'demo-n2', type: 'comment', title: 'Rajesh Kumar commented on your post', message: 'Rajesh Kumar: “Roofing looks great, Karthik! Bathroom plumbing rough-in is complete.”', read: false, link: '/app/engineer', created_at: hrs(1) },
  { id: 'demo-n3', type: 'mention', title: 'Mohan Lal mentioned you', message: 'Mohan Lal mentioned you in a comment about precast vs cast-in-situ.', read: true, link: '/app/engineer', created_at: hrs(26) },
  { id: 'demo-n4', type: 'system', title: 'Verification approved', message: 'Your identity verification was approved. Your Verified badge is now live.', read: false, link: '/app/engineer/verification', created_at: hrs(72) },
];

// ============================================================
// Notification helper (best-effort, permissive demo pattern)
// ============================================================

async function notify(userId: string | null | undefined, type: string, title: string, message: string, link: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('notifications').insert({ user_id: userId, type, title, message, link });
  } catch { /* non-fatal */ }
}

// ============================================================
// Supabase-backed post API
// ============================================================

export interface FeedResult {
  posts: FeedPost[];
  demo: boolean;
}

export async function fetchFeed(limit = 50): Promise<FeedResult> {
  if (!isSupabaseConfigured) return { posts: [...DEMO_FEED], demo: true };
  try {
    const { data, error } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    if (!data) return { posts: [], demo: false };
    const posts: FeedPost[] = (data as FeedPost[]).map((p) => ({ ...p, liked_by_me: false, saved_by_me: false }));
    // Load reposted originals so repost cards can render the original author + content.
    const repostIds = [...new Set(posts.map((p) => p.repost_of).filter(Boolean))] as string[];
    if (repostIds.length > 0) {
      const { data: orig, error: origErr } = await supabase.from('feed_posts').select('*').in('id', repostIds);
      if (!origErr && orig) {
        const seen = new Set(posts.map((p) => p.id));
        for (const row of orig as FeedPost[]) if (!seen.has(row.id)) posts.push(row);
      }
    }
    return { posts, demo: false };
  } catch {
    return { posts: [...DEMO_FEED], demo: true };
  }
}

export interface PublishAuthor {
  title?: string | null;
  verified: boolean;
}

export interface PublishInput {
  category: FeedCategory;
  content: string;
  media: FeedMediaItem[];
  visibility: PostVisibility;
  location?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  mentions: FeedMention[];
}

export interface PublishResult {
  post: FeedPost;
  demo: boolean;
}

async function uploadPostFile(file: File, userId: string): Promise<string | null> {
  try {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `posts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('post-media').upload(path, file, { contentType: file.type });
    if (error) return null;
    const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/** Publish a post: uploads files (when reachable), inserts a row, and returns the post. Falls back to a local demo post when the database is unreachable. */
export async function publishPost(user: AppUser, author: PublishAuthor, input: PublishInput, files: File[] = []): Promise<PublishResult> {
  const nowIso = new Date().toISOString();
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const localPost: FeedPost = {
    id: localId,
    author_user_id: user.id,
    author_name: user.name,
    author_role: user.role,
    author_title: author.title ?? null,
    author_photo_url: user.avatar_url ?? null,
    author_verified: author.verified,
    category: input.category,
    content: input.content,
    image_url: null,
    media: input.media,
    visibility: input.visibility,
    location: input.location || null,
    project_id: input.projectId || null,
    project_title: input.projectTitle || null,
    hashtags: extractHashtags(input.content),
    mentions: input.mentions,
    edited_at: null,
    likes_count: 0,
    comments_count: 0,
    liked_by_me: false,
    saved_by_me: false,
    created_at: nowIso,
  };

  // Upload files (parallel); keep the local preview URL when upload fails.
  const uploaded = await Promise.all(files.map((f) => uploadPostFile(f, user.id)));
  const media = input.media.map((m, i) => (uploaded[i] ? { ...m, url: uploaded[i] as string } : m));

  if (!isSupabaseConfigured) return { post: localPost, demo: true };

  try {
    const { data, error } = await supabase.from('feed_posts').insert({
      author_user_id: user.id,
      author_name: user.name,
      author_role: user.role,
      author_title: author.title ?? null,
      author_photo_url: user.avatar_url ?? null,
      author_verified: author.verified,
      category: input.category,
      content: input.content,
      media,
      visibility: input.visibility,
      location: input.location || null,
      project_id: input.projectId || null,
      project_title: input.projectTitle || null,
      hashtags: extractHashtags(input.content),
      mentions: input.mentions,
    }).select().single();
    if (error) throw error;
    const saved = data as FeedPost;
    for (const m of input.mentions) {
      if (m.id && m.id !== user.id) {
        await notify(m.id, 'mention', `${user.name} mentioned you`, `${user.name} mentioned you in a post.`, '/app/engineer');
      }
    }
    return { post: { ...saved, liked_by_me: false, saved_by_me: false }, demo: false };
  } catch {
    return { post: localPost, demo: true };
  }
}

export async function updateFeedPost(id: string, patch: { content?: string; location?: string | null; hashtags?: string[]; visibility?: PostVisibility }): Promise<void> {
  const updates: Record<string, unknown> = { edited_at: new Date().toISOString() };
  if (patch.content !== undefined) updates.content = patch.content;
  if (patch.location !== undefined) updates.location = patch.location || null;
  if (patch.visibility !== undefined) updates.visibility = patch.visibility;
  if (patch.hashtags !== undefined) updates.hashtags = patch.hashtags;
  const { error } = await supabase.from('feed_posts').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFeedPost(id: string): Promise<void> {
  const { error } = await supabase.from('feed_posts').delete().eq('id', id);
  if (error) throw error;
}

/** Repost a post (optionally with your own caption). The original is linked by id. */
export async function repostPost(user: AppUser, author: PublishAuthor, original: FeedPost, caption: string): Promise<PublishResult> {
  const nowIso = new Date().toISOString();
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const localPost: FeedPost = {
    id: localId,
    author_user_id: user.id,
    author_name: user.name,
    author_role: user.role,
    author_title: author.title ?? null,
    author_photo_url: user.avatar_url ?? null,
    author_verified: author.verified,
    category: original.category,
    content: caption || `Reposted ${original.author_name}’s update`,
    image_url: original.image_url,
    media: original.media,
    visibility: 'public',
    hashtags: extractHashtags(caption),
    edited_at: null,
    repost_of: original.id,
    repost_caption: caption || null,
    likes_count: 0,
    comments_count: 0,
    liked_by_me: false,
    saved_by_me: false,
    created_at: nowIso,
  };

  if (!isSupabaseConfigured) return { post: localPost, demo: true };
  try {
    const { data, error } = await supabase.from('feed_posts').insert({
      author_user_id: user.id,
      author_name: user.name,
      author_role: user.role,
      author_title: author.title ?? null,
      author_photo_url: user.avatar_url ?? null,
      author_verified: author.verified,
      category: original.category,
      content: caption || `Reposted ${original.author_name}’s update`,
      repost_of: original.id,
      repost_caption: caption || null,
      visibility: 'public',
    }).select().single();
    if (error) throw error;
    if (original.author_user_id !== user.id) {
      await notify(original.author_user_id, 'repost', `${user.name} reposted your post`, `${user.name} reposted “${original.content.slice(0, 60)}…”.`, '/app/engineer');
    }
    return { post: data as FeedPost, demo: false };
  } catch {
    return { post: localPost, demo: true };
  }
}

export async function toggleFeedLike(post: FeedPost, userId: string, actorName: string): Promise<boolean> {
  if (post.liked_by_me) {
    const { error } = await supabase.from('feed_post_likes').delete().eq('post_id', post.id).eq('user_id', userId);
    if (!error) await bumpCounter(post.id, 'likes_count', -1);
    return false;
  }
  const { error } = await supabase.from('feed_post_likes').insert({ post_id: post.id, user_id: userId });
  if (error) return true; // already liked (unique conflict)
  await bumpCounter(post.id, 'likes_count', 1);
  if (post.author_user_id !== userId) {
    await notify(post.author_user_id, 'like', `${actorName} liked your post`, `“${post.content.slice(0, 60)}…”`, '/app/engineer');
  }
  return true;
}

async function bumpCounter(postId: string, column: 'likes_count' | 'comments_count', delta: number): Promise<void> {
  try {
    const { data: post } = await supabase.from('feed_posts').select(column).eq('id', postId).single();
    const row = post as Record<string, unknown> | null;
    const current = Math.max(0, Number(row?.[column] ?? 0));
    await supabase.from('feed_posts').update({ [column]: Math.max(0, current + delta) }).eq('id', postId);
  } catch { /* non-fatal */ }
}

export async function fetchComments(postId: string): Promise<FeedComment[]> {
  if (!isSupabaseConfigured) return DEMO_COMMENTS[postId] ?? [];
  try {
    const { data, error } = await supabase.from('feed_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data as FeedComment[]) ?? [];
  } catch {
    return DEMO_COMMENTS[postId] ?? [];
  }
}

export interface AddCommentInput {
  author_user_id: string;
  author_name: string;
  author_role: string;
  author_photo_url?: string | null;
  content: string;
  parent_id?: string | null;
}

export async function addFeedComment(postId: string, postAuthorUserId: string, actorUserId: string, actorName: string, c: AddCommentInput): Promise<FeedComment | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('feed_comments').insert({ ...c, post_id: postId }).select().single();
    if (error) throw error;
    await bumpCounter(postId, 'comments_count', 1);
    if (postAuthorUserId !== actorUserId) {
      await notify(postAuthorUserId, 'comment', `${actorName} commented on your post`, `${actorName}: “${c.content.slice(0, 60)}…”`, '/app/engineer');
    }
    return data as FeedComment;
  } catch {
    return null;
  }
}

export async function deleteFeedComment(id: string): Promise<void> {
  const { error } = await supabase.from('feed_comments').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleFeedSave(postId: string, userId: string, currentlySaved: boolean): Promise<boolean> {
  if (currentlySaved) {
    const { error } = await supabase.from('feed_post_saves').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('feed_post_saves').insert({ post_id: postId, user_id: userId });
  if (error) throw error;
  return true;
}

export async function fetchSavedPostIds(userId: string): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  try {
    const { data, error } = await supabase.from('feed_post_saves').select('post_id').eq('user_id', userId);
    if (error) throw error;
    return new Set((data ?? []).map((r) => (r as { post_id: string }).post_id));
  } catch {
    return new Set();
  }
}
