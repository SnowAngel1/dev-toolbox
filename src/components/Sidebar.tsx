import { NavLink, useLocation } from "react-router-dom"
import { Braces, Clock, Wrench, Sun, Moon, ChevronDown, GitCompare, ArrowDownAZ, FileText, FileType2, Search, Timer, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/useTheme"

interface SubItem {
  name: string
  path: string
  icon: React.ReactNode
}

interface ToolItem {
  name: string
  path: string
  icon: React.ReactNode
  children?: SubItem[]
}

const tools: ToolItem[] = [
  {
    name: "JSON 工具",
    path: "/json",
    icon: <Braces className="h-4 w-4" />,
    children: [
      {
        name: "格式化",
        path: "/json/format",
        icon: <Braces className="h-3.5 w-3.5" />,
      },
      {
        name: "对比",
        path: "/json/diff",
        icon: <GitCompare className="h-3.5 w-3.5" />,
      },
      {
        name: "Key 排序",
        path: "/json/sort-keys",
        icon: <ArrowDownAZ className="h-3.5 w-3.5" />,
      },
      {
        name: "转 YAML",
        path: "/json/to-yaml",
        icon: <FileText className="h-3.5 w-3.5" />,
      },
      {
        name: "类型生成",
        path: "/json/to-typescript",
        icon: <FileType2 className="h-3.5 w-3.5" />,
      },
      {
        name: "路径查询",
        path: "/json/path",
        icon: <Search className="h-3.5 w-3.5" />,
      },
    ],
  },
  {
    name: "时间工具",
    path: "/time",
    icon: <Clock className="h-4 w-4" />,
    children: [
      {
        name: "时间转换",
        path: "/time/timestamp",
        icon: <Clock className="h-3.5 w-3.5" />,
      },
      {
        name: "Cron 表达式",
        path: "/time/cron",
        icon: <Timer className="h-3.5 w-3.5" />,
      },
    ],
  },
]

function NavItem({ tool }: { tool: ToolItem }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(tool.path)

  if (!tool.children) {
    return (
      <NavLink
        to={tool.path}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
            isActive
              ? "text-primary bg-primary/10"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent"
          )
        }
      >
        {tool.icon}
        {tool.name}
      </NavLink>
    )
  }

  return (
    <div className="relative group">
      {/* 触发区域 */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 cursor-default select-none",
          isActive
            ? "text-primary bg-primary/10"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent"
        )}
      >
        {tool.icon}
        {tool.name}
        <ChevronDown className="h-3 w-3 opacity-50 transition-transform duration-200 group-hover:rotate-180" />
      </div>

      {/* 下拉菜单 */}
      <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
        <div className="bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
          {tool.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-150 mx-1 rounded-md",
                  isActive
                    ? "text-primary bg-primary/10 font-medium"
                    : "text-popover-foreground/70 hover:text-popover-foreground hover:bg-accent"
                )
              }
            >
              {child.icon}
              {child.name}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Navbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-12 shrink-0 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-6">
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2.5 shrink-0 mr-2">
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Wrench className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight">DevToolbox</span>
      </NavLink>

      {/* 分隔线 */}
      <div className="h-5 w-px bg-sidebar-border shrink-0" />

      {/* 导航链接 */}
      <nav className="flex items-center gap-1">
        {tools.map((tool) => (
          <NavItem key={tool.path} tool={tool} />
        ))}
      </nav>

      {/* 右侧操作 */}
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/60 select-none">
          <ShieldCheck className="h-3 w-3" />
          所有数据仅在浏览器处理，不上传服务器
        </span>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center h-8 w-8 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent transition-all duration-150"
          title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  )
}
