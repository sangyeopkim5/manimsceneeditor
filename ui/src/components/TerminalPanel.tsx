import { ScrollArea } from "./ui/scroll-area";
import { Terminal, AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect, useRef } from "react";

export interface LogEntry {
  type: "info" | "error" | "success" | "warning";
  message: string;
  timestamp: string;
}

interface TerminalPanelProps {
  logs: LogEntry[];
  onClear?: () => void;
  height?: string;
}

export function TerminalPanel({ logs, onClear, height = "200px" }: TerminalPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 에러 발생 시 자동으로 터미널 펼치기
  useEffect(() => {
    const hasError = logs.some(log => log.type === "error");
    if (hasError && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [logs]);

  // 새 로그가 추가되면 자동으로 맨 아래로 스크롤
  useEffect(() => {
    if (scrollAreaRef.current && !isCollapsed) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, isCollapsed]);

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
  };

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "error":
        return "text-red-400";
      case "success":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div 
      className="bg-zinc-950 border-t border-zinc-800 flex flex-col transition-all duration-200" 
      style={{ height: isCollapsed ? "auto" : height }}
    >
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition-colors" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm text-zinc-100">Terminal</h3>
          <span className="text-xs text-zinc-500">({logs.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <ScrollArea className="flex-1 h-full overflow-hidden" ref={scrollAreaRef}>
          <div className="p-3 space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-zinc-500 text-center py-8">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No errors</p>
                <p className="text-[10px] text-zinc-600 mt-1">렌더링 오류가 발생하면 여기에 표시됩니다</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 group hover:bg-zinc-900/50 px-2 py-1 rounded">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-600 text-[10px] flex-shrink-0 mt-0.5">
                        {log.timestamp}
                      </span>
                      <pre className={`${getLogColor(log.type)} whitespace-pre-wrap break-words leading-relaxed font-mono`}>
{log.message}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

