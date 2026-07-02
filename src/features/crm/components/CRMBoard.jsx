import React, { useState, useEffect } from 'react';
import { 
  Users, Truck, MapPin, Search, Plus, Filter, Phone, Mail, FileText, Briefcase, Bell
} from 'lucide-react';
import useUIStore from '../../../store/useUIStore';

import { subscribeToContacts } from '../services/crmService';
import CreateContactModal from './CreateContactModal';

// Puente para notificaciones nativas de Windows
const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export default function CRMBoard() {
  const { searchQuery, setSearchQuery } = useUIStore();
  
  const [activeTab, setActiveTab] = useState('clientes'); // 'clientes' o 'proveedores'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState('Todas');

  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToContacts((data) => {
      setContacts(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const zones = ['Todas', 'Línea Sur', 'Valle', 'Centro', 'Nacional'];

  const testNativeNotification = () => {
    if (ipcRenderer) {
      ipcRenderer.send('show-native-notification', {
        title: 'Remex OS - Nuevo Recordatorio',
        body: 'Es momento de contactar a los clientes de la Línea Sur.'
      });
    } else {
      alert("Las notificaciones nativas solo funcionan en la app de escritorio.");
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (c.type !== activeTab) return false;
    if (selectedZone !== 'Todas' && c.zone !== selectedZone) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col h-full bg-zinc-950">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-orange-500" />
            Directorio y CRM
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Gestiona clientes, proveedores y zonas logísticas.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={testNativeNotification}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 border border-zinc-700 transition-colors"
          >
            <Bell className="w-4 h-4"/> Probar Notificación
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:scale-105 transition-all">
            <Plus className="w-4 h-4"/> NUEVO REGISTRO
          </button>
        </div>
      </div>

      {}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-full md:w-fit shadow-inner">
          <button 
            onClick={() => setActiveTab('clientes')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'clientes' ? 'bg-orange-600 text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
          >
            <Users className="w-4 h-4" /> CLIENTES
          </button>
          <button 
            onClick={() => setActiveTab('proveedores')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'proveedores' ? 'bg-orange-600 text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
          >
            <Truck className="w-4 h-4" /> PROVEEDORES
          </button>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl">
          <MapPin className="w-4 h-4 text-orange-500" />
          <span className="text-xs text-zinc-500 font-bold uppercase hidden sm:inline">Zona Logística:</span>
          <select 
            value={selectedZone} 
            onChange={(e) => setSelectedZone(e.target.value)} 
            className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
          >
            {zones.map(z => <option key={z} value={z} className="bg-zinc-900">{z}</option>)}
          </select>
        </div>
      </div>

      {}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Empresa / Razón Social</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Contacto Directo</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Zona Asignada</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">
                    Cargando base de datos...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">
                    No se encontraron {activeTab} para esta zona.
                  </td>
                </tr>
              ) : (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm block group-hover:text-orange-400 transition-colors">{contact.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{contact.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-zinc-300 font-bold block">{contact.contact}</span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3"/> {contact.phone}</span>
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-md border border-zinc-700 flex items-center gap-1.5 w-fit">
                        <MapPin className="w-3 h-3 text-orange-500"/> {contact.zone}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${contact.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-sm font-bold text-zinc-400 hover:text-white px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                        Ver Perfil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && <CreateContactModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}