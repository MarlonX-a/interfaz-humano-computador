import "./App.css";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import { useState } from "react";
import MainContent from "./components/MainContent";
import "./config/i18n";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [textSizeLarge, setTextSizeLarge] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  return (
    <div
      className={`flex flex-col min-h-screen transition-colors duration-300 ${
        highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Navbar fijo arriba */}
      <Navbar
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        highContrast={highContrast}
      />

      {/* Contenedor principal */}
      <div className="flex flex-1 relative">
        <Sidebar
          open={sidebarOpen}
          textSizeLarge={textSizeLarge}
          setTextSizeLarge={setTextSizeLarge}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
        />

        <main
          className={`flex-1 p-6 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "ml-0"
          } ${highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"}`}
        >
          <MainContent textSizeLarge={textSizeLarge} highContrast={highContrast} />
        </main>
      </div>

      <Footer highContrast={highContrast} />
    </div>
  );
}

export default App;

