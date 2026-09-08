import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMaterials, createMaterial, updateMaterial, deleteMaterial } from '@/lib/data';
import type { Material } from '@/lib/types';
import { LoadingState, EmptyState, Badge, Toast, Modal, formatINR } from '@/components/ui';
import { availabilityStatus } from '@/components/professional/statuses';
import {
  Package, Search, Plus, Pencil, Trash2, Minus, ImageOff, AlertTriangle,
} from 'lucide-react';
import { onMaterialImgError } from '@/lib/people';

const CATEGORIES = ['Cement', 'Steel', 'Bricks', 'Sand', 'Electrical', 'Plumbing', 'Tiles', 'Paint', 'Hardware', 'Other'];

const emptyForm = () => ({
  name: '', category: 'Cement' as Material['category'], description: '', price: '', unit: 'piece', stock: '', availability: 'in_stock' as Material['availability'], image_url: '',
});

export default function ShopInventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availFilter, setAvailFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { setItems(await fetchMaterials(user.id)); } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return <LoadingState text="Loading..." />;
  if (loading) return <LoadingState text="Loading inventory..." />;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({
      name: m.name, category: m.category, description: m.description ?? '', price: String(m.price),
      unit: m.unit, stock: String(m.stock), availability: m.availability, image_url: m.image_url ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setToast({ msg: 'Material name is required.', type: 'error' });
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      price: Math.max(0, Number(form.price) || 0),
      unit: form.unit.trim() || 'piece',
      stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
      availability: form.availability,
      image_url: form.image_url.trim() || null,
    };
    try {
      if (editing) {
        await updateMaterial(editing.id, payload);
        setToast({ msg: 'Material updated.', type: 'success' });
      } else {
        await createMaterial({ ...payload, shop_id: user.id });
        setToast({ msg: 'Material added to your inventory.', type: 'success' });
      }
      setModalOpen(false);
      await load();
    } catch {
      setToast({ msg: 'Could not save the material. Please try again.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (m: Material) => {
    if (!window.confirm(`Delete "${m.name}" from your inventory?`)) return;
    try {
      await deleteMaterial(m.id);
      setToast({ msg: 'Material deleted.', type: 'info' });
      await load();
    } catch {
      setToast({ msg: 'Could not delete the material.', type: 'error' });
    }
  };

  const adjustStock = async (m: Material, delta: number) => {
    const stock = Math.max(0, m.stock + delta);
    const availability: Material['availability'] = stock <= 0 ? 'out_of_stock' : m.availability === 'out_of_stock' ? 'in_stock' : m.availability;
    try {
      await updateMaterial(m.id, { stock, availability });
      await load();
    } catch {
      setToast({ msg: 'Could not update stock.', type: 'error' });
    }
  };

  const filtered = items.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'All' && m.category !== category) return false;
    if (availFilter !== 'All' && m.availability !== availFilter) return false;
    return true;
  });

  const low = items.filter((m) => m.availability === 'low_stock').length;
  const out = items.filter((m) => m.availability === 'out_of_stock').length;
  const value = items.reduce((s, m) => s + m.price * m.stock, 0);

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Materials & Inventory</h1>
          <p className="muted mt-1">Manage your catalogue, pricing, stock levels and availability</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Material</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-sm muted">Total Listings</p><p className="text-2xl font-bold text-navy-900 mt-1">{items.length}</p></div>
        <div className="card p-5"><p className="text-sm muted">Low Stock</p><p className="text-2xl font-bold text-amber-600 mt-1">{low}</p></div>
        <div className="card p-5"><p className="text-sm muted">Out of Stock</p><p className="text-2xl font-bold text-rose-600 mt-1">{out}</p></div>
        <div className="card p-5"><p className="text-sm muted">Stock Value</p><p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(value)}</p></div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input w-auto" value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}>
          <option>All</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Package className="w-7 h-7" />} title="No materials found" description="Add materials to start receiving orders, or adjust your filters." action={<button onClick={openAdd} className="btn-primary">Add Material</button>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const av = availabilityStatus(m.availability);
            return (
              <div key={m.id} className="card p-5">
                <div className="flex items-start gap-3 mb-3">
                  {m.image_url
                    ? <img src={m.image_url} alt={m.name} onError={onMaterialImgError} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    : <div className="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center text-navy-300 shrink-0"><ImageOff className="w-6 h-6" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy-900 text-sm leading-snug">{m.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="navy">{m.category}</Badge>
                      <Badge variant={av.variant}>{av.label}</Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                  <div className="bg-navy-50 rounded-lg p-2"><p className="text-[10px] muted">Price</p><p className="font-bold text-navy-900">{formatINR(m.price)}</p></div>
                  <div className="bg-navy-50 rounded-lg p-2"><p className="text-[10px] muted">Unit</p><p className="font-bold text-navy-900">{m.unit}</p></div>
                  <div className="bg-navy-50 rounded-lg p-2"><p className="text-[10px] muted">Stock</p><p className="font-bold text-navy-900">{m.stock}</p></div>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <button onClick={() => adjustStock(m, -1)} className="btn-secondary px-2.5 py-1.5 text-sm" title="Decrease stock"><Minus className="w-3.5 h-3.5" /></button>
                  <div className="flex-1 text-center text-sm font-semibold text-navy-900">{m.stock} in stock</div>
                  <button onClick={() => adjustStock(m, 1)} className="btn-secondary px-2.5 py-1.5 text-sm" title="Increase stock"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(m)} className="btn-secondary text-xs flex-1 py-2"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => handleDelete(m)} className="btn-secondary text-xs py-2 px-3 text-rose-600 hover:bg-rose-50 hover:border-rose-200"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Material' : 'Add Material'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div><label className="label">Name *</label><input className="input" placeholder="e.g. UltraTech Cement 53 Grade" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Material['category'] })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Unit</label><input className="input" placeholder="e.g. bag (50kg), ton, piece" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div><label className="label">Price (₹)</label><input type="number" min="0" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><label className="label">Stock</label><input type="number" min="0" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">Availability</label>
            <select className="input" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as Material['availability'] })}>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            {Number(form.stock) <= 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Stock is 0 — consider setting availability to Out of Stock.</p>
            )}
          </div>
          <div><label className="label">Description</label><textarea className="input min-h-[70px]" placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Image URL</label><input className="input" placeholder="https://... (optional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <button onClick={handleSave} disabled={busy} className="btn-primary w-full">{busy ? 'Saving...' : editing ? 'Save Changes' : 'Add Material'}</button>
        </div>
      </Modal>
    </div>
  );
}
