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
          <footer className="shrink-0 text-center text-xs text-muted-foreground py-1 border-t border-border/50 flex items-center justify-center gap-3">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              京ICP备2026015425号-1
            </a>
            <span className="text-border">|</span>
            <a href="https://beian.mps.gov.cn/#/query/webSearch?code=11011402055743" target="_blank" rel="noreferrer" className="hover:text-foreground inline-flex items-center gap-1">
              <img src="/gongan.png" alt="" className="h-3.5 w-3.5" />
              京公网安备11011402055743号
            </a>
          </footer>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
