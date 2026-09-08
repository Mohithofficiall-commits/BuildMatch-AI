import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarRange, FolderKanban, Star, ShieldCheck, Award, Building2, Compass, Flame, Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useProfessionalProfile } from '@/lib/portal';
import { fetchEngineers, fetchProfessionalProfiles, fetchProjects } from '@/lib/data';
import type { Engineer, ProfessionalProfile, FeedPost, FeedComment, FeedCategory, AppUser, PostVisibility } from '@/lib/types';
import {
  fetchFeed, fetchComments, publishPost, addFeedComment, toggleFeedLike, repostPost,
  updateFeedPost, deleteFeedPost, toggleFeedSave, fetchSavedPostIds, deleteFeedComment,
  FEED_CATEGORIES,
} from '@/lib/feed';
import type { ComposerSubmit, MentionTarget } from '@/components/feed/PostComposer';
import { personPhoto, onPersonImgError } from '@/lib/people';
import { Badge, VerifiedBadge, RatingStars, ProgressBar } from '@/components/ui';
import PostComposer from '@/components/feed/PostComposer';
import FeedPostCard from '@/components/feed/FeedPostCard';

interface RailEngineer { id: string; name: string; photo: string; headline: string; location: string; rating: number; verified: boolean; }
interface RailPro { id: string; name: string; business: string | null; profession: string; photo: string; location: string; rating: number; verified: boolean; }

const TRENDING = [
  { label: 'Sustainable Construction', posts: 128 },
  { label: 'Smart Buildings', posts: 96 },
  { label: 'BIM & Digital Twins', posts: 74 },
  { label: 'AI in Construction', posts: 61 },
  { label: 'Structural Engineering', posts: 55 },
  { label: 'Green Architecture', posts: 41 },
];

type FeedView = 'all' | 'mine' | 'saved';

const SAVED_LS_KEY = 'bm_saved_posts';

export default function EngineerHomePage() {
  const { user } = useAuth();
  const { profile } = useProfessionalProfile('engineer');
  const navigate = useNavigate();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [demo, setDemo] = useState(false);
  const [feedReady, setFeedReady] = useState(false);
  const [category, setCategory] = useState<FeedCategory | 'all'>('all');
  const [view, setView] = useState<FeedView>('all');
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoaded, setCommentsLoaded] = useState<Set<string>>(new Set());
  const [commentsLoadingId, setCommentsLoadingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [engineers, setEngineers] = useState<RailEngineer[]>([]);
  const [pros, setPros] = useState<RailPro[]>([]);
  const [mentionTargets, setMentionTargets] = useState<MentionTarget[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ id: string; title: string }[]>([]);

  const eng = (profile as Engineer | null) ?? null;

  // ---- load feed, directory + my projects (once the engineer row is known) ----
  useEffect(() => {
    (async () => {
      try {
        const fetchPros = (): Promise<ProfessionalProfile[]> => fetchProfessionalProfiles().catch(() => []);
        const [feedRes, engs, profs, projects] = await Promise.all([
          fetchFeed(60),
          fetchEngineers().catch(() => [] as Engineer[]),
          fetchPros(),
          fetchProjects().catch(() => []),
        ]);
        setPosts(feedRes.posts);
        setDemo(feedRes.demo);

        const eRows = engs.filter((e) => !eng || e.id !== eng.id);
        setEngineers(eRows.slice(0, 4).map((e) => ({
          id: e.id, name: e.name, photo: personPhoto(e.photo_url, 'engineer'),
          headline: e.qualification || 'Civil Engineer', location: e.location, rating: e.rating,
          verified: e.verification_status === 'verified',
        })));
        setMentionTargets(eRows.slice(0, 10).map((e) => ({
          id: e.user_id ?? e.id, name: e.name, role: 'engineer', title: e.qualification,
          photo: personPhoto(e.photo_url, 'engineer'), verified: e.verification_status === 'verified',
        })));

        const pRows = profs;
        setPros(pRows.slice(0, 4).map((p) => ({
          id: p.id, name: p.name, business: p.business_name ?? null, profession: p.profession,
          photo: personPhoto(p.photo_url, p.profession), location: p.location, rating: p.rating,
          verified: p.verification_status === 'verified',
        })));
        setMentionTargets((prev) => [...prev, ...pRows.slice(0, 6).map((p) => ({
          id: p.user_id, name: p.name, role: p.profession, title: p.business_name,
          photo: personPhoto(p.photo_url, p.profession), verified: p.verification_status === 'verified',
        }))]);

        if (eng) {
          const mine = projects.filter((p) => p.engineer_id === eng.id || p.homeowner_id === user?.id);
          setProjectOptions(mine.map((p) => ({ id: p.id, title: p.title })));
        }
      } catch { /* non-fatal */ } finally { setFeedReady(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng]);

  // ---- saved posts ----
  useEffect(() => {
    if (!user) return;
    if (demo) {
      try {
        const stored = JSON.parse(localStorage.getItem(SAVED_LS_KEY) ?? '[]') as string[];
        setSavedIds(new Set(stored));
      } catch { setSavedIds(new Set()); }
      return;
    }
    void fetchSavedPostIds(user.id).then((ids) => setSavedIds(ids));
  }, [user, demo]);

  useEffect(() => {
    setPosts((prev) => prev.map((p) => ({ ...p, saved_by_me: savedIds.has(p.id) })));
  }, [savedIds]);

  useEffect(() => {
    if (!demo || !user) return;
    try { localStorage.setItem(SAVED_LS_KEY, JSON.stringify([...savedIds])); } catch { /* ignore */ }
  }, [demo, savedIds, user]);

  // ---- helpers ----
  const bumpPost = useCallback((id: string, patch: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const showError = useCallback((msg: string) => setNotice(msg), []);

  const authorMeta = useCallback(() => ({
    title: composeHeadline(user, eng),
    verified: eng?.verification_status === 'verified',
  }), [user, eng]);

  // ---- interactions ----
  const handlePublish = useCallback(async (input: ComposerSubmit) => {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    const { post, demo: d } = await publishPost(user, authorMeta(), input);
    setPosts((prev) => [post, ...prev]);
    if (d) setNotice('Published for this session — connect the database migration for live posting.');
    setBusy(false);
  }, [user, authorMeta]);

  const handleToggleLike = useCallback(async (post: FeedPost) => {
    if (!user) return;
    const nextLiked = !post.liked_by_me;
    bumpPost(post.id, { liked_by_me: nextLiked, likes_count: Math.max(0, post.likes_count + (nextLiked ? 1 : -1)) });
    if (demo) return;
    try {
      await toggleFeedLike(post, user.id, user.name);
    } catch {
      bumpPost(post.id, { liked_by_me: post.liked_by_me, likes_count: post.likes_count });
      showError('Could not update the like — try again.');
    }
  }, [bumpPost, demo, showError, user]);

  const loadComments = useCallback(async (postId: string) => {
    setCommentsLoadingId(postId);
    try {
      const list = await fetchComments(postId);
      setComments((prev) => ({ ...prev, [postId]: list }));
      setCommentsLoaded((prev) => new Set(prev).add(postId));
    } finally { setCommentsLoadingId(null); }
  }, []);

  const handleAddComment = useCallback(async (postId: string, content: string, parentId: string | null) => {
    if (!user) return;
    const tmp: FeedComment = {
      id: `local-${Date.now()}`, post_id: postId, author_user_id: user.id, author_name: user.name,
      author_role: user.role, author_photo_url: personPhoto(user.avatar_url, user.role),
      parent_id: parentId, content, created_at: new Date().toISOString(),
    };
    setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), tmp] }));
    bumpPost(postId, { comments_count: (posts.find((p) => p.id === postId)?.comments_count ?? 0) + 1 });
    if (demo) return;
    const author = posts.find((p) => p.id === postId);
    const saved = await addFeedComment(postId, author?.author_user_id ?? '', user.id, user.name, {
      author_user_id: user.id, author_name: user.name, author_role: user.role,
      author_photo_url: tmp.author_photo_url, content, parent_id: parentId,
    });
    if (saved) {
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []).filter((c) => c.id !== tmp.id), saved] }));
    }
  }, [bumpPost, demo, posts, user]);

  const handleDeleteComment = useCallback((commentId: string) => {
    setComments((prev) => {
      const next: Record<string, FeedComment[]> = {};
      for (const [k, list] of Object.entries(prev)) next[k] = list.filter((c) => c.id !== commentId);
      return next;
    });
    if (!demo) void deleteFeedComment(commentId).catch(() => undefined);
  }, [demo]);

  const handleSave = useCallback((post: FeedPost) => {
    if (!user) return;
    const nowSaved = !post.saved_by_me;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(post.id); else next.delete(post.id);
      return next;
    });
    if (!demo) void toggleFeedSave(post.id, user.id, post.saved_by_me === true).catch(() => showError('Could not save post.'));
  }, [demo, showError, user]);

  const handleRepost = useCallback(async (post: FeedPost, caption: string) => {
    if (!user) return;
    setBusy(true);
    const { post: repost, demo: d } = await repostPost(user, authorMeta(), post, caption);
    setPosts((prev) => [repost, ...prev]);
    if (d) setNotice('Repost added for this session.');
    setBusy(false);
  }, [authorMeta, user]);

  const handleEdit = useCallback(async (postId: string, content: string, location: string | null, visibility: string) => {
    const vis = (visibility || 'public') as PostVisibility;
    bumpPost(postId, { content, location, visibility: vis, edited_at: new Date().toISOString() });
    if (!demo) {
      try {
        await updateFeedPost(postId, { content, location, visibility: vis });
      } catch { showError('Edit saved locally only — database update failed.'); }
    }
  }, [bumpPost, demo, showError]);

  const handleDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSavedIds((prev) => { const n = new Set(prev); n.delete(postId); return n; });
    if (!demo) void deleteFeedPost(postId).catch(() => showError('Could not delete the post.'));
  }, [demo, showError]);

  // ---- derived views ----
  const originals = useMemo(() => {
    const map: Record<string, FeedPost> = {};
    for (const p of posts) {
      if (p.repost_of && !map[p.repost_of]) {
        const orig = posts.find((x) => x.id === p.repost_of);
        if (orig) map[p.repost_of] = orig;
      }
    }
    return map;
  }, [posts]);

  const visiblePosts = useMemo(() => {
    let list = posts;
    if (view === 'mine' && user) list = list.filter((p) => p.author_user_id === user.id);
    if (view === 'saved') list = list.filter((p) => p.saved_by_me);
    if (category !== 'all') list = list.filter((p) => p.category === category);
    const q = query.trim();
    if (q) {
      const lower = q.toLowerCase();
      const hashtag = q.startsWith('#') ? q.slice(1).toLowerCase() : null;
      list = list.filter((p) => {
        if (hashtag) return (p.hashtags ?? []).some((h) => h.toLowerCase() === hashtag) || p.content.toLowerCase().includes(hashtag);
        return p.content.toLowerCase().includes(lower) || p.author_name.toLowerCase().includes(lower) || (p.hashtags ?? []).some((h) => h.toLowerCase().includes(lower));
      });
    }
    return list;
  }, [category, posts, query, user, view]);

  const profileStrength = useMemo(() => {
    if (!eng) return 0;
    const checks = [Boolean(eng.bio), Boolean(eng.qualification), eng.specializations.length > 0, eng.projects_completed > 0, Boolean(eng.photo_url), eng.rating > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [eng]);

  const demoBanner = demo;

  return (
    <div className="px-4 lg:px-6 py-6 space-y-6">
      {notice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-800 flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-amber-600 hover:text-amber-900 text-sm font-bold shrink-0">✕</button>
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
                {eng?.availability && <Badge variant={eng.availability === 'Available' ? 'success' : 'navy'}>{eng.availability}</Badge>}
              </div>
            </div>
            <div className="flex gap-2 pt-9">
              {eng && <Link to={`/app/engineers/${eng.id}`} className="btn-primary text-sm px-4 py-2"><Award className="w-4 h-4" /> View public profile</Link>}
            </div>
          </div>

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

      <div className="xl:flex xl:items-start xl:gap-6">
        <div className="xl:flex-1 min-w-0 max-w-[720px] xl:max-w-none mx-auto w-full space-y-4">
          {demoBanner && (
            <div className="rounded-xl border border-royal-200 bg-royal-50/70 px-4 py-2.5 text-[12.5px] font-medium text-royal-800">
              <strong>Preview feed.</strong> The social_posts migration isn&apos;t applied yet — showing labelled demo activity with full compose preview. Apply the migration for live posting, media uploads and notifications.
            </div>
          )}

          {/* Search + view row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts, engineers, #hashtags…"
                className="input pl-9 pr-8 py-2 text-[13px]"
              />
              {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-600 text-sm">✕</button>}
            </div>
            <div className="flex items-center gap-1.5 bg-white rounded-xl border border-navy-100 p-1">
              {([['all', 'All'], ['mine', 'My Posts'], ['saved', 'Saved']] as [FeedView, string][]).map(([v, label]) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all ${view === v ? 'bg-navy-900 text-white' : 'text-navy-500 hover:text-navy-800'}`}>
                  {v === 'saved' && <Bookmark className="w-3 h-3 inline mr-1" />}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {FEED_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap border transition-all ${
                  category === c.value ? 'bg-navy-900 text-white border-navy-900 shadow-soft' : 'bg-white text-navy-600 border-navy-200 hover:border-navy-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {user && (
            <PostComposer
              user={user}
              demo={demo}
              busy={busy}
              mentionTargets={mentionTargets}
              projectOptions={projectOptions}
              onSubmit={handlePublish}
            />
          )}

          {!feedReady && <p className="text-sm muted px-1">Loading your network feed…</p>}
          {feedReady && visiblePosts.length === 0 && (
            <div className="card p-10 text-center">
              <Compass className="w-10 h-10 text-navy-200 mx-auto" />
              <p className="font-semibold text-navy-900 mt-3">Nothing here yet</p>
              <p className="text-sm muted mt-1">{view === 'saved' ? 'Posts you save will appear here.' : 'Be the first to share an update or discussion.'}</p>
            </div>
          )}

          {visiblePosts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              original={post.repost_of ? (originals[post.repost_of] ?? null) : null}
              demo={demo}
              isMine={Boolean(user && post.author_user_id === user.id)}
              currentUserId={user?.id}
              comments={comments[post.id] ?? []}
              commentsLoaded={commentsLoaded.has(post.id)}
              commentsLoading={commentsLoadingId === post.id}
              onToggleLike={handleToggleLike}
              onLoadComments={loadComments}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onSave={handleSave}
              onRepost={handleRepost}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTagClick={(t) => setQuery(`#${t}`)}
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
                <button key={t.label} onClick={() => setQuery(t.label.split(' ')[0])} className="w-full flex items-center gap-2.5 text-left group">
                  <span className="w-1.5 h-1.5 rounded-full bg-royal-500 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-navy-800 truncate group-hover:text-royal-700">{t.label}</span>
                  </span>
                  <span className="text-[11px] text-navy-400">{t.posts} posts</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function composeHeadline(user: AppUser | null, eng: Engineer | null): string {
  if (eng) return `Civil Engineer · ${eng.location}`;
  if (!user) return '';
  return user.location ? `${user.role} · ${user.location}` : user.role;
}
