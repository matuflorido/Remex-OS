import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Map, Phone, AlertCircle, Trash2, FileText, RefreshCw } from 'lucide-react';
import { createEventInDb, updateEventInDb, deleteEventInDb } from '../services/calendarService';
import { subscribeToContacts, subscribeToZones } from '../../crm/services/crmService';

export default function CreateEventModal({ onClose, selectedDate, eventToEdit = null, prefilledData = null }) {
  const isEditing = !!(eventToEdit && eventToEdit.id);
  
  const initialDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    date: initialDateStr,
    type: 'tarea',
    zone: '',
    contactId: '',
    notes: '',
    preventaStart: initialDateStr,
    preventaEnd: initialDateStr,
    repartoStart: initialDateStr,
    repartoEnd: initialDateStr,
  });

  const [contacts, setContacts] = useState([]);
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubContacts = subscribeToContacts(setContacts);
    const unsubZones = subscribeToZones(setZones);
    return () => {
      unsubContacts();
      unsubZones();
    };
  }, []);

  useEffect(() => {
    if (eventToEdit && eventToEdit.id) {
      setFormData({
        title: eventToEdit.title || '',
        date: eventToEdit.date || initialDateStr,
        type: eventToEdit.type || 'tarea',
        zone: eventToEdit.zone || '',
        contactId: eventToEdit.contactId || '',
        notes: eventToEdit.notes || '',
        preventaStart: eventToEdit.preventaStart || initialDateStr,
        preventaEnd: eventToEdit.preventaEnd || initialDateStr,
        repartoStart: eventToEdit.repartoStart || initialDateStr,
        repartoEnd: eventToEdit.repartoEnd || initialDateStr
      });
    } else if (prefilledData) {
      setFormData(prev => ({
        ...prev,
        ...prefilledData
      }));
    }
  }, [eventToEdit, prefilledData, initialDateStr]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { ...formData };
      
      if (payload.type === 'ciclo') {
        payload.title = `Ciclo Logístico: ${payload.zone}`;
        payload.date = payload.repartoStart; 
      }
      
      if (payload.type === 'tarea') {
        payload.zone = '';
        payload.contactId = '';
      }

      if (isEditing) {
        await updateEventInDb(eventToEdit.id, payload);
      } else {
        await createEventInDb(payload);
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    await deleteEventInDb(eventToEdit.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      {/* CORRECCIÓN VISUAL: Se cambió max-w-lg a max-w-2xl para hacer la ventana más ancha */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-orange-500" />
            {isEditing ? 'Editar Evento' : 'Programar Evento'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          <form id="eventForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-wrap gap-2 bg-black p-1.5 rounded-xl border border-zinc-800 w-full mb-6">
              <button type="button" onClick={() => setFormData({...formData, type: 'tarea'})} className={`flex-1 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${formData.type === 'tarea' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
                <FileText className="w-4 h-4"/> Tarea General
              </button>
              <button type="button" onClick={() => setFormData({...formData, type: 'llamada'})} className={`flex-1 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${formData.type === 'llamada' ? 'bg-blue-500 text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
                <Phone className="w-4 h-4"/> Llamada
              </button>
              <button type="button" onClick={() => setFormData({...formData, type: 'recorrido'})} className={`flex-1 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${formData.type === 'recorrido' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
                <Map className="w-4 h-4"/> Recorrido Fijo
              </button>
              <button type="button" onClick={() => setFormData({...formData, type: 'ciclo'})} className={`flex-1 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${formData.type === 'ciclo' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
                <RefreshCw className="w-4 h-4"/> Ciclo Logístico
              </button>
            </div>

            {formData.type === 'ciclo' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1 text-orange-400">Seleccionar Zona de Reparto</label>
                  <select name="zone" value={formData.zone} onChange={handleChange} required className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none">
                    <option value="">-- Seleccionar Zona --</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-blue-950/20 p-4 border border-blue-900/30 rounded-xl">
                  <div className="col-span-2 text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone className="w-4 h-4"/> 1. Fase Preventa (Llamadas)
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Inicio</label>
                    <input type="date" name="preventaStart" required value={formData.preventaStart} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none color-scheme-dark" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Fin</label>
                    <input type="date" name="preventaEnd" required value={formData.preventaEnd} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none color-scheme-dark" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-orange-950/20 p-4 border border-orange-900/30 rounded-xl">
                  <div className="col-span-2 text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                    <Map className="w-4 h-4"/> 2. Fase Reparto (Viaje)
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Salida</label>
                    <input type="date" name="repartoStart" required value={formData.repartoStart} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none color-scheme-dark" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Regreso</label>
                    <input type="date" name="repartoEnd" required value={formData.repartoEnd} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none color-scheme-dark" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Notas Adicionales</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none custom-scrollbar" />
                </div>
              </div>
            )}

            {formData.type !== 'ciclo' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Título del Evento</label>
                  <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="Ej. Visita Línea Sur, Llamar a proveedor..." className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Fecha Única</label>
                  <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none color-scheme-dark" />
                </div>
                
                {formData.type === 'recorrido' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1 text-orange-400">Asignar Zona Logística</label>
                    <select name="zone" value={formData.zone} onChange={handleChange} required className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none">
                      <option value="">-- Seleccionar Zona --</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.name}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {formData.type === 'llamada' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1 text-blue-400">Vincular a un Contacto</label>
                    <select name="contactId" value={formData.contactId} onChange={handleChange} required className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none">
                      <option value="">-- Seleccionar Contacto --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Notas / Detalles</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none custom-scrollbar" />
                </div>
              </div>
            )}
          </form>
        </div>
        
        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-between items-center">
          {isEditing ? (
             <button type="button" onClick={handleDelete} className="p-2.5 bg-red-950/40 border border-red-900/50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-colors" title="Eliminar Evento">
                <Trash2 className="w-5 h-5"/>
             </button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">CANCELAR</button>
            <button form="eventForm" type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
              {isLoading ? 'GUARDANDO...' : (isEditing ? 'ACTUALIZAR' : 'PROGRAMAR')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}