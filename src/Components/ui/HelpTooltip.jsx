import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function HelpTooltip({ text }) {
  return (
    <div className="relative flex items-center group cursor-help ml-2 z-40">
      <HelpCircle className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
      
      {/* Caja Flotante (oculta por defecto, visible al hacer hover, hacia abajo) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 hidden group-hover:block w-72 p-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] pointer-events-none z-50">
        
        {/* Flechita del globo (apuntando hacia arriba) */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-zinc-700"></div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-b-zinc-900 mb-[-1px]"></div>
        
        <p className="text-xs text-zinc-300 font-mono normal-case tracking-normal leading-relaxed text-center">
          {text}
        </p>
      </div>
    </div>
  );
}