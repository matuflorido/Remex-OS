import React, { useState, useEffect } from 'react';
import { X, Tags, Plus, Trash2, Save, Layers } from 'lucide-react';
import { subscribeToExpenseCategories, updateExpenseCategoriesInDb } from '../services/fleetService';

export default function ExpenseCategoryManagerModal({ onClose }) {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newMacro, setNewMacro] = useState('');
  const [newMicros, setNewMicros] = useState({}); // Mapeo de inputs temporales por macrocategoría

  useEffect(() => {
    const unsub = subscribeToExpenseCategories((data) => {
      setCategories(data || {});
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddMacro = (e) => {
    e.preventDefault();
    const val = newMacro.trim();
    if (!val || categories[val]) return;
    setCategories({ ...categories, [val]: [] });
    setNewMacro('');
  };

  const handleDeleteMacro = (macro) => {
    if(window.confirm(`¿Seguro que deseas eliminar el grupo "${macro}" y todos sus ítems?`)) {
      const updated = { ...categories };
      delete updated[macro];
      setCategories(updated);
    }
  };

  const handleAddMicro = (e, macro) => {
    e.preventDefault();
    const val = newMicros[macro]?.trim();
    if (!val || categories[macro].includes(val)) return;
    
    setCategories({
      ...categories,
      [macro]: [...categories[macro], val]
    });
    setNewMicros({ ...newMicros, [macro]: '' });
  };

  const handleDeleteMicro = (macro, micro) => {
    setCategories({
      ...categories,
      [macro]: categories[macro].filter(m => m !== micro)
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateExpenseCategoriesInDb(categories);
    setIsSaving(false);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex justify-center items-center">
        <div className="text-orange-500 font-bold animate-pulse">Cargando categorías...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Tags className="w-6 h-6 text-orange-500" />
            Estructura de Gastos (Plan de Cuentas)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          
          <form onSubmit={handleAddMacro} className="mb-8 flex gap-3">
            <input 
              type="text" value={newMacro} onChange={(e) => setNewMacro(e.target.value)}
              placeholder="Ej. Impuestos, Mantenimiento..."
              className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
            />
            <button type="submit" disabled={!newMacro.trim()} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
              <Plus className="w-4 h-4"/> NUEVO GRUPO
            </button>
          </form>

          <div className="space-y-6">
            {Object.keys(categories).length === 0 && (
              <p className="text-center text-zinc-500 text-sm italic">No hay grupos creados.</p>
            )}

            {Object.keys(categories).map(macro => (
              <div key={macro} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-500"/> {macro}
                  </h3>
                  <button onClick={() => handleDeleteMacro(macro)} className="text-zinc-500 hover:text-red-500 transition-colors" title="Eliminar Grupo">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories[macro].length === 0 && <span className="text-xs text-zinc-500 italic">Sin ítems específicos.</span>}
                  {categories[macro].map(micro => (
                    <div key={micro} className="bg-black border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 flex items-center gap-2 group hover:border-red-500/50 transition-colors">
                      {micro}
                      <button onClick={() => handleDeleteMicro(macro, micro)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => handleAddMicro(e, macro)} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMicros[macro] || ''} 
                    onChange={(e) => setNewMicros({...newMicros, [macro]: e.target.value})}
                    placeholder={`Nuevo ítem en ${macro}...`}
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-2 text-xs text-white focus:border-orange-500 outline-none transition-colors"
                  />
                  <button type="submit" disabled={!newMicros[macro]?.trim()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 rounded-lg transition-colors disabled:opacity-50">
                    <Plus className="w-4 h-4"/>
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">CANCELAR</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center gap-2">
            {isSaving ? 'GUARDANDO...' : <><Save className="w-4 h-4"/> GUARDAR CAMBIOS</>}
          </button>
        </div>

      </div>
    </div>
  );
}