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
import VisualAlert from './components/VisualAlert';
import { Toaster } from "react-hot-toast";
import ResetPassword from "./pages/resetPassword";
import Molecules from "./pages/molecules";
import Atoms from "./pages/atoms";
import PeriodicTable from "./pages/periodicTable";
import ChemicalReactions from "./pages/chemicalReactions";
import Experiments from "./pages/experiments";
import SettingsPage from "./pages/settings";
import Articles from "./pages/articles";
import ContentsPage from "./pages/contents";
import TeacherDashboard from "./pages/teacher/dashboard";
import TeacherLessons from "./pages/teacher/lessons";
import TeacherContents from "./pages/teacher/contents";
import TeacherPruebas from "./pages/teacher/pruebas";
import TeacherQuestions from "./pages/teacher/questions";
import TeacherPerformance from "./pages/teacher/performance";
import ContenidoPage from "./pages/contenido";
import LessonsPage from "./pages/lessons";
import LessonDetailPage from "./pages/lesson-detail";
import PruebaPage from './pages/prueba';
import AdminUsers from "./pages/admin/users";
import AdminDashboard from "./pages/admin/dashboard";
import StudentDashboard from './pages/student/dashboard';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
    } catch (e) {
      return true;
    }
  });
  const [textSizeLarge, setTextSizeLarge] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('textSizeLarge') || 'false'); } catch (e) { return false; }
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('highContrast') || 'false'); } catch (e) { return false; }
  });
  const [visualAlertsEnabled, setVisualAlertsEnabled] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('visualAlertsEnabled') || 'false'); } catch (e) { return false; }
  });
  const [voiceReadingEnabled, setVoiceReadingEnabled] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('voiceReadingEnabled') || 'false'); } catch (e) { return false; }
  });
  const [alert, setAlert] = useState<{ message: string; highlightSelector?: string } | null>(null);

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

  // Centralized speech function. Uses window.speechSynthesis when available.
  useEffect(() => {
    (window as any).speak = (text: string) => {
      if (!voiceReadingEnabled) return;
      try {
        const utter = new SpeechSynthesisUtterance(typeof text === 'string' ? text : String(text));
        // Use default voice, but respect user system voice selection.
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.debug('[App] speech error', e);
      }
    };
  }, [voiceReadingEnabled]);

  // Global visual alert trigger
  useEffect(() => {
    (window as any).triggerVisualAlert = (input: any) => {
      if (!visualAlertsEnabled) return;
      try {
        if (!input) return;
        const payload = typeof input === 'string' ? { message: input } : input;
        setAlert(payload);
      } catch (err) {}
    };
  }, [visualAlertsEnabled]);

  // Persist toggles when changed
  useEffect(() => {
    try { localStorage.setItem('visualAlertsEnabled', JSON.stringify(visualAlertsEnabled)); } catch (e) {}
  }, [visualAlertsEnabled]);

  useEffect(() => {
    try { localStorage.setItem('voiceReadingEnabled', JSON.stringify(voiceReadingEnabled)); } catch (e) {}
  }, [voiceReadingEnabled]);

  useEffect(() => { try { localStorage.setItem('textSizeLarge', JSON.stringify(textSizeLarge)); } catch (e) {} }, [textSizeLarge]);
  useEffect(() => { try { localStorage.setItem('highContrast', JSON.stringify(highContrast)); } catch (e) {} }, [highContrast]);

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
            visualAlertsEnabled={visualAlertsEnabled}
            voiceReadingEnabled={voiceReadingEnabled}
            setVisualAlertsEnabled={setVisualAlertsEnabled}
            setVoiceReadingEnabled={setVoiceReadingEnabled}
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
              <Route path="/molecules" element={<Molecules />} />
              <Route path="/atoms" element={<Atoms />} />
              <Route path="/periodic-table" element={<PeriodicTable />} />
              <Route path="/chemical-reactions" element={<ChemicalReactions />} />
              <Route path="/experiments" element={<Experiments />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/contents" element={<ContentsPage />} />
              {/* 'clase' route removed: view-only lessons page (/lessons) replaced the need for per-lesson route */}
              <Route path="/contenido/:contentId" element={<ContenidoPage />} />
              <Route path="/lessons" element={<LessonsPage />} />
              <Route path="/lesson/:lessonId" element={<LessonDetailPage />} />
              <Route path="/lesson/:lessonId/prueba/:pruebaId" element={<PruebaPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/lessons" element={<TeacherLessons />} />
              <Route path="/teacher/contents" element={<TeacherContents />} />
              <Route path="/teacher/pruebas" element={<TeacherPruebas />} />
              <Route path="/teacher/questions" element={<TeacherQuestions />} />
              <Route path="/teacher/performance" element={<TeacherPerformance />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              {/* accessibility route removed; toggles are available in sidebar */}
            </Routes>
            <Toaster />
            {!!alert && (
              <>
                <VisualAlert message={alert.message} highlightSelector={alert.highlightSelector} onDone={() => setAlert(null)} />
              </>
            )}
          </main>
        </div>

        <Footer highContrast={highContrast} />
      </div>
    </BrowserRouter>
  );
}

export default App;
