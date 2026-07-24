import React, { useState, useEffect } from 'react';
import { Users, Building2, Map, Search, Plus, Edit2, Trash2, CalendarDays, Settings, UploadCloud } from 'lucide-react';
import { subscribeToContacts, deleteContactInDb, subscribeToZones } from '../services/crmService';
import CreateContactModal from './CreateContactModal';
import CreateEventModal from '../../calendar/components/CreateEventModal';
import ZoneManagerModal from './ZoneManagerModal';
import ImportContactsModal from './ImportContactsModal';
import HelpTooltip from '../../../components/ui/HelpTooltip';

export default function CRMBoard() {
  const [contacts, setContacts] = useState([]);
  const [zones, setZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('cliente');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);
  const [eventPrefill, setEventPrefill] = useState(null);

  useEffect(() => {
    const unsubscribeContacts = subscribeToContacts(setContacts);
    const unsubscribeZones = subscribeToZones(setZones);
    return () => {
      unsubscribeContacts();
      unsubscribeZones();
    };
  }, []);

  const handleEdit = (contact) => {
    setContactToEdit(contact);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setContactToEdit(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm("¿Seguro que deseas eliminar este registro?")) {
      await deleteContactInDb(id);
    }
  };

  const uniqueZones = zones.map(z => z.name);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('Todas');

  const filteredContacts = contacts.filter(c => {
    const matchesType = c.type === selectedType;
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.fantasyName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Adaptación para Zonas Múltiples
    const cZones = c.zones || (c.zone ? [c.zone] : []);
    const matchesZone = selectedZoneFilter === 'Todas' || cZones.includes(selectedZoneFilter);
    
    return matchesType && matchesSearch && matchesZone;
  });

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            {selectedType === 'cliente' ? <Users className="w-7 h-7 text-orange-500" /> : <Building2 className="w-7 h-7 text-orange-500" />}
            Directorio {selectedType === 'cliente' ? 'Comercial' : 'de Proveedores'}
            <HelpTooltip text="Si un cliente tiene múltiples rutas, usa el Gestor de Zonas para 'Vincular Clientes Importados' y el sistema armará las conexiones." />
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Gestiona contactos, zonas de logística e importaciones.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors border border-zinc-700">
            <UploadCloud className="w-5 h-5 text-orange-500"/> IMPORTAR CSV
          </button>
          <button onClick={() => setIsZoneModalOpen(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors">
            <Settings className="w-5 h-5"/> ZONAS
          </button>
          <button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            <Plus className="w-5 h-5"/> NUEVO
          </button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          <button onClick={() => {setSelectedType('cliente'); setSelectedZoneFilter('Todas');}} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${selectedType === 'cliente' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Clientes</button>
          <button onClick={() => {setSelectedType('proveedor'); setSelectedZoneFilter('Todas');}} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${selectedType === 'proveedor' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Proveedores</button>
        </div>
        <div className="flex gap-2 items-center overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest shrink-0">Filtrar Zona:</span>
          <button onClick={() => setSelectedZoneFilter('Todas')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${selectedZoneFilter === 'Todas' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-black text-zinc-400 border-zinc-800'}`}>Todas</button>
          {uniqueZones.map(zone => (
            <button key={zone} onClick={() => setSelectedZoneFilter(zone)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${selectedZoneFilter === zone ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-black text-zinc-400 border-zinc-800'}`}>{zone}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="p-4 text-xs font-black text-zinc-500 uppercase">Empresa / Razón Social</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase">Teléfono</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase">Localidad</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase">Zonas Asignadas</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredContacts.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">No hay registros en esta vista.</td></tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{contact.name}</div>
                      {contact.fantasyName && <div className="text-[10px] text-zinc-500 uppercase font-bold mt-0.5">{contact.fantasyName}</div>}
                    </td>
                    <td className="p-4 text-zinc-400 text-sm font-bold">{contact.phone || contact.whatsapp || '-'}</td>
                    <td className="p-4 text-zinc-400 text-sm">{contact.city || '-'}</td>
                    <td className="p-4">
                      {contact.zones && contact.zones.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.zones.map(z => (
                            <span key={z} className="flex items-center gap-1 text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded uppercase">
                              <Map className="w-2.5 h-2.5"/> {z}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 font-bold">Sin zona</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEventPrefill({ title: `Llamada a ${contact.name}`, type: 'llamada', contactId: contact.id })}
                          className="p-2 bg-orange-950/50 hover:bg-orange-600 text-orange-500 hover:text-white border border-orange-900/50 rounded-lg transition-colors"
                          title="Agendar Tarea/Llamada"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(contact)} className="p-2 bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(contact.id)} className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && <CreateContactModal onClose={() => setIsModalOpen(false)} contactToEdit={contactToEdit} />}
      {eventPrefill && <CreateEventModal onClose={() => setEventPrefill(null)} prefilledData={eventPrefill} />}
      {isZoneModalOpen && <ZoneManagerModal onClose={() => setIsZoneModalOpen(false)} />}
      {isImportModalOpen && <ImportContactsModal onClose={() => setIsImportModalOpen(false)} />}
    </div>
  );
}