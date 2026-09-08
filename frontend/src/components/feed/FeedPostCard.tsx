import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ThumbsUp, MessageCircle, Repeat2, Bookmark, Link2, MoreHorizontal, Pencil, Trash2, Send,
  MapPin, Globe, Users, Lock, Home as HomeIcon, FolderKanban, X,
} from 'lucide-react';
import type { FeedPost, FeedComment } from '@/lib/types';
import { categoryMeta, timeAgo, visibilityLabel } from '@/lib/feed';
import { personPhoto, onPersonImgError, onProjectImgError } from '@/lib/people';
import { VerifiedBadge, Modal } from '@/components/ui';
import PostMedia from './PostMedia';

const VIS_ICON: Record<string, typeof Globe> = {
  public: Globe,
  connections: Users,
  team: Users,
  homeowner_team: HomeIcon,
  private: Lock,
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function RichText({ content, mentionNames, onTag }: { content: string; mentionNames: string[]; onTag: (t: string) => void }) {
  const parts = useMemo(() => {
    const names = [...new Set(mentionNames)].map(escapeRegex);
    const re = new RegExp(`(#[A-Za-z0-9_]+${names.length ? `|@${names.join('|')}` : ''})`, 'g');
    return content.split(re).filter(Boolean);
  }, [content, mentionNames]);
  return (
    <p className="text-[15px] leading-relaxed text-navy-800 whitespace-pre-line break-words">
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <button key={i} onClick={() => onTag(part.slice(1))} className="text-royal-700 font-medium hover:underline">
              {part}
            </button>
          );
        }
        if (part.startsWith('@')) {
          return <span key={i} className="text-royal-700 font-medium">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function AuthorHeader({ post, size = 'md' }: { post: FeedPost; size?: 'md' | 'sm' }) {
  const showBadge = post.author_verified && post.author_role !== 'homeowner';
  return (
    <div className="flex items-start gap-3">
      <img
        src={personPhoto(post.author_photo_url, post.author_role)}
        alt={post.author_name}
        onError={(e) => onPersonImgError(e, post.author_role)}
        className={`${size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'} rounded-full object-cover ring-1 ring-navy-100 shrink-0`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`${size === 'sm' ? 'text-[13.5px]' : 'text-[15px]'} font-semibold text-navy-900`}>{post.author_name}</p>
          {showBadge && <VerifiedBadge size="xs" />}
        </div>
        {post.author_title && (
          <p className={`${size === 'sm' ? 'text-[12px]' : 'text-[13px]'} text-navy-500 leading-snug`}>{post.author_title}</p>
        )}
      </div>
    </div>
  );
}

export default function FeedPostCard({
  post, original, comments, commentsLoaded, commentsLoading, demo, isMine, currentUserId,
  onToggleLike, onLoadComments, onAddComment, onDeleteComment, onSave, onRepost, onEdit, onDelete, onTagClick,
}: {
  post: FeedPost;
  original?: FeedPost | null;
  comments: FeedComment[];
  commentsLoaded: boolean;
  commentsLoading: boolean;
  demo?: boolean;
  isMine: boolean;
  currentUserId?: string | null;
  onToggleLike: (post: FeedPost) => void;
  onLoadComments: (postId: string) => void;
  onAddComment: (postId: string, content: string, parentId: string | null) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  onSave: (post: FeedPost) => void;
  onRepost: (post: FeedPost, caption: string) => Promise<void>;
  onEdit: (postId: string, content: string, location: string | null, visibility: string) => Promise<void>;
  onDelete: (postId: string) => void;
  onTagClick: (tag: string) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editLocation, setEditLocation] = useState(post.location ?? '');
  const [savingEdit, setSavingEdit] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [repostDraft, setRepostDraft] = useState('');
  const [reposting, setReposting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const meta = categoryMeta(post.category);
  const isRepost = Boolean(post.repost_of);
  const mentionNames = (post.mentions ?? []).map((m) => m.name).filter(Boolean) as string[];
  const VisIcon = VIS_ICON[post.visibility ?? 'public'] ?? Globe;
  const saveClicked = () => onSave(post);
  const mineComment = (c: FeedComment) => currentUserId != null && c.author_user_id === currentUserId;

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !commentsLoaded && !commentsLoading) onLoadComments(post.id);
  };

  const submitComment = async (parentId: string | null, text: string) => {
    const content = text.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      await onAddComment(post.id, content, parentId);
      if (parentId === null) setDraft('');
      else { setReplyDraft(''); setReplyTo(null); }
    } finally {
      setPosting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/app/engineer/post/${post.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
    setMenuOpen(false);
  };

  const saveEdit = async () => {
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await onEdit(post.id, editContent.trim(), editLocation.trim() || null, post.visibility ?? 'public');
      setEditMode(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const doRepost = async () => {
    if (reposting) return;
    setReposting(true);
    try {
      await onRepost(post, repostDraft.trim());
      setRepostOpen(false);
      setRepostDraft('');
    } finally {
      setReposting(false);
    }
  };

  // Group comments into a nested tree (1 level of replies).
  const { roots, repliesByParent } = useMemo(() => {
    const roots: FeedComment[] = [];
    const map: Record<string, FeedComment[]> = {};
    for (const c of comments) {
      if (c.parent_id) (map[c.parent_id] ??= []).push(c);
      else roots.push(c);
    }
    return { roots, repliesByParent: map };
  }, [comments]);

  const CommentRow = ({ c, depth }: { c: FeedComment; depth: number }) => (
    <div key={c.id} className="flex items-start gap-2.5" style={{ paddingLeft: depth * 24 }}>
      <img src={personPhoto(c.author_photo_url, c.author_role)} alt="" onError={(e) => onPersonImgError(e, c.author_role)} className="w-8 h-8 rounded-full object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-navy-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-navy-900">{c.author_name}</p>
            <span className="text-[11px] text-navy-400">{timeAgo(c.created_at)}</span>
            {mineComment(c) && (
              <button onClick={() => onDeleteComment(c.id)} title="Delete comment" className="text-navy-300 hover:text-rose-600 transition-colors ml-auto">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[13.5px] text-navy-700 leading-relaxed mt-0.5">{c.content}</p>
        </div>
        <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-[11.5px] font-semibold text-navy-400 hover:text-royal-700 px-1 py-0.5 mt-0.5">
          Reply
        </button>
        {replyTo === c.id && (
          <form
            onSubmit={(e) => { e.preventDefault(); void submitComment(c.id, replyDraft); }}
            className="flex items-center gap-2 mt-1.5"
          >
            <input
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Write a reply…"
              autoFocus
              className="flex-1 input text-[13px] py-1.5"
            />
            <button type="submit" disabled={!replyDraft.trim() || posting} className="btn-primary px-2.5 py-1.5 !rounded-lg" aria-label="Send reply">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
        {(repliesByParent[c.id] ?? []).map((rc) => <CommentRow key={rc.id} c={rc} depth={1} />)}
      </div>
    </div>
  );

  return (
    <article className="card overflow-hidden">
      <div className="p-5">
        {/* Repost indicator */}
        {isRepost && (
          <p className="text-[12.5px] font-semibold text-navy-500 mb-2.5 flex items-center gap-1.5">
            <Repeat2 className="w-3.5 h-3.5" /> {post.author_name} reposted
          </p>
        )}

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <AuthorHeader post={isRepost ? (original ?? post) : post} />
          </div>
          {/* Meta + menu */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-700" aria-label="Post menu">
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 card !p-1.5 shadow-xl animate-scale-in">
                    {isMine && (
                      <>
                        <button onClick={() => { setEditMode(true); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-navy-700 hover:bg-navy-50">
                          <Pencil className="w-3.5 h-3.5" /> Edit post
                        </button>
                        <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-rose-600 hover:bg-rose-50">
                          <Trash2 className="w-3.5 h-3.5" /> Delete post
                        </button>
                      </>
                    )}
                    <button onClick={saveClicked} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-navy-700 hover:bg-navy-50">
                      <Bookmark className="w-3.5 h-3.5" /> {post.saved_by_me ? 'Remove from saved' : 'Save post'}
                    </button>
                    <button onClick={() => void copyLink()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-navy-700 hover:bg-navy-50">
                      <Link2 className="w-3.5 h-3.5" /> Copy link
                    </button>
                  </div>
                </>
              )}
            </div>
            {copied && <span className="text-[11px] font-semibold text-emerald-600">Link copied ✓</span>}
          </div>
        </div>

        <div className="mt-1 text-xs text-navy-400 flex items-center gap-1.5 flex-wrap">
          {timeAgo(post.created_at)}
          {post.edited_at && <span className="text-navy-300 italic">(edited)</span>}
          <span className="inline-flex items-center gap-1"><VisIcon className="w-3 h-3" />{visibilityLabel(post.visibility)}</span>
          <span className={`px-1.5 py-px rounded-full text-[10px] font-semibold ${meta.chip}`}>{meta.label}</span>
        </div>

        {/* Edit mode */}
        {!isRepost && editMode ? (
          <div className="mt-3 space-y-2">
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className="input w-full resize-none py-3 text-[14px]" autoFocus />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-[13px] text-navy-600">
                <MapPin className="w-3.5 h-3.5 text-navy-400" />
                <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Add location" className="input text-[13px] py-1.5 w-44" />
              </label>
              <div className="flex-1" />
              <button onClick={() => setEditMode(false)} className="text-sm px-3 py-1.5 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50"><X className="w-3.5 h-3.5 inline mr-1" />Cancel</button>
              <button onClick={() => void saveEdit()} disabled={!editContent.trim() || savingEdit} className="btn-primary text-sm px-4 py-1.5">
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Repost: reposter caption then embedded original */}
            {isRepost && post.repost_caption && <div className="mt-3"><RichText content={post.repost_caption} mentionNames={[]} onTag={onTagClick} /></div>}
            {!isRepost && <div className="mt-3"><RichText content={post.content} mentionNames={mentionNames} onTag={onTagClick} /></div>}

            {isRepost && original && (
              <div className="mt-3 border border-navy-100 rounded-xl overflow-hidden">
                <div className="p-4">
                  <AuthorHeader post={original} size="sm" />
                  <div className="mt-2">
                    <RichText content={original.content} mentionNames={(original.mentions ?? []).map((m) => m.name).filter(Boolean) as string[]} onTag={onTagClick} />
                  </div>
                </div>
                {(original.media?.length ?? 0) > 0 && <div className="px-4 pb-4"><PostMedia media={original.media ?? []} /></div>}
                {(!original.media || original.media.length === 0) && original.image_url && (
                  <img src={original.image_url} alt="Project update" onError={onProjectImgError} className="w-full h-44 object-cover" />
                )}
              </div>
            )}
            {isRepost && !original && (
              <p className="mt-3 text-[13px] text-navy-400 italic">Original post is no longer available.</p>
            )}

            {!isRepost && (
              <div className="mt-3">
                <PostMedia media={post.media ?? []} />
                {(!post.media || post.media.length === 0) && post.image_url && (
                  <img src={post.image_url} alt="Project update" onError={onProjectImgError} className="w-full h-56 object-cover rounded-xl border border-navy-100" />
                )}
              </div>
            )}

            {/* Project + location + hashtags */}
            {(post.project_title || post.location) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-3">
                {post.project_title && (
                  <Link to={post.project_id ? `/app/projects/${post.project_id}` : '/app/engineer/projects'} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-50 text-navy-700 text-[12px] font-semibold hover:bg-navy-100 transition-colors">
                    <FolderKanban className="w-3.5 h-3.5" /> {post.project_title}
                  </Link>
                )}
                {post.location && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-50 text-navy-600 text-[12px] font-medium">
                    <MapPin className="w-3.5 h-3.5" /> {post.location}
                  </span>
                )}
              </div>
            )}
            {(post.hashtags ?? []).length > 0 && !isRepost && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {(post.hashtags ?? []).slice(0, 8).map((h) => (
                  <button key={h} onClick={() => onTagClick(h)} className="text-[12.5px] font-semibold text-royal-700 hover:underline">#{h}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center border-t border-navy-50 px-2 py-1">
        <button onClick={() => onToggleLike(post)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${post.liked_by_me ? 'text-royal-700' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'}`}>
          <ThumbsUp className={`w-4 h-4 ${post.liked_by_me ? 'fill-current' : ''}`} /> Like{post.likes_count > 0 && <span className="tabular-nums">{post.likes_count}</span>}
        </button>
        <button onClick={toggleComments} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${commentsOpen ? 'text-navy-800 bg-navy-50' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'}`}>
          <MessageCircle className="w-4 h-4" /> Comment{post.comments_count > 0 && <span className="tabular-nums">{post.comments_count}</span>}
        </button>
        <button onClick={() => setRepostOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-navy-500 hover:bg-navy-50 hover:text-navy-800 transition-colors">
          <Repeat2 className="w-4 h-4" /> Repost
        </button>
        <button onClick={saveClicked} title={post.saved_by_me ? 'Remove from saved' : 'Save post'} className={`p-2.5 rounded-lg transition-colors ${post.saved_by_me ? 'text-royal-700' : 'text-navy-400 hover:bg-navy-50 hover:text-navy-700'}`}>
          <Bookmark className={`w-4 h-4 ${post.saved_by_me ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Repost panel */}
      {repostOpen && (
        <div className="px-5 pb-4 border-t border-navy-50 pt-3 bg-[#FAFBFE] animate-fade-in">
          <p className="text-[13px] text-navy-700 mb-2 flex items-center gap-1.5"><Repeat2 className="w-3.5 h-3.5 text-royal-600" /> Share <strong className="text-navy-900">{post.author_name}</strong>’s post to your feed</p>
          <textarea value={repostDraft} onChange={(e) => setRepostDraft(e.target.value)} rows={2} placeholder="Say something about this (optional)…" className="input w-full resize-none py-2.5 text-[13.5px]" autoFocus />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setRepostOpen(false)} className="text-sm px-3 py-1.5 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50">Cancel</button>
            <button onClick={() => void doRepost()} disabled={reposting} className="btn-primary text-sm px-4 py-1.5">
              {reposting ? 'Reposting…' : 'Repost'}
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      {commentsOpen && (
        <div className="px-5 pb-4 space-y-3 border-t border-navy-50 pt-3 bg-[#FAFBFE]">
          {commentsLoading && <p className="text-xs text-navy-400 px-1">Loading comments…</p>}
          {!commentsLoading && roots.length === 0 && <p className="text-xs text-navy-400 px-1">No comments yet — start the conversation.</p>}
          {roots.map((c) => <CommentRow key={c.id} c={c} depth={0} />)}

          <form onSubmit={(e) => { e.preventDefault(); void submitComment(null, draft); }} className="flex items-center gap-2 pl-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={demo ? 'Add a comment (demo — not saved)' : 'Add a comment…'} className="flex-1 input text-sm py-2" disabled={posting} />
            <button type="submit" disabled={!draft.trim() || posting} className="btn-primary px-3 py-2 !rounded-xl" aria-label="Send comment">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this post?">
        <p className="text-sm text-navy-600">This removes the post from your feed, along with its likes and comments. This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setConfirmDelete(false)} className="text-sm px-4 py-2 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50">Cancel</button>
          <button onClick={() => { onDelete(post.id); setConfirmDelete(false); }} className="text-sm px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">Delete</button>
        </div>
      </Modal>

    </article>
  );
}
