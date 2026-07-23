import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Trash2 } from 'lucide-react';
import { subscribeToAreas, saveAreaInDb, deleteAreaInDb } from '../services/adminService';

export default function AreaManagerModal({ onClose }) {
  const [areas, setAreas] = useState([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [newSubAreaName, setNewSubAreaName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAreas(setAreas);
    return () => unsub();
  }, []);

  const handleCreateArea = async (e) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setIsLoading(true);
    await saveAreaInDb({ name: newAreaName.trim(), subareas: [] });
    setNewAreaName('');
    setIsLoading(false);
  };

  const handleAddSubarea = async (e, area) => {
    e.preventDefault();
    if (!newSubAreaName.trim()) return;
    setIsLoading(true);
    const updatedSubareas = [...(area.subareas || []), newSubAreaName.trim()];
    await saveAreaInDb({ ...area, subareas: updatedSubareas });
    setNewSubAreaName('');
    setIsLoading(false);
  };

  const handleRemoveSubarea = async (area, subareaToRemove) => {
    setIsLoading(true);
    const updatedSubareas = area.subareas.filter(sa => sa !== subareaToRemove);
    await saveAreaInDb({ ...area, subareas: updatedSubareas });
    setIsLoading(false);
  };

  const handleDeleteArea = async (areaId) => {
    if (confirm("¿Estás seguro de eliminar esta Área Principal?")) {
      setIsLoading(true);
      await deleteAreaInDb(areaId);
      if (activeAreaId === areaId) setActiveAreaId(null);
      setIsLoading(false);
    }
  };

  const activeArea = areas.find(a => a.id === activeAreaId);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        <div className="w-full md:w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" /> Áreas Principales
            </h2>
            <button onClick={onClose} className="md:hidden p-2 text-zinc-400"><X className="w-5 h-5"/></button>
          </div>
          
          <form onSubmit={handleCreateArea} className="p-4 border-b border-zinc-800 bg-black">
            <div className="flex gap-2">
              <input 
                type="text" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} 
                placeholder="Ej. Mantenimiento, Ventas..." 
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none"
              />
              <button type="submit" disabled={!newAreaName.trim() || isLoading} className="bg-orange-600 text-black px-4 rounded-xl font-bold disabled:opacity-50"><Plus className="w-5 h-5"/></button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {areas.length === 0 && <p className="text-zinc-500 text-sm text-center mt-4">Sin áreas creadas.</p>}
            {areas.map(area => (
              <div 
                key={area.id} 
                onClick={() => setActiveAreaId(area.id)}
                className={`p-4 rounded-xl cursor-pointer flex justify-between items-center transition-all border ${activeAreaId === area.id ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'}`}
              >
                <div className="font-bold text-sm">{area.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">{area.subareas?.length || 0}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteArea(area.id); }} className="text-zinc-600 hover:text-red-500 p-1"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col bg-zinc-950 relative">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center absolute w-full top-0 right-0 z-10 bg-zinc-950/80 backdrop-blur">
            <h3 className="text-lg font-black text-white">
              {activeArea ? `Sub-áreas de ${activeArea.name}` : 'Selecciona un Área'}
            </h3>
            <button onClick={onClose} className="hidden md:block p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5"/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-24">
            {!activeArea ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <Layers className="w-12 h-12 mb-2 opacity-20"/>
                <p className="text-sm font-bold">Selecciona un área para gestionar sus divisiones.</p>
              </div>
            ) : (
              <>
                <form onSubmit={(e) => handleAddSubarea(e, activeArea)} className="flex gap-2 mb-6">
                  <input 
                    type="text" value={newSubAreaName} onChange={e => setNewSubAreaName(e.target.value)} 
                    placeholder="Ej. Preventivo, Piscinas..." 
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                  />
                  <button type="submit" disabled={!newSubAreaName.trim() || isLoading} className="bg-zinc-800 text-white px-4 rounded-xl font-bold disabled:opacity-50 hover:bg-zinc-700">Agregar</button>
                </form>

                <div className="flex flex-col gap-2">
                  {(!activeArea.subareas || activeArea.subareas.length === 0) && (
                    <p className="text-zinc-500 text-sm italic">Esta área no tiene sub-divisiones.</p>
                  )}
                  {activeArea.subareas?.map((sub, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
                      <span className="text-sm text-zinc-300 font-bold">{sub}</span>
                      <button onClick={() => handleRemoveSubarea(activeArea, sub)} className="text-zinc-500 hover:text-red-500"><X className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}