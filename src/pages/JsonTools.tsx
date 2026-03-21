import { Routes, Route, Navigate } from "react-router-dom"
import { JsonFormatterTab } from "./json/JsonFormatterTab"
import { JsonDiffTab } from "./json/JsonDiffTab"
import { JsonSortKeysTab } from "./json/JsonSortKeysTab"
import { JsonToYamlTab } from "./json/JsonToYamlTab"
import { JsonToTsTab } from "./json/JsonToTsTab"
import { JsonPathTab } from "./json/JsonPathTab"

export function JsonTools() {
  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route path="format" element={<JsonFormatterTab />} />
          <Route path="diff" element={<JsonDiffTab />} />
          <Route path="sort-keys" element={<JsonSortKeysTab />} />
          <Route path="to-yaml" element={<JsonToYamlTab />} />
          <Route path="to-typescript" element={<JsonToTsTab />} />
          <Route path="path" element={<JsonPathTab />} />
          <Route path="*" element={<Navigate to="format" replace />} />
        </Routes>
      </div>
    </div>
  )
}
