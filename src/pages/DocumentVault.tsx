import { useState, useEffect } from 'react';
import { fetchProjects, fetchDocuments } from '@/lib/data';
import type { Project, DocumentItem } from '@/lib/types';
import { LoadingState, EmptyState, Badge, formatDate } from '@/components/ui';
import { FolderLock, FileText, Download, Eye, Upload, Search } from 'lucide-react';

const categories = ['All', 'Building Plan', 'Engineer Agreement', 'Cost Estimate', 'Government Approval', 'Project Reports', 'Invoices', 'Milestone Evidence'];

export default function DocumentVault() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const projs = await fetchProjects();
        setProjects(projs);
        if (projs.length > 0) setSelectedProject(projs[0].id);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    (async () => { try { setDocs(await fetchDocuments(selectedProject)); } catch { /* ignore */ } })();
  }, [selectedProject]);

  if (loading) return <LoadingState text="Loading documents..." />;

  const filtered = docs.filter((d) => {
    if (filter !== 'All' && d.category !== filter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Document Vault</h1>
        <p className="muted mt-1">Upload, preview, and manage all your project documents</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`btn text-sm ${selectedProject === p.id ? 'bg-navy-900 text-white' : 'btn-secondary'}`}>{p.title}</button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-primary"><Upload className="w-4 h-4" /> Upload</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FolderLock className="w-7 h-7" />} title="No documents found" description="Upload documents or adjust your filters." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <div key={d.id} className="card p-5 card-hover">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-royal-50 text-royal-700 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 text-sm truncate">{d.name}</p>
                  <p className="text-xs muted">{(d.size_kb / 1024).toFixed(1)} MB · {formatDate(d.uploaded_date)}</p>
                </div>
              </div>
              <Badge variant="navy">{d.category}</Badge>
              <div className="flex gap-2 mt-3">
                <button className="btn-secondary text-xs flex-1 py-2"><Eye className="w-3.5 h-3.5" /> Preview</button>
                <button className="btn-secondary text-xs py-2 px-3"><Download className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
