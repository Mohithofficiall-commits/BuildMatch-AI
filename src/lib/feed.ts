import { supabase, isSupabaseConfigured } from './supabase';
import type { FeedPost, FeedComment, FeedCategory } from './types';

// ============================================================
// Category presentation metadata
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

// ============================================================
// Relative time formatting
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

// ============================================================
// Demo fallback feed (used until the network_feed migration is
// applied to the Supabase project). Mirrors the migration seed
// so the pre-live preview looks identical to the live feed.
// Clearly structured demo content — never mixed with real data.
// ============================================================

const DEMO_NOW = Date.now();
const hrs = (h: number) => new Date(DEMO_NOW - h * 3600_000).toISOString();

export const DEMO_FEED: FeedPost[] = [
  {
    id: 'demo-post-1', author_user_id: 'a1000000-0000-0000-0000-000000000003',
    author_name: 'Er. S. Karthik', author_role: 'engineer',
    author_title: 'Senior Civil Engineer · Structural & Residential Construction',
    author_photo_url: '/people/engineer-1.jpg', author_verified: true,
    category: 'project_update', image_url: '/project/construction-2.jpg',
    content: 'Site update — Dream Home (2BHK Modern), Coimbatore is now at the Roofing milestone at 60% overall progress. Structure phase completed on schedule and the foundation + structure milestones are verified with site evidence. Rajesh is on track with the bathroom plumbing rough-in. Thanks to Nishi Sharma for the seamless coordination!',
    likes_count: 3, comments_count: 2, liked_by_me: false, created_at: hrs(3),
  },
  {
    id: 'demo-post-2', author_user_id: 'a1000000-0000-0000-0000-000000000010',
    author_name: 'Rajesh Kumar', author_role: 'plumber',
    author_title: 'Master Plumber · Rajesh Plumbing Services',
    author_photo_url: '/people/plumber-1.jpg', author_verified: true,
    category: 'tip', image_url: null,
    content: 'Plumbing tip of the day: always pressure-test concealed pipes BEFORE tiling starts. A 30-minute test at working pressure catches joint leaks while they are still cheap to fix — after tiling, the same leak costs you a full bathroom redo.',
    likes_count: 1, comments_count: 0, liked_by_me: false, created_at: hrs(6),
  },
  {
    id: 'demo-post-3', author_user_id: 'a1000000-0000-0000-0000-000000000003',
    author_name: 'Er. S. Karthik', author_role: 'engineer',
    author_title: 'Senior Civil Engineer · Structural & Residential Construction',
    author_photo_url: '/people/engineer-1.jpg', author_verified: true,
    category: 'achievement', image_url: null,
    content: 'Proud milestone: 48 residential projects delivered across Tamil Nadu with a 94% on-time record and zero complaints logged. Grateful to every homeowner who trusted the process — and to the site teams who made it possible. On to the next 50.',
    likes_count: 2, comments_count: 0, liked_by_me: false, created_at: hrs(24),
  },
  {
    id: 'demo-post-4', author_user_id: 'a1000000-0000-0000-0000-000000000001',
    author_name: 'Nishi Sharma', author_role: 'homeowner',
    author_title: 'Homeowner · Dream Home project, Coimbatore',
    author_photo_url: '/people/homeowner-1.jpg', author_verified: false,
    category: 'discussion', image_url: null,
    content: 'To the incredible team on our Dream Home project — thank you Er. S. Karthik for the transparent milestone updates, and Rajesh for the careful plumbing work. Homeowners: ask for the verified reviews and trust scores before you hire. It makes all the difference.',
    likes_count: 0, comments_count: 0, liked_by_me: false, created_at: hrs(48),
  },
  {
    id: 'demo-post-5', author_user_id: 'a1000000-0000-0000-0000-000000000011',
    author_name: 'Suresh Kumar', author_role: 'electrician',
    author_title: 'Licensed Electrician · Spark Electricals',
    author_photo_url: '/people/electrician-1.jpg', author_verified: true,
    category: 'tip', image_url: null,
    content: 'Electrical safety checklist for new homes: (1) dedicated circuits for high-load appliances, (2) 30mA RCCB protection on every distribution board, (3) colour-coded wiring with a proper earthing pit, (4) label every breaker. Safety is not a line item — it is the design.',
    likes_count: 2, comments_count: 0, liked_by_me: false, created_at: hrs(52),
  },
  {
    id: 'demo-post-6', author_user_id: 'a1000000-0000-0000-0000-000000000012',
    author_name: 'Mohan Lal', author_role: 'material_shop',
    author_title: 'BuildMart Supplies · Coimbatore',
    author_photo_url: '/people/shop-1.jpg', author_verified: true,
    category: 'opportunity', image_url: null,
    content: 'BuildMart Supplies is now stocking UltraTech 53-grade cement and Fe500D TMT steel at our Coimbatore yard, with same-week delivery to site. Bulk quotes for contractors and engineers available — verified supplier with 4.5★ across 22 reviews.',
    likes_count: 2, comments_count: 1, liked_by_me: false, created_at: hrs(72),
  },
  {
    id: 'demo-post-7', author_user_id: 'a1000000-0000-0000-0000-000000000003',
    author_name: 'Er. S. Karthik', author_role: 'engineer',
    author_title: 'Senior Civil Engineer · Structural & Residential Construction',
    author_photo_url: '/people/engineer-1.jpg', author_verified: true,
    category: 'discussion', image_url: null,
    content: 'Discussion: precast vs cast-in-situ slabs for 2BHK construction in Coimbatore weather. Precast gives faster cycles and cleaner timelines; cast-in-situ is more forgiving with local labour and site access. What are your experiences with shrinkage cracking either way? Would value inputs from fellow structural engineers.',
    likes_count: 2, comments_count: 1, liked_by_me: false, created_at: hrs(96),
  },
  {
    id: 'demo-post-8', author_user_id: 'a1000000-0000-0000-0000-000000000002',
    author_name: 'BuildMatch Team', author_role: 'admin',
    author_title: 'BuildMatch AI · Platform Team',
    author_photo_url: '/people/admin-1.jpg', author_verified: true,
    category: 'news', image_url: null,
    content: 'BuildMatch tip: keep your certificates current in Verification to keep the Verified badge visible on your profile and in homeowner search results. Verification requests are reviewed by our admin team — upload identity + credential documents from your Verification tab.',
    likes_count: 0, comments_count: 0, liked_by_me: false, created_at: hrs(120),
  },
];

export const DEMO_COMMENTS: Record<string, FeedComment[]> = {
  'demo-post-1': [
    {
      id: 'demo-c1', post_id: 'demo-post-1', author_user_id: 'a1000000-0000-0000-0000-000000000010',
      author_name: 'Rajesh Kumar', author_role: 'plumber', author_photo_url: '/people/plumber-1.jpg',
      content: 'Roofing looks great, Karthik! Bathroom plumbing rough-in is complete and ready for your inspection.',
      created_at: hrs(2),
    },
    {
      id: 'demo-c2', post_id: 'demo-post-1', author_user_id: 'a1000000-0000-0000-0000-000000000011',
      author_name: 'Suresh Kumar', author_role: 'electrician', author_photo_url: '/people/electrician-1.jpg',
      content: 'Nice progress — I will be on site Thursday for the electrical first-fix walkthrough.',
      created_at: hrs(1),
    },
  ],
  'demo-post-6': [
    {
      id: 'demo-c3', post_id: 'demo-post-6', author_user_id: 'a1000000-0000-0000-0000-000000000003',
      author_name: 'Er. S. Karthik', author_role: 'engineer', author_photo_url: '/people/engineer-1.jpg',
      content: 'Booked a bulk quote for the Dream Home roofing phase — delivery expected next week.',
      created_at: hrs(70),
    },
  ],
  'demo-post-7': [
    {
      id: 'demo-c4', post_id: 'demo-post-7', author_user_id: 'a1000000-0000-0000-0000-000000000012',
      author_name: 'Mohan Lal', author_role: 'material_shop', author_photo_url: '/people/shop-1.jpg',
      content: 'We supply both. Precast gives cleaner timelines; cast-in-situ is more forgiving for local labour. Happy to quote either for your next project.',
      created_at: hrs(94),
    },
  ],
};

// ============================================================
// Supabase-backed feed API (works once the migration is applied)
// ============================================================

export interface FeedResult {
  posts: FeedPost[];
  demo: boolean;
}

export async function fetchFeed(limit = 50): Promise<FeedResult> {
  if (!isSupabaseConfigured) return { posts: [...DEMO_FEED], demo: true };
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    if (!data || data.length === 0) return { posts: [], demo: false };
    return { posts: (data as FeedPost[]).map((p) => ({ ...p, liked_by_me: false })), demo: false };
  } catch {
    // Migration not applied yet — show the clearly-labelled demo feed.
    return { posts: [...DEMO_FEED], demo: true };
  }
}

export interface NewFeedPost {
  author_user_id: string;
  author_name: string;
  author_role: string;
  author_title?: string;
  author_photo_url?: string;
  author_verified: boolean;
  category: FeedCategory;
  content: string;
}

export async function createFeedPost(input: NewFeedPost): Promise<FeedPost> {
  const { data, error } = await supabase.from('feed_posts').insert(input).select().single();
  if (error) throw error;
  return data as FeedPost;
}

export async function fetchComments(postId: string): Promise<FeedComment[]> {
  if (!isSupabaseConfigured) return DEMO_COMMENTS[postId] ?? [];
  try {
    const { data, error } = await supabase
      .from('feed_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as FeedComment[]) ?? [];
  } catch {
    return DEMO_COMMENTS[postId] ?? [];
  }
}

export async function addFeedComment(
  postId: string,
  c: Omit<FeedComment, 'id' | 'post_id' | 'created_at'>,
): Promise<FeedComment> {
  const { data, error } = await supabase.from('feed_comments').insert({ ...c, post_id: postId }).select().single();
  if (error) throw error;
  const { data: post } = await supabase.from('feed_posts').select('comments_count').eq('id', postId).single();
  const current = (post?.comments_count as number) ?? 0;
  await supabase.from('feed_posts').update({ comments_count: current + 1 }).eq('id', postId);
  return data as FeedComment;
}

/**
 * Toggle a like for the demo/anonymous user. Returns the new liked state.
 * Inserts or removes the row and keeps the stored counter consistent.
 */
export async function toggleFeedLike(postId: string, userId: string, currentlyLiked: boolean): Promise<boolean> {
  if (currentlyLiked) {
    const { error } = await supabase.from('feed_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    if (!error) {
      const { data: post } = await supabase.from('feed_posts').select('likes_count').eq('id', postId).single();
      const current = Math.max(0, (post?.likes_count as number) ?? 1);
      await supabase.from('feed_posts').update({ likes_count: current > 0 ? current - 1 : 0 }).eq('id', postId);
    }
    return false;
  }
  const { error } = await supabase.from('feed_post_likes').insert({ post_id: postId, user_id: userId });
  if (error) {
    // Already liked (unique conflict) — treat as liked.
    return true;
  }
  const { data: post } = await supabase.from('feed_posts').select('likes_count').eq('id', postId).single();
  const current = (post?.likes_count as number) ?? 0;
  await supabase.from('feed_posts').update({ likes_count: current + 1 }).eq('id', postId);
  return true;
}
