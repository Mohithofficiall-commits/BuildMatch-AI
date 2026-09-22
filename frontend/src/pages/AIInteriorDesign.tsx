import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Upload, Image as ImageIcon, Trash2, Sparkles, Loader2,
  AlertTriangle, Settings2, CheckCircle2, Sofa, Palette, LayoutGrid,
  Layers, Wallet, ArrowRight,
} from 'lucide-react';
import { aiInteriorDesign, type InteriorDesignResult } from '@/lib/ai';
import { Badge, SectionHeader } from '@/components/ui';

const ROOM_TYPES = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 'Kids Room', 'Home Office', 'Balcony / Outdoor'];
const STYLE_OPTIONS = ['Modern', 'Minimalist', 'Contemporary', 'Traditional', 'Scandinavian', 'Industrial', 'Bohemian', 'Luxury'];
const BUDGET_BANDS = [
  { label: 'Under ₹2 Lakhs', value: 200000 },
  { label: '₹2–5 Lakhs', value: 500000 },
  { label: '₹5–10 Lakhs', value: 1000000 },
  { label: '₹10–20 Lakhs', value: 2000000 },
  { label: '₹20 Lakhs+', value: 3000000 },
];

const SECTION_ICONS = [
  { key: 'styles' as const, icon: Sparkles, title: 'Interior Style Suggestions' },
  { key: 'furniture' as const, icon: Sofa, title: 'Furniture Recommendations' },
  { key: 'colours' as const, icon: Palette, title: 'Colour Suggestions' },
  { key: 'layout' as const, icon: LayoutGrid, title: 'Layout Suggestions' },
  { key: 'materials' as const, icon: Layers, title: 'Material Suggestions' },
];

export default function AIInteriorDesign() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [roomType, setRoomType] = useState(ROOM_TYPES[0]);
  const [style, setStyle] = useState(STYLE_OPTIONS[0]);
  const [budget, setBudget] = useState(BUDGET_BANDS[1].value);
  const [colours, setColours] = useState('');
  const [furnitureNeeds, setFurnitureNeeds] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'not_configured' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<InteriorDesignResult | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Please choose an image file (JPG, PNG, WebP).');
      setStatus('error');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(f);
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
  }

  async function analyse() {
    if (!preview) return;
    setStatus('loading');
    setErrorMsg('');
    const res = await aiInteriorDesign({
      imageDataUrl: preview,
      roomType,
      style,
      budget,
      preferredColours: colours,
      furnitureNeeds,
    });
    if (res.status === 'ok' && res.result) {
      setResult(res.result);
      setStatus('done');
    } else {
      setErrorMsg(res.reason ?? 'The AI request failed.');
      setStatus(res.status === 'not_configured' ? 'not_configured' : 'error');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <SectionHeader
        title="AI Interior Design"
        subtitle="Upload a room photo and get style, furniture, colour, layout and material suggestions for your space."
      />

      {/* Step 1 — photo upload & preview */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-full bg-royal-600 text-white text-sm font-bold flex items-center justify-center">1</span>
          <h2 className="text-lg font-bold text-navy-900">Upload your photo</h2>
        </div>

        {preview ? (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative md:w-80 shrink-0">
              <img src={preview} alt="Uploaded room preview" className="w-full h-56 md:h-48 object-cover rounded-xl border border-navy-100" />
              <button onClick={reset} className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-navy-600 hover:text-rose-600 shadow-soft" title="Remove photo">
                <Trash2 className="w-4 h-4" />
              </button>
              <Badge variant="success">Photo ready</Badge>
            </div>
            <div className="text-sm muted flex-1">
              <p className="flex items-center gap-1.5 text-navy-700 font-medium truncate"><ImageIcon className="w-4 h-4 shrink-0" />{file?.name ?? 'Selected image'}</p>
              <p className="mt-1">{file ? `${(file.size / 1024).toFixed(0)} KB` : ''}{roomType ? ` · analysed as: ${roomType}` : ''}</p>
              <p className="mt-2 text-xs">Photo stays in your browser and is sent only when you run the analysis.</p>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-navy-200 rounded-2xl cursor-pointer hover:border-royal-400 hover:bg-royal-50/40 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-navy-50 text-navy-400 flex items-center justify-center"><Upload className="w-7 h-7" /></div>
            <p className="font-semibold text-navy-900 text-sm">Click to upload a house / interior photo</p>
            <p className="text-xs muted">JPG, PNG or WebP — clear, well-lit photos give better suggestions</p>
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>
        )}
      </div>

      {/* Step 2 — requirements */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-full bg-royal-600 text-white text-sm font-bold flex items-center justify-center">2</span>
          <h2 className="text-lg font-bold text-navy-900">Describe your requirements</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Room type</label>
            <select className="input" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
              {ROOM_TYPES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Preferred style</label>
            <select className="input" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label"><Wallet className="w-3.5 h-3.5 inline mr-1" />Budget for this space</label>
            <select className="input" value={budget} onChange={(e) => setBudget(+e.target.value)}>
              {BUDGET_BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Preferred colours (optional)</label>
            <input className="input" placeholder="e.g. warm neutrals, teal accents" value={colours} onChange={(e) => setColours(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Furniture requirements (optional)</label>
            <textarea className="input" rows={2} placeholder="e.g. need a 3-seater sofa, TV unit and a study desk" value={furnitureNeeds} onChange={(e) => setFurnitureNeeds(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Step 3 — run analysis */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-full bg-royal-600 text-white text-sm font-bold flex items-center justify-center">3</span>
          <h2 className="text-lg font-bold text-navy-900">AI recommendations</h2>
        </div>

        <button onClick={analyse} disabled={!preview || status === 'loading'} className="btn-royal w-full md:w-auto">
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {status === 'loading' ? 'Analysing photo…' : 'Analyse Photo'}
        </button>

        {/* Loading state */}
        {status === 'loading' && (
          <div className="mt-4 flex items-center gap-3 bg-navy-50 rounded-xl p-4 text-sm text-navy-600">
            <Loader2 className="w-4 h-4 animate-spin text-royal-600 shrink-0" />
            Sending your photo and requirements to the AI service…
          </div>
        )}

        {/* Configuration state — shown instead of any fake analysis */}
        {status === 'not_configured' && (
          <div className="mt-4 border border-amber-200 bg-amber-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Settings2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">AI service not configured</p>
                <p className="text-amber-800 mt-1">{errorMsg}</p>
                <p className="text-amber-800 mt-2">
                  Add these variables to <code className="bg-amber-100 rounded px-1">frontend/.env.local</code> and restart the dev server:
                </p>
                <pre className="mt-2 bg-amber-100/70 rounded-lg p-2.5 text-xs text-amber-900 overflow-x-auto">{`VITE_AI_API_URL=https://your-image-ai-provider.example.com/v1/analyze\nVITE_AI_API_KEY=your_key   # optional — sent as Bearer token`}</pre>
                <p className="text-amber-700 mt-2 text-xs">
                  No simulated results are shown — BuildMatch never displays fake AI analysis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="mt-4 border border-rose-200 bg-rose-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-rose-900">Analysis failed</p>
                <p className="text-rose-800 mt-1">{errorMsg}</p>
                <button onClick={analyse} className="btn-secondary mt-3 text-xs py-1.5">Try again</button>
              </div>
            </div>
          </div>
        )}

        {/* Success — real provider result */}
        {status === 'done' && result && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Analysis complete — suggestions below come from the configured AI service.
            </div>
            <div className="bg-royal-50 border border-royal-100 rounded-xl p-4 text-sm text-navy-800">{result.summary}</div>
            <div className="grid md:grid-cols-2 gap-4">
              {SECTION_ICONS.map(({ key, icon: Icon, title }) => {
                const section = result.sections[key];
                return (
                  <div key={key} className="border border-navy-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-royal-600" />
                      <p className="font-semibold text-navy-900 text-sm">{title}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {section?.items?.length ? (
                        section.items.map((item, i) => (
                          <li key={i} className="text-sm text-navy-700 flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-royal-400 mt-1.5 shrink-0" />{item}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm muted">Insufficient data — the AI service returned no {title.toLowerCase()} for this photo.</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
            {result.budgetNote && (
              <div className="flex items-start gap-2 bg-navy-50 rounded-xl p-3 text-sm text-navy-700">
                <Wallet className="w-4 h-4 text-navy-500 shrink-0 mt-0.5" />
                <span>{result.budgetNote}</span>
              </div>
            )}

            {/* Continue the journey with real matching */}
            <div className="flex flex-wrap items-center gap-3 bg-royal-50 border border-royal-100 rounded-xl p-4">
              <p className="text-sm text-navy-800 flex-1 min-w-[220px]">
                Ready to execute? Match verified <strong>Interior Designers</strong> and <strong>Furniture Providers</strong> for this project.
              </p>
              <button onClick={() => navigate('/app/construction-team')} className="btn-primary text-sm">
                Find Professionals <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Idle hint + honest provider state */}
        {(status === 'idle' || status === 'loading') && (
          <div className="mt-4 flex items-start gap-2 text-xs muted">
            <><Sparkles className="w-4 h-4 text-royal-500 shrink-0" /><p>Real Gemini vision analysis via the BuildMatch backend — deploy the <code className="bg-navy-100 rounded px-1">interior-design</code> Edge Function with <code className="bg-navy-100 rounded px-1">GEMINI_API_KEY</code> to enable it. The page shows the server's exact state when you submit.</p></>
          </div>
        )}
      </div>
    </div>
  );
}
