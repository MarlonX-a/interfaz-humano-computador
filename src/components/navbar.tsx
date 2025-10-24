import { Menu, Atom } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ toggleSidebar, highContrast }: { toggleSidebar: () => void; highContrast: boolean }) {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState("es");
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = language === "es" ? "en" : "es";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  return (
    <header className={`fixed top-0 left-0 w-full border-b shadow-sm z-50 transition-colors duration-300 ${
        highContrast ? "bg-black border-yellow-300 text-yellow-300" : "bg-white border-gray-200 text-blue-700"
      }`}
    >
      <nav className="flex flex-wrap items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-md transition ${highContrast ? "text-yellow-300 hover:bg-yellow-900" : "text-blue-700 hover:bg-gray-100"}`}
          >
            <Menu size={22} />
          </button>
          <a href="#" className="flex items-center space-x-1"><Atom size={22} /></a>
          <span
            className={`text-lg sm:text-xl font-semibold transition cursor-pointer ${highContrast ? "text-yellow-300" : "text-blue-700"}`}
            onClick={() => navigate('/')}
          >
            Química Uleam
          </span>
        </div>

        <div className="w-full mt-2 sm:mt-0 sm:w-auto sm:flex-1 sm:flex sm:justify-center">
          <input
            type="text"
            placeholder={language === "es" ? "Buscar..." : "Search..."}
            className={`w-full sm:max-w-md px-4 py-2 text-sm border rounded-full focus:outline-none focus:ring-2 transition ${
              highContrast
                ? "bg-black border-yellow-300 text-yellow-300 focus:ring-yellow-400 placeholder-yellow-500"
                : "bg-white border-gray-300 text-gray-900 focus:ring-blue-400 placeholder-gray-400"
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <button onClick={toggleLanguage} className={`flex items-center space-x-1 px-3 py-1 border rounded-md transition ${
            highContrast ? "border-yellow-300 text-yellow-300 hover:bg-yellow-900" : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}>
            🌐 <span className="text-sm font-medium">{language.toUpperCase()}</span>
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
              highContrast ? "bg-yellow-300 text-black hover:bg-yellow-400" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            onClick={() => navigate('/login')}
          >
            Iniciar Sesion
          </button>
        </div>
      </nav>
    </header>
  );
}
