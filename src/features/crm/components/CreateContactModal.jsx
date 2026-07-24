import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Briefcase, Map, History, Clock, Send, MessageSquare } from 'lucide-react';
import { createContactInDb, updateContactInDb, subscribeToZones, addContactNoteInDb } from '../services/crmService';
import { useAuthStore } from '../../../store/useAuthStore';

export default function CreateContactModal({ onClose, contactToEdit = null }) {
  const { user } = useAuthStore();
  const isEditing = !!contactToEdit;
  
  const [formData, setFormData] = useState({
    clientNumber: '',
    name: '',
    fantasyName: '',
    type: 'cliente',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    state: '',
    contactPerson: '',
    transport: '',
    industry: '',
    zones: [] // Cambio a Array
  });
  
  const [zonesList, setZonesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localHistory, setLocalHistory] = useState([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const unsub = subscribeToZones(setZonesList);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (contactToEdit) {
      // Migración automática por si había un cliente con la zona vieja en string
      const initialZones = Array.isArray(contactToEdit.zones) ? contactToEdit.zones : (contactToEdit.zone ? [contactToEdit.zone] : []);

      setFormData({
        clientNumber: contactToEdit.clientNumber || '',
        name: contactToEdit.name || '',
        fantasyName: contactToEdit.fantasyName || '',
        type: contactToEdit.type || 'cliente',
        phone: contactToEdit.phone || '',
        whatsapp: contactToEdit.whatsapp || '',
        email: contactToEdit.email || '',
        address: contactToEdit.address || '',
        city: contactToEdit.city || '',
        state: contactToEdit.state || '',
        contactPerson: contactToEdit.contactPerson || '',
        transport: contactToEdit.transport || '',
        industry: contactToEdit.industry || '',
        zones: initialZones
      });
      setLocalHistory(contactToEdit.history || []);
    }
  }, [contactToEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleZoneToggle = (zoneName) => {
    setFormData(prev => {
      const isSelected = prev.zones.includes(zoneName);
      if (isSelected) {
        return { ...prev, zones: prev.zones.filter(z => z !== zoneName) };
      } else {
        return { ...prev, zones: [...prev.zones, zoneName] };
      }
    });
  };

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

  const handleAddNote = async () => {
    if (!newNote.trim() || !contactToEdit) return;
    
    const now = new Date();
    const noteEntry = { 
      date: now.toISOString().split('T')[0], 
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: user?.name || 'Usuario', 
      comment: newNote.trim()
    };
    
    setLocalHistory(prev => [...prev, noteEntry]);
    setNewNote('');
    await addContactNoteInDb(contactToEdit.id, noteEntry);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <User className="w-6 h-6 text-orange-500" />
            {isEditing ? `Perfil de ${formData.type}` : 'Nuevo Registro de Base'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          
          <div className="p-6 w-full lg:w-[60%] flex flex-col overflow-y-auto custom-scrollbar">
            <form id="contactForm" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex gap-4 bg-black p-1.5 rounded-xl border border-zinc-800 w-fit">
                <button type="button" onClick={() => setFormData({...formData, type: 'cliente'})} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${formData.type === 'cliente' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
                  Cliente
                </button>
                <button type="button" onClick={() => setFormData({...formData, type: 'proveedor'})} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${formData.type === 'proveedor' ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
                  Proveedor
                </button>
              </div>

              <div>
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">1. Identidad Corporativa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Nº Cliente / Sistema</label>
                    <input type="text" name="clientNumber" value={formData.clientNumber} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Rubro / Industria</label>
                    <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Razón Social <span className="text-red-500">*</span></label>
                    <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Nombre de Fantasía</label>
                    <input type="text" name="fantasyName" value={formData.fantasyName} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">2. Ubicación y Logística</h3>
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* SELECCIÓN MÚLTIPLE DE ZONAS */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Zonas Logísticas Asignadas</label>
                    <div className="flex flex-wrap gap-2">
                      {zonesList.map(z => {
                        const isChecked = formData.zones.includes(z.name);
                        return (
                          <label key={z.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={isChecked}
                              onChange={() => handleZoneToggle(z.name)}
                            />
                            {z.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="col-span-2 mt-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Dirección Exacta</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Localidad</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Provincia</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Transporte Preferido</label>
                    <input type="text" name="transport" value={formData.transport} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">3. Medios de Contacto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Persona de Contacto</label>
                    <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Teléfono Principal</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">WhatsApp</label>
                    <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Correo Electrónico</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  </div>
                </div>
              </div>

            </form>
          </div>

          <div className="p-6 w-full lg:w-[40%] flex flex-col bg-zinc-950/30">
            <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" /> Bitácora del Cliente
            </h3>
            
            {!isEditing ? (
              <div className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-center p-6">
                <p className="text-zinc-500 text-sm font-bold">Debes guardar este registro primero<br/>para poder agregarle notas.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 mb-6 overflow-y-auto custom-scrollbar pr-2 min-h-[250px] max-h-[500px]">
                  {localHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-zinc-600 mt-10">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm italic font-bold">No hay interacciones aún.</p>
                    </div>
                  )}
                  {localHistory.map((h, i) => (
                    <div key={i} className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs text-orange-400">{h.user}</span>
                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3"/> {h.date} - {h.time || '00:00'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{h.comment}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-auto pt-4 border-t border-zinc-800/50 shrink-0">
                  <input 
                    type="text" 
                    value={newNote} 
                    onChange={(e) => setNewNote(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    placeholder="Llamada, visita, acuerdo..." 
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                  />
                  <button 
                    onClick={handleAddNote} 
                    disabled={!newNote.trim()}
                    className="bg-zinc-800 hover:bg-orange-600 text-zinc-400 hover:text-white px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-bold text-sm"
                  >
                    <Send className="w-4 h-4"/>
                  </button>
                </div>
              </>
            )}
          </div>

        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800">CERRAR</button>
          <button form="contactForm" type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
            {isLoading ? 'GUARDANDO...' : (isEditing ? 'ACTUALIZAR DATOS' : 'CREAR REGISTRO')}
          </button>
        </div>

      </div>
    </div>
  );
}