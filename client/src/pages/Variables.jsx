import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, History } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

export default function Variables() {
  const { isAdmin } = useAuth();
  const { activePlan } = usePlan();
  const planId = activePlan?.id;

  const [variables, setVariables] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState('');

  // Edición en línea del valor
  const [editing, setEditing] = useState({}); // { id: nuevo_valor }

  // Modal crear / editar
  const [modal,      setModal]      = useState(false);
  const [editingVar, setEditingVar] = useState(null);
  const [form,       setForm]       = useState({ nombre: '', descripcion: '', valor_actual: 0, unidad: '' });

  // Modal historial
  const [histModal, setHistModal] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [histTitle, setHistTitle] = useState('');

  useEffect(() => { if (planId) fetchData(); }, [planId]);

  const fetchData = () => {
    setLoading(true);
    api.get(`/variables?plan_id=${planId}`)
      .then(r => setVariables(r.data.data))
      .catch(() => toast.error('Error cargando variables'))
      .finally(() => setLoading(false));
  };

  // ── Edición en línea ─────────────────────────────────────
  const startEdit  = (id, val) => setEditing(p => ({ ...p, [id]: val }));
  const cancelEdit = id => setEditing(p => { const n = { ...p }; delete n[id]; return n; });

  const saveEdit = async id => {
    try {
      const v = variables.find(v => v.id === id);
      await api.put(`/variables/${id}`, { ...v, valor_actual: editing[id], observacion: '' });
      toast.success('Variable actualizada');
      cancelEdit(id);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    }
  };

  // ── Guardar lote ─────────────────────────────────────────
  const handleBatchUpdate = async () => {
    const changes = variables
      .filter(v => editing[v.id] !== undefined)
      .map(v => ({ id: v.id, valor_actual: editing[v.id] }));
    if (!changes.length) return toast.error('No hay cambios pendientes');
    try {
      const r = await api.post('/variables/actualizar-lote', { variables: changes });
      const n = r.data.data?.length ?? 0;
      toast.success(`${n} indicador${n !== 1 ? 'es' : ''} recalculado${n !== 1 ? 's' : ''}`);
      setEditing({});
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  // ── Crear / Editar variable ──────────────────────────────
  const openCreate = () => {
    setEditingVar(null);
    setForm({ nombre: '', descripcion: '', valor_actual: 0, unidad: '' });
    setModal(true);
  };
  const openEdit = v => {
    setEditingVar(v);
    setForm({ nombre: v.nombre, descripcion: v.descripcion || '', valor_actual: v.valor_actual, unidad: v.unidad || '' });
    setModal(true);
  };
  const handleSave = async e => {
    e.preventDefault();
    try {
      if (editingVar) {
        await api.put(`/variables/${editingVar.id}`, { ...form, activo: true });
        toast.success('Variable actualizada');
      } else {
        await api.post('/variables', { ...form, plan_id: planId });
        toast.success('Variable creada');
      }
      setModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    }
  };

  // ── Eliminar ─────────────────────────────────────────────
  const handleDelete = async id => {
    if (!confirm('¿Desactivar esta variable?')) return;
    try {
      await api.delete(`/variables/${id}`);
      toast.success('Variable desactivada');
      fetchData();
    } catch { toast.error('Error'); }
  };

  // ── Historial ─────────────────────────────────────────────
  const openHistorico = async (id, nombre) => {
    try {
      const r = await api.get(`/variables/historico/${id}`);
      setHistorico(r.data.data);
      setHistTitle(`Historial: ${nombre}`);
      setHistModal(true);
    } catch { toast.error('Error cargando historial'); }
  };

  const pendingCount = Object.keys(editing).length;
  const filtered = variables.filter(v =>
    v.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    (v.descripcion || '').toLowerCase().includes(filtro.toLowerCase())
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
        <div className="flex gap-2 flex-wrap">
          <input
            className="input-field max-w-xs"
            placeholder="Buscar variable..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && isAdmin() && (
            <button onClick={handleBatchUpdate} className="btn-primary bg-green-600 hover:bg-green-700">
              <Save size={16} /> Guardar {pendingCount} cambio{pendingCount > 1 ? 's' : ''}
            </button>
          )}
          {isAdmin() && (
            <button onClick={openCreate} className="btn-primary">
              <Plus size={16} /> Nueva Variable
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        Las variables son de ámbito de plan y pueden usarse en cualquier indicador referenciando su nombre en la fórmula.
        Total: <strong>{variables.length}</strong> variable{variables.length !== 1 ? 's' : ''}.
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Nombre (en fórmula)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Descripción</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Valor Actual</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Unidad</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(v => (
                  <tr key={v.id} className={`hover:bg-gray-50 ${editing[v.id] !== undefined ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 text-primary-700 px-1.5 py-0.5 rounded">
                        {v.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[250px] truncate">{v.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin() ? (
                        editing[v.id] !== undefined ? (
                          <input
                            type="number" step="any"
                            className="w-28 text-right border border-primary-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={editing[v.id]}
                            onChange={e => setEditing(p => ({ ...p, [v.id]: e.target.value }))}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(v.id, v.valor_actual)}
                            className="font-bold text-gray-800 hover:text-primary-600 hover:underline"
                          >
                            {v.valor_actual}
                          </button>
                        )
                      ) : (
                        <span className="font-bold text-gray-800">{v.valor_actual}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{v.unidad || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {editing[v.id] !== undefined && (
                          <>
                            <button onClick={() => saveEdit(v.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Guardar">
                              <Save size={14} />
                            </button>
                            <button onClick={() => cancelEdit(v.id)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded text-xs">✕</button>
                          </>
                        )}
                        <button onClick={() => openHistorico(v.id, v.nombre)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100" title="Historial">
                          <History size={14} />
                        </button>
                        {isAdmin() && (
                          <>
                            <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-primary-50" title="Editar">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(v.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Eliminar">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="text-center text-gray-400 py-10 text-sm">No se encontraron variables.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editingVar ? 'Editar Variable' : 'Nueva Variable'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-gray-400 font-normal">(sin espacios, usado en la fórmula)</span> *
            </label>
            <input
              required
              className="input-field font-mono"
              placeholder="Ej: Total_Matriculados"
              value={form.nombre}
              disabled={!!editingVar}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value.replace(/\s/g, '_') }))}
            />
            {!editingVar && (
              <p className="text-xs text-gray-400 mt-1">
                Este nombre se usa en las fórmulas de los indicadores y no puede cambiarse después de creado.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Actual</label>
              <input
                type="number" step="any"
                className="input-field"
                value={form.valor_actual}
                onChange={e => setForm(p => ({ ...p, valor_actual: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <input
                className="input-field"
                placeholder="estudiantes, %, etc."
                value={form.unidad}
                onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={2}
              className="input-field"
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editingVar ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial */}
      <Modal open={histModal} onClose={() => setHistModal(false)} title={histTitle} size="lg">
        {historico.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Sin historial.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500 text-xs">
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium">Período</th>
                <th className="pb-2 font-medium">Valor</th>
                <th className="pb-2 font-medium">Usuario</th>
                <th className="pb-2 font-medium">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historico.map(h => (
                <tr key={h.id}>
                  <td className="py-2 text-xs">{new Date(h.created_at).toLocaleDateString('es-CO')}</td>
                  <td className="py-2 text-xs">{h.periodo || '—'}</td>
                  <td className="py-2 font-mono font-bold">{h.valor}</td>
                  <td className="py-2 text-xs">{h.usuario_nombre || '—'}</td>
                  <td className="py-2 text-xs">{h.observacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
