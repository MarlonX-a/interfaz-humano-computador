export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <nav className="flex flex-wrap items-center justify-between px-4 py-3">
        
        <div className="flex items-center space-x-2">
          <span className="text-lg sm:text-xl font-semibold text-blue-700">
            Quimica Uleam
          </span>
        </div>

        <div className="w-full mt-2 sm:mt-0 sm:w-auto sm:flex-1 sm:flex sm:justify-center">
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full sm:max-w-md px-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <button className="flex items-center space-x-1 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 transition">
            <span role="img" aria-label="globe">🌐</span>
            <span className="text-sm font-medium">EN</span>
          </button>
          <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition">
            Entrar
          </button>
        </div>
      </nav>
    </header>
  );
}
