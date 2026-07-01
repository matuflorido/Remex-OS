import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, Check, Mail, Lock, User, AlertTriangle } from 'lucide-react';
// Asumimos que tienes una función en adminService que actualiza el documento del usuario (sin afectar el Auth de Firebase directo para contraseñas en edición)
import { registerUser, updateUserData } from '../services/adminService'; 

export default function CreateUserModal({ onClose, userToEdit = null }) {
  const isEditing = !!userToEdit;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [selectedRoles, setSelectedRoles] = useState([]);
  
  // Lista inicial de áreas sugeridas. (Podría venir de Firestore en un futuro)
  const [availableAreas, setAvailableAreas] = useState([
    'Super_Usuario', 'Ventas', 'Operaciones', 'Administración', 'Marketing'
  ]);
  
  const [newAreaInput, setNewAreaInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Efecto para cargar los datos si estamos editando
  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        password: '', // No cargamos la contraseña, solo si quiere cambiarla
      });
      
      const userRoles = userToEdit.roles || (userToEdit.role ? [userToEdit.role] : []);
      setSelectedRoles(userRoles);

      // Si el usuario tiene roles que no están en la lista default, los agregamos
      const newAreasToAdd = userRoles.filter(r => !availableAreas.includes(r));
      if (newAreasToAdd.length > 0) {
        setAvailableAreas(prev => [...prev, ...newAreasToAdd]);
      }
    }
  }, [userToEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleToggle = (area) => {
    if (selectedRoles.includes(area)) {
      setSelectedRoles(selectedRoles.filter(r => r !== area));
    } else {
      setSelectedRoles([...selectedRoles, area]);
    }
  };

  const handleAddNewArea = (e) => {
    e.preventDefault(); // Previene envío de formulario
    const area = newAreaInput.trim();
    if (area && !availableAreas.includes(area)) {
      setAvailableAreas([...availableAreas, area]);
      setSelectedRoles([...selectedRoles, area]); // La auto-selecciona
      setNewAreaInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (selectedRoles.length === 0) {
      setError('Debes asignar al menos un área o rol al usuario.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        // En edición, pasamos los datos. Si password está vacío, el servicio no debería actualizarlo.
        await updateUserData(userToEdit.id, {
          name: formData.name,
          email: formData.email,
          roles: selectedRoles, // Array de roles
          // rol heredado por retrocompatibilidad
          role: selectedRoles[0] || 'Ventas', 
        }, formData.password);
      } else {
        // Creación
        await registerUser(formData.email, formData.password, {
          name: formData.name,
          roles: selectedRoles, // Array de roles
          role: selectedRoles[0] || 'Ventas',
          isActive: true
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-orange-500" />
              {isEditing ? 'Editar Perfil de Usuario' : 'Alta de Nuevo Usuario'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {isEditing ? 'Modifica los accesos y áreas operativas.' : 'Registra un colaborador y asigna sus credenciales.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* FORM BODY */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          
          {error && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-900 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0"/> {error}
            </div>
          )}

          <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* DATOS PERSONALES */}
            <div>
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">1. Credenciales de Acceso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input 
                      type="text" name="name" required value={formData.name} onChange={handleChange}
                      placeholder="Ej. Ana Pérez"
                      className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Correo Electrónico (Único)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input 
                      type="email" name="email" required value={formData.email} onChange={handleChange}
                      disabled={isEditing} // El correo principal suele no editarse fácilmente en Firebase
                      placeholder="ana@empresa.com"
                      className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">
                    {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Temporal'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input 
                      type="password" name="password" 
                      required={!isEditing} value={formData.password} onChange={handleChange}
                      placeholder={isEditing ? 'Dejar en blanco para no cambiarla' : 'Mínimo 6 caracteres'}
                      className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SELECCIÓN MULTI-ÁREA */}
            <div className="pt-2">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">
                2. Asignación de Áreas Operativas
              </h3>
              <p className="text-xs text-zinc-400 mb-4">Selecciona todas las áreas a las que pertenece este usuario. Podrá ver tareas y firmar en nombre de cualquiera de las áreas seleccionadas.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {availableAreas.map(area => {
                  const isSelected = selectedRoles.includes(area);
                  return (
                    <div 
                      key={area}
                      onClick={() => handleRoleToggle(area)}
                      className={`cursor-pointer border p-3 rounded-xl flex items-center justify-between transition-all ${isSelected ? 'bg-orange-900/20 border-orange-500/50' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
                    >
                      <span className={`text-sm font-bold ${isSelected ? 'text-orange-400' : 'text-zinc-300'}`}>{area}</span>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-zinc-600'}`}>
                        {isSelected && <Check className="w-3 h-3 text-black font-black"/>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CREADOR DINÁMICO DE SUB-ÁREAS */}
              <div className="bg-black/50 border border-zinc-800 border-dashed rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 ml-1">¿Falta un área? Créala (Ej: Marketing)</label>
                  <input 
                    type="text" 
                    value={newAreaInput} 
                    onChange={(e) => setNewAreaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewArea(e)}
                    placeholder="Escribir nueva área o subárea..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleAddNewArea}
                  disabled={!newAreaInput.trim()}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 h-[38px] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4"/> Agregar
                </button>
              </div>

            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            CANCELAR
          </button>
          <button 
            form="userForm" 
            type="submit" 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          >
            {isLoading ? 'GUARDANDO...' : (isEditing ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO')}
          </button>
        </div>

      </div>
    </div>
  );
}