import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, CalendarRange, FolderKanban, Star, ShieldCheck, Award, Building2, Compass, Flame,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useProfessionalProfile } from '@/lib/portal';
import { fetchEngineers, fetchProfessionalProfiles } from '@/lib/data';
import type { Engineer, ProfessionalProfile, FeedPost, FeedComment, FeedCategory, AppUser } from '@/lib/types';
import {
  fetchFeed, fetchComments, createFeedPost, addFeedComment, toggleFeedLike, FEED_CATEGORIES,
} from '@/lib/feed';
import { personPhoto, onPersonImgError } from '@/lib/people';
import { Badge, VerifiedBadge, RatingStars, ProgressBar } from '@/components/ui';
import PostComposer from '@/components/feed/PostComposer';
import FeedPostCard from '@/components/feed/FeedPostCard';

interface RailEngineer {
  id: string;
  name: string;
  photo: string;
  headline: string;
  location: string;
  rating: number;
  verified: boolean;
}

interface RailPro {
  id: string;
  name: string;
  business: string | null;
  profession: string;
  photo: string;
  location: string;
  rating: number;
  verified: boolean;
}

const TRENDING = [
  { label: 'Sustainable Construction', posts: 128 },
  { label: 'Smart Buildings', posts: 96 },
  { label: 'BIM & Digital Twins', posts: 74 },
  { label: 'AI in Construction', posts: 61 },
  { label: 'Structural Engineering', posts: 55 },
  { label: 'Green Architecture', posts: 41 },
];

export default function EngineerHomePage() {
  const { user } = useAuth();
  const { profile, loading } = useProfessionalProfile('engineer');
  const navigate = useNavigate();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [demo, setDemo] = useState(false);
  const [filter, setFilter] = useState<FeedCategory | 'all'>('all');
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoaded, setCommentsLoaded] = useState<Set<string>>(new Set());
  const [commentsLoadingId, setCommentsLoadingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [engineers, setEngineers] = useState<RailEngineer[]>([]);
  const [pros, setPros] = useState<RailPro[]>([]);

  const eng = (profile as Engineer | null) ?? null;

  // Load feed + discovery rails once
  useEffect(() => {
    (async () => {
      try {
        const [feedRes, engs, profs] = await Promise.all([
          fetchFeed(50),
          fetchEngineers().catch(() => [] as Engineer[]),
          fetchProfessionalProfiles().catch(() => [] as ProfessionalProfile[]),
        ]);
        setPosts(feedRes.posts);
        setDemo(feedRes.demo);

        const engList = engs
          .filter((e) => !eng || e.id !== eng.id)
          .map((e) => ({
            id: e.id,
            name: e.name,
            photo: personPhoto(e.photo_url, 'engineer'),
            headline: e.qualification || 'Civil Engineer',
            location: e.location,
            rating: e.rating,
            verified: e.verification_status === 'verified',
          }));
        setEngineers(engList.slice(0, 4));

        const proList = profs.map((p) => ({
          id: p.id,
          name: p.name,
          business: p.business_name ?? null,
          profession: p.profession,
          photo: personPhoto(p.photo_url, p.profession),
          location: p.location,
          rating: p.rating,
          verified: p.verification_status === 'verified',
        }));
        setPros(proList.slice(0, 4));
      } catch {
        /* non-fatal */
      }
    })();
  }, [eng]);

  // ---------------- Feed interactions ----------------

  const bumpPost = useCallback((id: string, patch: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const handleToggleLike = useCallback(
    async (post: FeedPost) => {
      const nextLiked = !post.liked_by_me;
      const delta = nextLiked ? 1 : -1;
      // optimistic
      bumpPost(post.id, { liked_by_me: nextLiked, likes_count: Math.max(0, post.likes_count + delta) });
      if (demo || !user) return; // demo session keeps state locally
      try {
        await toggleFeedLike(post.id, user.id, Boolean(post.liked_by_me));
      } catch {
        bumpPost(post.id, { liked_by_me: post.liked_by_me, likes_count: post.likes_count });
        setErrorMsg('Could not update like — try again.');
      }
    },
    [bumpPost, demo, user],
  );

  const loadComments = useCallback(
    async (postId: string) => {
      setCommentsLoadingId(postId);
      try {
        const list = await fetchComments(postId);
        setComments((prev) => ({ ...prev, [postId]: list }));
        setCommentsLoaded((prev) => new Set(prev).add(postId));
      } catch {
        /* ignore */
      } finally {
        setCommentsLoadingId(null);
      }
    },
    [],
  );

  const handleAddComment = useCallback(
    async (postId: string, content: string) => {
      if (!user) return;
      const comment: FeedComment = {
        id: `local-${Date.now()}`,
        post_id: postId,
        author_user_id: user.id,
        author_name: user.name,
        author_role: user.role,
        author_photo_url: personPhoto(user.avatar_url, user.role),
        content,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
      bumpPost(postId, { comments_count: (posts.find((p) => p.id === postId)?.comments_count ?? 0) + 1 });
      if (demo) return;
      try {
        const saved = await addFeedComment(postId, {
          author_user_id: user.id,
          author_name: user.name,
          author_role: user.role,
          author_photo_url: comment.author_photo_url,
          content,
        });
        setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []).filter((c) => c.id !== comment.id), saved] }));
      } catch {
        setErrorMsg('Comment saved locally only — database write failed.');
      }
    },
    [bumpPost, demo, posts, user],
  );

  const handleCreatePost = useCallback(
    async (category: FeedCategory, content: string) => {
      if (!user) return;
      setBusy(true);
      setErrorMsg(null);
      const post: FeedPost = {
        id: `local-${Date.now()}`,
        author_user_id: user.id,
        author_name: user.name,
        author_role: user.role,
        author_title: composeHeadline(user, eng),
        author_photo_url: personPhoto(user.avatar_url, user.role),
        author_verified: eng?.verification_status === 'verified',
        category,
        content,
        image_url: null,
        likes_count: 0,
        comments_count: 0,
        liked_by_me: false,
        created_at: new Date().toISOString(),
      };
      setPosts((prev) => [post, ...prev]);
      if (demo) {
        setBusy(false);
        return;
      }
      try {
        const saved = await createFeedPost({
          author_user_id: user.id,
          author_name: user.name,
          author_role: user.role,
          author_title: post.author_title ?? undefined,
          author_photo_url: post.author_photo_url ?? undefined,
          author_verified: post.author_verified,
          category,
          content,
        });
        setPosts((prev) => prev.map((p) => (p.id === post.id ? saved : p)));
      } catch {
        setErrorMsg('Post published for this session — connect the database migration for live publishing.');
      } finally {
        setBusy(false);
      }
    },
    [demo, eng, user],
  );

  const visiblePosts = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.category === filter)),
    [filter, posts],
  );

  // ---------------- Render ----------------

  const profileStrength = useMemo(() => {
    if (!eng) return 0;
    let filled = 0;
    const checks = [
      Boolean(eng.bio),
      Boolean(eng.qualification),
      eng.specializations.length > 0,
      eng.projects_completed > 0,
      Boolean(eng.photo_url),
      eng.rating > 0,
    ];
    filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [eng]);

  return (
    <div className="px-4 lg:px-6 py-6 space-y-6">
      {errorMsg && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-800 flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-amber-600 hover:text-amber-900 text-sm font-bold shrink-0">✕</button>
        </div>
      )}

      {/* Hero profile card */}
      <div className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-navy-900 via-navy-800 to-royal-800 relative">
          <div className="absolute inset-0 bg-grid-navy [background-size:28px_28px] opacity-20" />
        </div>
        <div className="px-5 lg:px-7 pb-5 -mt-9 relative">
          <div className="flex flex-wrap items-end gap-4">
            <img
              src={eng ? personPhoto(eng.photo_url, 'engineer') : personPhoto(user?.avatar_url, user?.role)}
              alt={eng?.name ?? user?.name ?? ''}
              onError={(e) => onPersonImgError(e, 'engineer')}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-soft"
            />
            <div className="flex-1 min-w-[220px] pt-9">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-bold text-navy-900">{eng?.name ?? user?.name}</h1>
                {eng?.verification_status === 'verified' && <VerifiedBadge />}
              </div>
              <p className="text-[15px] text-navy-600 font-medium mt-0.5">{eng?.qualification ?? 'Civil Engineer'}</p>
              <div className="flex items-center gap-3 text-[13px] text-navy-500 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {eng?.location ?? user?.location ?? '—'}</span>
                <span className="inline-flex items-center gap-1"><CalendarRange className="w-3.5 h-3.5" /> {eng?.experience_years ?? 0}+ years experience</span>
                {eng?.availability && (
                  <Badge variant={eng.availability === 'Available' ? 'success' : 'navy'}>{eng.availability}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-9">
              {eng && (
                <Link to={`/app/engineers/${eng.id}`} className="btn-primary text-sm px-4 py-2">
                  <Award className="w-4 h-4" /> View public profile
                </Link>
              )}
            </div>
          </div>

          {/* Real stat chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
            {[
              { icon: FolderKanban, label: 'Projects completed', value: String(eng?.projects_completed ?? 0), tint: 'bg-royal-50 text-royal-700' },
              { icon: Star, label: 'Rating', value: eng && eng.rating > 0 ? `${eng.rating.toFixed(1)}★` : '—', tint: 'bg-amber-50 text-amber-600' },
              { icon: ShieldCheck, label: 'Verified reviews', value: String(eng?.reviews_count ?? 0), tint: 'bg-emerald-50 text-emerald-600' },
              { icon: Award, label: 'Trust score', value: eng ? `${eng.trust_score}/100` : '—', tint: 'bg-navy-50 text-navy-700' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-3.5 py-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.tint}`}><s.icon className="w-[18px] h-[18px]" /></div>
                <div className="min-w-0">
                  <p className="text-[11px] text-navy-400 leading-tight">{s.label}</p>
                  <p className="text-[15px] font-bold text-navy-900 leading-tight">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {eng?.specializations && eng.specializations.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              {eng.specializations.slice(0, 6).map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full bg-navy-100/80 text-navy-700 text-xs font-semibold">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feed + right rail */}
      <div className="xl:flex xl:items-start xl:gap-6">
        <div className="xl:flex-1 min-w-0 max-w-[720px] xl:max-w-none mx-auto w-full space-y-5">
          {demo && (
            <div className="rounded-xl border border-royal-200 bg-royal-50/70 px-4 py-2.5 text-[12.5px] font-medium text-royal-800">
              <strong>Preview feed.</strong> The network_feed migration isn&apos;t applied to this Supabase project yet — showing clearly-labelled demo network activity. Apply the migration for live posting.
            </div>
          )}

          {user && (
            <PostComposer
              user={user}
              demo={demo}
              busy={busy}
              onSubmit={handleCreatePost}
            />
          )}

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {FEED_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-all ${
                  filter === c.value
                    ? 'bg-navy-900 text-white border-navy-900 shadow-soft'
                    : 'bg-white text-navy-600 border-navy-200 hover:border-navy-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm muted px-1">Loading feed…</p>}
          {!loading && visiblePosts.length === 0 && (
            <div className="card p-10 text-center">
              <Compass className="w-10 h-10 text-navy-200 mx-auto" />
              <p className="font-semibold text-navy-900 mt-3">Nothing here yet</p>
              <p className="text-sm muted mt-1">Be the first to share a project update or discussion in this category.</p>
            </div>
          )}

          {visiblePosts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              demo={demo}
              comments={comments[post.id] ?? []}
              commentsLoaded={commentsLoaded.has(post.id)}
              commentsLoading={commentsLoadingId === post.id}
              onToggleLike={handleToggleLike}
              onLoadComments={loadComments}
              onAddComment={handleAddComment}
            />
          ))}
        </div>

        {/* Right rail */}
        <aside className="hidden xl:block w-[300px] shrink-0 space-y-5">
          {eng && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-navy-900 text-[15px]">Profile strength</p>
                <span className="text-xs font-bold text-navy-500">{profileStrength}%</span>
              </div>
              <ProgressBar value={profileStrength} color={profileStrength >= 70 ? 'emerald' : profileStrength >= 40 ? 'royal' : 'amber'} />
              <p className="text-[12px] text-navy-500 mt-2 leading-snug">
                {profileStrength >= 70 ? 'Strong profile — you appear with full detail in homeowner matches.' : 'Add your bio, portfolio and credentials to rank higher in homeowner matches.'}
              </p>
            </div>
          )}

          {engineers.length > 0 && (
            <div className="card p-5">
              <p className="font-bold text-navy-900 text-[15px] mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-royal-600" /> Engineers you may know</p>
              <div className="space-y-3">
                {engineers.map((e) => (
                  <button key={e.id} onClick={() => navigate(`/app/engineers/${e.id}`)} className="w-full flex items-center gap-3 text-left group">
                    <img src={e.photo} alt={e.name} onError={(err) => onPersonImgError(err, 'engineer')} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-navy-900 truncate group-hover:text-royal-700 transition-colors">{e.name}</span>
                      <span className="block text-[12px] text-navy-500 truncate">{e.headline}</span>
                      <span className="block text-[11.5px] text-navy-400 truncate">{e.location} · {e.rating.toFixed(1)}★{e.verified ? ' · ✓ Verified' : ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pros.length > 0 && (
            <div className="card p-5">
              <p className="font-bold text-navy-900 text-[15px] mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-royal-600" /> Professionals near you</p>
              <div className="space-y-3">
                {pros.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <img src={p.photo} alt={p.name} onError={(err) => onPersonImgError(err, p.profession)} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-navy-900 truncate">{p.business ?? p.name}</p>
                      <p className="text-[12px] text-navy-500 capitalize truncate">{p.profession}{p.verified ? ' · ✓ Verified' : ''}</p>
                    </div>
                    <RatingStars rating={p.rating} size="xs" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <p className="font-bold text-navy-900 text-[15px] mb-3">Trending in construction</p>
            <div className="space-y-2.5">
              {TRENDING.map((t) => (
                <div key={t.label} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-royal-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-navy-800 truncate">{t.label}</p>
                  </div>
                  <span className="text-[11px] text-navy-400">{t.posts} posts</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-navy-100">
              <p className="text-[11.5px] text-navy-400 leading-snug">Trend volume reflects professional activity in this demo network.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function composeHeadline(user: AppUser, eng: Engineer | null): string {
  if (eng) return `Civil Engineer · ${eng.location}`;
  return user.location ? `${user.role} · ${user.location}` : user.role;
}
