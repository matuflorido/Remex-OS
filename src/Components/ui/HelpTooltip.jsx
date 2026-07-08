import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function HelpTooltip({ text }) {
  return (
    <div className="relative flex items-center group cursor-help ml-2 z-[400]">
      <HelpCircle className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
      
      {/* Caja Flotante (oculta por defecto, visible al hacer hover) */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 hidden group-hover:block w-72 p-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-none">
        <p className="text-xs text-zinc-300 font-mono normal-case tracking-normal leading-relaxed text-center">
          {text}
        </p>
        {/* Flechita del globo */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900"></div>
      </div>
    </div>
  );
}