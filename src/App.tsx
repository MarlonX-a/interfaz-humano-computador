import "./App.css";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import { useEffect, useState } from "react";
import MainContent from "./components/MainContent";
import "./config/i18n";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";
import AddContentPage from "./pages/addContent";
import { Toaster } from "react-hot-toast";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [textSizeLarge, setTextSizeLarge] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setHighContrast((prev) => !prev);
      }
      if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setTextSizeLarge(true);
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        setTextSizeLarge(false);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        window.location.reload();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <div className={`flex flex-col min-h-screen transition-colors duration-300 ${
          highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"
        }`}
      >
        {/* Navbar fijo */}
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} highContrast={highContrast} />

        <div className="flex flex-1 relative">
          {/* Sidebar */}
          <Sidebar
            open={sidebarOpen}
            textSizeLarge={textSizeLarge}
            setTextSizeLarge={setTextSizeLarge}
            highContrast={highContrast}
            setHighContrast={setHighContrast}
          />

          {/* Contenido principal con padding superior = altura Navbar */}
          <main className={`flex-1 p-6 pt-[64px] transition-all duration-300 ${
              sidebarOpen ? "lg:ml-64" : "ml-0"
            } ${highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"}`}
          >
            <Routes>
              <Route path="/" element={<MainContent textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/login" element={<Login textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/register" element={<Register textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/add-content" element={<AddContentPage textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </main>
        </div>

        <Footer highContrast={highContrast} />
      </div>
    </BrowserRouter>
  );
}

export default App;
