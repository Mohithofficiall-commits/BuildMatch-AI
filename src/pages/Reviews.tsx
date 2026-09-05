import { useState, useEffect } from 'react';
import { fetchReviews, fetchEngineers } from '@/lib/data';
import type { Review, Engineer } from '@/lib/types';
import { LoadingState, EmptyState, Badge, RatingStars, Modal, Toast } from '@/components/ui';
import { Star, ShieldCheck, Quote, Plus } from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [writeOpen, setWriteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [revs, engs] = await Promise.all([fetchReviews(), fetchEngineers()]);
        setReviews(revs); setEngineers(engs);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState text="Loading reviews..." />;

  const engineerMap = new Map(engineers.map((e) => [e.id, e]));
  const verified = reviews.filter((r) => r.verified);
  const avgRating = verified.length > 0 ? (verified.reduce((s, r) => s + r.rating, 0) / verified.length).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reviews</h1>
          <p className="muted mt-1">Verified project reviews from homeowners</p>
        </div>
        <button onClick={() => setWriteOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Write Review</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 text-center"><p className="text-3xl font-bold text-navy-900">{avgRating}</p><div className="flex justify-center mt-1"><RatingStars rating={+avgRating} /></div><p className="text-xs muted mt-1">Average Rating</p></div>
        <div className="card p-5 text-center"><p className="text-3xl font-bold text-navy-900">{verified.length}</p><p className="text-xs muted mt-1">Verified Reviews</p></div>
        <div className="card p-5 text-center"><p className="text-3xl font-bold text-navy-900">{engineers.length}</p><p className="text-xs muted mt-1">Engineers Reviewed</p></div>
      </div>

      <div className="card p-4 bg-emerald-50 border-emerald-100">
        <div className="flex items-center gap-2 text-sm text-emerald-800">
          <ShieldCheck className="w-5 h-5" />
          <span><strong>Verified Project Review:</strong> Reviews are only accepted for completed projects with verified milestones. This ensures authenticity and trust.</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={<Star className="w-7 h-7" />} title="No reviews yet" description="Complete a project to submit your first verified review." />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const eng = engineerMap.get(r.engineer_id);
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {eng && <img src={eng.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-navy-900">{r.homeowner_name}</p>
                        {r.verified && <Badge variant="verified"><ShieldCheck className="w-3 h-3" /> Verified Project Review</Badge>}
                      </div>
                      {eng && <p className="text-xs muted">Reviewing: {eng.name}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <RatingStars rating={r.rating} size="xs" />
                        <span className="text-xs muted">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <Quote className="w-6 h-6 text-navy-200" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3 text-xs">
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Quality</p><p className="font-bold text-navy-900">{r.quality_rating}/5</p></div>
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Timeline</p><p className="font-bold text-navy-900">{r.timeline_rating}/5</p></div>
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Communication</p><p className="font-bold text-navy-900">{r.communication_rating}/5</p></div>
                  <div className="bg-navy-50 rounded-lg p-2 text-center"><p className="muted">Budget</p><p className="font-bold text-navy-900">{r.budget_rating}/5</p></div>
                </div>
                <p className="text-sm text-navy-600">{r.feedback}</p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={writeOpen} onClose={() => setWriteOpen(false)} title="Write a Verified Project Review">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">Reviews can only be submitted for completed projects with verified milestones.</div>
          <div><label className="label">Select Project</label><select className="input"><option>Green Villa — 3BHK Eco (Completed)</option></select></div>
          <div><label className="label">Overall Rating</label><div className="flex gap-1">{[1,2,3,4,5].map((i) => <button key={i} className="text-2xl text-amber-400 hover:scale-110 transition-transform"><Star className="w-7 h-7 fill-current" /></button>)}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quality (1-5)</label><input type="number" min="1" max="5" className="input" defaultValue="5" /></div>
            <div><label className="label">Timeline (1-5)</label><input type="number" min="1" max="5" className="input" defaultValue="4" /></div>
            <div><label className="label">Communication (1-5)</label><input type="number" min="1" max="5" className="input" defaultValue="5" /></div>
            <div><label className="label">Budget Adherence (1-5)</label><input type="number" min="1" max="5" className="input" defaultValue="5" /></div>
          </div>
          <div><label className="label">Written Feedback</label><textarea className="input min-h-[100px]" placeholder="Share your experience..." /></div>
          <button onClick={() => { setWriteOpen(false); setToast('Review submitted for verification.'); }} className="btn-primary w-full">Submit Review</button>
        </div>
      </Modal>
    </div>
  );
}
