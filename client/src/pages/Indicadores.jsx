import { useState, useEffect } from 'react';
import { Plus, RefreshCw, History, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import toast from 'react-hot-toast';
import Modal      from '../components/Modal';
import ProgressBar from '../components/ProgressBar';

function estadoBadge(pct) {
  if (pct >= 90) return <span className="badge-green">En Meta</span>;
  if (pct >= 50) return <span className="badge-yellow">En Progreso</span>;
  return <span className="badge-red">En Riesgo</span>;
}

export default function Indicadores() {
  const { isAdmin }  = useAuth();
  const { activePlan } = usePlan();
  const planId = activePlan?.id;

  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('');
  const [expanded, setExpanded] = useState({});

  // Modal crear/editar
  const [modal,  setModal]  = useState(false);
  const [editing,setEditing]= useState(null);
  const [form,   setForm]   = useState({ meta_id:'', nombre:'', formula:'', unidad_medida:'', linea_base:0, valor_meta:'', periodo_calculo:'anual', descripcion:'' });

  // Modal historial
  const [histModal, setHistModal] = useState(false);
  const [historico, setHistorico] = useState([]);

  // Listas para select
  const [metas,    setMetas]    = useState([]);
  const [varsPlan, setVarsPlan] = useState([]); // variables disponibles del plan

  useEffect(() => { if (planId) fetchData(); }, [planId]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get(`/indicadores?plan_id=${planId}`),
      api.get(`/metas?plan_id=${planId}`),
      api.get(`/variables?plan_id=${planId}`),
    ]).then(([r1, r2, r3]) => {
      setItems(r1.data.data);
      setMetas(r2.data.data);
      setVarsPlan(r3.data.data);
    }).catch(() => toast.error('Error cargando datos'))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ meta_id:'', nombre:'', formula:'', unidad_medida:'', linea_base:0, valor_meta:'', periodo_calculo:'anual', descripcion:'' });
    setModal(true);
  };

  const openEdit = ind => {
    setEditing(ind);
    setForm({ meta_id: ind.meta_id, nombre: ind.nombre, formula: ind.formula, unidad_medida: ind.unidad_medida || '', linea_base: ind.linea_base, valor_meta: ind.valor_meta, periodo_calculo: ind.periodo_calculo || 'anual', descripcion: ind.descripcion || '' });
    setModal(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/indicadores/${editing.id}`, { ...form, activo: true });
        toast.success('Indicador actualizado');
      } else {
        await api.post('/indicadores', form);
        toast.success('Indicador creado');
      }
      setModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    }
  };

  const handleDelete = async id => {
    if (!confirm('¿Desactivar este indicador?')) return;
    try {
      await api.delete(`/indicadores/${id}`);
      toast.success('Indicador desactivado');
      fetchData();
    } catch { toast.error('Error'); }
  };

  const handleRecalculate = async id => {
    try {
      const r = await api.post(`/indicadores/${id}/recalcular`, { periodo: new Date().getFullYear().toString() });
      toast.success(`Recalculado: ${r.data.data.valor_calculado} (${r.data.data.porcentaje_cumplimiento}%)`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error en fórmula');
    }
  };

  const openHistorico = async id => {
    try {
      const r = await api.get(`/indicadores/${id}/historico`);
      setHistorico(r.data.data);
      setHistModal(true);
    } catch { toast.error('Error cargando historial'); }
  };

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = items.filter(i =>
    i.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    i.area_nombre?.toLowerCase().includes(filtro.toLowerCase())
  );

  if (!planId) return (
    <div className="card p-12 text-center">
      <p className="text-gray-500 font-medium">No hay un plan activo seleccionado.</p>
      <p className="text-sm text-gray-400 mt-1">Ve a la sección <strong>Planes</strong> y activa un plan.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <input
          className="input-field max-w-xs"
          placeholder="Buscar indicador..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />
        {isAdmin() && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Nuevo Indicador
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ind => (
            <div key={ind.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {estadoBadge(ind.porcentaje_cumplimiento)}
                      <span className="badge-blue">{ind.area_nombre}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm">{ind.nombre}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Meta: {ind.meta_nombre}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin() && (
                      <>
                        <button onClick={() => handleRecalculate(ind.id)} title="Recalcular" className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                          <RefreshCw size={15} />
                        </button>
                        <button onClick={() => openEdit(ind)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => handleDelete(ind.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    <button onClick={() => openHistorico(ind.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                      <History size={15} />
                    </button>
                    <button onClick={() => toggleExpand(ind.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                      {expanded[ind.id] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={ind.porcentaje_cumplimiento} />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-bold text-gray-800">{ind.porcentaje_cumplimiento}%</span>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-400 mt-1">
                  <span>Actual: <strong className="text-gray-700">{ind.valor_actual}</strong></span>
                  <span>Meta: <strong className="text-gray-700">{ind.valor_meta}</strong></span>
                  {ind.unidad_medida && <span>Unidad: {ind.unidad_medida}</span>}
                </div>
              </div>

              {expanded[ind.id] && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Fórmula:</p>
                  <code className="text-xs bg-gray-100 text-primary-800 px-2 py-1 rounded font-mono">{ind.formula}</code>
                  {ind.descripcion && <p className="text-xs text-gray-500 mt-2">{ind.descripcion}</p>}
                  <div className="flex gap-4 text-xs text-gray-400 mt-2">
                    <span>Línea base: {ind.linea_base}</span>
                    <span>Período: {ind.periodo_calculo}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!filtered.length && <p className="text-center text-gray-400 py-10">No se encontraron indicadores.</p>}
        </div>
      )}

      {/* Modal Crear/Editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Indicador' : 'Nuevo Indicador'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta asociada *</label>
            <select required className="input-field" value={form.meta_id} onChange={e => setForm(p => ({ ...p, meta_id: e.target.value }))}>
              <option value="">Seleccionar meta...</option>
              {metas.map(m => <option key={m.id} value={m.id}>{m.codigo} – {m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del indicador *</label>
            <input required className="input-field" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fórmula *</label>
            <input required className="input-field font-mono" placeholder="Ej: (Graduados_Oportunos / Total_Matriculados) * 100" value={form.formula} onChange={e => setForm(p => ({ ...p, formula: e.target.value }))} />
            {varsPlan.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Variables disponibles en este plan:</p>
                <div className="flex flex-wrap gap-1">
                  {varsPlan.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      title={v.descripcion || v.nombre}
                      onClick={() => setForm(p => ({ ...p, formula: p.formula + v.nombre }))}
                      className="font-mono text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded hover:bg-primary-100 transition-colors"
                    >
                      {v.nombre}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Haz clic en una variable para insertarla en la fórmula.</p>
              </div>
            )}
            {varsPlan.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay variables creadas para este plan. Crea variables primero en la sección Variables.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Línea Base</label>
              <input type="number" step="any" className="input-field" value={form.linea_base} onChange={e => setForm(p => ({ ...p, linea_base: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Meta *</label>
              <input required type="number" step="any" className="input-field" value={form.valor_meta} onChange={e => setForm(p => ({ ...p, valor_meta: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
              <input className="input-field" placeholder="%, estudiantes, etc." value={form.unidad_medida} onChange={e => setForm(p => ({ ...p, unidad_medida: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período de Cálculo</label>
              <select className="input-field" value={form.periodo_calculo} onChange={e => setForm(p => ({ ...p, periodo_calculo: e.target.value }))}>
                <option value="anual">Anual</option>
                <option value="semestral">Semestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="mensual">Mensual</option>
              </select>
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

      {/* Modal Historial */}
      <Modal open={histModal} onClose={() => setHistModal(false)} title="Historial del Indicador" size="lg">
        {historico.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Sin historial registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 text-gray-500 text-xs">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Período</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historico.map(h => (
                  <tr key={h.id} className="text-gray-700">
                    <td className="py-2 text-xs">{new Date(h.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="py-2 text-xs">{h.periodo || '-'}</td>
                    <td className="py-2 font-mono">{h.valor_calculado}</td>
                    <td className="py-2">
                      <ProgressBar value={h.porcentaje_cumplimiento} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
