import { useState, useEffect } from 'react';
import { Plus, Play, StopCircle, Edit, CalendarClock, CheckCircle2, Clock, XCircle } from 'lucide-react';
import api from '../services/api';
import { usePlan } from '../context/PlanContext';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const ESTADO_CONFIG = {
  programado: { label: 'Programado', icon: Clock,        cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  activo:     { label: 'Activo',     icon: CheckCircle2, cls: 'bg-green-100  text-green-700  border-green-200'  },
  cerrado:    { label: 'Cerrado',    icon: XCircle,      cls: 'bg-gray-100   text-gray-600   border-gray-200'   },
};

const fmt = d =>
  d ? new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function Periodos() {
  const { activePlan } = usePlan();
  const planId = activePlan?.id;

  const [periodos, setPeriodos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form, setForm] = useState({ nombre: '', fecha_inicio: '', fecha_cierre: '' });

  useEffect(() => { if (planId) fetchData(); }, [planId]);

  const fetchData = () => {
    setLoading(true);
    api.get(`/periodos?plan_id=${planId}`)
      .then(r => setPeriodos(r.data.data))
      .catch(() => toast.error('Error cargando periodos'))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', fecha_inicio: '', fecha_cierre: '' });
    setModal(true);
  };

  const openEdit = p => {
    setEditing(p);
    setForm({
      nombre:       p.nombre,
      fecha_inicio: p.fecha_inicio?.slice(0,10) || '',
      fecha_cierre: p.fecha_cierre?.slice(0,10) || '',
    });
    setModal(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/periodos/${editing.id}`, form);
        toast.success('Periodo actualizado');
      } else {
        await api.post('/periodos', { ...form, plan_id: planId });
        toast.success('Periodo creado');
      }
      setModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    }
  };

  const handleActivar = async id => {
    if (!confirm('Activar este periodo? Se abrira el reporte para los usuarios de area.')) return;
    try {
      await api.put(`/periodos/${id}/activar`);
      toast.success('Periodo activado');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleCerrar = async id => {
    if (!confirm('Cerrar este periodo? Los usuarios de area no podran enviar mas solicitudes.')) return;
    try {
      await api.put(`/periodos/${id}/cerrar`);
      toast.success('Periodo cerrado');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const diasDuracion = (inicio, cierre) => {
    if (!inicio || !cierre) return '—';
    const d = Math.round((new Date(cierre) - new Date(inicio)) / (1000*60*60*24));
    return `${d} dias`;
  };

  if (!planId) return (
    <div className="card p-12 text-center">
      <p className="text-gray-500 font-medium">No hay un plan activo.</p>
      <p className="text-sm text-gray-400 mt-1">Ve a <strong>Planes</strong> y activa uno.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarClock size={22} className="text-primary-600" />
            Periodos de Seguimiento
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestiona los periodos semestrales de reporte de cambios.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nuevo Periodo
        </button>
      </div>

      <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex gap-2">
        <Clock size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          Los periodos deben tener una duracion de <strong>14 a 21 dias</strong> (2-3 semanas) y se
          habilitan cada 6 meses. Solo puede haber <strong>un periodo activo</strong> por plan.
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
        </div>
      ) : periodos.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No hay periodos creados aun.</div>
      ) : (
        <div className="space-y-3">
          {periodos.map(p => {
            const cfg  = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.programado;
            const Icon = cfg.icon;
            return (
              <div key={p.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{p.nombre}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
                      <Icon size={11} />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>Inicio: <strong className="text-gray-700">{fmt(p.fecha_inicio)}</strong></span>
                    <span>Cierre: <strong className="text-gray-700">{fmt(p.fecha_cierre)}</strong></span>
                    <span>Duracion: <strong className="text-gray-700">{diasDuracion(p.fecha_inicio, p.fecha_cierre)}</strong></span>
                    {p.creado_por_nombre && (
                      <span>Creado por: <strong className="text-gray-700">{p.creado_por_nombre}</strong></span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.estado === 'programado' && (
                    <>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleActivar(p.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        <Play size={14} /> Activar
                      </button>
                    </>
                  )}
                  {p.estado === 'activo' && (
                    <button
                      onClick={() => handleCerrar(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      <StopCircle size={14} /> Cerrar
                    </button>
                  )}
                  {p.estado === 'cerrado' && (
                    <span className="text-xs text-gray-400 italic">Finalizado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Periodo' : 'Nuevo Periodo de Seguimiento'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del periodo *</label>
            <input
              required
              className="input-field"
              placeholder="Ej: Seguimiento I-2025"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio *</label>
              <input
                required type="date"
                className="input-field"
                value={form.fecha_inicio}
                onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de cierre *</label>
              <input
                required type="date"
                className="input-field"
                value={form.fecha_cierre}
                onChange={e => setForm(p => ({ ...p, fecha_cierre: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            La duracion debe ser entre 14 y 21 dias (2-3 semanas).
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
