import "./App.css";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import { useEffect, useState } from "react";
import MainContent from "./components/MainContent";
import "./config/i18n";
import { initAuthListener } from './lib/auth';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";
import AddContentPage from "./pages/addContent";
import HistoryPanel from "./components/HistoryPanel";
import { Toaster } from "react-hot-toast";
import ResetPassword from "./pages/resetPassword";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
    } catch (e) {
      return true;
    }
  });
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

  // Global unhandledrejection listener to capture unexpected promise rejections for debugging
  useEffect(() => {
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      console.error('[UNHANDLED PROMISE REJECTION]', ev.reason);
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  useEffect(() => {
    // Initialize a global auth listener so sign-out and auth events are available app-wide
    const sub = initAuthListener((event) => {
      console.debug('[App] Auth event', event);
    });
    // The supabase client returns an object with subscription and unsubscribe methods in older SDKs.
    return () => {
      try {
        // attempt to unsubscribe if available
        sub?.data?.subscription?.unsubscribe?.();
      } catch (err) {
        // ignore
      }
    };
  }, []);

    // En src/main.tsx o en App.tsx, dentro del top-level:
  useEffect(() => {
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      console.error("[UNHANDLED PROMISE REJECTION]", ev.reason);
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  return (
    <BrowserRouter>
        <div className={`flex flex-col min-h-screen transition-colors duration-300 ${highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"}`}>
        {/* Navbar fijo */}
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} highContrast={highContrast} />

        <div className="flex flex-1 relative">
          {/* Sidebar */}
          <Sidebar
            open={sidebarOpen}
            textSizeLarge={textSizeLarge}
            setTextSizeLarge={setTextSizeLarge}
            highContrast={highContrast}
            setHighContrast={setHighContrast}
            setSidebarOpen={setSidebarOpen}
          />

          {/* Contenido principal con padding superior = altura Navbar */}
          <main className={`flex-1 p-6 pt-[64px] transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-0"} ${highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"}`}>
            <Routes>
              <Route path="/" element={<MainContent textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/login" element={<Login textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/register" element={<Register textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/add-content" element={<AddContentPage textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/reset-password" element={<ResetPassword textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/history" element={<HistoryPanel />} />
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
