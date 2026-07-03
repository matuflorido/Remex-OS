import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Briefcase, Map } from 'lucide-react';
import { createContactInDb, updateContactInDb, subscribeToZones } from '../services/crmService';

export default function CreateContactModal({ onClose, contactToEdit = null }) {
  const isEditing = !!contactToEdit;
  const [formData, setFormData] = useState({
    name: '',
    type: 'cliente',
    phone: '',
    email: '',
    address: '',
    zone: '' 
  });
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToZones(setZones);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (contactToEdit) {
      setFormData({
        name: contactToEdit.name || '',
        type: contactToEdit.type || 'cliente',
        phone: contactToEdit.phone || '',
        email: contactToEdit.email || '',
        address: contactToEdit.address || '',
        zone: contactToEdit.zone || ''
      });
    }
  }, [contactToEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateContactInDb(contactToEdit.id, formData);
      } else {
        await createContactInDb(formData);
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <User className="w-6 h-6 text-orange-500" />
            {isEditing ? 'Editar Registro' : 'Nuevo Registro'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          <form id="contactForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex gap-4 mb-6 bg-black p-1.5 rounded-xl border border-zinc-800 w-fit">
              <button 
                type="button" 
                onClick={() => setFormData({...formData, type: 'cliente'})}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${formData.type === 'cliente' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                Cliente
              </button>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, type: 'proveedor'})}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${formData.type === 'proveedor' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                Proveedor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Razón Social / Nombre</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                </div>
              </div>

              {/* SELECT ESTRICTO DE ZONAS */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1 flex items-center gap-2">
                  <Map className="w-3 h-3 text-orange-500"/> Zona de Recorrido / Logística
                </label>
                <select 
                  name="zone" 
                  value={formData.zone} 
                  onChange={handleChange} 
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none"
                >
                  <option value="">-- Sin Zona Asignada --</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 mt-1 ml-1">Puedes gestionar las zonas desde el botón "Zonas" en el menú principal.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Teléfono</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Correo (Opcional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Dirección Física</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800">CANCELAR</button>
          <button form="contactForm" type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
            {isLoading ? 'GUARDANDO...' : (isEditing ? 'GUARDAR CAMBIOS' : 'CREAR REGISTRO')}
          </button>
        </div>

      </div>
    </div>
  );
}