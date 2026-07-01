import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, Mail, FileText } from 'lucide-react';
import { subscribeToEntities } from '../services/crmService';
import CreateEntityModal from './CreateEntityModal';
import ClientProfile from './ClientProfile';
import useUIStore from '../../../store/useUIStore';

export default function CRMBoard() {
  const [entities, setEntities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null); // <-- Estado para el expediente abierto
  const [isLoading, setIsLoading] = useState(true);
  
  const { searchQuery } = useUIStore();

  useEffect(() => {
    const unsubscribe = subscribeToEntities((data) => {
      setEntities(data);
      setIsLoading(false);
      // Si hay un expediente abierto, actualizamos sus datos en vivo
      if (selectedEntity) {
        const updatedSelected = data.find(e => e.id === selectedEntity.id);
        if (updatedSelected) setSelectedEntity(updatedSelected);
      }
    });
    return () => unsubscribe();
  }, [selectedEntity]);

  const filteredEntities = entities.filter(ent => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ent.name.toLowerCase().includes(q) || ent.type.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col bg-zinc-950">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            CRM Operativo
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Directorio de Clientes, Proveedores y Límites de Crédito</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-transform hover:-translate-y-0.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
        >
          <Plus className="w-4 h-4"/> NUEVA ENTIDAD
        </button>
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl"><Building2 className="w-6 h-6 text-blue-500"/></div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Clientes</p>
            <p className="text-2xl font-black text-white">
              {entities.filter(e => e.type === 'cliente').length}
            </p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl"><BriefcaseIcon className="w-6 h-6 text-amber-500"/></div>
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Proveedores</p>
            <p className="text-2xl font-black text-white">
              {entities.filter(e => e.type === 'proveedor').length}
            </p>
          </div>
        </div>
      </div>

      {/* TABLA DE CRM */}
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Entidad</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Tipo</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Contacto</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Límite Crédito</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-center">Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">Cargando base de datos...</td></tr>
              ) : filteredEntities.map(ent => (
                <tr 
                  key={ent.id} 
                  onClick={() => setSelectedEntity(ent)} 
                  className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                >
                  <td className="p-4">
                    <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{ent.name}</p>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${ent.type === 'cliente' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                      {ent.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-zinc-400 flex flex-col gap-1">
                      {ent.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {ent.phone}</span>}
                      {ent.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {ent.email}</span>}
                      {(!ent.phone && !ent.email) && <span className="text-zinc-600 italic">Sin datos</span>}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {ent.type === 'cliente' ? (
                      <span className={`font-mono text-sm font-bold ${ent.creditLimit > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                        ${ent.creditLimit?.toLocaleString('es-AR') || '0'}
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button className="text-zinc-500 group-hover:text-white transition-colors p-2 bg-zinc-800 group-hover:bg-blue-600 rounded-lg">
                      <FileText className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredEntities.length === 0 && (
                 <tr><td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">No hay entidades registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && <CreateEntityModal onClose={() => setIsModalOpen(false)} />}
      
      {/* RENDERIZADO DEL EXPEDIENTE CUANDO HAY UN CLIENTE SELECCIONADO */}
      {selectedEntity && (
        <ClientProfile 
          entity={selectedEntity} 
          onClose={() => setSelectedEntity(null)} 
        />
      )}
    </div>
  );
}

function BriefcaseIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}