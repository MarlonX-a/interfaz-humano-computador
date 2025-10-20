import { Settings, BookOpenText, PersonStanding, FlaskConical } from "lucide-react";

export default function Sidebar({ open }: {open: boolean}) {
  return (
    <aside
      className={`fixed top-[64px] left-0 h-[calc(100%-64px)] bg-blue-900 text-white w-64 transform ${
        open ? "translate-x-0" : "-translate-x-full"
      } transition-transform duration-300 ease-in-out z-40`}
    >
      <nav className="flex flex-col p-4 space-y-2 text-sm">
        <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
            <BookOpenText size={18} /> <span>Aprende</span>
        </a>
        <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
            <FlaskConical size={16} /> <span>Experimentos</span>
        </a>
        <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
            <PersonStanding size={16} /> <span>Accesibilidad</span>
        </a>
        <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
          <Settings size={18} /> <span>Configuración</span>
        </a>
      </nav>
    </aside>
  );
}