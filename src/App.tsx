// ...existing code...
import "./App.css";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import { useState } from "react";
import MainContent from "./components/MainContent";
import "./config/i18n";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./pages/login";
import Register from "./pages/register";
import AddContentPage from "./pages/addContent";
import { Toaster } from "react-hot-toast";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [textSizeLarge, setTextSizeLarge] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  return (
    <BrowserRouter>
      <div
        className={`flex flex-col min-h-screen transition-colors duration-300 ${
          highContrast ? "bg-black text-yellow-300" : "bg-gray-50 text-gray-900"
        }`}
      >
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          highContrast={highContrast}
        />

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
            <Routes>
              {/* MainContent solo en la raíz */}
              <Route path="/" element={<MainContent textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register highContrast={highContrast} />} />
              <Route path="/add-content" element={<AddContentPage textSizeLarge={textSizeLarge} highContrast={highContrast} />} />
              {/* redirigir rutas desconocidas a / */}
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
// ...existing code...