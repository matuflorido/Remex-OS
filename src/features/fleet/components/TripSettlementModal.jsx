import React, { useState, useEffect } from 'react';
import { X, Truck, Fuel, DollarSign, Receipt, MapPin, CheckCircle2, Plus, Trash2, Save, Tags, Navigation } from 'lucide-react';
import { subscribeToTrip, updateTripInDb, ensureTripExists, subscribeToExpenseCategories } from '../services/fleetService';

export default function TripSettlementModal({ eventId, zoneName, onClose }) {
  const [trip, setTrip] = useState(null);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newExpense, setNewExpense] = useState({ 
    macroCategory: '', 
    microCategory: '', 
    amount: '', 
    description: '' 
  });

  useEffect(() => {
    let unsubscribeTrip;
    let unsubscribeCats;

    const initialize = async () => {
      await ensureTripExists(eventId, zoneName);
      
      unsubscribeTrip = subscribeToTrip(eventId, (data) => {
        setTrip(data);
        if (Object.keys(categories).length > 0) setLoading(false);
      });

      unsubscribeCats = subscribeToExpenseCategories((cats) => {
        setCategories(cats || {});
        // Inicializar los selectores con la primera categoría disponible
        const macros = Object.keys(cats || {});
        if (macros.length > 0) {
          const firstMacro = macros[0];
          setNewExpense(prev => ({
            ...prev,
            macroCategory: prev.macroCategory || firstMacro,
            microCategory: prev.microCategory || (cats[firstMacro] ? cats[firstMacro][0] : '')
          }));
        }
        if (trip) setLoading(false);
      });
    };
    
    initialize();
    return () => { 
      if (unsubscribeTrip) unsubscribeTrip(); 
      if (unsubscribeCats) unsubscribeCats(); 
    };
  }, [eventId, zoneName, trip !== null]);

  // Si cambia la Macro-categoría, reseteamos la Micro-categoría a la primera opción disponible
  const handleMacroChange = (e) => {
    const selectedMacro = e.target.value;
    setNewExpense({
      ...newExpense,
      macroCategory: selectedMacro,
      microCategory: categories[selectedMacro] && categories[selectedMacro].length > 0 ? categories[selectedMacro][0] : ''
    });
  };

  const handleUpdateNested = (section, field, value) => {
    setTrip(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: Number(value) || value 
      }
    }));
  };

  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.description.trim() || !newExpense.macroCategory) return;
    
    const expenseItem = {
      id: Date.now(),
      macroCategory: newExpense.macroCategory,
      microCategory: newExpense.microCategory || 'General',
      amount: Number(newExpense.amount),
      description: newExpense.description.trim()
    };

    setTrip(prev => ({
      ...prev,
      finances: {
        ...prev.finances,
        expenses: [...(prev.finances?.expenses || []), expenseItem]
      }
    }));
    
    setNewExpense(prev => ({ ...prev, amount: '', description: '' }));
  };

  const handleRemoveExpense = (expenseId) => {
    setTrip(prev => ({
      ...prev,
      finances: {
        ...prev.finances,
        expenses: (prev.finances?.expenses || []).filter(e => e.id !== expenseId)
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateTripInDb(trip.id, {
      status: trip.status,
      departure: trip.departure,
      return: trip.return,
      finances: trip.finances
    });
    setIsSaving(false);
    onClose();
  };

  if (loading || !trip) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center">
        <div className="text-orange-500 font-bold animate-pulse tracking-widest text-sm">CARGANDO HOJA DE RUTA...</div>
      </div>
    );
  }

  const kmTraveled = (trip.return?.km || 0) - (trip.departure?.km || 0);
  const totalExpenses = (trip.finances?.expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
  const totalRendition = (trip.departure?.cashAdvance || 0) + (trip.finances?.totalCollected || 0) - totalExpenses;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-6xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[95vh]">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border border-zinc-700 px-2 py-0.5 rounded">ID: {trip.id.slice(0, 8)}</span>
              <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">Zona: {trip.zone}</span>
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Truck className="w-7 h-7 text-orange-500" />
              Liquidación de Viaje Operativo
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-6 h-6"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/50">
            
            {/* BLOQUE A: CONTROL DE SALIDA */}
            <div className="space-y-6 lg:pr-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Navigation className="w-5 h-5 text-zinc-500"/> 1. Despacho (Salida)
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Kilometraje Inicial</label>
                  <input 
                    type="number" value={trip.departure?.km || ''} onChange={(e) => handleUpdateNested('departure', 'km', e.target.value)}
                    placeholder="Ej. 125400"
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1 flex items-center gap-1">
                    <Fuel className="w-3 h-3"/> Estado del Tanque
                  </label>
                  <select 
                    value={trip.departure?.fuelLevel || 'Lleno'} onChange={(e) => handleUpdateNested('departure', 'fuelLevel', e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                  >
                    <option value="Reserva">Reserva (Luz Roja)</option>
                    <option value="1/4">1/4 Tanque</option>
                    <option value="1/2">Medio Tanque (1/2)</option>
                    <option value="3/4">3/4 Tanque</option>
                    <option value="Lleno">Tanque Lleno</option>
                  </select>
                </div>
                
                <div className="pt-4 border-t border-zinc-800/50">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Viáticos Entregados (Efectivo)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"/>
                    <input 
                      type="number" value={trip.departure?.cashAdvance || ''} onChange={(e) => handleUpdateNested('departure', 'cashAdvance', e.target.value)}
                      placeholder="0"
                      className="w-full bg-black border border-emerald-900/50 rounded-xl pl-9 pr-4 py-3 text-sm text-emerald-400 font-bold focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Valor Mercadería Transportada (Op)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/>
                    <input 
                      type="number" value={trip.departure?.merchandiseValue || ''} onChange={(e) => handleUpdateNested('departure', 'merchandiseValue', e.target.value)}
                      placeholder="0"
                      className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-sm text-zinc-400 focus:border-orange-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUE B: CARGA DE COMPROBANTES DINÁMICA */}
            <div className="space-y-6 pt-6 lg:pt-0 lg:px-4 flex flex-col h-full">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 shrink-0">
                <Receipt className="w-5 h-5 text-blue-500"/> 2. Comprobantes de Ruta
              </h3>
              
              {Object.keys(categories).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
                  <Tags className="w-8 h-8 mb-2 opacity-50"/>
                  <p className="text-sm font-bold">No hay Plan de Cuentas configurado.</p>
                  <p className="text-xs mt-1">Dirígete a la sección de Estadísticas para crear las categorías.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 mb-2 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 shrink-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Grupo General</label>
                        <select 
                          value={newExpense.macroCategory} onChange={handleMacroChange}
                          className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                        >
                          {Object.keys(categories).map(macro => (
                            <option key={macro} value={macro}>{macro}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Ítem Específico</label>
                        <select 
                          value={newExpense.microCategory} onChange={e => setNewExpense({...newExpense, microCategory: e.target.value})}
                          className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                        >
                          {categories[newExpense.macroCategory]?.length > 0 ? (
                            categories[newExpense.macroCategory].map(micro => (
                              <option key={micro} value={micro}>{micro}</option>
                            ))
                          ) : (
                            <option value="">Sin sub-ítems</option>
                          )}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                        <input 
                          type="number" placeholder="Monto" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                          className="w-full bg-black border border-zinc-800 rounded-lg pl-6 pr-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <input 
                        type="text" placeholder="Nº Factura, Detalle..." value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                        className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                      />
                      <button onClick={handleAddExpense} disabled={!newExpense.amount || !newExpense.description.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[200px] lg:min-h-0">
                    {(!trip.finances?.expenses || trip.finances.expenses.length === 0) && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center opacity-50">
                        <Tags className="w-8 h-8 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">Sin comprobantes</p>
                      </div>
                    )}
                    {trip.finances?.expenses?.map(exp => (
                      <div key={exp.id} className="bg-black border border-zinc-800/80 p-3 rounded-xl flex justify-between items-center group hover:border-red-500/30 transition-colors">
                        <div className="flex flex-col overflow-hidden pr-2">
                          <span className="text-xs font-bold text-zinc-300 truncate">{exp.description}</span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            {exp.macroCategory} {exp.microCategory && <><span className="text-zinc-700">&gt;</span> {exp.microCategory}</>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-black text-red-400">-${exp.amount.toLocaleString('es-AR')}</span>
                          <button onClick={() => handleRemoveExpense(exp.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-zinc-900 rounded-md">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* BLOQUE C: RENDICIÓN FINAL */}
            <div className="space-y-6 pt-6 lg:pt-0 lg:pl-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500"/> 3. Rendición y Cierre
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Kilometraje Final (Llegada)</label>
                  <input 
                    type="number" value={trip.return?.km || ''} onChange={(e) => handleUpdateNested('return', 'km', e.target.value)}
                    placeholder="Ej. 126150"
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                  />
                  {kmTraveled > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg w-fit">
                      <MapPin className="w-3.5 h-3.5"/> Distancia Computada: {kmTraveled} km
                    </div>
                  )}
                  {kmTraveled < 0 && trip.return?.km > 0 && (
                     <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">⚠️ Error: Los kilómetros de llegada no pueden ser menores a los de salida.</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Total Recaudado (Cobranzas)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"/>
                    <input 
                      type="number" value={trip.finances?.totalCollected || ''} onChange={(e) => handleUpdateNested('finances', 'totalCollected', e.target.value)}
                      placeholder="0"
                      className="w-full bg-black border border-blue-900/50 rounded-xl pl-9 pr-4 py-3 text-sm text-blue-400 font-bold focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-zinc-950 border border-emerald-900/40 p-5 rounded-2xl relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
                <h4 className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-4 border-b border-emerald-900/30 pb-2">Balance de Caja a Rendir</h4>
                <div className="space-y-2.5 relative z-10">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                    <span>Viáticos de Salida (+)</span> 
                    <span className="text-white">${(trip.departure?.cashAdvance || 0).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                    <span>Recaudación Cobrada (+)</span> 
                    <span className="text-white">${(trip.finances?.totalCollected || 0).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-red-400/80 border-b border-zinc-800 pb-3">
                    <span>Comprobantes Aceptados (-)</span> 
                    <span className="text-red-400">-${totalExpenses.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-black text-white">MONTO A ENTREGAR</span>
                    <span className={`text-2xl font-black tracking-tight ${totalRendition >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      ${totalRendition.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0">Estado del Viaje:</span>
             <select 
                value={trip.status} onChange={(e) => setTrip({...trip, status: e.target.value})}
                className={`w-full sm:w-auto bg-black border rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-colors ${trip.status === 'liquidado' ? 'text-emerald-400 border-emerald-500/30' : 'text-orange-500 border-zinc-800'}`}
             >
               <option value="en_preparacion">En Preparación (Pre-viaje)</option>
               <option value="en_ruta">En Ruta (Viajando)</option>
               <option value="liquidado">Liquidado (Rendición Cerrada)</option>
             </select>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              CERRAR
            </button>
            <button onClick={handleSave} disabled={isSaving || (kmTraveled < 0 && trip.return?.km > 0)} className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              {isSaving ? 'GUARDANDO...' : <><Save className="w-4 h-4"/> GUARDAR HOJA</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}