import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, GitBranch, Target, BarChart3,
  Variable, FileText, Users, LogOut, GraduationCap,
  BookCopy, CheckCircle2, CalendarClock, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

const ROL_LABELS = {
  admin: 'Administrador',
  consultor: 'Consultor',
  area_estrategica: 'Área Estratégica',
};

export default function Sidebar() {
  const { user, logout, isAdmin, isAreaUser } = useAuth();
  const { activePlan } = usePlan();

  const navLink = (to, Icon, label) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
         ${isActive
           ? 'bg-primary-600 text-white'
           : 'text-primary-100 hover:bg-primary-700 hover:text-white'}`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );

  return (
    <aside className="w-64 flex-shrink-0 bg-primary-800 flex flex-col h-full sidebar-scroll overflow-y-auto">
      <div className="px-6 py-5 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-700 rounded-lg">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">SIGEPU</p>
            <p className="text-primary-200 text-xs">Plan de Desarrollo</p>
          </div>
        </div>
      </div>

      {activePlan && (
        <div className="mx-3 mt-3 px-3 py-2 bg-primary-700/60 rounded-lg border border-primary-600">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 size={11} className="text-green-400 flex-shrink-0" />
            <span className="text-green-300 text-xs font-semibold">Plan Activo</span>
          </div>
          <p className="text-white text-xs font-medium leading-tight truncate">{activePlan.nombre}</p>
          <p className="text-primary-300 text-xs">{activePlan.anio_inicio}–{activePlan.anio_fin}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navLink('/planes',      BookCopy,        'Planes')}
        {navLink('/dashboard',   LayoutDashboard, 'Dashboard')}
        {navLink('/estructura',  GitBranch,       'Estructura PDU')}
        {navLink('/indicadores', BarChart3,        'Indicadores')}
        {navLink('/metas',       Target,           'Metas')}
        {navLink('/variables',   Variable,         'Variables')}
        {navLink('/reportes',    FileText,         'Reportes')}

        {(isAdmin() || isAreaUser()) && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-primary-400 text-xs font-semibold uppercase tracking-wider">Seguimiento</span>
            </div>
            {navLink('/solicitudes', ClipboardList, 'Solicitudes de Cambio')}
            {isAdmin() && navLink('/periodos', CalendarClock, 'Períodos')}
          </>
        )}

        {isAdmin() && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-primary-400 text-xs font-semibold uppercase tracking-wider">Administración</span>
            </div>
            {navLink('/usuarios', Users, 'Usuarios')}
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-primary-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.nombre?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.nombre}</p>
            <p className="text-primary-300 text-xs truncate">{ROL_LABELS[user?.rol] || user?.rol}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-primary-200 hover:text-white hover:bg-primary-700 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
