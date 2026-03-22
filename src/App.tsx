import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Navbar } from "@/components/Sidebar"
import { ToastProvider } from "@/components/ui/toast"
import { JsonTools } from "@/pages/JsonTools"
import { TimeTools } from "@/pages/TimeTools"

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          <Navbar />
          <main className="flex-1 min-w-0 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/json/format" replace />} />
              <Route path="/json" element={<Navigate to="/json/format" replace />} />
              <Route path="/json/*" element={<JsonTools />} />
              <Route path="/time" element={<Navigate to="/time/timestamp" replace />} />
              <Route path="/time/*" element={<TimeTools />} />
              <Route path="/timestamp" element={<Navigate to="/time/timestamp" replace />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
