import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Briefcase, Map, History, Clock, Send } from 'lucide-react';
import { createContactInDb, updateContactInDb, subscribeToZones, addContactNoteInDb } from '../services/crmService';
import { useAuthStore } from '../../../store/useAuthStore';

export default function CreateContactModal({ onClose, contactToEdit = null }) {
  const { user } = useAuthStore();
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
  
  // Estados para el Historial de Notas
  const [localHistory, setLocalHistory] = useState([]);
  const [newNote, setNewNote] = useState('');

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
      setLocalHistory(contactToEdit.history || []);
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

  const handleAddNote = async () => {
    if (!newNote.trim() || !contactToEdit) return;
    
    const now = new Date();
    const noteEntry = { 
      date: now.toISOString().split('T')[0], 
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: user?.name || 'Usuario', 
      comment: newNote.trim()
    };
    
    // Actualizamos la vista local rápido
    setLocalHistory(prev => [...prev, noteEntry]);
    setNewNote('');

    // Guardamos en Firebase
    await addContactNoteInDb(contactToEdit.id, noteEntry);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <User className="w-6 h-6 text-orange-500" />
            {isEditing ? `Perfil de ${formData.type}` : 'Nuevo Registro'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          
          {/* COLUMNA IZQUIERDA: Formulario de Datos */}
          <div className="p-6 w-full lg:w-1/2 flex flex-col">
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

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Razón Social / Nombre</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                </div>
              </div>

              <div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Dirección Física</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none" />
                </div>
              </div>

            </form>
          </div>

          {/* COLUMNA DERECHA: Historial de Notas (Solo si está editando) */}
          <div className="p-6 w-full lg:w-1/2 flex flex-col bg-zinc-950/30">
            <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" /> Bitácora del {formData.type === 'cliente' ? 'Cliente' : 'Proveedor'}
            </h3>
            
            {!isEditing ? (
              <div className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-center p-6">
                <p className="text-zinc-500 text-sm font-bold">Debes guardar este registro primero<br/>para poder agregarle notas.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 mb-6 overflow-y-auto custom-scrollbar pr-2 min-h-[250px] max-h-[400px]">
                  {localHistory.length === 0 && (
                    <p className="text-zinc-600 text-sm italic text-center mt-10">No hay interacciones registradas aún.</p>
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