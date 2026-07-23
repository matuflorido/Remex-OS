import React, { useState } from 'react';
import { UserCircle, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

export default function LoginForm() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      console.error("Error de login:", err);
      // Firebase devuelve mensajes en inglés, los filtramos para el usuario final:
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('El correo o la contraseña son incorrectos.');
      } else {
        setError('Ocurrió un error al intentar ingresar. Revisa tu conexión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 font-mono">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Destello Naranja de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none"></div>
        
        <h1 className="text-3xl font-black text-white text-center mb-2 relative z-10 tracking-tight">
          REMEX<span className="text-orange-500">.</span>
        </h1>
        <p className="text-center text-zinc-500 mb-8 text-sm font-bold uppercase tracking-widest relative z-10">
          Work-OS Enterprise
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-900 rounded-xl flex items-start gap-3 relative z-10">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
              Correo Electrónico
            </label>
            <div className="relative">
              <UserCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@remex.com.ar"
                className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-4 rounded-xl text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-transform hover:-translate-y-0.5 flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isLoading ? 'VERIFICANDO...' : <>INGRESAR AL SISTEMA <ArrowRight className="w-4 h-4"/></>}
          </button>
        </form>
      </div>
    </div>
  );
}