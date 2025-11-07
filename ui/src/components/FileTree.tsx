import { useState } from 'react';
import { ChevronRight, ChevronDown, Film, Code, FileText } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface FileTreeProps {
  scenes: number[];
  selectedScene: number | 'all';
  onSceneSelect: (scene: number | 'all') => void;
  onFileSelect: (scene: number | 'all', type: 'video' | 'code') => void;
  onSceneRename?: (sceneNum: number, newName: string) => void;
}

export function FileTree({ scenes, selectedScene, onSceneSelect, onFileSelect, onSceneRename }: FileTreeProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<number | 'all'>>(
    new Set([...scenes, 'all'])
  );
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; scene: number | 'all' } | null>(null);
  const [renamingScene, setRenamingScene] = useState<number | 'all' | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const toggleExpand = (scene: number | 'all') => {
    const newExpanded = new Set(expandedScenes);
    if (newExpanded.has(scene)) {
      newExpanded.delete(scene);
    } else {
      newExpanded.add(scene);
    }
    setExpandedScenes(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, scene: number | 'all') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, scene });
  };

  const handleRename = (scene: number | 'all') => {
    setRenamingScene(scene);
    setRenameValue(`Scene ${scene}`);
    setContextMenu(null);
  };

  const confirmRename = () => {
    if (renamingScene !== null && typeof renamingScene === 'number' && onSceneRename) {
      onSceneRename(renamingScene, renameValue);
    }
    setRenamingScene(null);
  };

  return (
    <>
      <div className="h-full bg-zinc-950 border-r border-zinc-800 flex flex-col text-[10px]">
        <div className="px-2 py-1.5 border-b border-zinc-800 text-zinc-400 font-medium">
          EXPLORER
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1">
            {/* 전체 Scene */}
            <div>
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-800 ${
                  selectedScene === 'all' ? 'bg-zinc-800' : ''
                }`}
                onClick={() => toggleExpand('all')}
                onContextMenu={(e) => handleContextMenu(e, 'all')}
              >
                {expandedScenes.has('all') ? (
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                )}
                <FileText className="w-3 h-3 text-blue-400" />
                <span className="text-zinc-300">All Scenes</span>
              </div>
              {expandedScenes.has('all') && (
                <div className="ml-4 mt-0.5">
                  <div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-800"
                    onClick={() => {
                      onSceneSelect('all');
                      onFileSelect('all', 'video');
                    }}
                  >
                    <Film className="w-3 h-3 text-purple-400" />
                    <span className="text-zinc-400">video</span>
                  </div>
                  <div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-800"
                    onClick={() => {
                      onSceneSelect('all');
                      onFileSelect('all', 'code');
                    }}
                  >
                    <Code className="w-3 h-3 text-green-400" />
                    <span className="text-zinc-400">code</span>
                  </div>
                </div>
              )}
            </div>

            {/* 개별 Scenes */}
            {scenes.map((sceneNum) => (
              <div key={sceneNum} className="mt-1">
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-800 ${
                    selectedScene === sceneNum ? 'bg-zinc-800' : ''
                  }`}
                  onClick={() => toggleExpand(sceneNum)}
                  onContextMenu={(e) => handleContextMenu(e, sceneNum)}
                >
                  {expandedScenes.has(sceneNum) ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <FileText className="w-3 h-3 text-blue-400" />
                  {renamingScene === sceneNum ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={confirmRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmRename();
                        if (e.key === 'Escape') setRenamingScene(null);
                      }}
                      className="flex-1 bg-zinc-900 text-zinc-300 px-1 py-0 text-[10px] outline-none border border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-zinc-300">Scene {sceneNum}</span>
                  )}
                </div>
                {expandedScenes.has(sceneNum) && (
                  <div className="ml-4 mt-0.5">
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-800"
                      onClick={() => {
                        onSceneSelect(sceneNum);
                        onFileSelect(sceneNum, 'video');
                      }}
                    >
                      <Film className="w-3 h-3 text-purple-400" />
                      <span className="text-zinc-400">video</span>
                    </div>
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-800"
                      onClick={() => {
                        onSceneSelect(sceneNum);
                        onFileSelect(sceneNum, 'code');
                      }}
                    >
                      <Code className="w-3 h-3 text-green-400" />
                      <span className="text-zinc-400">code</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded shadow-lg py-1 text-[10px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="w-full px-3 py-1 text-left hover:bg-zinc-800 text-zinc-300"
              onClick={() => handleRename(contextMenu.scene)}
            >
              Rename
            </button>
          </div>
        </>
      )}
    </>
  );
}

