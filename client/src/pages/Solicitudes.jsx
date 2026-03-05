import { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, Plus, CheckCircle2, XCircle, Clock,
  FileText, Eye, AlertTriangle, Upload, Download,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const ESTADO_SOL = {
  pendiente:  { label: 'Pendiente',  icon: Clock,        cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  aprobado:   { label: 'Aprobado',   icon: CheckCircle2, cls: 'bg-green-100  text-green-700  border-green-200'  },
  rechazado:  { label: 'Rechazado',  icon: XCircle,      cls: 'bg-red-100    text-red-700    border-red-200'    },
};

const fmt     = d => d ? new Date(d).toLocaleString('es-CO')  : '—';
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function Solicitudes() {
  const { user, isAdmin, isAreaUser } = useAuth();
  const { activePlan } = usePlan();
  const planId = activePlan?.id;

  const [solicitudes,    setSolicitudes]    = useState([]);
  const [periodos,       setPeriodos]       = useState([]);
  const [periodoActivo,  setPeriodoActivo]  = useState(null);
  const [variables,      setVariables]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filtroEstado,   setFiltroEstado]   = useState('');

  // Modal nueva solicitud
  const [modalNueva,  setModalNueva]  = useState(false);
  const [formNueva, setFormNueva] = useState({
    periodo_id: '', variable_id: '', valor_propuesto: '', justificacion: '',
  });
  const [archivo, setArchivo] = useState(null);
  const fileRef = useRef();

  // Modal detalle / resolución
  const [modalDetalle,  setModalDetalle]  = useState(false);
  const [solSeleccionada, setSolSeleccionada] = useState(null);
  const [observacion,   setObservacion]   = useState('');
  const [accion,        setAccion]        = useState(''); // 'aprobar' | 'rechazar'
  const [modalResol,    setModalResol]    = useState(false);

  useEffect(() => { if (planId) init(); }, [planId]);

  const init = async () => {
    setLoading(true);
    try {
      const [solRes, perRes, varRes] = await Promise.all([
        api.get(`/solicitudes?plan_id=${planId}`),
        api.get(`/periodos?plan_id=${planId}`),
        api.get(`/variables?plan_id=${planId}`),
      ]);
      setSolicitudes(solRes.data.data);
      setPeriodos(perRes.data.data);
      setVariables(varRes.data.data);

      // Periodo activo
      const activo = perRes.data.data.find(p => p.estado === 'activo') || null;
      setPeriodoActivo(activo);
    } catch {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  // ── Nueva solicitud (area user) ─────────────────────────────
  const openNueva = () => {
    if (!periodoActivo) return toast.error('No hay un periodo de seguimiento activo en este momento.');
    setFormNueva({ periodo_id: periodoActivo.id, variable_id: '', valor_propuesto: '', justificacion: '' });
    setArchivo(null);
    setModalNueva(true);
  };

  const handleNuevaSubmit = async e => {
    e.preventDefault();
    if (!archivo) return toast.error('El documento soporte es obligatorio');
    try {
      const fd = new FormData();
      fd.append('periodo_id',      formNueva.periodo_id);
      fd.append('variable_id',     formNueva.variable_id);
      fd.append('valor_propuesto', formNueva.valor_propuesto);
      fd.append('justificacion',   formNueva.justificacion);
      fd.append('documento',       archivo);

      await api.post('/solicitudes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Solicitud enviada correctamente');
      setModalNueva(false);
      init();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error enviando solicitud');
    }
  };

  // ── Detalle ──────────────────────────────────────────────────
  const openDetalle = sol => {
    setSolSeleccionada(sol);
    setModalDetalle(true);
  };

  // ── Resolución (admin) ───────────────────────────────────────
  const openResolucion = (sol, acc) => {
    setSolSeleccionada(sol);
    setAccion(acc);
    setObservacion('');
    setModalResol(true);
  };

  const handleResolucion = async e => {
    e.preventDefault();
    try {
      await api.put(`/solicitudes/${solSeleccionada.id}/${accion}`, { observacion });
      toast.success(accion === 'aprobar' ? 'Solicitud aprobada y variable actualizada' : 'Solicitud rechazada');
      setModalResol(false);
      init();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  // ── Filtro ───────────────────────────────────────────────────
  const filtradas = solicitudes.filter(s =>
    !filtroEstado || s.estado === filtroEstado
  );

  const varVariable = variables.find(v => v.id === parseInt(formNueva.variable_id));

  if (!planId) return (
    <div className="card p-12 text-center">
      <p className="text-gray-500">No hay un plan activo. Ve a <strong>Planes</strong> y activa uno.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={22} className="text-primary-600" />
            Solicitudes de Cambio
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin()
              ? 'Revisa y resuelve las solicitudes enviadas por los usuarios de area.'
              : 'Reporta cambios en las variables de tu area durante el periodo activo.'}
          </p>
        </div>
        {(isAreaUser() || isAdmin()) && (
          <button onClick={openNueva} className="btn-primary" disabled={!periodoActivo}>
            <Plus size={16} /> Nueva Solicitud
          </button>
        )}
      </div>

      {/* Banner periodo */}
      {periodoActivo ? (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-sm">
          <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
          <div>
            <span className="font-semibold text-green-800">Periodo activo: {periodoActivo.nombre}</span>
            <span className="text-green-700 ml-2">
              Del {fmtDate(periodoActivo.fecha_inicio)} al {fmtDate(periodoActivo.fecha_cierre)}
            </span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">
            No hay un periodo de seguimiento activo. Las solicitudes solo se pueden enviar durante
            los periodos habilitados por el administrador.
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pendiente', 'aprobado', 'rechazado'].map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtroEstado === e
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            {e === '' ? 'Todas' : ESTADO_SOL[e]?.label}
            {e !== '' && (
              <span className="ml-1.5 bg-white/20 px-1 rounded">
                {solicitudes.filter(s => s.estado === e).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No hay solicitudes para mostrar.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Variable</th>
                  {isAdmin() && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Solicitante</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Periodo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Valor Ant.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Valor Prop.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Fecha envio</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map(s => {
                  const cfg  = ESTADO_SOL[s.estado];
                  const Icon = cfg?.icon || Clock;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-mono text-xs bg-gray-100 text-primary-700 px-1.5 py-0.5 rounded">
                            {s.variable_nombre}
                          </span>
                          {s.area_nombre && (
                            <p className="text-xs text-gray-400 mt-0.5">{s.area_nombre}</p>
                          )}
                        </div>
                      </td>
                      {isAdmin() && (
                        <td className="px-4 py-3 text-xs text-gray-600">{s.usuario_nombre}</td>
                      )}
                      <td className="px-4 py-3 text-xs text-gray-600">{s.periodo_nombre}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{s.valor_anterior}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">{s.valor_propuesto}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg?.cls}`}>
                          <Icon size={11} />
                          {cfg?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{fmt(s.fecha_envio)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => openDetalle(s)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="Ver detalle"
                          >
                            <Eye size={14} />
                          </button>
                          {isAdmin() && s.estado === 'pendiente' && (
                            <>
                              <button
                                onClick={() => openResolucion(s, 'aprobar')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Aprobar"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={() => openResolucion(s, 'rechazar')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Rechazar"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal nueva solicitud ────────────────────────────── */}
      <Modal open={modalNueva} onClose={() => setModalNueva(false)} title="Nueva Solicitud de Cambio" size="lg">
        <form onSubmit={handleNuevaSubmit} className="space-y-4">
          {periodoActivo && (
            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              Periodo: <strong>{periodoActivo.nombre}</strong> —
              Cierre: <strong>{fmtDate(periodoActivo.fecha_cierre)}</strong>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variable a modificar *</label>
            <select
              required
              className="input-field"
              value={formNueva.variable_id}
              onChange={e => setFormNueva(p => ({ ...p, variable_id: e.target.value }))}
            >
              <option value="">Seleccionar variable...</option>
              {variables.map(v => (
                <option key={v.id} value={v.id}>{v.nombre} — {v.descripcion || v.unidad || ''}</option>
              ))}
            </select>
          </div>

          {varVariable && (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              Valor actual: <strong className="font-mono text-primary-700">{varVariable.valor_actual}</strong>
              {varVariable.unidad && <span className="text-gray-500 ml-1">{varVariable.unidad}</span>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo valor propuesto *</label>
            <input
              required type="number" step="any"
              className="input-field font-mono"
              placeholder="0"
              value={formNueva.valor_propuesto}
              onChange={e => setFormNueva(p => ({ ...p, valor_propuesto: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Justificacion del cambio *</label>
            <textarea
              required rows={3}
              className="input-field"
              placeholder="Explique la razon del cambio propuesto..."
              value={formNueva.justificacion}
              onChange={e => setFormNueva(p => ({ ...p, justificacion: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documento soporte <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(PDF, Word, Excel, imagen — max 10 MB)</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                archivo ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
              }`}
            >
              {archivo ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <FileText size={18} />
                  <span className="text-sm font-medium">{archivo.name}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Upload size={18} />
                  <span className="text-sm">Haga clic para seleccionar archivo</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={e => setArchivo(e.target.files[0] || null)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalNueva(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Enviar Solicitud</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal detalle ────────────────────────────────────── */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Detalle de Solicitud" size="lg">
        {solSeleccionada && (() => {
          const cfg  = ESTADO_SOL[solSeleccionada.estado];
          const Icon = cfg?.icon || Clock;
          return (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Variable</p>
                  <p className="font-mono font-bold text-primary-700">{solSeleccionada.variable_nombre}</p>
                  {solSeleccionada.area_nombre && <p className="text-xs text-gray-500">{solSeleccionada.area_nombre}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Estado</p>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg?.cls}`}>
                    <Icon size={11} />{cfg?.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Valor anterior</p>
                  <p className="font-mono font-bold text-gray-600">{solSeleccionada.valor_anterior}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Valor propuesto</p>
                  <p className="font-mono font-bold text-gray-800">{solSeleccionada.valor_propuesto}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Solicitado por</p>
                  <p className="font-medium">{solSeleccionada.usuario_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Periodo</p>
                  <p>{solSeleccionada.periodo_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Fecha envio</p>
                  <p>{fmt(solSeleccionada.fecha_envio)}</p>
                </div>
                {solSeleccionada.fecha_resolucion && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Fecha resolucion</p>
                    <p>{fmt(solSeleccionada.fecha_resolucion)}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Justificacion</p>
                <p className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {solSeleccionada.justificacion}
                </p>
              </div>

              {solSeleccionada.observacion_admin && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Observacion del administrador</p>
                  <p className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                    {solSeleccionada.observacion_admin}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Documento soporte</p>
                <a
                  href={`${api.defaults.baseURL?.replace('/api','') || ''}/uploads/${solSeleccionada.documento_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary-600 hover:underline text-sm"
                >
                  <Download size={14} />
                  {solSeleccionada.documento_nombre || solSeleccionada.documento_url}
                </a>
              </div>

              {isAdmin() && solSeleccionada.estado === 'pendiente' && (
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => { setModalDetalle(false); openResolucion(solSeleccionada, 'aprobar'); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    <CheckCircle2 size={15} /> Aprobar
                  </button>
                  <button
                    onClick={() => { setModalDetalle(false); openResolucion(solSeleccionada, 'rechazar'); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    <XCircle size={15} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Modal resolucion ─────────────────────────────────── */}
      <Modal
        open={modalResol}
        onClose={() => setModalResol(false)}
        title={accion === 'aprobar' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
      >
        {solSeleccionada && (
          <form onSubmit={handleResolucion} className="space-y-4">
            <div className={`px-3 py-2 rounded-lg border text-sm ${
              accion === 'aprobar'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50   border-red-200   text-red-800'
            }`}>
              {accion === 'aprobar' ? (
                <span>
                  Se actualizara <strong>{solSeleccionada.variable_nombre}</strong> de{' '}
                  <strong>{solSeleccionada.valor_anterior}</strong> a{' '}
                  <strong>{solSeleccionada.valor_propuesto}</strong> y
                  se recalcularan los indicadores afectados.
                </span>
              ) : (
                <span>
                  Se mantendra el valor actual de <strong>{solSeleccionada.variable_nombre}</strong>
                  {' '}(<strong>{solSeleccionada.valor_anterior}</strong>).
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observacion {accion === 'rechazar' ? '*' : '(opcional)'}
              </label>
              <textarea
                rows={3}
                required={accion === 'rechazar'}
                className="input-field"
                placeholder={
                  accion === 'aprobar'
                    ? 'Comentario adicional (opcional)...'
                    : 'Indique el motivo del rechazo...'
                }
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalResol(false)} className="btn-secondary">Cancelar</button>
              <button
                type="submit"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  accion === 'aprobar'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600   hover:bg-red-700'
                }`}
              >
                {accion === 'aprobar' ? <><CheckCircle2 size={15} /> Aprobar</> : <><XCircle size={15} /> Rechazar</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
