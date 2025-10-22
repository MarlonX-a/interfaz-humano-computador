
type FooterProps = {
  highContrast?: boolean;
};

export default function Footer({ highContrast = false }: FooterProps) {
  const bg = highContrast ? "bg-black" : "bg-blue-900";
  const sectionBg = highContrast ? "bg-black" : "bg-blue-950";
  const text = highContrast ? "text-yellow-300" : "text-white";
  const border = highContrast ? "border-yellow-700" : "border-blue-700";

  return (
    <footer className={`${bg} ${text} mt-10`}>
      <div className={`max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8`}>
        <div>
          <h3 className={`text-lg font-semibold mb-3 border-b ${border} pb-1`}>
            Información institucional
          </h3>
          <ul className="space-y-1 text-sm">
            <li><strong>Dirección:</strong> Av. Circunvalación, Manta</li>
            <li><strong>Rector:</strong> Dr. Marcos Zambrano, PhD</li>
            <li><strong>Fundación:</strong> 13 de noviembre de 1985</li>
            <li><strong>Campus:</strong> Manta, 30 ha</li>
            <li><strong>Tipo:</strong> Pública</li>
            <li><strong>Teléfono:</strong> (05) 262-0288</li>
          </ul>
        </div>

        <div>
          <h3 className={`text-lg font-semibold mb-3 border-b ${border} pb-1`}>
            Soporte / Contacto
          </h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:underline">Centro de ayuda</a></li>
            <li><a href="#" className="hover:underline">soporte@uleam.edu.ec</a></li>
            <li><a href="#" className="hover:underline">Llámanos: 0984563204</a></li>
          </ul>
        </div>

        <div>
          <h3 className={`text-lg font-semibold mb-3 border-b ${border} pb-1`}>
            Política y Términos de Uso
          </h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:underline">Política de privacidad</a></li>
            <li><a href="#" className="hover:underline">Términos de uso</a></li>
            <li><a href="#" className="hover:underline">Accesibilidad</a></li>
          </ul>
        </div>
      </div>

      <div className={`${sectionBg} text-center py-3 text-xs border-t ${highContrast ? "border-yellow-700" : "border-blue-800"}`}>
        © {new Date().getFullYear()} Universidad Laica Eloy Alfaro de Manabí – Todos los derechos reservados
      </div>
    </footer>
  );
}
