import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import toast from 'react-hot-toast';
import Modal      from '../components/Modal';
import ProgressBar from '../components/ProgressBar';

export default function Metas() {
  const { isAdmin } = useAuth();
  const { activePlan } = usePlan();
  const planId = activePlan?.id;
  const [metas,  setMetas]  = useState([]);
  const [oes,    setOes]    = useState([]);
  const [loading,setLoading]= useState(true);
  const [filtro, setFiltro] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [areas, setAreas] = useState([]);

  const [modal,  setModal]  = useState(false);
  const [editing,setEditing]= useState(null);
  const defaultForm = { objetivo_especifico_id:'', codigo:'', nombre:'', descripcion:'', linea_base:0, valor_meta:'', unidad_medida:'', anio_meta:new Date().getFullYear() };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { if (planId) fetchData(); }, [planId]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get(`/metas?plan_id=${planId}`),
      api.get(`/objetivos/especificos?plan_id=${planId}`),
      api.get(`/areas?plan_id=${planId}`),
    ]).then(([r1, r2, r3]) => {
      setMetas(r1.data.data);
      setOes(r2.data.data);
      setAreas(r3.data.data);
    }).catch(() => toast.error('Error cargando datos'))
      .finally(() => setLoading(false));
  };

  const openCreate = () => { setEditing(null); setForm(defaultForm); setModal(true); };
  const openEdit   = m  => {
    setEditing(m);
    setForm({ objetivo_especifico_id: m.objetivo_especifico_id, codigo: m.codigo||'', nombre: m.nombre, descripcion: m.descripcion||'', linea_base: m.linea_base, valor_meta: m.valor_meta, unidad_medida: m.unidad_medida||'', anio_meta: m.anio_meta||'' });
    setModal(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/metas/${editing.id}`, { ...form, orden: editing.orden, activo: true });
        toast.success('Meta actualizada');
      } else {
        await api.post('/metas', form);
        toast.success('Meta creada');
      }
      setModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    }
  };

  const handleDelete = async id => {
    if (!confirm('¿Desactivar esta meta?')) return;
    try { await api.delete(`/metas/${id}`); toast.success('Meta desactivada'); fetchData(); }
    catch { toast.error('Error'); }
  };

  const filtered = metas.filter(m =>
    m.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    (m.codigo || '').toLowerCase().includes(filtro.toLowerCase())
  );

  if (!planId) return (
    <div className="card p-12 text-center">
      <p className="text-gray-500 font-medium">No hay un plan activo seleccionado.</p>
      <p className="text-sm text-gray-400 mt-1">Ve a la sección <strong>Planes</strong> y activa un plan.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <input className="input-field max-w-xs" placeholder="Buscar meta..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>
        {isAdmin() && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nueva Meta</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Meta</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Objetivo Específico</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Línea Base</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Valor Meta</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Avance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.codigo || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{m.nombre}</p>
                      <p className="text-xs text-gray-400">{m.area_nombre} · {m.anio_meta}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{m.obj_especifico_nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{m.linea_base} {m.unidad_medida}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{m.valor_meta} {m.unidad_medida}</td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <ProgressBar value={m.avance} />
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin() && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-primary-50"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className="text-center text-gray-400 py-10 text-sm">No se encontraron metas.</p>}
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Meta' : 'Nueva Meta'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo Específico *</label>
            <select required className="input-field" value={form.objetivo_especifico_id} onChange={e => setForm(p => ({ ...p, objetivo_especifico_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {oes.map(oe => <option key={oe.id} value={oe.id}>{oe.codigo} – {oe.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input className="input-field" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año Meta</label>
              <input type="number" className="input-field" value={form.anio_meta} onChange={e => setForm(p => ({ ...p, anio_meta: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Meta *</label>
            <input required className="input-field" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Línea Base</label>
              <input type="number" step="any" className="input-field" value={form.linea_base} onChange={e => setForm(p => ({ ...p, linea_base: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Meta *</label>
              <input required type="number" step="any" className="input-field" value={form.valor_meta} onChange={e => setForm(p => ({ ...p, valor_meta: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <input className="input-field" placeholder="%" value={form.unidad_medida} onChange={e => setForm(p => ({ ...p, unidad_medida: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea rows={2} className="input-field" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
