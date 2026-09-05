import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { FeedMediaItem } from '@/lib/types';
import { formatBytes } from '@/lib/feed';
import { onProjectImgError, PROJECT_PHOTO_FALLBACK } from '@/lib/people';

/** Responsive grid for 1..N images, plus video + document rendering. */
export default function PostMedia({ media, className = '' }: { media: FeedMediaItem[]; className?: string }) {
  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');
  const documents = media.filter((m) => m.type === 'document');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  const gridClass =
    images.length === 1 ? 'grid-cols-1'
    : images.length === 2 ? 'grid-cols-2'
    : images.length === 3 ? 'grid-cols-2'
    : 'grid-cols-2';

  const visibleImages = images.slice(0, 4);
  const hiddenCount = Math.max(0, images.length - 4);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Image gallery */}
      {images.length > 0 && (
        <div className={`grid ${gridClass} gap-1.5 rounded-xl overflow-hidden`}>
          {visibleImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className={`relative group overflow-hidden ${images.length === 3 && i === 0 ? 'row-span-2' : ''} ${images.length === 1 ? 'w-full' : ''}`}
            >
              <img
                src={img.url}
                alt="Post media"
                onError={onProjectImgError}
                className={`w-full object-cover ${images.length === 1 ? 'max-h-[420px]' : images.length === 3 && i === 0 ? 'h-full min-h-[260px] max-h-[380px]' : 'h-40 sm:h-48'}`}
              />
              {hiddenCount > 0 && i === visibleImages.length - 1 && (
                <span className="absolute inset-0 bg-navy-950/60 flex items-center justify-center text-white font-bold text-lg">
                  +{hiddenCount + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Videos — never autoplay */}
      {videos.map((v, i) => (
        <video
          key={i}
          src={v.url}
          poster={v.poster ?? undefined}
          controls
          preload="metadata"
          playsInline
          className="w-full max-h-[440px] rounded-xl bg-navy-950"
        />
      ))}

      {/* Documents */}
      {documents.map((d, i) => (
        <a
          key={i}
          href={d.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50/60 px-4 py-3 hover:border-navy-300 transition-colors"
        >
          <span className="w-10 h-10 rounded-lg bg-white border border-navy-100 flex items-center justify-center text-royal-700 shrink-0">
            <FileText className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-semibold text-navy-900 truncate">{d.name || 'Document'}</span>
            {d.size != null && <span className="text-[11.5px] text-navy-400">{formatBytes(d.size)}</span>}
          </span>
        </a>
      ))}

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i === null ? i : (i + images.length - 1) % images.length))}
          onNext={() => setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length))}
        />
      )}
    </div>
  );
}

function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: FeedMediaItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-[70] bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="Close">
        <X className="w-6 h-6" />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Previous">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Next">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <img
        src={images[index].url}
        alt="Enlarged post media"
        onClick={(e) => e.stopPropagation()}
        onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = PROJECT_PHOTO_FALLBACK; }}
        className="max-h-[88vh] max-w-full object-contain rounded-lg"
      />
      <p className="absolute bottom-4 text-white/70 text-sm">{index + 1} / {images.length}</p>
    </div>
  );
}
