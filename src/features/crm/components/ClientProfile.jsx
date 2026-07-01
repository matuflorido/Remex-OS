import React, { useState, useRef } from 'react';
import { X, Building2, Phone, Mail, DollarSign, History, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { addEntityLogInDb, updateEntityCreditLimit } from '../services/crmService';

export default function ClientProfile({ entity, onClose }) {
  const { user } = useAuthStore();
  const [newLog, setNewLog] = useState("");
  const [isEditingCredit, setIsEditingCredit] = useState(false);
  const [tempCredit, setTempCredit] = useState(entity.creditLimit || 0);
  
  // Referencia para hacer foco automático en la caja de texto
  const textareaRef = useRef(null);

  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    const logEntry = {
      date: new Date().toISOString().split('T')[0],
      user: user.name,
      role: user.role,
      comment: newLog
    };
    await addEntityLogInDb(entity.id, logEntry);
    setNewLog("");
  };

  const handleUpdateCredit = async () => {
    await updateEntityCreditLimit(entity.id, Number(tempCredit));
    setIsEditingCredit(false);
  };

  const handleContactAttempt = async (method, value) => {
    // 1. Registro Automático del sistema
    const autoLog = {
      date: new Date().toISOString().split('T')[0],
      user: user.name,
      role: user.role,
      comment: `⚡ Sistema: Inició contacto vía ${method === 'whatsapp' ? 'WhatsApp' : 'Email'} al destino: ${value}.`
    };
    await addEntityLogInDb(entity.id, autoLog);

    // 2. Pre-llenar la caja de comentarios y hacerle focus para pedir resumen
    setNewLog(`📝 [Resumen de contacto por ${method === 'whatsapp' ? 'WhatsApp' : 'Email'}] - `);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    // 3. Abrir la aplicación externa en una nueva pestaña
    if (method === 'whatsapp') {
      // Limpiamos el número para que WhatsApp lo entienda (solo números)
      const cleanPhone = value.replace(/\D/g, ''); 
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else {
      window.open(`mailto:${value}`, '_blank');
    }
  };

  const isClient = entity.type === 'cliente';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${isClient ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                {entity.type}
              </span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">ID: {entity.id.slice(0, 8)}</span>
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Building2 className={`w-6 h-6 ${isClient ? 'text-blue-500' : 'text-amber-500'}`}/> 
              {entity.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl text-zinc-400 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {}
            <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Contacto Rápido</h3>
                <div className="space-y-3">
                  
                  {/* BOTÓN WHATSAPP */}
                  {entity.phone ? (
                    <button 
                      onClick={() => handleContactAttempt('whatsapp', entity.phone)}
                      className="w-full flex items-center justify-between p-3 bg-zinc-950 hover:bg-emerald-950/40 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-colors"><Phone className="w-4 h-4"/></div>
                        <div className="text-left">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase">WhatsApp / Tel</p>
                          <p className="text-sm text-white font-medium">{entity.phone}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </button>
                  ) : (
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center"><span className="text-zinc-600 text-xs italic">No hay teléfono</span></div>
                  )}

                  {/* BOTÓN EMAIL */}
                  {entity.email ? (
                    <button 
                      onClick={() => handleContactAttempt('email', entity.email)}
                      className="w-full flex items-center justify-between p-3 bg-zinc-950 hover:bg-blue-950/40 border border-zinc-800 hover:border-blue-500/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-colors"><Mail className="w-4 h-4"/></div>
                        <div className="text-left">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase">Enviar Correo</p>
                          <p className="text-sm text-white font-medium truncate max-w-[120px]">{entity.email}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </button>
                  ) : (
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center"><span className="text-zinc-600 text-xs italic">No hay email</span></div>
                  )}

                </div>
              </div>

              {}
              {isClient && (
                <div className="bg-emerald-950/20 border border-emerald-900/50 p-5 rounded-2xl">
                  <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4"/> Límite de Crédito
                  </h3>
                  
                  {isEditingCredit ? (
                    <div className="mt-3 flex gap-2">
                      <input 
                        type="number" 
                        value={tempCredit} 
                        onChange={(e) => setTempCredit(e.target.value)}
                        className="w-full bg-black border border-emerald-900 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold outline-none"
                      />
                      <button onClick={handleUpdateCredit} className="bg-emerald-600 hover:bg-emerald-500 text-black px-3 rounded-xl font-bold text-xs">OK</button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-2xl font-black text-emerald-400">${entity.creditLimit?.toLocaleString('es-AR') || '0'}</p>
                      {(user?.role === 'Administración' || user?.role === 'Super_Usuario') && (
                        <button onClick={() => setIsEditingCredit(true)} className="text-xs text-emerald-500 hover:text-emerald-400 underline font-bold">Editar</button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {}
            <div className="lg:col-span-2 flex flex-col">
              <h3 className="text-lg font-black text-white mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500"/> Bitácora de Interacciones
              </h3>
              
              <div className="flex-1 space-y-4 mb-6">
                {(!entity.history || entity.history.length === 0) && (
                   <div className="text-center p-8 border-2 border-dashed border-zinc-800 rounded-2xl">
                     <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2"/>
                     <p className="text-zinc-500 text-sm font-bold">No hay registros de contacto aún.</p>
                   </div>
                )}
                {entity.history && entity.history.map((h, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${h.comment.startsWith('⚡ Sistema') ? 'bg-zinc-950 border-zinc-800 opacity-80' : 'bg-zinc-900 border-zinc-700'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-blue-400">{h.user}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">{h.role}</span>
                      </div>
                      <span className="text-xs text-zinc-500 font-medium">{h.date}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${h.comment.startsWith('⚡ Sistema') ? 'text-zinc-500' : 'text-zinc-300'}`}>{h.comment}</p>
                  </div>
                ))}
              </div>

              {/* Input para nuevo log */}
              <div className="relative mt-auto">
                <textarea 
                  ref={textareaRef}
                  value={newLog} 
                  onChange={(e) => setNewLog(e.target.value)} 
                  placeholder="Registrar una llamada, promesa de pago, o acuerdo..." 
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 pr-12 text-sm text-white focus:border-blue-500 outline-none resize-none h-24 custom-scrollbar transition-colors"
                ></textarea>
                <button 
                  onClick={handleAddLog} 
                  disabled={!newLog.trim()}
                  className="absolute bottom-3 right-3 bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 p-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4"/>
                </button>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}