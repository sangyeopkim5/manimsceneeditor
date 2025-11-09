import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { authMiddleware } from './middleware/auth';
import { getDatabase, testDatabaseConnection } from './lib/db';
import { setEnvContext, clearEnvContext, getDatabaseUrl, getRequiredEnv } from './lib/env';
import * as schema from './schema/users';
import { renderManim, mergeVideos } from './lib/render';
import Anthropic from '@anthropic-ai/sdk';

type Env = {
  RUNTIME?: string;
  [key: string]: any;
};

// Types for Scene API
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  timestamp: string;
}

interface SceneCode {
  [key: number]: string;
  all: string;
}

const app = new Hono<{ Bindings: Env }>();

// In Node.js environment, set environment context from process.env
if (typeof process !== 'undefined' && process.env) {
  setEnvContext(process.env);
}

// Environment context middleware - detect runtime using RUNTIME env var
app.use('*', async (c, next) => {
  if (c.env?.RUNTIME === 'cloudflare') {
    setEnvContext(c.env);
  }
  
  await next();
  // No need to clear context - env vars are the same for all requests
  // In fact, clearing the context would cause the env vars to potentially be unset for parallel requests
});

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check route - public
app.get('/', (c) => c.json({ status: 'ok', message: 'API is running' }));

// API routes
const api = new Hono();

// Public routes go here (if any)
api.get('/hello', (c) => {
  return c.json({
    message: 'Hello from Hono!',
  });
});

// Database test route - public for testing
api.get('/db-test', async (c) => {
  try {
    // Use external DB URL if available, otherwise use local PostgreSQL database server
    // Note: In development, the port is dynamically allocated by port-manager.js
    const defaultLocalConnection = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
    const dbUrl = getDatabaseUrl() || defaultLocalConnection;
    
    const db = await getDatabase(dbUrl);
    const isHealthy = await testDatabaseConnection();
    
    if (!isHealthy) {
      return c.json({
        error: 'Database connection is not healthy',
        timestamp: new Date().toISOString(),
      }, 500);
    }
    
    const result = await db.select().from(schema.users).limit(5);
    
    return c.json({
      message: 'Database connection successful!',
      users: result,
      connectionHealthy: isHealthy,
      usingLocalDatabase: !getDatabaseUrl(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database test error:', error);
    return c.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// 비디오 파일 서빙 엔드포인트
api.get('/media/video/:filename', async (c) => {
  const filename = c.req.param('filename');
  // server 디렉토리에서 실행되므로 상위 디렉토리의 public으로 이동
  const videoPath = join(process.cwd(), '..', 'public', 'media', 'video', filename);

  try {
    const videoBuffer = await readFile(videoPath);
    return new Response(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (error) {
    console.error(`[media/video] File not found: ${filename}`);
    return c.json({ error: 'Video not found' }, 404);
  }
});

// 렌더링 엔드포인트 - public (인증 필요 시 protectedRoutes로 이동)
api.post('/render-scene', async (c) => {
  try {
    const body = await c.req.json();
    const { manim_code } = body;

    if (!manim_code || typeof manim_code !== 'string') {
      return c.json({
        success: false,
        videoUrl: null,
        error: 'manim_code가 필요합니다',
      }, 400);
    }

    // Python 스크립트 직접 실행하여 렌더링
    const result = await renderManim(manim_code);
    
    return c.json(result);
  } catch (error) {
    console.error('[render-scene] Error:', error);
    return c.json({
      success: false,
      videoUrl: null,
      error: error instanceof Error ? error.message : '렌더링 실패',
    }, 500);
  }
});

// 영상 병합 엔드포인트 - public
api.post('/merge-videos', async (c) => {
  try {
    const body = await c.req.json();
    const { videoUrls } = body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return c.json({
        success: false,
        videoUrl: null,
        error: 'videoUrls 배열이 필요합니다',
      }, 400);
    }

    console.log('[merge-videos] Merging videos:', videoUrls);
    
    // 영상 병합 실행
    const result = await mergeVideos(videoUrls);
    
    return c.json(result);
  } catch (error) {
    console.error('[merge-videos] Error:', error);
    return c.json({
      success: false,
      videoUrl: null,
      error: error instanceof Error ? error.message : '영상 병합 실패',
    }, 500);
  }
});

// Claude API - Scene 생성
async function generateInitialScenes(prompt: string, images?: string[]) {
  const apiKey = getRequiredEnv('CLAUDE_API_KEY');

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

  const anthropic = new Anthropic({ apiKey });

  try {
    const contentParts: any[] = [{ type: 'text', text: prompt }];

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentParts }]
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

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
  const apiKey = getRequiredEnv('CLAUDE_API_KEY');

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

  const anthropic = new Anthropic({ apiKey });

  try {
    const messages: any[] = [];
    
    for (const msg of chatHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

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

// Scene 생성 API
api.post('/generate-initial', async (c) => {
  try {
    console.log('[generate-initial] Request received');
    
    const body = await c.req.json();
    const { prompt, images } = body;

    if (!prompt) {
      console.log('[generate-initial] Error: No prompt provided');
      return c.json({ success: false, error: "Prompt is required" }, 400);
    }

    console.log('[generate-initial] Prompt:', prompt);
    console.log('[generate-initial] Images count:', images ? images.length : 0);

    const { scenes, sceneCodes, description } = await generateInitialScenes(prompt, images);

    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

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
    scenes.forEach((sceneNum: number) => {
      sceneChats[sceneNum] = [];
    });

    console.log('[generate-initial] Project created:', projectId);

    return c.json({
      success: true,
      projectId,
      scenes,
      sceneCodes,
      sceneChats,
      description
    });

  } catch (error: any) {
    console.error('[generate-initial] Error:', error.message, error);
    return c.json({ 
      success: false, 
      error: `Scene 생성 중 오류 발생: ${error.message}` 
    }, 500);
  }
});

// Scene 수정 API
api.post('/modify-scene', async (c) => {
  try {
    const body = await c.req.json();
    const { projectId, sceneNumber, prompt, sceneOnly, currentCode, chatHistory, images } = body;

    if (!projectId || sceneNumber === undefined || !prompt) {
      return c.json({ 
        success: false, 
        error: "projectId, sceneNumber, and prompt are required" 
      }, 400);
    }

    console.log('[modify-scene] Project:', projectId, 'Scene:', sceneNumber, 'Prompt:', prompt);
    console.log('[modify-scene] Images count:', images ? images.length : 0);

    const { updatedCode, explanation } = await modifyScene(
      sceneNumber,
      prompt,
      currentCode,
      chatHistory || [],
      images
    );

    const now = new Date().toISOString();

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

    const updatedChatHistory = [...(chatHistory || []), userMessage, assistantMessage];

    console.log('[modify-scene] Scene', sceneNumber, 'updated');

    return c.json({
      success: true,
      updatedCode,
      explanation,
      chatHistory: updatedChatHistory,
      needsRender: true
    });

  } catch (error: any) {
    console.error('[modify-scene] Error:', error.message, error);
    return c.json({ 
      success: false, 
      error: `Scene 수정 중 오류 발생: ${error.message}` 
    }, 500);
  }
});

// 채팅 스트리밍 엔드포인트 - public
api.post('/chat/stream', async (c) => {
  try {
    const body = await c.req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({
        error: '메시지 배열이 필요합니다',
      }, 400);
    }

    console.log('[chat/stream] Starting stream with', messages.length, 'messages');

    // 환경 변수에서 API 키 가져오기
    const apiKey = getRequiredEnv('CLAUDE_API_KEY');

    // Anthropic 클라이언트 생성
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // SSE 헤더 설정
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('X-Accel-Buffering', 'no');

    // 메시지 포맷 변환 (Anthropic API 형식에 맞게)
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 시스템 프롬프트 with Prompt Caching
    const systemPrompt = `당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.`;

    // ReadableStream 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Anthropic 스트리밍 시작
          const messageStream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            messages: formattedMessages,
            // Prompt Caching 적용
            system: [
              {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' },
              },
            ],
          });

          // 스트림 데이터 전송
          for await (const event of messageStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              const sseData = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`;
              controller.enqueue(new TextEncoder().encode(sseData));
            }
          }

          // 완료 메시지 전송
          const doneData = `data: ${JSON.stringify({ type: 'done' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(doneData));
          
          console.log('[chat/stream] Stream completed successfully');
          controller.close();
        } catch (error) {
          console.error('[chat/stream] Stream error:', error);
          const errorData = `data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[chat/stream] Error:', error);
    return c.json({
      error: error instanceof Error ? error.message : '채팅 스트리밍 실패',
    }, 500);
  }
});

// Protected routes - require authentication
const protectedRoutes = new Hono();

protectedRoutes.use('*', authMiddleware);

protectedRoutes.get('/me', (c) => {
  const user = c.get('user');
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      photo_url: user.photo_url,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    message: 'You are authenticated!',
  });
});

// Mount the protected routes under /protected
api.route('/protected', protectedRoutes);

// Mount the API router
app.route('/api/v1', api);

export default app; 