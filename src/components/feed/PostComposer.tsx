import { useState } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import type { AppUser, FeedCategory } from '@/lib/types';
import { FEED_CATEGORIES, CATEGORY_META } from '@/lib/feed';
import { personPhoto, onPersonImgError } from '@/lib/people';

interface PostComposerProps {
  user: AppUser;
  demo?: boolean;
  busy: boolean;
  onSubmit: (category: FeedCategory, content: string) => Promise<void>;
}

export default function PostComposer({ user, demo, busy, onSubmit }: PostComposerProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<FeedCategory>('discussion');

  const canPost = content.trim().length >= 3 && !busy;

  const submit = async () => {
    if (!canPost) return;
    try {
      await onSubmit(category, content.trim());
      setContent('');
      setCategory('discussion');
      setOpen(false);
    } catch {
      /* parent surfaces the error */
    }
  };

  const categoryOptions = FEED_CATEGORIES.filter((c) => c.value !== 'all') as { value: FeedCategory; label: string }[];

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <img
          src={personPhoto(user.avatar_url, user.role)}
          alt={user.name}
          onError={(e) => onPersonImgError(e, user.role)}
          className="w-11 h-11 rounded-full object-cover ring-1 ring-navy-100 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full text-left bg-[#F1F4F9] hover:bg-navy-100/70 border border-transparent hover:border-navy-200 text-navy-500 rounded-full px-4 py-2.5 text-[14px] transition-colors"
          >
            Share an update with the construction network…
          </button>

          {open && (
            <div className="mt-3 space-y-3 animate-fade-in">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                autoFocus
                placeholder={demo ? 'Share a project update, tip or discussion (demo — shown in this session)' : 'Share a project update, tip, achievement or discussion with your professional network…'}
                className="input w-full resize-none py-3 text-[14px] leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      category === c.value
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white text-navy-600 border-navy-200 hover:border-navy-400'
                    }`}
                  >
                    {CATEGORY_META[c.value].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <button type="button" title="Image hosting is not wired yet" className="text-navy-300 cursor-not-allowed inline-flex items-center gap-1.5 text-[13px] px-2 py-1.5 rounded-lg">
                  <ImagePlus className="w-4 h-4" /> Photo
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOpen(false)} className="text-sm px-3 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors"><X className="w-4 h-4" /> Cancel</button>
                  <button onClick={() => void submit()} disabled={!canPost} className="btn-primary text-sm px-4 py-2">
                    <Send className="w-4 h-4" /> {busy ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
