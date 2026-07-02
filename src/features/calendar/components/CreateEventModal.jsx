import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Truck, Phone } from 'lucide-react';
import { createEventInDb } from '../services/calendarService';
import { useAuthStore } from '../../../store/useAuthStore';

export default function CreateEventModal({ onClose, selectedDateStr = '' }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'ruta', // 'ruta' o 'llamada'
    title: '',
    date: selectedDateStr || new Date().toISOString().split('T')[0],
    zone: 'Línea Sur',
    area: user?.role || 'Operaciones'
  });

  const zones = ['Línea Sur', 'Valle', 'Centro', 'Nacional'];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setLoading(true);
    try {
      await createEventInDb({
        ...formData,
        status: 'pending'
      });
      onClose();
    } catch (error) {
      console.error("Error al crear evento:", error);
      alert("Error al guardar en la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        
        {}
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-500"/> Programar Evento
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="eventForm" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4 mb-2">
              <label className={`cursor-pointer border p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${formData.type === 'ruta' ? 'bg-orange-900/20 border-orange-500 text-orange-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                <input type="radio" name="type" value="ruta" checked={formData.type === 'ruta'} onChange={handleChange} className="hidden"/>
                <Truck className="w-4 h-4"/> RUTA LOGÍSTICA
              </label>
              <label className={`cursor-pointer border p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${formData.type === 'llamada' ? 'bg-orange-900/20 border-orange-500 text-orange-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                <input type="radio" name="type" value="llamada" checked={formData.type === 'llamada'} onChange={handleChange} className="hidden"/>
                <Phone className="w-4 h-4"/> LLAMADA / AVISO
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Título de la Actividad *</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder={formData.type === 'ruta' ? "Ej. Reparto Mensual Valle" : "Ej. Llamar a Distribuidora X"} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Fecha Exacta *</label>
                <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none color-scheme-dark"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Asignar al Área</label>
                <input type="text" name="area" value={formData.area} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400 outline-none bg-zinc-900/50" readOnly title="Se asigna a tu área actual automáticamente"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3"/> Zona de Referencia</label>
              <select name="zone" value={formData.zone} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none">
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

          </form>
        </div>

        <div className="px-6 py-5 flex justify-end gap-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancelar</button>
          <button form="eventForm" type="submit" disabled={loading || !formData.title.trim()} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)] disabled:opacity-50">
            {loading ? 'PROGRAMANDO...' : 'PROGRAMAR EVENTO'}
          </button>
        </div>

      </div>
    </div>
  );
}