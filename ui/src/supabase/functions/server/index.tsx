import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Types
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  timestamp: string;
}

interface SceneData {
  number: number;
  code: string;
  chatHistory: ChatMessage[];
  lastModified: string;
}

interface ProjectData {
  id: string;
  title: string;
  initialPrompt: string;
  scenes: number[];
  sceneCodes: { [key: number]: string; all: string };
  sceneChats: { [key: number]: ChatMessage[]; all: ChatMessage[] };
  createdAt: string;
  updatedAt: string;
}

// Utility: Generate unique project ID
function generateProjectId(): string {
  return `project_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Utility: Current timestamp
function timestamp(): string {
  return new Date().toISOString();
}

// Utility: Generate project key with project name
function getProjectKey(projectName: string, projectId: string): string {
  // 프로젝트 이름을 URL-safe하게 변환
  const safeName = projectName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_').substring(0, 50);
  return `project:${safeName}:${projectId}`;
}

// Utility: Extract project name from key (backward compatibility)
function extractProjectName(key: string): string | null {
  const match = key.match(/^project:([^:]+):(.+)$/);
  if (match) {
    return match[1];
  }
  // 기존 형식 (project:projectId)인 경우 null 반환
  return null;
}

// Claude API - Scene 생성
async function generateInitialScenes(prompt: string, images?: string[]) {
  const apiKey = Deno.env.get('CLAUDE_API_KEY');
  
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY가 설정되지 않았습니다.');
  }

  const systemPrompt = `당신은 Manim(Mathematical Animation Engine) 전문가입니다.
사용자의 요청에 따라 교육용 애니메이션 영상을 논리적인 Scene들로 나누고, 각 Scene의 Python/Manim 코드를 생성하세요.

**중요 규칙:**
1. 각 Scene은 독립적으로 실행 가능한 완전한 코드여야 합니다
2. class 이름은 Scene1, Scene2, Scene3, ... 형식을 사용하세요
3. from manim import * 같은 import 문은 작성하지 마세요 (자동으로 추가됨)
4. 3~5개의 Scene으로 구성하세요
5. "all" Scene은 모든 Scene을 순서대로 통합한 것입니다
6. 이미지가 제공된 경우, 이미지 내용을 분석하여 애니메이션에 반영하세요

**응답 형식 (반드시 JSON):**
{
  "scenes": [1, 2, 3],
  "sceneCodes": {
    "1": "class Scene1(Scene):\\n    def construct(self):\\n        ...",
    "2": "class Scene2(Scene):\\n    def construct(self):\\n        ...",
    "3": "class Scene3(Scene):\\n    def construct(self):\\n        ...",
    "all": "class AllScenes(Scene):\\n    def construct(self):\\n        ..."
  },
  "description": "Scene 구성에 대한 설명"
}`;

  try {
    // 메시지 구성 (이미지 포함 가능)
    const contentParts: any[] = [
      {
        type: 'text',
        text: prompt
      }
    ];

    // 이미지가 있으면 추가
    if (images && images.length > 0) {
      for (const imageData of images) {
        // base64 데이터에서 media type과 data 분리
        const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mediaType = match[1];
          const base64Data = match[2];
          
          contentParts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          });
        }
      }
    }

    const messages = [{
      role: 'user',
      content: contentParts
    }];

    // Claude API 호출
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // JSON 추출 (```json ... ``` 형식 처리)
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const result = JSON.parse(jsonStr);

    return {
      scenes: result.scenes || [1, 2, 3],
      sceneCodes: result.sceneCodes || {},
      description: result.description || '영상이 생성되었습니다.'
    };

  } catch (error: any) {
    console.error('[generateInitialScenes] Claude API error:', error);
    throw new Error(`Claude API 호출 실패: ${error.message}`);
  }
}

// Claude API - Scene 수정
async function modifyScene(
  sceneNumber: number | string,
  prompt: string,
  currentCode: string,
  chatHistory: ChatMessage[],
  images?: string[]
) {
  const apiKey = Deno.env.get('CLAUDE_API_KEY');
  
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY가 설정되지 않았습니다.');
  }

  const systemPrompt = `당신은 Manim 코드 수정 전문가입니다.
사용자의 요청에 따라 기존 Manim Scene 코드를 수정하세요.

**중요 규칙:**
1. 기존 코드의 구조를 최대한 유지하세요
2. class 이름 (Scene${sceneNumber} 또는 AllScenes)을 변경하지 마세요
3. import 문은 작성하지 마세요
4. 사용자가 요청한 수정사항만 반영하세요
5. 코드는 완전히 실행 가능해야 합니다
6. 이미지가 제공된 경우, 이미지 내용을 분석하여 수정에 반영하세요

**응답 형식 (반드시 JSON):**
{
  "updatedCode": "class Scene${sceneNumber}(Scene):\\n    def construct(self):\\n        ...",
  "explanation": "수정 내용에 대한 설명"
}`;

  try {
    // 대화 히스토리 구성
    const messages: any[] = [];
    
    // 기존 대화 추가
    for (const msg of chatHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // 현재 요청 추가
    const contentParts: any[] = [
      {
        type: 'text',
        text: `**현재 코드:**
\`\`\`python
${currentCode}
\`\`\`

**수정 요청:**
${prompt}`
      }
    ];

    // 이미지가 있으면 추가
    if (images && images.length > 0) {
      for (const imageData of images) {
        const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mediaType = match[1];
          const base64Data = match[2];
          
          contentParts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          });
        }
      }
    }

    messages.push({
      role: 'user',
      content: contentParts
    });

    // Claude API 호출
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // JSON 추출
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const result = JSON.parse(jsonStr);

    return {
      updatedCode: result.updatedCode || currentCode,
      explanation: result.explanation || '코드가 수정되었습니다.'
    };

  } catch (error: any) {
    console.error('[modifyScene] Claude API error:', error);
    throw new Error(`Claude API 호출 실패: ${error.message}`);
  }
}

// Health check endpoint
app.get("/make-server-36e21242/health", (c) => {
  return c.json({ status: "ok" });
});

// POST /api/generate-initial - 초기 Scene 생성
app.post("/make-server-36e21242/api/generate-initial", async (c) => {
  try {
    console.log(`[generate-initial] Request received`);
    
    const body = await c.req.json();
    const { prompt, images } = body;

    if (!prompt) {
      console.log(`[generate-initial] Error: No prompt provided`);
      return c.json({ success: false, error: "Prompt is required" }, 400);
    }

    console.log(`[generate-initial] Prompt: ${prompt}`);
    console.log(`[generate-initial] Images count: ${images ? images.length : 0}`);

    // Claude API 호출
    const { scenes, sceneCodes, description } = await generateInitialScenes(prompt, images);

    // 프로젝트 데이터 생성
    const projectId = generateProjectId();
    const now = timestamp();

    const userMessage: ChatMessage = {
      role: "user",
      content: prompt,
      images: images || undefined,
      timestamp: now
    };

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: description,
      timestamp: now
    };

    const sceneChats: any = { all: [userMessage, assistantMessage] };
    scenes.forEach(sceneNum => {
      sceneChats[sceneNum] = [];
    });

    const projectData: ProjectData = {
      id: projectId,
      title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
      initialPrompt: prompt,
      scenes,
      sceneCodes,
      sceneChats,
      createdAt: now,
      updatedAt: now
    };

    // KV Store에 저장 (프로젝트 이름 포함)
    const projectKey = getProjectKey(projectData.title, projectId);
    await kv.set(projectKey, projectData);

    console.log(`[generate-initial] Project created: ${projectId}`);

    return c.json({
      success: true,
      projectId,
      scenes,
      sceneCodes,
      sceneChats,
      description
    });

  } catch (error: any) {
    console.error(`[generate-initial] Error: ${error.message}`, error);
    console.error(`[generate-initial] Stack trace:`, error.stack);
    return c.json({ 
      success: false, 
      error: `Scene 생성 중 오류 발생: ${error.message}` 
    }, 500);
  }
});

// POST /api/modify-scene - Scene 수정
app.post("/make-server-36e21242/api/modify-scene", async (c) => {
  try {
    const body = await c.req.json();
    const { projectId, sceneNumber, prompt, sceneOnly, currentCode, chatHistory, images } = body;

    if (!projectId || sceneNumber === undefined || !prompt) {
      return c.json({ 
        success: false, 
        error: "projectId, sceneNumber, and prompt are required" 
      }, 400);
    }

    console.log(`[modify-scene] Project: ${projectId}, Scene: ${sceneNumber}, Prompt: ${prompt}`);
    console.log(`[modify-scene] Images count: ${images ? images.length : 0}`);

    // 프로젝트 데이터 가져오기 (프로젝트 이름으로 검색)
    let projectData: ProjectData | null = null;
    const projects = await kv.getByPrefix("project:") as ProjectData[];
    for (const proj of projects) {
      if (proj && proj.id === projectId) {
        projectData = proj;
        break;
      }
    }
    
    if (!projectData) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }

    // Claude API 호출
    const { updatedCode, explanation } = await modifyScene(
      sceneNumber,
      prompt,
      currentCode,
      chatHistory || [],
      images
    );

    const now = timestamp();

    const userMessage: ChatMessage = {
      role: "user",
      content: prompt,
      images: images || undefined,
      timestamp: now
    };

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: explanation,
      timestamp: now
    };

    // 프로젝트 데이터 업데이트
    projectData.sceneCodes[sceneNumber] = updatedCode;
    
    if (!projectData.sceneChats[sceneNumber]) {
      projectData.sceneChats[sceneNumber] = [];
    }
    projectData.sceneChats[sceneNumber].push(userMessage, assistantMessage);
    
    projectData.updatedAt = now;

    // KV Store 업데이트 (프로젝트 이름 포함)
    const projectKey = getProjectKey(projectData.title, projectId);
    await kv.set(projectKey, projectData);

    console.log(`[modify-scene] Scene ${sceneNumber} updated`);

    return c.json({
      success: true,
      updatedCode,
      explanation,
      chatHistory: projectData.sceneChats[sceneNumber],
      needsRender: true
    });

  } catch (error: any) {
    console.error(`[modify-scene] Error: ${error.message}`, error);
    return c.json({ 
      success: false, 
      error: `Scene 수정 중 오류 발생: ${error.message}` 
    }, 500);
  }
});

// POST /api/save-project - 프로젝트 저장
app.post("/make-server-36e21242/api/save-project", async (c) => {
  try {
    const body = await c.req.json();
    const { projectId, projectData } = body;

    if (!projectId || !projectData) {
      return c.json({ success: false, error: "Invalid request" }, 400);
    }

    projectData.updatedAt = timestamp();
    
    // 프로젝트 이름을 키에 포함하여 저장
    const projectKey = getProjectKey(projectData.title, projectId);
    await kv.set(projectKey, projectData);

    console.log(`[save-project] Project saved: ${projectId} with key: ${projectKey}`);

    return c.json({ success: true, projectId });

  } catch (error: any) {
    console.error(`[save-project] Error: ${error.message}`, error);
    return c.json({ 
      success: false, 
      error: `프로젝트 저장 중 오류 발생: ${error.message}` 
    }, 500);
  }
});

// GET /api/project/:id - 프로젝트 불러오기
app.get("/make-server-36e21242/api/project/:id", async (c) => {
  try {
    const projectId = c.req.param("id");

    // 프로젝트 이름으로 검색
    let projectData: ProjectData | null = null;
    const projects = await kv.getByPrefix("project:") as ProjectData[];
    for (const proj of projects) {
      if (proj && proj.id === projectId) {
        projectData = proj;
        break;
      }
    }

    if (!projectData) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }

    console.log(`[get-project] Project loaded: ${projectId}`);

    return c.json({
      success: true,
      projectData
    });

  } catch (error: any) {
    console.error(`[get-project] Error: ${error.message}`, error);
    return c.json({ 
      success: false, 
      error: `프로젝트 불러오기 중 오류 발생: ${error.message}` 
    }, 500);
  }
});

// GET /api/projects - 모든 프로젝트 목록 (프리픽스 검색)
app.get("/make-server-36e21242/api/projects", async (c) => {
  try {
    const projectName = c.req.query("name"); // 프로젝트 이름으로 필터링 (선택적)
    
    const projects = await kv.getByPrefix("project:") as ProjectData[];

    // 프로젝트 목록만 (메타데이터)
    let projectList = projects
      .filter(p => p && p.id) // 유효한 프로젝트만
      .map(p => ({
        id: p.id,
        title: p.title,
        initialPrompt: p.initialPrompt,
        sceneCount: p.scenes.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));

    // 프로젝트 이름으로 필터링 (있는 경우)
    if (projectName) {
      projectList = projectList.filter(p => 
        p.title.toLowerCase().includes(projectName.toLowerCase())
      );
    }

    projectList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`[get-projects] Found ${projectList.length} projects${projectName ? ` (filtered by name: ${projectName})` : ''}`);

    return c.json({
      success: true,
      projects: projectList
    });

  } catch (error: any) {
    console.error(`[get-projects] Error: ${error.message}`, error);
    return c.json({ 
      success: false, 
      error: `프로젝트 목록 조회 중 오류 발생: ${error.message}` 
    }, 500);
  }
});

// Supabase Client 임포트
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Manim 렌더링 함수 (외부 서비스 호출)
async function renderManimScene(code: string, sceneNumber: number | string): Promise<string> {
  // 실제 렌더링을 위해서는 외부 Python 서버 또는 클라우드 서비스 필요
  // 예: 외부 렌더링 서버 API 호출
  // const renderServerUrl = Deno.env.get('MANIM_RENDER_SERVER_URL');
  // if (renderServerUrl) {
  //   const response = await fetch(`${renderServerUrl}/render`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ code, sceneNumber })
  //   });
  //   const result = await response.json();
  //   return result.videoUrl;
  // }
  
  // 임시: 렌더링된 영상 URL 생성 (실제로는 외부 서비스에서 받아옴)
  // 실제 구현 시 외부 렌더링 서비스 API를 호출해야 함
  const videoId = `render_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const videoUrl = `https://storage.example.com/renders/${videoId}.mp4`;
  
  // 코드를 임시 저장 (실제 렌더링 서비스에서 사용)
  await kv.set(`render:${videoId}`, {
    code,
    sceneNumber,
    timestamp: Date.now(),
    status: 'rendering'
  });
  
  // 실제 렌더링은 외부 서비스에서 수행되어야 함
  // 여기서는 임시 URL 반환
  return videoUrl;
}

// POST /api/render-scene - Scene 렌더링
app.post("/make-server-36e21242/api/render-scene", async (c) => {
  try {
    const body = await c.req.json();
    const { projectId, sceneNumber, code } = body;

    if (!projectId || sceneNumber === undefined || !code) {
      return c.json({ 
        success: false, 
        error: "projectId, sceneNumber, code 필요" 
      }, 400);
    }

    console.log(`[render-scene] Rendering scene ${sceneNumber} for project ${projectId}`);

    // Manim 코드 렌더링 (외부 서비스 호출)
    const videoUrl = await renderManimScene(code, sceneNumber);

    // 렌더링 결과 저장
    await kv.set(`render:${projectId}:${sceneNumber}`, {
      code,
      videoUrl,
      timestamp: Date.now(),
      sceneNumber,
      status: 'completed'
    });

    return c.json({
      success: true,
      videoUrl
    });

  } catch (error: any) {
    console.error('[render-scene]', error.message);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// POST /api/render-all - 전체 Scene 렌더링
app.post("/make-server-36e21242/api/render-all", async (c) => {
  try {
    const body = await c.req.json();
    const { projectId, code } = body;

    if (!projectId || !code) {
      return c.json({ 
        success: false, 
        error: "projectId, code 필요" 
      }, 400);
    }

    console.log(`[render-all] Rendering all scenes for project ${projectId}`);

    // 전체 Scene 렌더링
    const videoUrl = await renderManimScene(code, "all");

    // 렌더링 결과 저장
    await kv.set(`render:${projectId}:all`, {
      code,
      videoUrl,
      timestamp: Date.now(),
      sceneNumber: "all",
      status: 'completed'
    });

    return c.json({
      success: true,
      videoUrl
    });

  } catch (error: any) {
    console.error('[render-all]', error.message);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

Deno.serve(app.fetch);
