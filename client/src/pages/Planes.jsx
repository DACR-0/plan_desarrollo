import { useState } from 'react';
import {
  BookCopy, CheckCircle2, Circle, Edit, Trash2, Plus,
  CalendarRange, Zap,
} from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const defaultForm = { nombre: '', descripcion: '', anio_inicio: 2022, anio_fin: 2026 };

export default function Planes() {
  const { planes, activePlan, loading, fetchPlanes, activarPlan } = usePlan();
  const { isAdmin } = useAuth();

  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);   // plan object being edited, or null
  const [form,    setForm]    = useState(defaultForm);
  const [saving,  setSaving]  = useState(false);
  const [activating, setActivating] = useState(null); // id being activated

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setModal(true);
  };

  const openEdit = plan => {
    setEditing(plan);
    setForm({
      nombre:      plan.nombre,
      descripcion: plan.descripcion || '',
      anio_inicio: plan.anio_inicio,
      anio_fin:    plan.anio_fin,
    });
    setModal(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/planes/${editing.id}`, form);
        toast.success('Plan actualizado');
      } else {
        await api.post('/planes', form);
        toast.success('Plan creado');
      }
      setModal(false);
      fetchPlanes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async plan => {
    if (!confirm(`¿Eliminar el plan "${plan.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/planes/${plan.id}`);
      toast.success('Plan eliminado');
      fetchPlanes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando plan');
    }
  };

  const handleActivar = async plan => {
    setActivating(plan.id);
    try {
      await activarPlan(plan.id);
      toast.success(`Plan "${plan.nombre}" activado`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error activando plan');
    } finally {
      setActivating(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Planes de Desarrollo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {planes.length} plan{planes.length !== 1 ? 'es' : ''} registrado{planes.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin() && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Nuevo Plan
          </button>
        )}
      </div>

      {/* Grid de tarjetas */}
      {planes.length === 0 ? (
        <div className="card p-12 text-center">
          <BookCopy size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay planes registrados</p>
          {isAdmin() && (
            <button onClick={openCreate} className="btn-primary mt-4">
              <Plus size={16} /> Crear primer plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {planes.map(plan => {
            const isVigente = plan.vigente || plan.id === activePlan?.id;
            return (
              <div
                key={plan.id}
                className={`card p-5 flex flex-col gap-4 transition-shadow hover:shadow-md
                  ${isVigente ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
              >
                {/* Estado badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isVigente ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle2 size={12} />
                        Plan Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <Circle size={12} />
                        Inactivo
                      </span>
                    )}
                  </div>

                  {/* Acciones admin */}
                  {isAdmin() && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(plan)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      {!isVigente && (
                        <button
                          onClick={() => handleDelete(plan)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${isVigente ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <BookCopy size={18} className={isVigente ? 'text-primary-700' : 'text-gray-500'} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{plan.nombre}</h3>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <CalendarRange size={11} />
                        <span>{plan.anio_inicio} – {plan.anio_fin}</span>
                      </div>
                    </div>
                  </div>

                  {plan.descripcion && (
                    <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-3">
                      {plan.descripcion}
                    </p>
                  )}
                </div>

                {/* Footer: botón Activar */}
                {isAdmin() && !isVigente && (
                  <button
                    onClick={() => handleActivar(plan)}
                    disabled={activating === plan.id}
                    className="w-full btn-secondary justify-center text-xs py-1.5 gap-1.5"
                  >
                    {activating === plan.id ? (
                      <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600" /> Activando...</>
                    ) : (
                      <><Zap size={13} /> Activar este plan</>
                    )}
                  </button>
                )}

                {isVigente && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <CheckCircle2 size={13} />
                    Este es el plan activo del sistema
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear / editar */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar Plan' : 'Nuevo Plan de Desarrollo'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del plan *</label>
            <input
              required
              className="input-field"
              placeholder="Ej: Plan de Desarrollo Institucional 2026-2030"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Breve descripción del plan..."
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año de inicio *</label>
              <input
                required
                type="number"
                min="2000"
                max="2100"
                className="input-field"
                value={form.anio_inicio}
                onChange={e => setForm(p => ({ ...p, anio_inicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año de fin *</label>
              <input
                required
                type="number"
                min="2000"
                max="2100"
                className="input-field"
                value={form.anio_fin}
                onChange={e => setForm(p => ({ ...p, anio_fin: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
