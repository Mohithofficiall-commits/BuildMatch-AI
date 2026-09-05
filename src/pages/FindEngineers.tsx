import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, MapPin, GitCompareArrows, SlidersHorizontal, X } from 'lucide-react';
import { fetchEngineers } from '@/lib/data';
import { rankEngineers } from '@/lib/matching';
import { useCompare } from '@/lib/compare';
import type { Engineer, ProjectRequirement } from '@/lib/types';
import { Badge, RatingStars, TrustBadge, LoadingState, EmptyState } from '@/components/ui';

export default function FindEngineers() {
  const navigate = useNavigate();
  const { engineerIds, toggle, has } = useCompare();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    location: 'all',
    specialization: 'all',
    minRating: 0,
    minExperience: 0,
    maxPrice: 3000,
    availability: 'all',
    verifiedOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [req] = useState<ProjectRequirement>({
    location: 'Coimbatore',
    budget: 2800000,
    house_type: '2BHK',
    area_sqft: 1500,
    construction_style: 'Modern',
  });

  useEffect(() => {
    (async () => {
      try {
        setEngineers(await fetchEngineers());
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const matches = useMemo(() => rankEngineers(engineers, req), [engineers, req]);
  const matchMap = useMemo(() => {
    const map = new Map<string, number>();
    matches.forEach((m) => map.set(m.engineer.id, m.overallScore));
    return map;
  }, [matches]);

  const filtered = useMemo(() => {
    return engineers.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.location.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.location !== 'all' && e.location !== filters.location) return false;
      if (filters.specialization !== 'all' && !e.specializations.includes(filters.specialization)) return false;
      if (e.rating < filters.minRating) return false;
      if (e.experience_years < filters.minExperience) return false;
      if (e.price_per_sqft > filters.maxPrice) return false;
      if (filters.availability !== 'all' && e.availability !== filters.availability) return false;
      if (filters.verifiedOnly && e.verification_status !== 'verified') return false;
      return true;
    });
  }, [engineers, search, filters]);

  const locations = useMemo(() => [...new Set(engineers.map((e) => e.location))], [engineers]);
  const specializations = useMemo(() => [...new Set(engineers.flatMap((e) => e.specializations))], [engineers]);

  if (loading) return <LoadingState text="Finding engineers..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Find Engineers</h1>
        <p className="muted mt-1">Browse verified civil engineers and compare your options</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" placeholder="Search by name or location..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary ${showFilters ? 'border-royal-500 text-royal-700' : ''}`}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-5 animate-fade-in">
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Location</label>
              <select className="input" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
                <option value="all">All Locations</option>
                {locations.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Specialization</label>
              <select className="input" value={filters.specialization} onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}>
                <option value="all">All Specializations</option>
                {specializations.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Min Rating: {filters.minRating}★</label>
              <input type="range" min="0" max="5" step="0.5" className="w-full accent-royal-600" value={filters.minRating} onChange={(e) => setFilters({ ...filters, minRating: +e.target.value })} />
            </div>
            <div>
              <label className="label">Min Experience: {filters.minExperience} yrs</label>
              <input type="range" min="0" max="20" className="w-full accent-royal-600" value={filters.minExperience} onChange={(e) => setFilters({ ...filters, minExperience: +e.target.value })} />
            </div>
            <div>
              <label className="label">Max Price/sq.ft: ₹{filters.maxPrice}</label>
              <input type="range" min="1000" max="3000" step="50" className="w-full accent-royal-600" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: +e.target.value })} />
            </div>
            <div>
              <label className="label">Availability</label>
              <select className="input" value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })}>
                <option value="all">All</option>
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-navy-700 cursor-pointer">
                <input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => setFilters({ ...filters, verifiedOnly: e.target.checked })} className="w-4 h-4 accent-royal-600 rounded" />
                Verified only
              </label>
            </div>
            <div className="flex items-end">
              <button onClick={() => setFilters({ location: 'all', specialization: 'all', minRating: 0, minExperience: 0, maxPrice: 3000, availability: 'all', verifiedOnly: false })} className="btn-ghost text-sm">
                <X className="w-4 h-4" /> Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare bar */}
      {engineerIds.length > 0 && (
        <div className="card p-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-royal-600" />
            <span className="text-sm font-medium text-navy-900">{engineerIds.length} engineer(s) selected for comparison</span>
          </div>
          <button onClick={() => navigate('/app/compare')} className="btn-primary text-sm">
            Compare Now <GitCompareArrows className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-sm muted">{filtered.length} engineer(s) found</p>

      {/* Engineer cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="w-7 h-7" />} title="No engineers found" description="Try adjusting your filters or search query." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((e) => {
            const match = matchMap.get(e.id) ?? 0;
            return (
              <div key={e.id} className="card p-5 card-hover">
                <div className="flex items-start gap-3 mb-4">
                  <img src={e.photo_url} alt={e.name} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-navy-900 truncate">{e.name}</p>
                      {e.verification_status === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-xs muted flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <RatingStars rating={e.rating} size="xs" />
                      <span className="text-xs muted ml-1">{e.rating} ({e.reviews_count})</span>
                    </div>
                  </div>
                  {match > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-royal-600">{match}%</p>
                      <p className="text-[10px] muted">Match</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div><p className="text-xs muted">Experience</p><p className="font-semibold text-navy-900">{e.experience_years} years</p></div>
                  <div><p className="text-xs muted">Projects</p><p className="font-semibold text-navy-900">{e.projects_completed}</p></div>
                  <div><p className="text-xs muted">Price/sq.ft</p><p className="font-semibold text-navy-900">₹{e.price_per_sqft}</p></div>
                  <div><p className="text-xs muted">Availability</p><p className="font-semibold text-navy-900">{e.availability}</p></div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {e.specializations.slice(0, 3).map((s) => <Badge key={s} variant="navy">{s}</Badge>)}
                </div>

                <TrustBadge score={e.trust_score} />

                <div className="flex gap-2 mt-4">
                  <button onClick={() => navigate(`/app/engineers/${e.id}`)} className="btn-secondary flex-1 text-sm">
                    View Profile
                  </button>
                  <button
                    onClick={() => toggle(e.id)}
                    className={`btn text-sm px-3 ${has(e.id) ? 'bg-royal-600 text-white' : 'btn-secondary'}`}
                    title={has(e.id) ? 'Remove from compare' : 'Add to compare'}
                  >
                    <GitCompareArrows className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
