import { useMemo, useRef, useState } from 'react';
import {
  ImagePlus, Video, FileText, Send, X, MapPin, Hash, AtSign, FolderKanban, ChevronDown, File as FileIcon, Globe, Lock,
} from 'lucide-react';
import type { AppUser, FeedCategory, FeedMediaItem, FeedMention, PostVisibility } from '@/lib/types';
import { FEED_CATEGORIES, CATEGORY_META, VISIBILITY_OPTIONS, formatBytes } from '@/lib/feed';
import { personPhoto, onPersonImgError, onProjectImgError } from '@/lib/people';

export interface MentionTarget {
  id: string;
  name: string;
  role: string;
  title?: string | null;
  photo: string;
  verified: boolean;
}

export interface ComposerSubmit {
  category: FeedCategory;
  content: string;
  media: FeedMediaItem[];
  files: File[];
  visibility: PostVisibility;
  location: string | null;
  projectId: string | null;
  projectTitle: string | null;
  mentions: FeedMention[];
}

interface PostComposerProps {
  user: AppUser;
  demo?: boolean;
  busy: boolean;
  mentionTargets: MentionTarget[];
  projectOptions: { id: string; title: string }[];
  onSubmit: (input: ComposerSubmit) => Promise<void>;
}

const MEDIA_LIMIT = 6;
const MAX_CHARS = 4000;

type DraftMedia = FeedMediaItem & { file: File; id: string };

export default function PostComposer({ user, demo, busy, mentionTargets, projectOptions, onSubmit }: PostComposerProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<FeedCategory>('project_update');
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [location, setLocation] = useState('');
  const [projectId, setProjectId] = useState('');
  const [mentions, setMentions] = useState<FeedMention[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [posting, setPosting] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const remaining = MAX_CHARS - content.length;
  const canPost = (content.trim().length >= 3 || media.length > 0) && !posting && !busy && remaining >= 0;
  const projectTitle = projectOptions.find((p) => p.id === projectId)?.title ?? '';

  const filteredTargets = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    return mentionTargets.filter((t) => !q || t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q));
  }, [mentionQuery, mentionTargets]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: DraftMedia[] = [];
    for (const file of Array.from(files)) {
      if (media.length + next.length >= MEDIA_LIMIT) break;
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
      const url = URL.createObjectURL(file);
      next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, url, name: file.name, size: file.size, file });
    }
    if (next.length) setMedia((prev) => [...prev, ...next].slice(0, MEDIA_LIMIT));
  };

  const removeMedia = (id: string) => setMedia((prev) => prev.filter((m) => m.id !== id));
  const moveMedia = (index: number, dir: -1 | 1) => {
    setMedia((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const appendText = (fragment: string) => setContent((prev) => (prev ? `${prev} ${fragment}` : fragment));

  const pickMention = (t: MentionTarget) => {
    appendText(`@${t.name}`);
    setMentions((prev) => (prev.some((m) => m.name === t.name) ? prev : [...prev, { id: t.id, name: t.name, role: t.role }]));
    setMentionOpen(false);
    setMentionQuery('');
  };

  const reset = () => {
    setContent(''); setMedia([]); setCategory('project_update'); setVisibility('public');
    setLocation(''); setProjectId(''); setMentions([]); setOpen(false);
  };

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      await onSubmit({
        category,
        content: content.trim(),
        media: media.map((m) => ({ type: m.type, url: m.url, name: m.name, size: m.size })),
        files: media.map((m) => m.file),
        visibility,
        location: location.trim() || null,
        projectId: projectId || null,
        projectTitle: projectTitle || null,
        mentions,
      });
      reset();
    } catch {
      /* error surfaced by parent */
    } finally {
      setPosting(false);
    }
  };

  const categoryOptions = FEED_CATEGORIES.filter((c) => c.value !== 'all') as { value: FeedCategory; label: string }[];
  const imageCount = media.filter((m) => m.type === 'image').length;

  return (
    <div className="card p-4">
      <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={docInput} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

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
            What do you want to share, {user.name.split(' ')[0]}?
          </button>

          {open && (
            <div className="mt-3 space-y-3 animate-fade-in">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                rows={4}
                autoFocus
                placeholder="Share an engineering insight, site progress, tip or discussion with your professional network…"
                className="input w-full resize-none py-3 text-[14px] leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11.5px] text-navy-400">
                <span>{content.length > 0 ? `${content.length} / ${MAX_CHARS}` : ''}</span>
                {remaining < 200 && <span className={remaining < 0 ? 'text-rose-600 font-semibold' : 'text-amber-600'}>Character limit: {MAX_CHARS}</span>}
              </div>

              {/* Media previews */}
              {media.length > 0 && (
                <div className="space-y-2">
                  {media.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50/40 p-2">
                      {m.type === 'image' && (
                        <img src={m.url} alt="Preview" onError={onProjectImgError} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      )}
                      {m.type === 'video' && (
                        <div className="w-16 h-16 rounded-lg bg-navy-950 flex items-center justify-center text-white shrink-0"><Video className="w-6 h-6" /></div>
                      )}
                      {m.type === 'document' && (
                        <div className="w-16 h-16 rounded-lg bg-white border border-navy-100 flex items-center justify-center text-royal-700 shrink-0"><FileIcon className="w-6 h-6" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-navy-800 truncate">{m.name}</p>
                        <p className="text-[11.5px] text-navy-400 capitalize">{m.type} · {formatBytes(m.size)}</p>
                      </div>
                      {m.type === 'image' && imageCount > 1 && (
                        <div className="flex gap-1">
                          <button onClick={() => moveMedia(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-100 disabled:opacity-30" aria-label="Move earlier">‹</button>
                          <button onClick={() => moveMedia(i, 1)} disabled={i === media.length - 1} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-100 disabled:opacity-30" aria-label="Move later">›</button>
                        </div>
                      )}
                      <button onClick={() => removeMedia(m.id)} className="p-1.5 rounded-lg text-navy-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" aria-label="Remove media">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Category chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      category === c.value ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-600 border-navy-200 hover:border-navy-400'
                    }`}
                  >
                    {CATEGORY_META[c.value].label}
                  </button>
                ))}
              </div>

              {/* Media + enrichment buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => imageInput.current?.click()} disabled={media.length >= MEDIA_LIMIT} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
                  <ImagePlus className="w-4 h-4" /> Photo
                </button>
                <button type="button" onClick={() => videoInput.current?.click()} disabled={media.length >= MEDIA_LIMIT} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                  <Video className="w-4 h-4" /> Video
                </button>
                <button type="button" onClick={() => docInput.current?.click()} disabled={media.length >= MEDIA_LIMIT} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg text-royal-700 hover:bg-royal-50 disabled:opacity-40">
                  <FileText className="w-4 h-4" /> Document
                </button>
                <button type="button" onClick={() => setMentionOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg text-navy-600 hover:bg-navy-50">
                  <AtSign className="w-4 h-4" /> Mention
                </button>
                <button type="button" onClick={() => appendText('#')} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg text-navy-600 hover:bg-navy-50">
                  <Hash className="w-4 h-4" /> Hashtag
                </button>
                <label className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-lg text-navy-600 hover:bg-navy-50 cursor-pointer">
                  <MapPin className="w-4 h-4" />
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" className="bg-transparent outline-none w-32 text-[13px] placeholder:text-navy-300" />
                </label>
              </div>

              {/* Mention picker */}
              {mentionOpen && (
                <div className="rounded-xl border border-navy-100 bg-white shadow-soft p-2 animate-scale-in relative z-10">
                  <input
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.target.value)}
                    placeholder="Search professionals to mention…"
                    autoFocus
                    className="input text-[13px] py-1.5 mb-1.5"
                  />
                  <div className="max-h-44 overflow-y-auto no-scrollbar space-y-0.5">
                    {filteredTargets.slice(0, 8).map((t) => (
                      <button key={t.id} onClick={() => pickMention(t)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-navy-50 text-left">
                        <img src={t.photo} alt="" onError={(e) => onPersonImgError(e, t.role)} className="w-7 h-7 rounded-full object-cover" />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-navy-900 truncate">{t.name}</span>
                          <span className="block text-[11px] text-navy-400 capitalize truncate">{t.role}{t.verified ? ' · Verified' : ''}</span>
                        </span>
                      </button>
                    ))}
                    {filteredTargets.length === 0 && <p className="text-[12px] text-navy-400 px-2 py-2">No professionals found.</p>}
                  </div>
                </div>
              )}

              {/* Project + visibility + mentions summary */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative inline-flex">
                  <FolderKanban className="w-4 h-4 text-navy-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input pl-8 pr-7 text-[13px] py-1.5 appearance-none cursor-pointer">
                    <option value="">Tag a project…</option>
                    {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-navy-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative inline-flex">
                  {visibility === 'public'
                    ? <Globe className="w-4 h-4 text-navy-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    : <Lock className="w-4 h-4 text-navy-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />}
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value as PostVisibility)} className="input pl-8 pr-7 text-[13px] py-1.5 appearance-none cursor-pointer">
                    {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-navy-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              {mentions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <AtSign className="w-3.5 h-3.5 text-navy-400" />
                  {mentions.map((m) => (
                    <span key={m.id ?? m.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-royal-50 text-royal-700 text-[12px] font-semibold">
                      @{m.name}
                      <button onClick={() => setMentions((prev) => prev.filter((x) => x.name !== m.name))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11.5px] text-navy-400">{demo ? 'Demo mode — posts shown in this session only.' : `${media.length}/${MEDIA_LIMIT} media · visibility set on publish`}</p>
                <div className="flex items-center gap-2">
                  <button onClick={reset} className="text-sm px-3 py-2 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 transition-colors"><X className="w-4 h-4 inline mr-1" />Cancel</button>
                  <button onClick={() => void submit()} disabled={!canPost} className="btn-primary text-sm px-5 py-2">
                    <Send className="w-4 h-4" /> {posting ? 'Publishing…' : 'Post'}
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
