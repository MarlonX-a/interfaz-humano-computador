import { useState } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Sidebar({
  open,
  textSizeLarge,
  setTextSizeLarge,
  highContrast,
  setHighContrast,
}: {
  open: boolean;
  textSizeLarge: boolean;
  setTextSizeLarge: (val: boolean) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
}) {
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
    <aside
      className={`sticky top-[64px] left-0 h-auto max-h-[calc(100vh-64px)] w-64 transform ${
        open ? "translate-x-0" : "-translate-x-full"
      } transition-transform duration-300 ease-in-out z-40 overflow-y-auto ${
        highContrast ? "bg-black text-yellow-300" : "bg-blue-900 text-white"
      }`}
      aria-label={t("sidebarLabel")}
    >
      <nav className={`flex flex-col p-4 space-y-2 ${textSizeLarge ? "text-lg" : "text-sm"}`}>
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
            <a
              href="#"
              className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
            >
              <Atom size={16} /> <span>{t("molecules")}</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
            >
              <FlaskRound size={16} /> <span>{t("atoms")}</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
            >
              <FlaskConical size={16} /> <span>{t("periodicTable")}</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
            >
              <FlaskConical size={16} /> <span>{t("chemicalReactions")}</span>
            </a>
          </div>
        )}

        {/* Experimentos */}
        <a
          href="#"
          className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
        >
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
        <a
          href="#"
          className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition"
        >
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
  );
}
