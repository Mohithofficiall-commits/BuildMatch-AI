import type { ReactNode } from 'react';
import { CheckCircle2, ShieldCheck, Star, AlertTriangle, Clock, FileText, X } from 'lucide-react';

export function Badge({ children, variant = 'navy' }: { children: ReactNode; variant?: 'navy' | 'royal' | 'verified' | 'warning' | 'danger' | 'success' }) {
  const variants: Record<string, string> = {
    navy: 'bg-navy-100 text-navy-700',
    royal: 'bg-royal-100 text-royal-700',
    verified: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    success: 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`badge ${variants[variant]}`}>{children}</span>;
}

export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'xs' }) {
  return (
    <span className={`badge-verified ${size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : ''}`}>
      <ShieldCheck className="w-3 h-3" /> Verified
    </span>
  );
}

export function TrustBadge({ score }: { score: number }) {
  const level = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : score >= 70 ? 'Fair' : 'Low';
  const color = score >= 90 ? 'success' : score >= 80 ? 'navy' : score >= 70 ? 'warning' : 'danger';
  return <Badge variant={color as 'success'}>Trust {score}/100 · {level}</Badge>;
}

export function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'xs' | 'sm' | 'md' }) {
  const s = size === 'md' ? 'w-4 h-4' : size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${s} ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-navy-200'}`} />
      ))}
    </span>
  );
}

export function ProgressBar({ value, color = 'navy' }: { value: number; color?: 'navy' | 'royal' | 'emerald' | 'amber' | 'rose' }) {
  const colors: Record<string, string> = {
    navy: 'bg-navy-600',
    royal: 'bg-royal-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  return (
    <div className="w-full h-2 bg-navy-100 rounded-full overflow-hidden">
      <div className={`h-full ${colors[color]} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function StatCard({ icon, label, value, sublabel, color = 'navy' }: {
  icon: ReactNode; label: string; value: string | number; sublabel?: string; color?: 'navy' | 'royal' | 'emerald' | 'amber' | 'rose';
}) {
  const colors: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    royal: 'bg-royal-50 text-royal-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm muted">{label}</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">{value}</p>
          {sublabel && <p className="text-xs muted mt-0.5">{sublabel}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center text-navy-400 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <p className="muted mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-3 border-navy-200 border-t-royal-600 rounded-full animate-spin" />
      <p className="muted mt-3 text-sm">{text}</p>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
    low: { variant: 'success', label: 'LOW' },
    medium: { variant: 'warning', label: 'MEDIUM' },
    high: { variant: 'danger', label: 'HIGH' },
  };
  const cfg = map[level] ?? map.low;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card p-6 w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-scale-in`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <AlertTriangle className="w-5 h-5 text-rose-600" />,
    info: <AlertTriangle className="w-5 h-5 text-royal-600" />,
  };
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="card p-4 pr-6 flex items-center gap-3 shadow-card-hover">
        {icons[type]}
        <p className="text-sm font-medium text-navy-900">{message}</p>
        <button onClick={onClose} className="text-navy-300 hover:text-navy-600"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function MilestoneIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  if (status === 'in_progress') return <Clock className="w-5 h-5 text-royal-600" />;
  if (status === 'delayed') return <AlertTriangle className="w-5 h-5 text-rose-600" />;
  return <div className="w-5 h-5 rounded-full border-2 border-navy-200" />;
}

export function DocumentIcon() {
  return <FileText className="w-5 h-5 text-royal-600" />;
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
