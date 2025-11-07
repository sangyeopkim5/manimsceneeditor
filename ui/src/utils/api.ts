// API 호출 유틸리티
// 백엔드 API URL (환경 변수 또는 기본값)
// 환경 변수는 .env 파일에 VITE_BACKEND_API_URL=http://localhost:8787 형식으로 설정 가능
const BACKEND_API_URL = (import.meta as any).env?.VITE_BACKEND_API_URL || 'http://localhost:8787';

// API 호출 헬퍼 (로컬 백엔드 서버 사용)
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${BACKEND_API_URL}${endpoint}`;
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API Error: ${response.status}`);
  }

  return response.json();
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  timestamp?: string;
}

export interface GenerateInitialResponse {
  success: boolean;
  projectId: string;
  scenes: number[];
  sceneCodes: { [key: number]: string; all: string };
  sceneChats: { [key: number]: ChatMessage[]; all: ChatMessage[] };
  description: string;
  error?: string;
}

export interface ModifySceneResponse {
  success: boolean;
  updatedCode: string;
  explanation: string;
  chatHistory: ChatMessage[];
  needsRender: boolean;
  error?: string;
}

export interface ProjectData {
  id: string;
  title: string;
  initialPrompt: string;
  scenes: number[];
  sceneCodes: { [key: number]: string; all: string };
  sceneChats: { [key: number]: ChatMessage[]; all: ChatMessage[] };
  createdAt: string;
  updatedAt: string;
}

export interface SaveProjectResponse {
  success: boolean;
  projectId: string;
  error?: string;
}

export interface GetProjectResponse {
  success: boolean;
  projectData: ProjectData;
  error?: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  initialPrompt: string;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetProjectsResponse {
  success: boolean;
  projects: ProjectListItem[];
  error?: string;
}

export interface RenderSceneResponse {
  success: boolean;
  videoUrl: string | null;
  error?: string;
  stdout?: string;
  stderr?: string;
}

export interface RenderAllResponse {
  success: boolean;
  videoUrl: string | null;
  error?: string;
}

export interface MergeVideosResponse {
  success: boolean;
  videoUrl: string | null;
  error?: string;
}

// API 함수들
export const api = {
  // 초기 Scene 생성
  async generateInitial(prompt: string, images?: string[]): Promise<GenerateInitialResponse> {
    return apiCall('/api/v1/generate-initial', {
      method: 'POST',
      body: JSON.stringify({ prompt, images }),
    });
  },

  // Scene 수정
  async modifyScene(
    projectId: string,
    sceneNumber: number | "all",
    prompt: string,
    sceneOnly: boolean,
    currentCode: string,
    chatHistory: ChatMessage[],
    images?: string[]
  ): Promise<ModifySceneResponse> {
    return apiCall('/api/v1/modify-scene', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        sceneNumber,
        prompt,
        sceneOnly,
        currentCode,
        chatHistory,
        images,
      }),
    });
  },

  // 프로젝트 저장
  async saveProject(projectId: string, projectData: ProjectData): Promise<SaveProjectResponse> {
    return apiCall('/api/save-project', {
      method: 'POST',
      body: JSON.stringify({ projectId, projectData }),
    });
  },

  // 프로젝트 불러오기
  async getProject(projectId: string): Promise<GetProjectResponse> {
    return apiCall(`/api/project/${projectId}`, {
      method: 'GET',
    });
  },

  // 프로젝트 목록 조회
  async getProjects(): Promise<GetProjectsResponse> {
    return apiCall('/api/projects', {
      method: 'GET',
    });
  },

  // Health check
  async health(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${BACKEND_API_URL}/`);
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('서버에 연결할 수 없습니다');
    }
  },

  // Scene 렌더링 (백엔드 API 사용)
  async renderScene(projectId: string, sceneNumber: number | "all", code: string): Promise<RenderSceneResponse> {
    try {
      // 백엔드 API에 요청
      const response = await fetch(`${BACKEND_API_URL}/api/v1/render-scene`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manim_code: code,
          custom_prompt: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `백엔드 API 오류: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: result.success || false,
        videoUrl: result.videoUrl || null,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[renderScene] Error:', error);
      return {
        success: false,
        videoUrl: null,
        error: error.message || '렌더링 실패',
      };
    }
  },

  // 전체 Scene 렌더링 (백엔드 API 사용)
  async renderAll(projectId: string, code: string): Promise<RenderAllResponse> {
    try {
      // 백엔드 API에 요청
      const response = await fetch(`${BACKEND_API_URL}/api/v1/render-scene`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manim_code: code,
          custom_prompt: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `백엔드 API 오류: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: result.success || false,
        videoUrl: result.videoUrl || null,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[renderAll] Error:', error);
      return {
        success: false,
        videoUrl: null,
        error: error.message || '렌더링 실패',
      };
    }
  },

  // 영상 병합 (개별 Scene 영상들을 하나로 병합)
  async mergeVideos(projectId: string, videoUrls: string[]): Promise<MergeVideosResponse> {
    try {
      // 백엔드 API에 요청
      const response = await fetch(`${BACKEND_API_URL}/api/v1/merge-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          videoUrls,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `백엔드 API 오류: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: result.success || false,
        videoUrl: result.videoUrl || null,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[mergeVideos] Error:', error);
      return {
        success: false,
        videoUrl: null,
        error: error.message || '영상 병합 실패',
      };
    }
  },

  // 채팅 스트리밍 (SSE)
  async *streamChat(messages: { role: string; content: string }[]): AsyncGenerator<string, void, unknown> {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `백엔드 API 오류: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('응답 스트림을 받을 수 없습니다');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data);
              
              if (event.type === 'text' && event.content) {
                yield event.content;
              } else if (event.type === 'error') {
                throw new Error(event.error || '스트리밍 오류');
              } else if (event.type === 'done') {
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[streamChat] Error:', error);
      throw error;
    }
  },
};

// pollRenderStatus 함수는 더 이상 필요 없음 (백엔드에서 처리)
