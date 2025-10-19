import './App.css'
import Navbar from './components/navbar'
import Footer from './components/Footer'
import Sidebar from './components/Sidebar'
import { useState } from 'react'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar toggleSidebar={()=> setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} />

        <main className={`flex-1 p-6 bg-gray-50 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "ml-0"
          }`}
          >
          <h1 className="text-2xl font-semibold mb-4">
            Bienvenido a Química Uleam
          </h1>
          <p className="text-gray-700">
            Aquí puedes colocar el contenido principal o las páginas del sistema.
          </p>
        </main>
      </div>

      <Footer />
    </div>
  )
}

export default App

