import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';
import Layout       from './components/Layout';
import Login        from './pages/Login';
import Planes       from './pages/Planes';
import Dashboard    from './pages/Dashboard';
import Estructura   from './pages/Estructura';
import Indicadores  from './pages/Indicadores';
import Metas        from './pages/Metas';
import Variables    from './pages/Variables';
import Reportes     from './pages/Reportes';
import Usuarios     from './pages/Usuarios';
import Periodos     from './pages/Periodos';
import Solicitudes  from './pages/Solicitudes';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <PlanProvider>{children}</PlanProvider>;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
}

function SeguimientoRoute({ children }) {
  const { user, loading, isAdmin, isAreaUser } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin() && !isAreaUser()) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontSize: '14px' } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/planes" replace />} />
          <Route path="planes"      element={<Planes />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="estructura"  element={<Estructura />} />
          <Route path="indicadores" element={<Indicadores />} />
          <Route path="metas"       element={<Metas />} />
          <Route path="variables"   element={<Variables />} />
          <Route path="reportes"    element={<Reportes />} />
          <Route path="solicitudes" element={<SeguimientoRoute><Solicitudes /></SeguimientoRoute>} />
          <Route path="periodos"    element={<AdminRoute><Periodos /></AdminRoute>} />
          <Route path="usuarios"    element={<AdminRoute><Usuarios /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
