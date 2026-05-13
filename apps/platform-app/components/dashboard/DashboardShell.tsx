"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { PanelLeftOpen } from "lucide-react";

type ShellCtx = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<ShellCtx | null>(null);

export function useSidebar() {
  // Returns null if used outside the shell — sidebars guard against this.
  return useContext(SidebarContext);
}

const STORAGE_KEY = "lth_sidebar_collapsed";

export default function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {
      // localStorage unavailable — fine, default to expanded.
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // ⌘B / Ctrl+B toggles the sidebar — standard productivity-app shortcut.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "b" && !e.altKey && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        // Don't hijack ⌘B inside text inputs or content-editable.
        if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div className="flex min-h-screen">
        <div
          aria-hidden={collapsed}
          className={`hidden shrink-0 overflow-hidden border-r border-line bg-stone-50/80 backdrop-blur transition-[width] duration-200 ease-in-out md:block ${
            collapsed ? "w-0 border-r-0" : "w-64"
          }`}
        >
          <div className="w-64">{sidebar}</div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {collapsed && (
            <div className="hidden border-b border-line bg-stone-50/80 backdrop-blur md:block">
              <div className="flex items-center justify-between px-4 py-2">
                <button
                  type="button"
                  onClick={toggle}
                  className="group inline-flex items-center gap-2 text-sm text-stone-600 transition-colors hover:text-stone-900"
                  aria-label="Show sidebar"
                  title="Show sidebar (⌘B)"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                  Show sidebar
                </button>
                <kbd className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-stone-400 sm:inline">
                  ⌘B
                </kbd>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
