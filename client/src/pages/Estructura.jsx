import { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronDown, Plus, Layers, BookOpen,
  Target, BarChart3, ChevronsDownUp, ChevronsUpDown,
} from 'lucide-react';
import api          from '../services/api';
import { useAuth }  from '../context/AuthContext';
import { usePlan }  from '../context/PlanContext';
import toast        from 'react-hot-toast';
import Modal        from '../components/Modal';
import ProgressBar  from '../components/ProgressBar';

// ─────────────────────────────────────────────────────────────
// Formularios por defecto según tipo de nodo
// ─────────────────────────────────────────────────────────────
const DEFAULT_FORMS = {
  area: { nombre: '', codigo: '', descripcion: '', orden: 1 },
  og:   { nombre: '', codigo: '', descripcion: '', orden: 1 },
  oe:   { nombre: '', codigo: '', descripcion: '', orden: 1 },
  meta: { nombre: '', codigo: '', descripcion: '', linea_base: 0, valor_meta: '', unidad_medida: '', anio_meta: new Date().getFullYear() },
};

const TITLES = {
  area: 'Nueva Área Estratégica',
  og:   'Nuevo Objetivo General',
  oe:   'Nuevo Objetivo Específico',
  meta: 'Nueva Meta',
};

// ─────────────────────────────────────────────────────────────
// Nodo del árbol
// ─────────────────────────────────────────────────────────────
function TreeNode({ node, level = 0, type, children, badge, avance, forceOpen, forceVersion, onAdd, adminMode }) {
  const [open, setOpen] = useState(level < 2);

  useEffect(() => {
    if (forceVersion > 0) setOpen(forceOpen);
  }, [forceVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const icons  = { area: Layers, og: BookOpen, oe: Target, meta: BarChart3 };
  const colors = {
    area: 'text-primary-700 bg-primary-50 border-primary-200',
    og:   'text-purple-700  bg-purple-50  border-purple-200',
    oe:   'text-orange-700  bg-orange-50  border-orange-200',
    meta: 'text-green-700   bg-green-50   border-green-200',
  };
  const addTitles = { area: 'Nuevo Objetivo General', og: 'Nuevo Objetivo Específico', oe: 'Nueva Meta' };
  const Icon = icons[type] || Layers;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${colors[type]}`}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-shrink-0 w-3.5">
          {children
            ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
            : null}
        </div>
        <Icon size={14} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {badge && <span className="text-xs font-mono opacity-60 mr-1">{badge}</span>}
          <span className="text-sm font-medium">{node.nombre}</span>
        </div>
        {avance !== undefined && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <div className="w-20 hidden sm:block">
              <ProgressBar value={avance} size="sm" showLabel={false} />
            </div>
            <span className="text-xs font-bold">{avance}%</span>
          </div>
        )}
        {/* Botón "+" solo para admin y en nodos que tienen hijos (area, og, oe) */}
        {adminMode && onAdd && type !== 'meta' && (
          <button
            title={addTitles[type]}
            onClick={e => { e.stopPropagation(); onAdd(); }}
            className="ml-1 flex-shrink-0 p-1 rounded hover:bg-white/60 opacity-60 hover:opacity-100 transition-opacity"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {open && children && (
        <div className="ml-5 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers de cálculo de avance
// ─────────────────────────────────────────────────────────────
function calcAvance(indicadores = []) {
  if (!indicadores.length) return 0;
  const avg = indicadores.reduce((s, i) => s + (parseFloat(i.porcentaje_cumplimiento) || 0), 0) / indicadores.length;
  return parseFloat(avg.toFixed(1));
}

// ─────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────
export default function Estructura() {
  const { isAdmin }                      = useAuth();
  const { activePlan, planes, fetchPlanes } = usePlan();

  const [areas,   setAreas]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [planId,  setPlanId]  = useState(null);

  // Estado global de expansión
  const [force, setForce] = useState({ open: true, v: 0 });

  // ── Modal único para crear cualquier elemento ──────────────
  // modal = null | { type: 'area'|'og'|'oe'|'meta', parentId, parentLabel }
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  // Init planId desde el plan activo
  useEffect(() => {
    if (activePlan?.id && planId === null) setPlanId(activePlan.id);
  }, [activePlan]);

  useEffect(() => { if (planId) fetchAll(); }, [planId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/planes/${planId}/estructura`);
      setAreas(r.data.data);
    } catch { toast.error('Error cargando estructura'); }
    finally { setLoading(false); }
  };

  // ── Expansión / colapso global ─────────────────────────────
  const expandAll   = () => setForce(p => ({ open: true,  v: p.v + 1 }));
  const collapseAll = () => setForce(p => ({ open: false, v: p.v + 1 }));

  // ── Abrir modal de creación ────────────────────────────────
  const openCreate = (type, parentId = null, parentLabel = '') => {
    setModal({ type, parentId, parentLabel });
    setForm({ ...DEFAULT_FORMS[type] });
  };

  // ── Guardar elemento creado ────────────────────────────────
  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const { type, parentId } = modal;

      // Construir payload según tipo
      const payloads = {
        area: { ...form, plan_id: planId },
        og:   { ...form, area_id: parentId },
        oe:   { ...form, objetivo_general_id: parentId },
        meta: { ...form, objetivo_especifico_id: parentId },
      };
      const endpoints = {
        area: '/areas',
        og:   '/objetivos/generales',
        oe:   '/objetivos/especificos',
        meta: '/metas',
      };

      await api.post(endpoints[type], payloads[type]);
      toast.success(`${TITLES[type]} creado correctamente`);
      setModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  // ── Cálculos de avance ────────────────────────────────────
  const getAreaAvance = area => {
    let all = [];
    (area.objetivos_generales || []).forEach(og =>
      (og.objetivos_especificos || []).forEach(oe =>
        (oe.metas || []).forEach(m => all.push(...(m.indicadores || [])))
      )
    );
    return calcAvance(all);
  };
  const getOgAvance = og => {
    let all = [];
    (og.objetivos_especificos || []).forEach(oe =>
      (oe.metas || []).forEach(m => all.push(...(m.indicadores || [])))
    );
    return calcAvance(all);
  };
  const getOeAvance = oe => {
    let all = [];
    (oe.metas || []).forEach(m => all.push(...(m.indicadores || [])));
    return calcAvance(all);
  };
  const getMetaAvance = meta => calcAvance(meta.indicadores || []);

  // Props de fuerza globales
  const fp = { forceOpen: force.open, forceVersion: force.v };
  const adminMode = isAdmin();

  return (
    <div className="space-y-4">

      {/* ── Barra de herramientas ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">

        {/* Selector de plan */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            className="input-field max-w-xs"
            value={planId ?? ''}
            onChange={e => setPlanId(Number(e.target.value))}
          >
            {planes.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.anio_inicio}–{p.anio_fin})
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400 hidden sm:block">Vista jerárquica del plan</span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={expandAll}   title="Expandir todo"  className="btn-secondary gap-1.5 text-xs py-1.5">
            <ChevronsUpDown size={15} />
            <span className="hidden sm:inline">Expandir todo</span>
          </button>
          <button onClick={collapseAll} title="Contraer todo" className="btn-secondary gap-1.5 text-xs py-1.5">
            <ChevronsDownUp size={15} />
            <span className="hidden sm:inline">Contraer todo</span>
          </button>
          {adminMode && (
            <button
              onClick={() => openCreate('area')}
              className="btn-primary gap-1.5 text-xs py-1.5"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nueva Área</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Árbol ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
        </div>
      ) : (
        <div className="card p-5 space-y-3">
          {areas.map(area => (
            <TreeNode
              key={area.id} node={area} type="area" badge={area.codigo}
              avance={getAreaAvance(area)} {...fp} adminMode={adminMode}
              onAdd={() => openCreate('og', area.id, area.nombre)}
            >
              {(area.objetivos_generales || []).map(og => (
                <TreeNode
                  key={og.id} node={og} type="og" badge={og.codigo}
                  avance={getOgAvance(og)} {...fp} adminMode={adminMode}
                  onAdd={() => openCreate('oe', og.id, og.nombre)}
                >
                  {(og.objetivos_especificos || []).map(oe => (
                    <TreeNode
                      key={oe.id} node={oe} type="oe" badge={oe.codigo}
                      avance={getOeAvance(oe)} {...fp} adminMode={adminMode}
                      onAdd={() => openCreate('meta', oe.id, oe.nombre)}
                    >
                      {(oe.metas || []).map(meta => (
                        <TreeNode
                          key={meta.id} node={meta} type="meta" badge={meta.codigo}
                          avance={getMetaAvance(meta)} {...fp} adminMode={adminMode}
                        >
                          {(meta.indicadores || []).map(ind => (
                            <div key={ind.id} className="ml-5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <BarChart3 size={12} className="text-gray-400 flex-shrink-0" />
                                <p className="text-xs text-gray-700 font-medium flex-1 min-w-0 truncate">{ind.nombre}</p>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="w-16 hidden sm:block">
                                    <ProgressBar value={ind.porcentaje_cumplimiento} size="sm" showLabel={false} />
                                  </div>
                                  <span className={`text-xs font-bold ${
                                    ind.porcentaje_cumplimiento >= 90 ? 'text-green-600'
                                    : ind.porcentaje_cumplimiento >= 50 ? 'text-yellow-600'
                                    : 'text-red-600'}`}>
                                    {ind.porcentaje_cumplimiento}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 ml-5 mt-0.5 font-mono">{ind.formula}</p>
                            </div>
                          ))}
                        </TreeNode>
                      ))}
                      {/* Botón inline "Nueva Meta" al final de la lista de metas */}
                      {adminMode && (
                        <button
                          onClick={() => openCreate('meta', oe.id, oe.nombre)}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg border border-dashed border-green-300 transition-colors"
                        >
                          <Plus size={12} /> Nueva Meta
                        </button>
                      )}
                    </TreeNode>
                  ))}
                  {/* Botón inline "Nuevo OE" al final de la lista de OEs */}
                  {adminMode && (
                    <button
                      onClick={() => openCreate('oe', og.id, og.nombre)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded-lg border border-dashed border-orange-300 transition-colors"
                    >
                      <Plus size={12} /> Nuevo Objetivo Específico
                    </button>
                  )}
                </TreeNode>
              ))}
              {/* Botón inline "Nuevo OG" al final de la lista de OGs */}
              {adminMode && (
                <button
                  onClick={() => openCreate('og', area.id, area.nombre)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg border border-dashed border-purple-300 transition-colors"
                >
                  <Plus size={12} /> Nuevo Objetivo General
                </button>
              )}
            </TreeNode>
          ))}

          {!areas.length && (
            <div className="text-center py-10">
              <p className="text-gray-400 mb-3">No hay áreas estratégicas en este plan.</p>
              {adminMode && (
                <button onClick={() => openCreate('area')} className="btn-primary text-sm">
                  <Plus size={15} /> Crear primera Área Estratégica
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Leyenda ───────────────────────────────────────────── */}
      <div className="card p-4">
        <p className="text-xs font-medium text-gray-500 mb-3">Leyenda</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Área Estratégica',    color: 'bg-primary-50 border-primary-200 text-primary-700' },
            { label: 'Objetivo General',    color: 'bg-purple-50  border-purple-200  text-purple-700'  },
            { label: 'Objetivo Específico', color: 'bg-orange-50  border-orange-200  text-orange-700'  },
            { label: 'Meta',                color: 'bg-green-50   border-green-200   text-green-700'   },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${item.color}`}>
              <div className="w-2 h-2 rounded-full bg-current opacity-60" />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal: Crear elemento ──────────────────────────────── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? TITLES[modal.type] : ''}
      >
        {modal && (
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Contexto padre */}
            {modal.parentLabel && (
              <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
                Vinculado a: <span className="font-semibold text-gray-700">{modal.parentLabel}</span>
              </div>
            )}

            {/* Campos comunes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  className="input-field font-mono"
                  placeholder="Ej: AE-01"
                  value={form.codigo || ''}
                  onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
                />
              </div>
              <div>
                {modal.type === 'meta' ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Año Meta</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form.anio_meta || ''}
                      onChange={e => setForm(p => ({ ...p, anio_meta: e.target.value }))}
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={form.orden || 1}
                      onChange={e => setForm(p => ({ ...p, orden: e.target.value }))}
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                required
                className="input-field"
                placeholder={
                  modal.type === 'area' ? 'Ej: Docencia e Investigación' :
                  modal.type === 'og'   ? 'Ej: Fortalecer la calidad educativa' :
                  modal.type === 'oe'   ? 'Ej: Incrementar la tasa de graduación' :
                                         'Ej: Aumentar graduados al 85%'
                }
                value={form.nombre || ''}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                rows={2}
                className="input-field"
                value={form.descripcion || ''}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              />
            </div>

            {/* Campos exclusivos de Meta */}
            {modal.type === 'meta' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Línea Base</label>
                  <input
                    type="number" step="any"
                    className="input-field"
                    value={form.linea_base ?? 0}
                    onChange={e => setForm(p => ({ ...p, linea_base: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Meta *</label>
                  <input
                    required type="number" step="any"
                    className="input-field"
                    value={form.valor_meta || ''}
                    onChange={e => setForm(p => ({ ...p, valor_meta: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <input
                    className="input-field"
                    placeholder="%"
                    value={form.unidad_medida || ''}
                    onChange={e => setForm(p => ({ ...p, unidad_medida: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : 'Crear'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
