import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ShieldCheck, User, Building2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

const ROL_LABELS = {
  admin:            { label: 'Admin',        color: 'badge-blue',  icon: ShieldCheck },
  consultor:        { label: 'Consultor',    color: 'badge-green', icon: User        },
  area_estrategica: { label: 'Area Estrat.', color: 'badge-purple', icon: Building2   },
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const { activePlan } = usePlan();
  const [usuarios, setUsuarios] = useState([]);
  const [areas,    setAreas]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', rol: 'consultor', activo: true, area_ids: [],
  });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (activePlan?.id)
      api.get('/areas?plan_id=' + activePlan.id)
        .then(r => setAreas(r.data.data || []))
        .catch(() => {});
  }, [activePlan]);

  const fetchData = () => {
    setLoading(true);
    api.get('/usuarios')
      .then(r => setUsuarios(r.data.data))
      .catch(() => toast.error('Error cargando usuarios'))
      .finally(() => setLoading(false));
  };

  const toggleArea = id =>
    setForm(p => ({
      ...p,
      area_ids: p.area_ids.includes(id)
        ? p.area_ids.filter(x => x !== id)
        : [...p.area_ids, id],
    }));

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', email: '', password: '', rol: 'consultor', activo: true, area_ids: [] });
    setModal(true);
  };

  const openEdit = u => {
    setEditing(u);
    setForm({
      nombre: u.nombre, email: u.email, password: '', rol: u.rol,
      activo: u.activo, area_ids: (u.areas || []).map(a => a.id),
    });
    setModal(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editing) {
        await api.put(`/usuarios/${editing.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        if (!payload.password) return toast.error('La contraseña es requerida');
        await api.post('/usuarios', payload);
        toast.success('Usuario creado');
      }
      setModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    }
  };

  const handleDelete = async id => {
    if (id === currentUser.id) return toast.error('No puedes desactivar tu propio usuario');
    if (!confirm('¿Desactivar este usuario?')) return;
    try { await api.delete(`/usuarios/${id}`); toast.success('Usuario desactivado'); fetchData(); }
    catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo Usuario</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Rol</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Áreas</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Último acceso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => {
                  const rc = ROL_LABELS[u.rol] || { label: u.rol, color: 'badge-green', icon: User };
                  const RI = rc.icon;
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                            {u.nombre[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{u.nombre}</span>
                          {u.id === currentUser.id && <span className="text-xs text-gray-400">(yo)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`${rc.color} inline-flex items-center gap-1`}>
                          <RI size={11} /> {rc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.areas && u.areas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.areas.map(a => (
                              <span key={a.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                                {a.nombre}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={u.activo ? 'badge-green' : 'badge-red'}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CO') : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-primary-50"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
            <input required className="input-field" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
            <input required type="email" className="input-field" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña {editing ? '(dejar vacío para no cambiar)' : '*'}
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={editing ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required={!editing}
              minLength={editing ? 0 : 6}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className="input-field" value={form.rol}
                onChange={e => setForm(p => ({ ...p, rol: e.target.value, area_ids: [] }))}>
                <option value="consultor">Consultor</option>
                <option value="admin">Administrador</option>
                <option value="area_estrategica">Usuario de Área Estratégica</option>
              </select>
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select className="input-field" value={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.value === 'true' }))}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>

          {/* Asignación de áreas - solo para área estratégica */}
          {form.rol === 'area_estrategica' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Áreas estratégicas asignadas
              </label>
              {areas.length === 0 ? (
                <p className="text-xs text-gray-400">No hay áreas disponibles para el plan activo.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {areas.map(a => (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1">
                      <input
                        type="checkbox"
                        checked={form.area_ids.includes(a.id)}
                        onChange={() => toggleArea(a.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                      <span className="text-sm text-gray-700">
                        {a.codigo && <span className="text-xs text-gray-400 mr-1">[{a.codigo}]</span>}
                        {a.nombre}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                El usuario solo podrá solicitar cambios en variables de las áreas asignadas.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
