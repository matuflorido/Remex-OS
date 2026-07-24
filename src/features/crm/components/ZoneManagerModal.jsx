import React, { useState, useEffect } from 'react';
import { X, Map, Plus, Edit2, Trash2, Check, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { subscribeToZones, createZoneInDb, updateZoneAndContacts, deleteZoneAndUnlinkContacts, smartSyncZones } from '../services/crmService';

// Paleta de colores predefinida para las zonas
const ZONE_COLORS = ['#f97316', '#10b981', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16', '#64748b'];

export default function ZoneManagerModal({ onClose }) {
  const [zones, setZones] = useState([]);
  
  // Estados de Creación
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);
  
  // Estados de Edición
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  
  const [deletingId, setDeletingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // NUEVO: Estados para la Sincronización Inteligente
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    const unsub = subscribeToZones(setZones);
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if(!newZoneName.trim()) return;
    setIsLoading(true);
    await createZoneInDb(newZoneName.trim(), newZoneColor);
    setNewZoneName('');
    setNewZoneColor(ZONE_COLORS[0]);
    setIsLoading(false);
  };

  const handleSaveEdit = async (zone) => {
    if(!editName.trim() || (editName === zone.name && editColor === zone.color)) {
      setEditingId(null);
      return;
    }
    setIsLoading(true);
    await updateZoneAndContacts(zone.id, zone.name, editName.trim(), editColor);
    setEditingId(null);
    setIsLoading(false);
  };

  const handleDeleteConfirm = async (zone) => {
    setIsLoading(true);
    await deleteZoneAndUnlinkContacts(zone.id, zone.name);
    setDeletingId(null);
    setIsLoading(false);
  };

  // NUEVO: Función que llama a la limpieza de la base de datos
  const handleSmartSync = async () => {
    if (zones.length === 0) {
        setSyncMessage("Debes crear al menos una zona primero.");
        setTimeout(() => setSyncMessage(''), 3000);
        return;
    }
    
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const count = await smartSyncZones(zones);
      if (count > 0) {
          setSyncMessage(`¡Éxito! Se vincularon y corrigieron ${count} clientes importados.`);
      } else {
          setSyncMessage("Todo está en orden. No se encontraron clientes desconectados.");
      }
    } catch (error) {
      console.error(error);
      setSyncMessage("Ocurrió un error al sincronizar.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 6000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Map className="w-6 h-6 text-orange-500" /> Gestor de Zonas
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* CREADOR DE NUEVA ZONA */}
        <div className="p-6 bg-black border-b border-zinc-800 shrink-0">
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newZoneName} 
                onChange={(e) => setNewZoneName(e.target.value)} 
                placeholder="Ej. Bariloche, Bolson..." 
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !newZoneName.trim()} className="bg-orange-600 hover:bg-orange-500 text-black px-4 rounded-xl font-bold transition-colors disabled:opacity-50">
                <Plus className="w-5 h-5"/>
              </button>
            </div>
            
            {/* Paleta de colores */}
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color de Identificación:</span>
              <div className="flex gap-1.5">
                {ZONE_COLORS.map(c => (
                  <button 
                    key={c} type="button" onClick={() => setNewZoneColor(c)} 
                    style={{backgroundColor: c}} 
                    className={`w-5 h-5 rounded-full transition-transform ${newZoneColor === c ? 'ring-2 ring-white scale-125' : 'opacity-40 hover:opacity-100'}`} 
                  />
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* LISTADO DE ZONAS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          {zones.length === 0 && (
            <p className="text-center text-zinc-500 text-sm font-bold">No hay zonas creadas en el sistema.</p>
          )}
          
          {zones.map(zone => (
            <div key={zone.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col justify-center transition-all group shadow-sm">
              
              {deletingId === zone.id ? (
                <div className="flex flex-col gap-3">
                  <span className="text-xs text-red-400 font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> ¿Borrar zona? Los clientes quedarán sueltos.</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDeletingId(null)} className="flex-1 bg-zinc-800 text-white text-xs font-bold py-2 rounded-lg">Cancelar</button>
                    <button onClick={() => handleDeleteConfirm(zone)} disabled={isLoading} className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-lg">Sí, Borrar</button>
                  </div>
                </div>
              ) : editingId === zone.id ? (
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center gap-2">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="flex-1 bg-black border border-orange-500 rounded-lg px-3 py-1.5 text-sm text-white outline-none" disabled={isLoading}/>
                    <button onClick={() => handleSaveEdit(zone)} disabled={isLoading} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"><Check className="w-4 h-4"/></button>
                    <button onClick={() => setEditingId(null)} disabled={isLoading} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    {ZONE_COLORS.map(c => (
                      <button 
                        key={c} type="button" onClick={() => setEditColor(c)} 
                        style={{backgroundColor: c}} 
                        className={`w-5 h-5 rounded-full transition-transform ${editColor === c ? 'ring-2 ring-white scale-125' : 'opacity-40 hover:opacity-100'}`} 
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: zone.color || ZONE_COLORS[0] }}></div>
                    <span className="font-bold text-white text-sm">{zone.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {setEditingId(zone.id); setEditName(zone.name); setEditColor(zone.color || ZONE_COLORS[0]);}} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => setDeletingId(zone.id)} className="p-1.5 hover:bg-red-950/50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* BOTÓN MÁGICO DE SINCRONIZACIÓN */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900 shrink-0 flex flex-col gap-3">
          {syncMessage && (
            <div className={`text-xs font-bold text-center p-2 rounded-lg ${syncMessage.includes('Éxito') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
              {syncMessage}
            </div>
          )}
          <button 
            onClick={handleSmartSync}
            disabled={isSyncing || zones.length === 0}
            className="w-full bg-blue-900/30 hover:bg-blue-600 border border-blue-500/50 text-blue-400 hover:text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            title="Conecta los clientes del Excel con las Zonas de este menú."
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
            {isSyncing ? 'ANALIZANDO BASE DE DATOS...' : 'VINCULAR CLIENTES IMPORTADOS'}
          </button>
        </div>

      </div>
    </div>
  );
}