import { Menu, Atom, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavbar } from "@/app/layout/hooks/useNavbar";

export default function Navbar({ toggleSidebar, sidebarOpen, highContrast }: { toggleSidebar: () => void; sidebarOpen?: boolean; highContrast: boolean }) {
  const hook = useNavbar({ highContrast });
  const { t } = useTranslation();

  return (
    <header className={`fixed top-0 left-0 w-full border-b shadow-sm z-50 transition-colors duration-300 ${highContrast ? "bg-black border-yellow-300 text-yellow-300" : "bg-white border-gray-200 text-blue-700"}`}>
      <nav className="flex flex-wrap items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSidebar}
            aria-controls="main-sidebar"
            aria-expanded={!!sidebarOpen}
            className={`p-2 rounded-md transition ${highContrast ? "text-yellow-300 hover:bg-yellow-900" : "text-blue-700 hover:bg-gray-100"}`}
            aria-label={sidebarOpen ? (t("sidebarClose") || "Close sidebar") : (t("sidebarOpen") || "Open sidebar")}
            title={sidebarOpen ? (t("sidebarClose") || "Close sidebar") : (t("sidebarOpen") || "Open sidebar")}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <a href="#" className="flex items-center space-x-1" aria-label="Quimica Uleam home">
            <Atom size={22} />
            <span className="sr-only">Quimica Uleam</span>
          </a>
          <span
            className={`text-lg sm:text-xl font-semibold transition cursor-pointer ${highContrast ? "text-yellow-300" : "text-blue-700"}`}
            onClick={() => hook.navigate('/')}
          >
            Química Uleam
          </span>
          {/* Current page indicator */}
          <div className="hidden sm:block ml-3 text-sm text-gray-500">
            {hook.location.pathname === '/' && (t('nav.home') || 'Inicio')}
            {hook.location.pathname === '/login' && (t('nav.login') || 'Iniciar sesión')}
            {hook.location.pathname === '/register' && (t('nav.register') || 'Registro')}
            {hook.location.pathname === '/add-content' && (t('nav.addContent') || 'Añadir contenido')}
            {hook.location.pathname === '/reset-password' && (t('nav.resetPassword') || 'Recuperar contraseña')}
          </div>
        </div>

        <div className="w-full mt-2 sm:mt-0 sm:w-auto sm:flex-1 sm:flex sm:justify-center">
          {/* Search is shown as inline input on `sm+` and as an icon opening a fullscreen overlay on xs */}
          <div className="w-full hidden sm:block relative sm:ml-8 md:ml-12 lg:ml-16">
            <input
              type="text"
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              value={hook.query}
              onChange={(e) => hook.setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (hook.suggestions.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  hook.setActiveIndex((i: number) => {
                    if (i < 0) return 0;
                    return Math.min(i + 1, hook.suggestions.length - 1);
                  });
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  hook.setActiveIndex((i: number) => {
                    if (i <= 0) return hook.suggestions.length - 1;
                    return i - 1;
                  });
                } else if (e.key === "Enter") {
                  if (hook.activeIndex >= 0 && hook.suggestions[hook.activeIndex]) {
                    hook.navigateToSuggestion(hook.suggestions[hook.activeIndex]);
                  }
                }
              }}
              aria-controls="search-suggestions"
              aria-activedescendant={hook.activeIndex >= 0 ? `suggestion-${hook.suggestions[hook.activeIndex]?.id}` : undefined}
              className={`w-full sm:max-w-md px-4 py-2 text-sm border rounded-full focus:outline-none transition ${highContrast ? "bg-black border-yellow-300 text-yellow-300" : "bg-white border-gray-300 text-gray-900"} ${sidebarOpen ? "lg:ml-0" : ""}`}
            />
            {hook.searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">...</div>
            )}
            {hook.suggestions.length > 0 && (
              <ul id="search-suggestions" ref={hook.suggestionsListRef} role="listbox" className="absolute left-0 right-0 mt-2 bg-white border rounded shadow z-20 max-h-72 overflow-auto">
                {hook.suggestions.map((s: any, idx: number) => (
                  <li
                    id={`suggestion-${s.id}`}
                    key={s.id}
                    role="option"
                    aria-selected={hook.activeIndex === idx}
                    className={`p-2 cursor-pointer ${hook.activeIndex === idx ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                    onClick={() => hook.navigateToSuggestion(s)}
                  >
                    <div className="font-medium">{s.titulo}</div>
                    <div className="text-xs text-gray-500">{s.nivel}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="sm:hidden flex items-center w-full justify-center">
            <button aria-label="Open search" onClick={() => hook.setSearchOpen(true)} className={`p-2 rounded ${highContrast ? "text-yellow-300" : "text-blue-700"}`}>
              <Search size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* On very small screens, hide large text buttons and show compact icons to conserve space */}
          <div className="hidden sm:flex items-center space-x-4 mr-2">
            <a href="#" className={`text-sm ${hook.location.pathname === '/' ? 'font-semibold underline' : ''}`} onClick={() => hook.navigate('/')}>{t('nav.home') || 'Inicio'}</a>
            {/* Show Add content only for teachers */}
            {hook.isTeacher && (
              <a href="#" className={`text-sm ${hook.location.pathname === '/add-content' ? 'font-semibold underline' : ''}`} onClick={() => hook.navigate('/add-content')}>{t('addContent') || 'Añadir contenido'}</a>
            )}
          </div>
          <button onClick={hook.toggleLanguage} className={`flex items-center space-x-1 px-3 py-1 border rounded-md transition ${highContrast ? "border-yellow-300 text-yellow-300 hover:bg-yellow-900" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}>
            🌐 <span className="text-sm font-medium">{hook.language.toUpperCase()}</span>
          </button>

          {/* Conditional: if logged in show name/role, else login button */}
          {hook.session && hook.profile ? (
            <>
              {/* Display role label */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${hook.isAdmin ? "bg-indigo-100 text-indigo-800" : hook.isTeacher ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {hook.isAdmin ? t("register.roles.admin") || "Admin" : hook.isTeacher ? t("register.roles.teacher") || "Teacher" : t("register.roles.student") || "Student"}
              </span>

              {/* Display name */}
              <button
                className={`hidden sm:inline-block px-3 py-1 rounded-md text-sm font-medium ${highContrast ? "text-yellow-300" : "text-gray-700"}`}
                onClick={() => hook.navigate('/profile-setup')}
                title={hook.displayName || hook.session.user.email}
              >
                {hook.displayName || hook.session.user.email}
              </button>

              {/* Teachers and admins see 'Add Content' */}
              {(hook.isTeacher || hook.isAdmin) && (
                <button
                  className={`hidden sm:inline-flex px-4 py-1.5 text-sm font-medium rounded-md ${highContrast ? "bg-yellow-300 text-black hover:bg-yellow-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
                  onClick={() => hook.navigate('/add-content')}
                >
                  {t("addContent") || "Ingresar contenido"}
                </button>
              )}

              

              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${highContrast ? "bg-yellow-300 text-black hover:bg-yellow-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                onClick={hook.handleSignOut}
                title={t("login.signOut")}
              >
                {/* keep the button text for visibility on small screens */}
                <span className="hidden sm:inline">{t("login.signOut") || "Cerrar sesión"}</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </>
          ) : (
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${highContrast ? "bg-yellow-300 text-black hover:bg-yellow-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              onClick={() => hook.navigate('/login')}
            >
              <span className="hidden sm:inline">{t("login.signIn") || "Iniciar Sesión"}</span>
              <span className="sm:hidden">🔑</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile search overlay */}
      {hook.searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start pt-16 px-4 sm:hidden">
          <div className={`absolute inset-0 bg-black/40`} onClick={() => hook.setSearchOpen(false)} />
          <div className={`${highContrast ? "bg-black text-yellow-300" : "bg-white text-gray-900"} z-50 w-full rounded-lg p-4 shadow-lg`}> 
            <div className="flex items-center">
              <input autoFocus type="text" value={hook.query} onChange={(e) => hook.setQuery(e.target.value)} placeholder={t('search.placeholder')} className={`w-full px-4 py-2 rounded border ${highContrast ? "border-yellow-300 bg-black text-yellow-300" : "border-gray-300 bg-white text-gray-900"}`} aria-label={t('search.placeholder')} aria-controls="search-suggestions-mobile" aria-activedescendant={hook.activeIndex >= 0 ? `suggestion-${hook.suggestions[hook.activeIndex]?.id}` : undefined} onKeyDown={(e) => {
                if (hook.suggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  hook.setActiveIndex((i: number) => Math.min(i + 1, hook.suggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  hook.setActiveIndex((i: number) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  if (hook.activeIndex >= 0 && hook.suggestions[hook.activeIndex]) {
                    hook.navigateToSuggestion(hook.suggestions[hook.activeIndex]);
                  }
                }
              }} />
              <button className="ml-2 p-2 rounded" aria-label="Close search" onClick={() => hook.setSearchOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mt-3">
              <ul role="listbox" id="search-suggestions-mobile" className="space-y-2">
                {hook.suggestions.map((s: any, idx: number) => (
                  <li key={s.id}>
                    <button
                      className={`w-full text-left p-2 rounded ${hook.activeIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => hook.navigateToSuggestion(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          hook.setActiveIndex((i: number) => {
                            if (i < 0) return 0;
                            return Math.min(i + 1, hook.suggestions.length - 1);
                          });
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          hook.setActiveIndex((i: number) => {
                            if (i <= 0) return hook.suggestions.length - 1;
                            return i - 1;
                          });
                        } else if (e.key === 'Enter') {
                          // the button click will run
                        }
                      }}
                      aria-selected={hook.activeIndex === idx}
                      id={`suggestion-${s.id}`}
                    >
                      <div className="font-medium">{s.titulo}</div>
                      <div className="text-xs text-gray-500">{s.nivel}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}