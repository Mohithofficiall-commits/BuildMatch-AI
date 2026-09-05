import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardHat, ArrowRight, ShieldCheck, Sparkles, FileBadge, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { roleLandingPath } from '@/lib/portal';
import type { UserRole } from '@/lib/types';

const ALL_ROLES: UserRole[] = ['homeowner', 'engineer', 'plumber', 'electrician', 'material_shop', 'admin'];

const DEMO_ACCOUNTS: Record<string, { id: string; name: string; role: UserRole; location: string; avatar_url: string }> = {
  'nishi.sharma@example.com': { id: 'a1000000-0000-0000-0000-000000000001', name: 'Nishi Sharma', role: 'homeowner', location: 'Coimbatore', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
  'karthik@buildmatch.ai': { id: 'a1000000-0000-0000-0000-000000000003', name: 'Er. S. Karthik', role: 'engineer', location: 'Coimbatore', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
  'rajesh@buildmatch.ai': { id: 'a1000000-0000-0000-0000-000000000010', name: 'Rajesh Kumar', role: 'plumber', location: 'Coimbatore', avatar_url: 'https://images.unsplash.com/photo-1633332755192-780a8825d60c?w=200&h=200&fit=crop' },
  'spark@buildmatch.ai': { id: 'a1000000-0000-0000-0000-000000000011', name: 'Suresh Kumar', role: 'electrician', location: 'Coimbatore', avatar_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7150?w=200&h=200&fit=crop' },
  'buildmart@buildmatch.ai': { id: 'a1000000-0000-0000-0000-000000000012', name: 'Mohan Lal', role: 'material_shop', location: 'Coimbatore', avatar_url: 'https://images.unsplash.com/photo-1565008447762-0bd3c6e5951f?w=200&h=200&fit=crop' },
  'admin@buildmatch.ai': { id: 'a1000000-0000-0000-0000-000000000002', name: 'Admin User', role: 'admin', location: 'Bengaluru', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4f?w=200&h=200&fit=crop' },
};

const DEMO_EMOJI: Record<UserRole, string> = {
  homeowner: '🏠', engineer: '👷', plumber: '🔧', electrician: '⚡', material_shop: '🏬', admin: '🛡️',
};

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('homeowner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (mode === 'login') {
        const account = DEMO_ACCOUNTS[email];
        if (account) {
          login({ id: account.id, name: account.name, email, role: account.role, location: account.location, avatar_url: account.avatar_url });
          navigate(roleLandingPath(account.role));
        } else {
          setError('No account found with these credentials. Try the demo login below.');
          setLoading(false);
        }
      } else {
        if (!name || !email || !password) {
          setError('Please fill all fields.');
          setLoading(false);
          return;
        }
        login({ id: crypto.randomUUID(), name, email, role, location: '', avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}` });
        navigate(roleLandingPath(role));
      }
    }, 600);
  };

  const handleDemo = (demoRole: UserRole) => {
    demoLogin(demoRole);
    navigate(roleLandingPath(demoRole));
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 to-navy-800 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-navy [background-size:40px_40px] opacity-10" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">BuildMatch AI</span>
          </Link>
          <h2 className="text-3xl font-bold mt-12 mb-4">{mode === 'login' ? 'Welcome back.' : 'Start building with trust.'}</h2>
          <p className="text-navy-200 max-w-md">
            The AI-powered platform that helps you verify, match, select, track, and trust the entire construction journey.
          </p>
        </div>
        <div className="relative space-y-4">
          {[
            { icon: Sparkles, text: 'Explainable AI matching with transparent scoring' },
            { icon: ShieldCheck, text: 'Verified engineers with dynamic trust scores' },
            { icon: FileBadge, text: 'Construction Digital Passport for every project' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-emerald-300" />
              </div>
              <span className="text-sm text-navy-100">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-navy-900 text-lg">BuildMatch AI</span>
          </Link>

          <h1 className="text-2xl font-bold text-navy-900">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h1>
          <p className="muted mt-1 mb-6">{mode === 'login' ? 'Enter your credentials to continue' : 'Join BuildMatch AI and start building with trust'}</p>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm mb-4 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input className="input pl-10" placeholder="Nishi Sharma" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="email" className="input pl-10" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" className="input pl-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="label">I am a...</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-all ${
                        role === r ? 'border-royal-500 bg-royal-50 text-royal-700' : 'border-navy-200 text-navy-600 hover:bg-navy-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-navy-100">
            <p className="text-xs muted text-center mb-3">Quick demo login — explore the full prototype instantly</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_ROLES.map((r) => (
                <button key={r} onClick={() => handleDemo(r)} className="btn-secondary capitalize text-xs py-2.5">
                  {DEMO_EMOJI[r]} {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm muted mt-6">
            {mode === 'login' ? (
              <>Don't have an account? <Link to="/signup" className="text-royal-600 font-semibold hover:underline">Sign up</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-royal-600 font-semibold hover:underline">Sign in</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
