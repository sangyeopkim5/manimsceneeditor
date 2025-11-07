import React, { useState, useEffect } from "react";
import { InitialPrompt } from "./components/InitialPrompt";
import { TerminalPanel, LogEntry } from "./components/TerminalPanel";
import { ChatMessage } from "./components/ChatHistory";
import { FileTree } from "./components/FileTree";
import { AgentPanel } from "./components/AgentPanel";
import { TabViewer } from "./components/TabViewer";
// ChevronUp, ChevronDown 제거 (사용 안 함)

import { api } from "./utils/api";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

// Scene별 코드 타입
interface SceneCode {
  [key: number]: string;
  all: string;
}

// Scene별 대화 내역 타입
interface SceneChatHistory {
  [key: number]: ChatMessage[];
  all: ChatMessage[];
}

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScene, setSelectedScene] = useState<number | "all">(1);
  const [scenes, setScenes] = useState<number[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [isRendering, setIsRendering] = useState(false);
  
  // Scene별 영상 URL
  const [sceneVideos, setSceneVideos] = useState<{ [key: number | string]: string }>({});
  
  // Terminal 로그
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  
  // 탭 관리
  interface Tab {
    id: string;
    title: string;
    type: 'video' | 'code';
    sceneNumber: number | 'all';
    videoUrl?: string;
    code?: string;
  }
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  // Scene별 코드 관리
  const [sceneCodes, setSceneCodes] = useState<SceneCode>({
    all: ""
  });

  // Scene별 대화 히스토리 관리
  const [sceneChats, setSceneChats] = useState<SceneChatHistory>({
    all: []
  });

  // 로그 추가 함수
  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, { type, message, timestamp }]);
  };

  // 로그 초기화
  const clearLogs = () => {
    setTerminalLogs([]);
  };

  // 코드 변경 핸들러
  const handleCodeChange = (newCode: string) => {
    const currentScene = selectedScene === "all" ? "all" : selectedScene;
    setSceneCodes(prev => {
      const updated = {
        ...prev,
        [currentScene]: newCode
      };
      
      // 개별 Scene 수정 시 전체 코드도 자동으로 재생성
      if (currentScene !== "all") {
        const allCode = mergeScenes(scenes, updated);
        updated.all = allCode;
      }
      
      return updated;
    });
    // 성공 메시지는 Terminal에 표시 안 함 (toast만 사용)
  };

  // 코드 기반 렌더링 (수정된 코드로)
  const handleRenderFromCode = () => {
    const currentCode = getCurrentCode();
    if (currentCode && projectId) {
      renderScene(selectedScene, currentCode);
    } else {
      toast.error("렌더링할 코드가 없습니다");
      addLog("error", "렌더링 실패: 코드가 없습니다");
    }
  };

  // Backend API - 초기 Scene 생성
  const generateInitialScenes = async (prompt: string, images?: string[]) => {
    setIsLoading(true);
    
    try {
      console.log("[App] Starting initial scene generation...");
      const response = await api.generateInitial(prompt, images);
      
      if (!response.success) {
        throw new Error(response.error || "Scene 생성 실패");
      }

      setProjectId(response.projectId);
      setScenes(response.scenes);
      setSceneCodes(response.sceneCodes);
      setSceneChats(response.sceneChats);
      setInitialized(true);
      setSelectedScene(1);
      
      toast.success("Scene 생성 완료!");
      
      // 모든 Scene 순차적으로 자동 렌더링
      const renderAllScenes = async () => {
        let successCount = 0;
        let failCount = 0;
        const totalScenes = response.scenes.length + 1; // 개별 Scene + 전체 Scene
        
        addLog("info", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog("info", `자동 렌더링 시작 (총 ${totalScenes}개 Scene)`);
        addLog("info", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // 각 개별 Scene 렌더링 (토스트 표시 안 함)
        for (const sceneNum of response.scenes) {
          if (response.sceneCodes[sceneNum]) {
            addLog("info", `Scene ${sceneNum} 렌더링 시작...`);
            const success = await renderScene(
              sceneNum, 
              response.sceneCodes[sceneNum], 
              response.projectId, 
              false // 토스트 표시 안 함
            );
            if (success) {
              successCount++;
              addLog("success", `✓ Scene ${sceneNum} 렌더링 완료`);
            } else {
              failCount++;
              addLog("error", `✗ Scene ${sceneNum} 렌더링 실패`);
            }
            // 각 Scene 렌더링 사이에 약간의 딜레이 (서버 부하 방지)
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // 전체 Scene도 렌더링
        if (response.sceneCodes.all) {
          addLog("info", `전체 Scene 렌더링 시작...`);
          const success = await renderScene(
            "all", 
            response.sceneCodes.all, 
            response.projectId, 
            false // 토스트 표시 안 함
          );
          if (success) {
            successCount++;
            addLog("success", `✓ 전체 Scene 렌더링 완료`);
          } else {
            failCount++;
            addLog("error", `✗ 전체 Scene 렌더링 실패`);
          }
        }
        
        // 렌더링 결과 요약
        addLog("info", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        if (failCount > 0) {
          addLog("warning", `렌더링 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
        } else {
          addLog("success", `모든 Scene 렌더링 성공! (${successCount}/${totalScenes})`);
        }
        addLog("info", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // 모든 렌더링 완료 후 한 번만 토스트 표시
        if (successCount === totalScenes) {
          toast.success(`모든 Scene (${totalScenes}개) 렌더링 완료!`);
        } else if (successCount > 0) {
          toast.warning(`일부 Scene 렌더링 완료 (${successCount}/${totalScenes})`);
        } else {
          toast.error("모든 Scene 렌더링 실패");
        }
      };
      
      renderAllScenes();
      
    } catch (error: any) {
      console.error("[App] Error generating initial scenes:", error);
      toast.error(`Scene 생성 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Scene들을 병합하여 전체 코드 생성
  const mergeScenes = (sceneNumbers: number[], codes: SceneCode): string => {
    const sceneClasses = sceneNumbers
      .map(num => codes[num])
      .filter(code => code && !code.startsWith('#'))
      .join('\n\n');
    
    return sceneClasses;
  };

  // Backend API - Scene 수정
  const generateSceneCode = async (prompt: string, sceneOnly: boolean, images?: string[]) => {
    setIsLoading(true);

    const currentScene = selectedScene === "all" ? "all" : selectedScene;
    const currentCode = getCurrentCode();
    const chatHistory = getCurrentChat();

    try {
      const response = await api.modifyScene(
        projectId,
        currentScene,
        prompt,
        sceneOnly,
        currentCode,
        chatHistory,
        images
      );

      if (!response.success) {
        throw new Error(response.error || "코드 생성 실패");
      }

      // 코드 업데이트
      if (currentScene === "all") {
        // 전체 Scene 수정
        setSceneCodes(prev => ({
          ...prev,
          all: response.updatedCode
        }));
      } else {
        // 개별 Scene 수정 - 해당 Scene + 전체 코드 모두 업데이트
        setSceneCodes(prev => {
          const updated = {
            ...prev,
            [currentScene]: response.updatedCode
          };
          
          // 전체 코드도 자동으로 재생성 (모든 Scene 병합)
          const allCode = mergeScenes(scenes, updated);
          updated.all = allCode;
          
          return updated;
        });
      }

      // 대화 히스토리 업데이트
      setSceneChats(prev => ({
        ...prev,
        [currentScene]: response.chatHistory
      }));

      // Scene별 수정 알림
      const sceneLabel = currentScene === "all" ? "전체 Scene" : `Scene ${currentScene}`;
      toast.success(`${sceneLabel}이(가) 수정되었습니다`);
      
      // 자동 렌더링 (개별 Scene만)
      if (response.updatedCode && currentScene !== "all") {
        await renderScene(currentScene, response.updatedCode, undefined, false);
        toast.success(`${sceneLabel} 렌더링 완료!`);
      } else if (currentScene === "all") {
        // 전체 Scene 수정 시 전체 렌더링
        await renderScene("all", response.updatedCode, undefined, false);
        toast.success("전체 Scene 렌더링 완료!");
      }

    } catch (error: any) {
      console.error("[App] Error modifying scene:", error);
      toast.error(`코드 생성 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Scene 렌더링
  const renderScene = async (
    sceneNum: number | "all", 
    code: string, 
    pid?: string, 
    showToast: boolean = true
  ): Promise<boolean> => {
    const targetProjectId = pid || projectId;
    if (!targetProjectId) {
      if (showToast) toast.error("프로젝트 ID가 없습니다");
      addLog("error", "렌더링 실패: 프로젝트 ID가 없습니다");
      return false;
    }

    if (!code || code.startsWith('#')) {
      if (showToast) toast.error("렌더링할 코드가 없습니다");
      addLog("error", "렌더링 실패: 코드가 없습니다");
      return false;
    }

    setIsRendering(true);
    
    try {
      console.log(`[App] Rendering scene ${sceneNum}...`);
      const response = await api.renderScene(targetProjectId, sceneNum, code);
      console.log(`[App] Render response:`, response);
      
      if (!response.success) {
        // 오류 발생 시 stderr 전체를 상세하게 표시
        addLog("error", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog("error", `Scene ${sceneNum} 렌더링 실패`);
        addLog("error", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // 에러 메시지
        if (response.error) {
          addLog("error", response.error);
        }
        
        // stderr 전체를 있는 그대로 표시 (줄바꿈 유지)
        if (response.stderr) {
          const stderrLines = response.stderr.split('\n');
          stderrLines.forEach(line => {
            if (line.trim()) {
              addLog("error", line);
            }
          });
        }
        
        // stdout도 오류 관련 내용이 있으면 표시
        if (response.stdout) {
          const stdoutLines = response.stdout.split('\n');
          stdoutLines.forEach(line => {
            if (line.includes('Error') || line.includes('Traceback') || line.includes('Exception')) {
              addLog("error", line);
            }
          });
        }
        
        addLog("error", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        throw new Error(response.error || "렌더링 실패");
      }

      if (response.videoUrl) {
        console.log(`[App] Setting video URL for scene ${sceneNum}:`, response.videoUrl);
        // 비디오 URL을 강제로 업데이트 (타임스탬프 추가로 캐시 방지)
        const urlWithTimestamp = `${response.videoUrl}?t=${Date.now()}`;
        setSceneVideos(prev => {
          const updated = {
            ...prev,
            [sceneNum]: urlWithTimestamp
          };
          console.log(`[App] Updated sceneVideos:`, updated);
          return updated;
        });
        if (showToast) toast.success("렌더링 완료!");
        return true;
      } else {
        console.warn(`[App] No videoUrl in response for scene ${sceneNum}`);
        if (showToast) toast.info("렌더링이 완료되었지만 영상 URL을 받지 못했습니다");
        addLog("warning", `Scene ${sceneNum}: 비디오 URL을 받지 못했습니다`);
        return false;
      }
    } catch (error: any) {
      console.error("[App] Error rendering scene:", error);
      if (showToast) toast.error(`렌더링 실패: ${error.message}`);
      
      // 네트워크 오류 등 예외 상황도 Terminal에 표시
      if (error.message.includes('fetch') || error.message.includes('network')) {
        addLog("error", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog("error", `Scene ${sceneNum} 네트워크 오류`);
        addLog("error", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog("error", error.message);
        addLog("error", "백엔드 서버가 실행 중인지 확인하세요: http://localhost:8787");
        addLog("error", `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
      
      return false;
    } finally {
      setIsRendering(false);
    }
  };

  const handleRefreshPreview = () => {
    const currentCode = getCurrentCode();
    if (currentCode && projectId) {
      renderScene(selectedScene, currentCode);
    } else {
      toast.error("렌더링할 코드가 없습니다");
    }
  };

  // 영상 내보내기 핸들러
  const handleExport = () => {
    const videoUrl = getCurrentVideo();
    if (!videoUrl) {
      toast.error("내보내기할 영상이 없습니다. 먼저 렌더링해주세요.");
      return;
    }

    // 영상 다운로드
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `scene_${selectedScene === "all" ? "all" : selectedScene}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("영상 다운로드가 시작되었습니다");
  };

  const handleAddScene = (position: number) => {
    const newSceneNumber = Math.max(...scenes) + 1;
    const newScenes = [...scenes];
    newScenes.splice(position, 0, newSceneNumber);
    setScenes(newScenes);
    
    // 새 Scene 코드 추가
    setSceneCodes(prev => ({
      ...prev,
      [newSceneNumber]: `class Scene${newSceneNumber}(Scene):
    def construct(self):
        # Scene ${newSceneNumber} 코드
        pass`
    }));

    // 새 Scene 대화 히스토리 초기화
    setSceneChats(prev => ({
      ...prev,
      [newSceneNumber]: []
    }));

    toast.success(`Scene ${newSceneNumber}이 추가되었습니다`);
  };

  // 탭 관리 함수들
  const openTab = (sceneNumber: number | 'all', type: 'video' | 'code') => {
    const tabId = `${sceneNumber}-${type}`;
    const existingTab = tabs.find(t => t.id === tabId);
    
    if (existingTab) {
      setActiveTabId(tabId);
      return;
    }
    
    const newTab: Tab = {
      id: tabId,
      title: `${sceneNumber === 'all' ? 'All' : `Scene ${sceneNumber}`} - ${type}`,
      type,
      sceneNumber,
      videoUrl: type === 'video' ? sceneVideos[sceneNumber] : undefined,
      code: type === 'code' ? (sceneNumber === 'all' ? sceneCodes.all : sceneCodes[sceneNumber]) : undefined,
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
  };

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });
  };

  const handleFileTreeSelect = (sceneNumber: number | 'all') => {
    setSelectedScene(sceneNumber);
  };

  const handleFileOpen = (sceneNumber: number | 'all', type: 'video' | 'code') => {
    openTab(sceneNumber, type);
  };

  // 탭 내용 업데이트 (코드나 비디오 변경 시)
  useEffect(() => {
    setTabs(prevTabs => 
      prevTabs.map(tab => ({
        ...tab,
        videoUrl: tab.type === 'video' ? sceneVideos[tab.sceneNumber] : tab.videoUrl,
        code: tab.type === 'code' ? 
          (tab.sceneNumber === 'all' ? sceneCodes.all : sceneCodes[tab.sceneNumber]) : 
          tab.code,
      }))
    );
  }, [sceneVideos, sceneCodes]);

  const getCurrentCode = () => {
    if (selectedScene === "all") {
      return sceneCodes.all || "# 전체 Scene 코드가 여기에 표시됩니다.";
    }
    return sceneCodes[selectedScene] || "# Scene 코드가 여기에 표시됩니다.";
  };

  const getSceneName = () => {
    if (selectedScene === "all") {
      return "전체 Scene";
    }
    return `Scene ${selectedScene}`;
  };

  const getCurrentChat = () => {
    if (selectedScene === "all") {
      return sceneChats.all || [];
    }
    return sceneChats[selectedScene] || [];
  };

  const getCurrentVideo = () => {
    const videoUrl = sceneVideos[selectedScene];
    console.log(`[App] getCurrentVideo - selectedScene: ${selectedScene}, videoUrl:`, videoUrl);
    console.log(`[App] All sceneVideos:`, sceneVideos);
    return videoUrl;
  };

  // 코드 다운로드
  const handleDownloadCode = () => {
    const code = getCurrentCode();
    if (!code || code.startsWith('#')) {
      toast.error("다운로드할 코드가 없습니다");
      return;
    }

    const fullCode = `from manim import *\n\n${code}`;
    const blob = new Blob([fullCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scene_${selectedScene}.py`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('코드 다운로드 완료! 터미널에서 "manim -pql scene_' + selectedScene + '.py" 실행하세요');
  };

  // 초기화되지 않은 경우 초기 프롬프트 화면 표시
  if (!initialized) {
    return (
      <div>
        <InitialPrompt onSubmit={generateInitialScenes} isLoading={isLoading} />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="layout-container bg-zinc-950 text-zinc-100 text-[11px]">
      {/* Left: File Tree (15%) */}
      <div className="file-tree-panel">
        <FileTree
          scenes={scenes}
        selectedScene={selectedScene} 
          onSceneSelect={handleFileTreeSelect}
          onFileSelect={handleFileOpen}
      />
          </div>

      {/* Center: Agent Panel (35%) */}
      <div className="agent-panel">
        <AgentPanel
              sceneName={getSceneName()} 
          messages={getCurrentChat()}
              onSubmit={generateSceneCode}
              isLoading={isLoading}
            />
        </div>

      {/* Right: Tab Viewer + Terminal (50%) */}
      <div className="viewer-panel flex flex-col border-l border-zinc-800">
        {/* Tab Viewer (75%) */}
        <div className="viewer-content">
          <TabViewer
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onTabClose={closeTab}
            onCodeChange={(tabId, newCode) => {
              const tab = tabs.find(t => t.id === tabId);
              if (tab && tab.type === 'code') {
                handleCodeChange(newCode);
              }
            }}
            onRenderCode={(tabId) => {
              const tab = tabs.find(t => t.id === tabId);
              if (tab && tab.code) {
                renderScene(tab.sceneNumber, tab.code);
              }
            }}
                  isRendering={isRendering}
                />
              </div>

        {/* Terminal (25%) */}
        <div className="terminal-panel border-t border-zinc-800">
                <TerminalPanel 
                  logs={terminalLogs}
                  onClear={clearLogs}
            height="100%"
                />
        </div>
      </div>
      
      <Toaster />
    </div>
  );
}
