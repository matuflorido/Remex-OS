import React, { useState } from 'react';
import { X, Building2, Phone, Mail, DollarSign, Briefcase } from 'lucide-react';
import { createEntityInDb } from '../services/crmService';

export default function CreateEntityModal({ onClose }) {
  const [type, setType] = useState('cliente');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newEntity = {
        type,
        name,
        phone,
        email,
        creditLimit: type === 'cliente' ? Number(creditLimit) || 0 : 0,
        status: 'activo',
        history: [] // Para futuras bitácoras de llamadas
      };

      await createEntityInDb(newEntity);
      onClose();
    } catch (err) {
      console.error("Error al crear entidad:", err);
      setError("Hubo un problema al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500"/> Alta de Entidad
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl text-zinc-400 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* FORMULARIO */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-950/50 border border-red-900 text-red-400 text-sm p-3 rounded-xl font-bold">
              {error}
            </div>
          )}

          <div className="flex gap-4 mb-2">
            <button
              type="button"
              onClick={() => setType('cliente')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${type === 'cliente' ? 'bg-blue-900/20 text-blue-400 border-blue-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
            >
              CLIENTE
            </button>
            <button
              type="button"
              onClick={() => setType('proveedor')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${type === 'proveedor' ? 'bg-amber-900/20 text-amber-400 border-amber-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
            >
              PROVEEDOR
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
              Razón Social / Nombre <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Lubricentro El Sol SRL"
                className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Teléfono</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 294 4123456"
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {type === 'cliente' && (
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                Límite de Crédito Otorgado ($)
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input 
                  type="number" 
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="Ej: 500000"
                  className="w-full bg-black border border-emerald-900/50 rounded-xl pl-12 pr-4 py-3.5 text-sm text-emerald-400 font-bold focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">Deja en 0 si las ventas son estrictamente al contado.</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-5 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'CREAR ENTIDAD'}
          </button>
        </div>

      </div>
    </div>
  );
}