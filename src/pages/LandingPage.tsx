import { Link, useNavigate } from 'react-router-dom';
import {
  HardHat, ShieldCheck, Sparkles, FileBadge, ArrowRight, CheckCircle2,
  TrendingUp, Users, Search, GitCompareArrows, Star, Camera,
  AlertTriangle, Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function LandingPage() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();

  const startDemo = () => {
    demoLogin('homeowner');
    navigate('/app/dashboard');
  };

  const features = [
    { icon: Sparkles, title: 'Explainable AI Matching', desc: 'Transparent weighted scoring — not a black box. See exactly why an engineer was recommended.' },
    { icon: ShieldCheck, title: 'Trust Score System', desc: 'Dynamic 0–100 trust score from verification, reviews, on-time delivery, and quality history.' },
    { icon: Camera, title: 'AI Milestone Verification', desc: 'Upload site photos for AI-assisted construction stage detection with human confirmation.' },
    { icon: FileBadge, title: 'Construction Digital Passport', desc: 'A trusted, verifiable digital record of the entire construction journey — start to handover.' },
  ];

  const steps = [
    { icon: Search, label: 'Requirement', desc: 'Enter your location, budget, house type, and style.' },
    { icon: Sparkles, label: 'AI Match', desc: 'Get explainable engineer recommendations with match scores.' },
    { icon: GitCompareArrows, label: 'Compare', desc: 'Compare 2–4 engineers side-by-side across key metrics.' },
    { icon: CheckCircle2, label: 'Hire', desc: 'Select your engineer and start the project.' },
    { icon: TrendingUp, label: 'Track', desc: 'Monitor milestones, progress, and site updates in real time.' },
    { icon: ShieldCheck, label: 'Verify', desc: 'AI-assisted milestone verification with human confirmation.' },
    { icon: Star, label: 'Review', desc: 'Submit a verified project review after completion.' },
  ];

  const stats = [
    { value: '8+', label: 'Verified Engineers' },
    { value: '48+', label: 'Projects Completed' },
    { value: '4.7★', label: 'Average Rating' },
    { value: '91%', label: 'Avg Trust Score' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-navy-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-navy-900 leading-tight">BuildMatch AI</p>
              <p className="text-[10px] muted leading-tight">Build Right. Build Trusted.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-navy-600">
            <a href="#how" className="hover:text-navy-900 transition-colors">How it Works</a>
            <a href="#innovations" className="hover:text-navy-900 transition-colors">Innovations</a>
            <a href="#benefits" className="hover:text-navy-900 transition-colors">Benefits</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <button onClick={startDemo} className="btn-primary">
              Explore Demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-radial">
        <div className="absolute inset-0 bg-grid-navy [background-size:40px_40px] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 badge-royal mb-6 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" /> SIH Prototype · AI-Powered Construction Platform
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-navy-900 leading-[1.1] text-balance animate-slide-up">
              Build Your Dream Home<br />With Confidence.
            </h1>
            <p className="mt-6 text-lg lg:text-xl muted max-w-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              AI-powered engineer matching and transparent construction management — from selection to handover.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <button onClick={startDemo} className="btn-primary text-base px-6 py-3">
                Find Your Engineer <ArrowRight className="w-4 h-4" />
              </button>
              <Link to="/login" className="btn-secondary text-base px-6 py-3">
                Sign in
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {stats.map((s) => (
                <div key={s.label} className="card p-4">
                  <p className="text-2xl font-bold text-navy-900">{s.value}</p>
                  <p className="text-xs muted mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="badge-danger mb-4">The Problem</span>
            <h2 className="text-3xl font-bold text-navy-900 mb-4">Finding an engineer is easy. Trusting one is hard.</h2>
            <p className="muted text-lg mb-6">
              Existing platforms help homeowners FIND professionals. But they don't help you VERIFY credentials, MATCH the right engineer to your project, TRACK construction progress, or build TRUST across the entire journey.
            </p>
            <ul className="space-y-3">
              {[
                'No way to verify engineer credentials or track record',
                'No explainable matching — just listings and ads',
                'No milestone verification or construction transparency',
                'No trusted digital record of the build journey',
              ].map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-navy-700">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-8 bg-gradient-to-br from-navy-900 to-navy-800 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-royal-300" />
              </div>
              <div>
                <p className="font-bold text-lg">The BuildMatch Solution</p>
                <p className="text-navy-200 text-sm">Verify · Match · Select · Track · Trust</p>
              </div>
            </div>
            <p className="text-navy-100 mb-6">
              BuildMatch AI helps homeowners VERIFY, MATCH, SELECT, TRACK and TRUST the entire construction journey — not just find a professional.
            </p>
            <div className="space-y-3">
              {[
                { icon: ShieldCheck, text: 'Verified engineers with transparent trust scores' },
                { icon: Sparkles, text: 'Explainable AI matching with clear reasons' },
                { icon: Camera, text: 'AI-assisted milestone verification' },
                { icon: FileBadge, text: 'Construction Digital Passport for every project' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-emerald-300" />
                  </div>
                  <span className="text-sm text-navy-100">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="bg-white border-y border-navy-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-12">
            <span className="badge-royal mb-3">How BuildMatch Works</span>
            <h2 className="text-3xl font-bold text-navy-900">From requirement to handover — guided every step</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {steps.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="card p-5 text-center h-full card-hover">
                  <div className="w-12 h-12 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center mx-auto mb-3">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-royal-600 font-semibold mb-1">Step {i + 1}</p>
                  <p className="font-semibold text-navy-900 text-sm">{step.label}</p>
                  <p className="text-xs muted mt-1">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 w-4 h-4 text-navy-300 -translate-y-1/2 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Innovations */}
      <section id="innovations" className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
        <div className="text-center mb-12">
          <span className="badge-navy mb-3">Core Innovations</span>
          <h2 className="text-3xl font-bold text-navy-900">Four innovations that build trust</h2>
          <p className="muted mt-2 max-w-2xl mx-auto">Each feature is designed to make construction transparent, explainable, and verifiable.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6 card-hover">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-900">{f.title}</h3>
                  <p className="muted text-sm mt-1">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="bg-white border-y border-navy-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'For Homeowners', points: ['Find verified engineers with trust scores', 'Compare and hire with confidence', 'Track every milestone with transparency', 'Generate a digital passport of your build'] },
              { icon: HardHat, title: 'For Engineers', points: ['Showcase verified credentials', 'Get matched to relevant projects', 'Build reputation through verified reviews', 'Manage projects and milestones'] },
              { icon: Lock, title: 'For the Industry', points: ['Bring accountability to construction', 'Create trusted digital records', 'Reduce disputes with milestone verification', 'Enable evidence-based decisions'] },
            ].map((b) => (
              <div key={b.title} className="card p-6">
                <div className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center mb-4">
                  <b.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-navy-900 mb-3">{b.title}</h3>
                <ul className="space-y-2">
                  {b.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-navy-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
        <div className="card p-8 lg:p-12 text-center bg-gradient-to-br from-navy-900 to-navy-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-navy [background-size:40px_40px] opacity-10" />
          <div className="relative">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to build with confidence?</h2>
            <p className="text-navy-200 text-lg mb-8 max-w-2xl mx-auto">
              Experience the complete flow — from finding your engineer to generating your Construction Digital Passport.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={startDemo} className="btn bg-white text-navy-900 hover:bg-navy-50 px-6 py-3 text-base">
                Explore Demo <ArrowRight className="w-4 h-4" />
              </button>
              <Link to="/login" className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 px-6 py-3 text-base">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-navy-900 text-sm">BuildMatch AI</span>
          </div>
          <p className="text-xs muted">AI-assisted decision-support platform. Human verification required for all critical decisions. © 2026 BuildMatch AI · SIH Prototype</p>
        </div>
      </footer>
    </div>
  );
}
