import { useState, type FC } from "react";
import {
  Settings,
  BookOpenText,
  PersonStanding,
  FlaskConical,
  ChevronRight,
  ChevronDown,
  Atom,
  FlaskRound,
  Eye,
  Volume2,
  Type,
  Contrast,
  Plus,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  open: boolean;
  textSizeLarge: boolean;
  setTextSizeLarge: (val: boolean) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  setSidebarOpen?: (val: boolean) => void; // opcional para overlay click
}

const Sidebar: FC<SidebarProps> = ({
  open,
  textSizeLarge,
  setTextSizeLarge,
  highContrast,
  setHighContrast,
  setSidebarOpen,
}) => {
  const { t } = useTranslation();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    aprende: false,
    accesibilidad: false,
  });
  const navigate = useNavigate();

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  return (
    <>
      {/* Overlay semi-transparente (móvil + opcional PC) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-[64px] left-0 w-64 transform transition-transform duration-300 ease-in-out z-40 
        ${open ? "translate-x-0" : "-translate-x-full"}
        ${highContrast ? "bg-black text-yellow-300" : "bg-blue-900 text-white"}
        h-[calc(100vh-64px)] overflow-y-auto shadow-lg`}
        aria-label={t("sidebarLabel")}
      >
        <nav className={`flex flex-col p-4 space-y-2 ${textSizeLarge ? "text-lg" : "text-sm"}`}>
          {/* Cerrar en móvil */}
          <div className="lg:hidden flex justify-end mb-4">
            <button onClick={() => setSidebarOpen && setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Aprende */}
          <button
            onClick={() => toggleMenu("aprende")}
            className="flex items-center justify-between w-full p-2 rounded hover:bg-blue-800 transition"
          >
            <div className="flex items-center space-x-2">
              <BookOpenText size={18} /> <span>{t("learn")}</span>
            </div>
            {openMenus.aprende ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {openMenus.aprende && (
            <div className="ml-6 mt-1 flex flex-col space-y-1">
              <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
                <Atom size={16} /> <span>{t("molecules")}</span>
              </a>
              <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
                <FlaskRound size={16} /> <span>{t("atoms")}</span>
              </a>
              <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
                <FlaskConical size={16} /> <span>{t("periodicTable")}</span>
              </a>
              <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
                <FlaskConical size={16} /> <span>{t("chemicalReactions")}</span>
              </a>
            </div>
          )}

          {/* Experimentos */}
          <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
            <FlaskConical size={16} /> <span>{t("experiments")}</span>
          </a>

          {/* Accesibilidad */}
          <button
            onClick={() => toggleMenu("accesibilidad")}
            className="flex items-center justify-between w-full p-2 rounded hover:bg-blue-800 transition"
          >
            <div className="flex items-center space-x-2">
              <PersonStanding size={16} /> <span>{t("accessibility")}</span>
            </div>
            {openMenus.accesibilidad ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {openMenus.accesibilidad && (
            <div className="ml-6 mt-1 flex flex-col space-y-1">
              <a
                href="#"
                className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
                onClick={() => alert(t("visualAlertsEnabled"))}
              >
                <Eye size={16} /> <span>{t("visualAlerts")}</span>
              </a>

              <a
                href="#"
                className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
                onClick={() => alert(t("voiceReadingEnabled"))}
              >
                <Volume2 size={16} /> <span>{t("voiceReading")}</span>
              </a>

              <button
                onClick={() => setTextSizeLarge(!textSizeLarge)}
                className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left"
              >
                <Type size={16} /> <span>{t("textSize")}</span>
              </button>

              <button
                onClick={() => setHighContrast(!highContrast)}
                className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left"
              >
                <Contrast size={16} /> <span>{t("highContrast")}</span>
              </button>
            </div>
          )}

          {/* Configuración */}
          <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition">
            <Settings size={18} /> <span>{t("settings")}</span>
          </a>

          {/* Añadir contenido */}
          <button
            onClick={() => navigate("/add-content")}
            className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left"
          >
            <Plus size={16} /> <span>{t("addContent")}</span>
          </button>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
