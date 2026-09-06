import { useState } from 'react';
import { MapPin, Home, Ruler, Wallet, Palette } from 'lucide-react';
import type { ProjectRequirement } from '@/lib/types';
import ConstructionTeam from '@/components/team/ConstructionTeam';

const DEFAULT_REQ: ProjectRequirement = {
  location: 'Coimbatore',
  budget: 2800000,
  house_type: '2BHK',
  area_sqft: 1500,
  construction_style: 'Modern',
};

export default function ConstructionTeamPage() {
  const [req, setReq] = useState<ProjectRequirement>(DEFAULT_REQ);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Requirements quick-editor */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-1">Project Requirements</h2>
        <p className="muted text-sm mb-4">
          AI recommendations are ranked against these requirements. Adjust them and the team matches update instantly.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="label"><MapPin className="w-3.5 h-3.5 inline mr-1" />Location</label>
            <select className="input" value={req.location} onChange={(e) => setReq({ ...req, location: e.target.value })}>
              {['Coimbatore', 'Chennai', 'Bengaluru', 'Hyderabad', 'Kochi', 'Pune', 'Mumbai'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label"><Home className="w-3.5 h-3.5 inline mr-1" />House Type</label>
            <select className="input" value={req.house_type} onChange={(e) => setReq({ ...req, house_type: e.target.value })}>
              {['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Duplex'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label"><Ruler className="w-3.5 h-3.5 inline mr-1" />Area (sq.ft)</label>
            <input type="number" className="input" value={req.area_sqft} onChange={(e) => setReq({ ...req, area_sqft: +e.target.value })} />
          </div>
          <div>
            <label className="label"><Wallet className="w-3.5 h-3.5 inline mr-1" />Budget (₹)</label>
            <select className="input" value={req.budget} onChange={(e) => setReq({ ...req, budget: +e.target.value })}>
              <option value={1500000}>₹10–15 Lakhs</option>
              <option value={2000000}>₹15–20 Lakhs</option>
              <option value={2800000}>₹20–30 Lakhs</option>
              <option value={4000000}>₹30–45 Lakhs</option>
              <option value={6000000}>₹45–60 Lakhs</option>
              <option value={8000000}>₹60+ Lakhs</option>
            </select>
          </div>
          <div>
            <label className="label"><Palette className="w-3.5 h-3.5 inline mr-1" />Construction Style</label>
            <select className="input" value={req.construction_style} onChange={(e) => setReq({ ...req, construction_style: e.target.value })}>
              {['Modern', 'Contemporary', 'Traditional', 'Eco-friendly', 'Luxury'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Construction Team */}
      <ConstructionTeam req={req} />
    </div>
  );
}