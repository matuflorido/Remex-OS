import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Map, Phone, AlertCircle, Trash2 } from 'lucide-react';
import { createEventInDb, updateEventInDb, deleteEventInDb } from '../services/calendarService';
import { subscribeToContacts, subscribeToZones } from '../../crm/services/crmService';

export default function CreateEventModal({ onClose, selectedDate, eventToEdit = null, prefilledData = null }) {
  const isEditing = !!(eventToEdit && eventToEdit.id);
  
  const [formData, setFormData] = useState({
    title: '',
    date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    type: 'recorrido', 
    zone: '',
    contactId: '',
    notes: ''
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
        date: eventToEdit.date || '',
        type: eventToEdit.type || 'recorrido',
        zone: eventToEdit.zone || '',
        contactId: eventToEdit.contactId || '',
        notes: eventToEdit.notes || ''
      });
    } else if (prefilledData) {
      // Si venimos del atajo del CRM
      setFormData(prev => ({
        ...prev,
        ...prefilledData
      }));
    }
  }, [eventToEdit, prefilledData]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateEventInDb(eventToEdit.id, formData);
      } else {
        await createEventInDb(formData);
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
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-orange-500" />
            {isEditing ? 'Editar Evento' : 'Programar Evento'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          <form id="eventForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex gap-4 bg-black p-1.5 rounded-xl border border-zinc-800 w-fit">
              <button type="button" onClick={() => setFormData({...formData, type: 'recorrido'})} className={`px-4 py-1.5 text-sm font-bold rounded-lg flex items-center gap-2 ${formData.type === 'recorrido' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
                <Map className="w-4 h-4"/> Recorrido / Zona
              </button>
              <button type="button" onClick={() => setFormData({...formData, type: 'llamada'})} className={`px-4 py-1.5 text-sm font-bold rounded-lg flex items-center gap-2 ${formData.type === 'llamada' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
                <Phone className="w-4 h-4"/> Llamada
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Título del Evento</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="Ej. Visita Línea Sur, Llamar a proveedor..." className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Fecha</label>
              <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
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
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1 text-orange-400">Vincular a un Contacto</label>
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

          </form>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-between items-center">
          {isEditing ? (
             <button type="button" onClick={handleDelete} className="p-2.5 bg-red-950/40 border border-red-900/50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-colors" title="Eliminar Evento">
                <Trash2 className="w-5 h-5"/>
             </button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800">CANCELAR</button>
            <button form="eventForm" type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
              {isLoading ? 'GUARDANDO...' : (isEditing ? 'ACTUALIZAR' : 'PROGRAMAR')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}