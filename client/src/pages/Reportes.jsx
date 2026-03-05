import { useState, useEffect } from 'react';
import { FileText, Table, Download, BarChart3, TrendingUp, Target } from 'lucide-react';
import api from '../services/api';
import { usePlan } from '../context/PlanContext';
import ProgressBar from '../components/ProgressBar';
import toast from 'react-hot-toast';

export default function Reportes() {
  const { planes, activePlan } = usePlan();
  const [planId,  setPlanId]  = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // Init planId from active plan when context loads
  useEffect(() => {
    if (activePlan?.id && planId === null) {
      setPlanId(activePlan.id);
      fetchSummary(activePlan.id);
    }
  }, [activePlan]);

  const fetchSummary = id => {
    setLoading(true);
    api.get(`/dashboard/${id}`)
      .then(r => setSummary(r.data.data))
      .catch(() => toast.error('Error cargando resumen'))
      .finally(() => setLoading(false));
  };

  const handlePlanChange = id => {
    setPlanId(id);
    fetchSummary(id);
  };

  const downloadFile = async (endpoint, filename) => {
    if (!planId) return toast.error('Selecciona un plan');
    try {
      const token = localStorage.getItem('sigepu_token');
      const res   = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error descargando archivo');
    }
  };

  const downloadPDF   = () => downloadFile(`/api/reportes/pdf/${planId}`,   `reporte-plan-${planId}.pdf`);
  const downloadExcel = () => downloadFile(`/api/reportes/excel/${planId}`, `reporte-plan-${planId}.xlsx`);

  return (
    <div className="space-y-6">
      {/* Selector de plan */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Generación de Reportes</h2>
            <p className="text-sm text-gray-500">Exporta el estado actual del plan en PDF o Excel</p>
          </div>
          <select
            className="input-field max-w-xs"
            value={planId}
            onChange={e => handlePlanChange(e.target.value)}
          >
            {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={downloadPDF}
            className="btn-primary bg-red-600 hover:bg-red-700"
          >
            <FileText size={16} /> Exportar PDF
          </button>
          <button
            onClick={downloadExcel}
            className="btn-primary bg-green-600 hover:bg-green-700"
          >
            <Table size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Vista previa */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>
      ) : summary && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-primary-700">{summary.kpis?.avance_global ?? 0}%</p>
              <p className="text-xs text-gray-500 mt-1">Avance Global</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-gray-800">{summary.kpis?.total_indicadores}</p>
              <p className="text-xs text-gray-500 mt-1">Total Indicadores</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{summary.kpis?.indicadores_en_meta}</p>
              <p className="text-xs text-gray-500 mt-1">En Meta (≥90%)</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{summary.kpis?.indicadores_en_riesgo}</p>
              <p className="text-xs text-gray-500 mt-1">En Riesgo (&lt;50%)</p>
            </div>
          </div>

          {/* Áreas */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp size={15} /> Avance por Área Estratégica
            </h3>
            <div className="space-y-4">
              {summary.areas?.map(a => (
                <div key={a.id} className="flex items-center gap-4">
                  <div className="w-14 text-xs font-mono font-medium text-gray-500 flex-shrink-0">{a.codigo}</div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1 truncate">{a.nombre}</p>
                    <ProgressBar value={a.avance} />
                  </div>
                  <div className="w-16 text-right">
                    <span className={`text-sm font-bold ${a.avance >= 90 ? 'text-green-600' : a.avance >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {a.avance}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top indicadores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Indicadores Destacados</h3>
              <ul className="space-y-3">
                {summary.top_indicadores?.map(ind => (
                  <li key={ind.id} className="flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{ind.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1"><ProgressBar value={ind.porcentaje_cumplimiento} size="sm" showLabel={false} /></div>
                        <span className="text-xs font-bold text-green-600">{ind.porcentaje_cumplimiento}%</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Indicadores con Bajo Avance</h3>
              <ul className="space-y-3">
                {summary.riesgo_indicadores?.map(ind => (
                  <li key={ind.id} className="flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{ind.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1"><ProgressBar value={ind.porcentaje_cumplimiento} size="sm" showLabel={false} /></div>
                        <span className="text-xs font-bold text-red-600">{ind.porcentaje_cumplimiento}%</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
