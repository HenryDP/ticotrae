export default function Logo({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Fondo Canasta - Bandera CR */}
      <polygon points="19.5,22 55.5,22 54.2,26 20.2,26" fill="#002B7F" />
      <polygon points="20.2,26 54.2,26 53.2,30 20.8,30" fill="#FFFFFF" />
      <polygon points="20.8,30 53.2,30 51.5,38 21.8,38" fill="#CE1126" />
      <polygon points="21.8,38 51.5,38 50.5,42 22.5,42" fill="#FFFFFF" />
      <polygon points="22.5,42 50.5,42 50,44 23,44" fill="#002B7F" />

      {/* Estructura del carrito */}
      <path d="M 6 12 L 14 12 L 23 44 L 50 44 L 56 20 L 19 20" stroke="#1f2937" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      
      {/* Rejilla Vertical */}
      <path d="M 28 20 L 30 44" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 37 20 L 38 44" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 46 20 L 45 44" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Rejilla Horizontal */}
      <path d="M 21 28 L 53 28" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 22 36 L 51 36" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>

      {/* Ruedas */}
      <circle cx="26" cy="52" r="4" fill="#1f2937" />
      <circle cx="46" cy="52" r="4" fill="#1f2937" />
      <circle cx="26" cy="52" r="1.5" fill="#f3f4f6" />
      <circle cx="46" cy="52" r="1.5" fill="#f3f4f6" />
      
      {/* Detalle agarradera */}
      <path d="M 6 12 L 10 12" stroke="#CE1126" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
