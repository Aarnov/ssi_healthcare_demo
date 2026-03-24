import DoctorDashboard from './pages/DoctorDashboard'
import './index.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple Navigation Bar */}
      <nav className="bg-white shadow-sm p-4 mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="font-bold text-blue-600 text-xl">Hospital Provider Portal</span>
          <div className="text-sm text-gray-500">Identity: General Hospital</div>
        </div>
      </nav>

      <main>
        <DoctorDashboard />
      </main>
    </div>
  )
}

export default App