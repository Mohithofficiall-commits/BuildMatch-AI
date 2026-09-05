import { useState } from 'react';
import { ThumbsUp, MessageCircle, Send } from 'lucide-react';
import type { FeedPost, FeedComment } from '@/lib/types';
import { categoryMeta, timeAgo } from '@/lib/feed';
import { personPhoto, onPersonImgError, onProjectImgError } from '@/lib/people';
import { VerifiedBadge } from '@/components/ui';

interface FeedPostCardProps {
  post: FeedPost;
  comments: FeedComment[];
  commentsLoaded: boolean;
  commentsLoading: boolean;
  demo?: boolean;
  onToggleLike: (post: FeedPost) => void;
  onLoadComments: (postId: string) => void;
  onAddComment: (postId: string, content: string) => Promise<void>;
}

export default function FeedPostCard({
  post, comments, commentsLoaded, commentsLoading, demo,
  onToggleLike, onLoadComments, onAddComment,
}: FeedPostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const meta = categoryMeta(post.category);
  const photo = personPhoto(post.author_photo_url, post.author_role);
  const showBadge = post.author_verified && post.author_role !== 'homeowner';

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !commentsLoaded && !commentsLoading) onLoadComments(post.id);
  };

  const submitComment = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await onAddComment(post.id, text);
      setDraft('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <article className="card overflow-hidden">
      {/* Post body */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <img src={photo} alt={post.author_name} onError={(e) => onPersonImgError(e, post.author_role)} className="w-11 h-11 rounded-full object-cover ring-1 ring-navy-100 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-navy-900 text-[15px]">{post.author_name}</p>
              {showBadge && <VerifiedBadge size="xs" />}
            </div>
            {post.author_title && <p className="text-[13px] text-navy-500 leading-snug">{post.author_title}</p>}
            <p className="text-xs text-navy-400 mt-0.5 flex items-center gap-1">
              {timeAgo(post.created_at)}
              <span className="inline-block w-0.5 h-0.5 rounded-full bg-navy-300" />
              <span className={`px-1.5 py-px rounded-full text-[10px] font-semibold ${meta.chip}`}>{meta.label}</span>
            </p>
          </div>
        </div>

        <p className="mt-3.5 text-[15px] leading-relaxed text-navy-800 whitespace-pre-line">{post.content}</p>

        {post.image_url && (
          <div className="mt-3.5 rounded-xl overflow-hidden border border-navy-100">
            <img src={post.image_url} alt="Project update" onError={onProjectImgError} className="w-full h-56 object-cover" />
          </div>
        )}
      </div>

      {/* Engagement strip */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-navy-50">
        <button
          onClick={() => onToggleLike(post)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
            post.liked_by_me ? 'text-royal-700 bg-royal-50' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${post.liked_by_me ? 'fill-current' : ''}`} />
          Like{post.likes_count > 0 && <span className="tabular-nums">{post.likes_count}</span>}
        </button>
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
            commentsOpen ? 'text-navy-800 bg-navy-50' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Comment{post.comments_count > 0 && <span className="tabular-nums">{post.comments_count}</span>}
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="px-5 pb-4 space-y-3 border-t border-navy-50 pt-3 bg-[#FAFBFE]">
          {commentsLoading && <p className="text-xs text-navy-400 px-1">Loading comments…</p>}
          {!commentsLoading && comments.length === 0 && <p className="text-xs text-navy-400 px-1">No comments yet — start the conversation.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <img src={personPhoto(c.author_photo_url, c.author_role)} alt="" onError={(e) => onPersonImgError(e, c.author_role)} className="w-8 h-8 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="bg-white border border-navy-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-navy-900">{c.author_name}</p>
                    <span className="text-[11px] text-navy-400">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[13.5px] text-navy-700 leading-relaxed mt-0.5">{c.content}</p>
                </div>
              </div>
            </div>
          ))}

          <form
            onSubmit={(e) => { e.preventDefault(); void submitComment(); }}
            className="flex items-center gap-2 pl-1"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={demo ? 'Add a comment (demo — not saved)' : 'Add a comment…'}
              className="flex-1 input text-sm py-2"
              disabled={posting}
            />
            <button type="submit" disabled={!draft.trim() || posting} className="btn-primary px-3 py-2 !rounded-xl" aria-label="Send comment">
              {posting ? <Send className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
