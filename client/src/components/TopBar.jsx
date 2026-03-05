import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const titles = {
  '/dashboard':   'Dashboard',
  '/estructura':  'Estructura del PDU',
  '/indicadores': 'Indicadores',
  '/metas':       'Metas',
  '/variables':   'Variables',
  '/reportes':    'Reportes',
  '/usuarios':    'Gestión de Usuarios',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = titles[pathname] || 'SIGEPU';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-gray-800 font-semibold text-lg">{title}</h1>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="hidden sm:block">{user?.email}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user?.rol === 'admin' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-700'}`}>
          {user?.rol === 'admin' ? 'Administrador' : 'Consultor'}
        </span>
      </div>
    </header>
  );
}
