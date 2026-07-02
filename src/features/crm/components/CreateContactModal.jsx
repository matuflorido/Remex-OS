import React, { useState } from 'react';
import { X, Plus, Users, MapPin, Phone, Building2 } from 'lucide-react';
import { createContactInDb } from '../services/crmService';

export default function CreateContactModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'cliente',
    name: '',
    contact: '',
    phone: '',
    zone: 'Línea Sur',
    status: 'Activo'
  });

  const zones = ['Línea Sur', 'Valle', 'Centro', 'Nacional'];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createContactInDb(formData);
      onClose();
    } catch (error) {
      console.error("Error al crear contacto:", error);
      alert("Error al guardar en la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500"/> Nuevo Registro
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="contactForm" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4 mb-2">
              <label className={`cursor-pointer border p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${formData.type === 'cliente' ? 'bg-orange-900/20 border-orange-500 text-orange-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                <input type="radio" name="type" value="cliente" checked={formData.type === 'cliente'} onChange={handleChange} className="hidden"/>
                <Users className="w-4 h-4"/> CLIENTE
              </label>
              <label className={`cursor-pointer border p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${formData.type === 'proveedor' ? 'bg-orange-900/20 border-orange-500 text-orange-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                <input type="radio" name="type" value="proveedor" checked={formData.type === 'proveedor'} onChange={handleChange} className="hidden"/>
                <Building2 className="w-4 h-4"/> PROVEEDOR
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Empresa / Razón Social *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Ej. Ferretería El Tornillo" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Persona de Contacto</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Ej. Juan Pérez" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Teléfono</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Ej. 2944-123456" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3"/> Zona Logística / Asignada *</label>
              <select name="zone" value={formData.zone} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none">
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

          </form>
        </div>

        <div className="px-6 py-5 flex justify-end gap-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancelar</button>
          <button form="contactForm" type="submit" disabled={loading || !formData.name.trim()} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)] disabled:opacity-50">
            {loading ? 'GUARDANDO...' : 'GUARDAR REGISTRO'}
          </button>
        </div>

      </div>
    </div>
  );
}