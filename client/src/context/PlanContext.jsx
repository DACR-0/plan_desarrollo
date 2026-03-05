import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const PlanContext = createContext(null);

/**
 * PlanProvider debe montarse DENTRO de la ruta privada,
 * para que siempre haya token disponible cuando realice la solicitud.
 */
export function PlanProvider({ children }) {
  const [planes,     setPlanes]     = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading,    setLoading]    = useState(true);

  const fetchPlanes = async () => {
    try {
      const { data } = await api.get('/planes');
      const list = data.data ?? [];
      setPlanes(list);
      // El plan vigente es el que tiene vigente=TRUE; si ninguno, el primero de la lista
      const vigente = list.find(p => p.vigente) ?? list[0] ?? null;
      setActivePlan(vigente);
    } catch {
      // La redirección al login ya la maneja el interceptor en api.js
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlanes(); }, []);

  /** Activa un plan: llama al backend y recarga la lista */
  const activarPlan = async (planId) => {
    await api.put(`/planes/${planId}/activar`);
    await fetchPlanes();
  };

  return (
    <PlanContext.Provider value={{ planes, activePlan, loading, fetchPlanes, activarPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
