import { Routes, Route, Navigate } from "react-router-dom"
import { TimestampConverter } from "./time/TimestampConverterTab"
import { CronExpressionTab } from "./time/CronExpressionTab"

export function TimeTools() {
  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route path="timestamp" element={<TimestampConverter />} />
          <Route path="cron" element={<CronExpressionTab />} />
          <Route path="*" element={<Navigate to="timestamp" replace />} />
        </Routes>
      </div>
    </div>
  )
}
