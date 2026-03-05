import { useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend, LineElement, PointElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { BarChart3, Target, Layers, CheckCircle, AlertTriangle, TrendingUp, BookOpen } from 'lucide-react';
import api from '../services/api';
import { usePlan } from '../context/PlanContext';
import KpiCard    from '../components/KpiCard';
import ProgressBar from '../components/ProgressBar';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, LineElement, PointElement);

export default function Dashboard() {
  const { activePlan, loading: planLoading } = usePlan();
  const planId = activePlan?.id;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!planId) return;
    setLoading(true);
    setData(null);
    api.get(`/dashboard/${planId}`)
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [planId]);

  if (planLoading || loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700" />
    </div>
  );

  if (!planId) return (
    <div className="card p-12 text-center">
      <p className="text-gray-500 font-medium">No hay un plan activo seleccionado.</p>
      <p className="text-sm text-gray-400 mt-1">Ve a la sección <strong>Planes</strong> y activa un plan.</p>
    </div>
  );

  if (!data) return <p className="text-gray-500">No se pudieron cargar los datos.</p>;

  const { kpis, areas, top_indicadores, riesgo_indicadores, evolucion } = data;

  const barData = {
    labels: areas.map(a => a.codigo),
    datasets: [{
      label: 'Avance (%)',
      data: areas.map(a => a.avance),
      backgroundColor: areas.map(a => a.avance >= 90 ? '#16a34a' : a.avance >= 50 ? '#ca8a04' : '#dc2626'),
      borderRadius: 6,
    }],
  };

  const donutData = {
    labels: ['En Meta (≥90%)', 'En Progreso (50-89%)', 'En Riesgo (<50%)'],
    datasets: [{
      data: [kpis.indicadores_en_meta, kpis.indicadores_en_progreso, kpis.indicadores_en_riesgo],
      backgroundColor: ['#16a34a', '#ca8a04', '#dc2626'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const lineData = {
    labels: evolucion.map(e => e.mes),
    datasets: [{
      label: 'Avance promedio (%)',
      data: evolucion.map(e => e.promedio_cumplimiento),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.1)',
      tension: 0.4,
      fill: true,
    }],
  };

  const chartOpts = { responsive: true, plugins: { legend: { display: false } } };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Avance Global"      value={`${kpis.avance_global ?? 0}%`} icon={TrendingUp}  color="blue" />
        <KpiCard title="Áreas"              value={kpis.total_areas}               icon={Layers}      color="purple" />
        <KpiCard title="Indicadores"        value={kpis.total_indicadores}         icon={BarChart3}   color="blue" />
        <KpiCard title="En Meta"            value={kpis.indicadores_en_meta}        icon={CheckCircle} color="green" />
        <KpiCard title="En Progreso"        value={kpis.indicadores_en_progreso}   icon={Target}      color="yellow" />
        <KpiCard title="En Riesgo"          value={kpis.indicadores_en_riesgo}     icon={AlertTriangle} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar - Areas */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Avance por Área Estratégica</h2>
          <Bar data={barData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } } }} />
        </div>
        {/* Donut */}
        <div className="card p-5 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Estado de Indicadores</h2>
          <div className="w-52 h-52">
            <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, cutout: '65%' }} />
          </div>
        </div>
      </div>

      {/* Line evolution */}
      {evolucion.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Evolución del Avance Global</h2>
          <Line data={lineData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } } }} />
        </div>
      )}

      {/* Top / Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" /> Indicadores Destacados
          </h2>
          <ul className="space-y-3">
            {top_indicadores.map(ind => (
              <li key={ind.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{ind.nombre}</p>
                  <p className="text-xs text-gray-400">{ind.area_codigo}</p>
                  <ProgressBar value={ind.porcentaje_cumplimiento} size="sm" showLabel={false} />
                </div>
                <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                  {ind.porcentaje_cumplimiento}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" /> Indicadores en Riesgo
          </h2>
          <ul className="space-y-3">
            {riesgo_indicadores.map(ind => (
              <li key={ind.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{ind.nombre}</p>
                  <p className="text-xs text-gray-400">{ind.area_codigo}</p>
                  <ProgressBar value={ind.porcentaje_cumplimiento} size="sm" showLabel={false} />
                </div>
                <span className="text-sm font-bold text-red-600 whitespace-nowrap">
                  {ind.porcentaje_cumplimiento}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Avance detallado por área */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Avance Detallado por Área</h2>
        <div className="space-y-4">
          {areas.map(a => (
            <div key={a.id} className="flex items-center gap-4">
              <div className="w-32 text-right text-xs font-medium text-gray-600 flex-shrink-0">{a.codigo}</div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">{a.nombre}</p>
                <ProgressBar value={a.avance} size="md" showLabel={false} />
              </div>
              <span className="w-14 text-right text-sm font-bold text-gray-700">{a.avance}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
