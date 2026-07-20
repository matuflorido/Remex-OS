import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, Lock, User, AlertTriangle, Layers, Mail } from 'lucide-react';
import { registerUser, updateUserData, subscribeToAreas, forceUserPasswordChange } from '../services/adminService';

export default function CreateUserModal({ onClose, userToEdit = null }) {
  const isEditing = !!userToEdit;
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [dbAreas, setDbAreas] = useState([]);
  const [tempArea, setTempArea] = useState('');
  const [tempSubArea, setTempSubArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = subscribeToAreas(setDbAreas);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        password: '', // Lo dejamos en blanco para que solo lo cambie si escribe algo
      });
      const userRoles = userToEdit.roles || (userToEdit.role ? [userToEdit.role] : []);
      setSelectedRoles(userRoles);
    }
  }, [userToEdit]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddRole = () => {
    if (!tempArea) return;
    const roleString = tempSubArea ? `${tempArea} > ${tempSubArea}` : tempArea;
    if (!selectedRoles.includes(roleString)) setSelectedRoles([...selectedRoles, roleString]);
    setTempSubArea('');
  };

  const handleRemoveRole = (role) => setSelectedRoles(selectedRoles.filter(r => r !== role));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (selectedRoles.length === 0) {
      setError('Debes asignar al menos un área o rol al empleado para que pueda recibir tareas.');
      return;
    }
    setIsLoading(true);
    try {
      if (isEditing) {
        // 1. Actualizamos datos de Firestore
        await updateUserData(userToEdit.id, {
          name: formData.name, email: formData.email, roles: selectedRoles, role: selectedRoles[0]
        });
        
        // 2. Si el administrador escribió una nueva clave, llamamos a la Cloud Function
        if (formData.password.trim() !== '') {
          await forceUserPasswordChange(userToEdit.id, formData.password);
        }
      } else {
        // 3. Crear un usuario nuevo
        await registerUser(formData.email, formData.password, {
          name: formData.name, roles: selectedRoles, role: selectedRoles[0], isActive: true
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeAreaObj = dbAreas.find(a => a.name === tempArea);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-orange-500" />
              {isEditing ? 'Editar Perfil de Empleado' : 'Alta de Nuevo Empleado'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          {error && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-900 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0"/> {error}
            </div>
          )}

          <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">1. Identidad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Ej. Ana Pérez" className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Correo Electrónico (Único)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={isEditing} placeholder="ana@empresa.com" className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors disabled:opacity-50" />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">
                    {isEditing ? 'Forzar Nueva Contraseña (Dejar vacío si no se cambia)' : 'Contraseña Temporal'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input type="text" name="password" required={!isEditing} value={formData.password} onChange={handleChange} placeholder={isEditing ? 'Solo llenar para forzar un cambio de clave' : 'Mínimo 6 caracteres'} className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors" />
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">
                2. Asignación a Áreas Operativas
              </h3>
              
              <div className="bg-black/50 border border-zinc-800 rounded-xl p-5 mb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Área Principal</label>
                    <select value={tempArea} onChange={(e) => { setTempArea(e.target.value); setTempSubArea(''); }} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none">
                      <option value="">Seleccionar área...</option>
                      <option value="Super_Usuario" className="text-orange-500 font-bold">Super Administrador (Todo el sistema)</option>
                      {dbAreas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                  
                  {activeAreaObj?.subareas?.length > 0 && (
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Sub-área (Opcional)</label>
                      <select value={tempSubArea} onChange={(e) => setTempSubArea(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none">
                        <option value="">Cualquiera...</option>
                        {activeAreaObj.subareas.map((sa, i) => <option key={i} value={sa}>{sa}</option>)}
                      </select>
                    </div>
                  )}

                  <button type="button" onClick={handleAddRole} disabled={!tempArea} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
                    Asignar
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedRoles.length === 0 && <span className="text-sm text-zinc-600 italic">No hay áreas asignadas.</span>}
                {selectedRoles.map(role => (
                  <div key={role} className="bg-orange-900/20 border border-orange-500/50 text-orange-400 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold">
                    <Layers className="w-3 h-3"/> {role}
                    <button type="button" onClick={() => handleRemoveRole(role)} className="hover:text-white"><X className="w-3 h-3"/></button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">CANCELAR</button>
          <button form="userForm" type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            {isLoading ? 'GUARDANDO...' : (isEditing ? 'GUARDAR CAMBIOS' : 'CREAR EMPLEADO')}
          </button>
        </div>
      </div>
    </div>
  );
}