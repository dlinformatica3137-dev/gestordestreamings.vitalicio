import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface FloatingWhatsAppSupportProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const FloatingWhatsAppSupport: React.FC<FloatingWhatsAppSupportProps> = ({
  phoneNumber = '5585996079396',
  defaultMessage = 'Olá! Preciso de suporte no Gestor de Streamings.',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-4 right-4 z-40 p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer"
        title="Abrir Suporte WhatsApp"
        aria-label="Abrir Suporte WhatsApp"
      >
        <img
          src="/whatsapp.png"
          alt="WhatsApp Suporte"
          className="w-7 h-7 object-contain drop-shadow"
          onError={(e) => {
            // Fallback to SVG icon if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-40 flex items-center group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip on Desktop hover */}
      <div
        className={`hidden sm:flex absolute right-0 bottom-full mb-2.5 items-center gap-2 bg-slate-900/95 text-white text-xs py-1.5 px-3 rounded-xl shadow-xl border border-slate-700/80 transition-all duration-200 pointer-events-none whitespace-nowrap ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Atendimento via WhatsApp • <strong>(85) 99607-9396</strong></span>
      </div>

      {/* Main Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Suporte WhatsApp (85) 99607-9396"
        className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-sm sm:text-base py-2.5 px-4 rounded-full shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-300/40 cursor-pointer backdrop-blur-xs"
      >
        {/* WhatsApp PNG Logo */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center">
          <img
            src="/whatsapp.png"
            alt="Suporte WhatsApp"
            className="w-full h-full object-contain filter drop-shadow-md hover:rotate-6 transition-transform"
            onError={(e) => {
              // In case the image doesn't load, hide img and let icon show
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {/* Online green pulse ring */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-200 border-2 border-emerald-600"></span>
          </span>
        </div>

        {/* Text Label */}
        <div className="flex flex-col text-left leading-tight pr-1">
          <span className="font-extrabold tracking-wide text-white drop-shadow-xs">
            Suporte
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-emerald-100/90 tracking-tight">
            WhatsApp Online
          </span>
        </div>
      </a>
    </div>
  );
};
