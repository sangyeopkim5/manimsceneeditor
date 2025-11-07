import { useState } from 'react';
import { X, PlaySquare, Code2 } from 'lucide-react';
import { LivePreview } from './LivePreview';
import { CodePanel } from './CodePanel';
import { Button } from './ui/button';

interface Tab {
  id: string;
  title: string;
  type: 'video' | 'code';
  sceneNumber: number | 'all';
  videoUrl?: string;
  code?: string;
}

interface TabViewerProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onCodeChange?: (tabId: string, newCode: string) => void;
  onRenderCode?: (tabId: string) => void;
  isRendering?: boolean;
}

export function TabViewer({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onCodeChange,
  onRenderCode,
  isRendering,
}: TabViewerProps) {
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Tab Bar */}
      <div className="flex items-center gap-0.5 bg-zinc-900 border-b border-zinc-800 px-1 py-0.5 text-[10px]">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer group ${
              activeTabId === tab.id
                ? 'bg-zinc-950 text-zinc-100'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.type === 'video' ? (
              <PlaySquare className="w-3 h-3" />
            ) : (
              <Code2 className="w-3 h-3" />
            )}
            <span className="max-w-[120px] truncate">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-zinc-600 rounded p-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        {tabs.length === 0 && (
          <div className="text-zinc-500 px-2 py-1">No tabs open</div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          activeTab.type === 'video' ? (
            <LivePreview
              videoUrl={activeTab.videoUrl}
              isRendering={isRendering || false}
              onDownload={() => {}}
            />
          ) : (
            <CodePanel
              code={activeTab.code || ''}
              sceneName={activeTab.title}
              onCodeChange={(newCode) => onCodeChange?.(activeTab.id, newCode)}
              onRenderCode={() => onRenderCode?.(activeTab.id)}
              isRendering={isRendering || false}
              isEditable={true}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-[11px]">
            <div className="text-center">
              <PlaySquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>파일 트리에서 파일을 클릭하여 열기</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

