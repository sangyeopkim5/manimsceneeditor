# Backend 구현 가이드

## 구현 완료 ✅

Supabase Edge Functions 기반 백엔드가 완전히 구축되었습니다!

---

## 1. 서버 구조

### 파일 구조
```
/supabase/functions/server/
├── index.tsx          # API 엔드포인트 (Hono 서버)
└── kv_store.tsx       # KV Store 유틸리티 (보호됨)

/utils/
└── api.ts             # Frontend API 클라이언트
```

---

## 2. API 엔드포인트

### 베이스 URL
```
https://{projectId}.supabase.co/functions/v1/make-server-36e21242
```

### 2.1 Health Check
```
GET /health
```

**Response**:
```json
{
  "status": "ok"
}
```

---

### 2.2 초기 Scene 생성
```
POST /api/generate-initial
```

**Request**:
```json
{
  "prompt": "피타고라스 정리를 증명하는 애니메이션 영상"
}
```

**Response**:
```json
{
  "success": true,
  "projectId": "project_1730123456789_abc123",
  "scenes": [1, 2, 3],
  "sceneCodes": {
    "1": "class Scene1(Scene):\n    def construct(self):\n        ...",
    "2": "class Scene2(Scene):\n    def construct(self):\n        ...",
    "3": "class Scene3(Scene):\n    def construct(self):\n        ...",
    "all": "class AllScenes(Scene):\n    def construct(self):\n        ..."
  },
  "sceneChats": {
    "1": [],
    "2": [],
    "3": [],
    "all": [
      {
        "role": "user",
        "content": "피타고라스 정리를 증명하는 애니메이션 영상",
        "timestamp": "2025-11-02T10:30:45.123Z"
      },
      {
        "role": "assistant",
        "content": "영상을 3개의 Scene으로 구성했습니다...",
        "timestamp": "2025-11-02T10:30:47.456Z"
      }
    ]
  },
  "description": "영상을 3개의 Scene으로 구성했습니다..."
}
```

**현재 동작**:
- ✅ Mock 데이터로 Scene 3개 자동 생성
- ✅ KV Store에 프로젝트 저장
- ✅ 고유 Project ID 생성
- ⏳ Claude API 연동 대기 (TODO 주석 표시됨)

---

### 2.3 Scene 수정
```
POST /api/modify-scene
```

**Request**:
```json
{
  "projectId": "project_1730123456789_abc123",
  "sceneNumber": 3,
  "prompt": "점 B를 왼쪽으로 2만큼 이동하고 각도 표시 추가",
  "sceneOnly": true,
  "currentCode": "class Scene3(Scene):\n    def construct(self):\n        ...",
  "chatHistory": [
    {
      "role": "user",
      "content": "삼각형 추가해줘"
    },
    {
      "role": "assistant",
      "content": "삼각형을 추가했습니다."
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "updatedCode": "class Scene3(Scene):\n    def construct(self):\n        # 수정된 코드\n        ...",
  "explanation": "Scene 3 코드를 수정했습니다.\n\n수정 내용:\n- 점 B를 왼쪽으로 2만큼 이동\n- 각도 표시 추가",
  "chatHistory": [
    {
      "role": "user",
      "content": "삼각형 추가해줘",
      "timestamp": "..."
    },
    {
      "role": "assistant",
      "content": "삼각형을 추가했습니다.",
      "timestamp": "..."
    },
    {
      "role": "user",
      "content": "점 B를 왼쪽으로 2만큼 이동하고 각도 표시 추가",
      "timestamp": "..."
    },
    {
      "role": "assistant",
      "content": "Scene 3 코드를 수정했습니다...",
      "timestamp": "..."
    }
  ],
  "needsRender": true
}
```

**현재 동작**:
- ✅ Mock 코드 생성
- ✅ 대화 히스토리 저장
- ✅ KV Store 업데이트
- ⏳ Claude API 연동 대기

---

### 2.4 프로젝트 저장
```
POST /api/save-project
```

**Request**:
```json
{
  "projectId": "project_1730123456789_abc123",
  "projectData": {
    "id": "project_1730123456789_abc123",
    "title": "피타고라스 정리 증명 영상",
    "initialPrompt": "피타고라스 정리를 증명하는 애니메이션 영상",
    "scenes": [1, 2, 3],
    "sceneCodes": { ... },
    "sceneChats": { ... },
    "createdAt": "2025-11-02T10:30:45.123Z",
    "updatedAt": "2025-11-02T11:45:20.789Z"
  }
}
```

**Response**:
```json
{
  "success": true,
  "projectId": "project_1730123456789_abc123"
}
```

---

### 2.5 프로젝트 불러오기
```
GET /api/project/:id
```

**Example**:
```
GET /api/project/project_1730123456789_abc123
```

**Response**:
```json
{
  "success": true,
  "projectData": {
    "id": "project_1730123456789_abc123",
    "title": "피타고라스 정리 증명 영상",
    "initialPrompt": "피타고라스 정리를 증명하는 애니메이션 영상",
    "scenes": [1, 2, 3],
    "sceneCodes": { ... },
    "sceneChats": { ... },
    "createdAt": "2025-11-02T10:30:45.123Z",
    "updatedAt": "2025-11-02T11:45:20.789Z"
  }
}
```

---

### 2.6 프로젝트 목록 조회
```
GET /api/projects
```

**Response**:
```json
{
  "success": true,
  "projects": [
    {
      "id": "project_1730123456789_abc123",
      "title": "피타고라스 정리 증명 영상",
      "initialPrompt": "피타고라스 정리를 증명하는 애니메이션 영상",
      "sceneCount": 3,
      "createdAt": "2025-11-02T10:30:45.123Z",
      "updatedAt": "2025-11-02T11:45:20.789Z"
    },
    {
      "id": "project_1730098765432_xyz789",
      "title": "이차방정식 근의 공식",
      "initialPrompt": "이차방정식 근의 공식 유도 과정",
      "sceneCount": 4,
      "createdAt": "2025-11-01T15:20:30.456Z",
      "updatedAt": "2025-11-01T16:10:15.789Z"
    }
  ]
}
```

---

## 3. 데이터 저장 구조 (KV Store)

### 키 패턴
```
project:{projectId}  →  ProjectData 객체
```

### ProjectData 스키마
```typescript
interface ProjectData {
  id: string;                                    // 고유 ID
  title: string;                                 // 프로젝트 제목
  initialPrompt: string;                         // 초기 프롬프트
  scenes: number[];                              // [1, 2, 3, 4]
  sceneCodes: {                                  // Scene별 코드
    [key: number]: string;                       // 1: "class Scene1...", 2: ...
    all: string;                                 // 전체 통합 코드
  };
  sceneChats: {                                  // Scene별 대화
    [key: number]: ChatMessage[];
    all: ChatMessage[];
  };
  createdAt: string;                             // ISO 타임스탬프
  updatedAt: string;                             // ISO 타임스탬프
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;                             // ISO 타임스탬프
}
```

---

## 4. Frontend 통합

### API 클라이언트 사용법

```typescript
import { api } from './utils/api';

// 1. 초기 Scene 생성
const response = await api.generateInitial(prompt);
console.log(response.projectId);  // "project_..."
console.log(response.scenes);     // [1, 2, 3]

// 2. Scene 수정
const modifyResponse = await api.modifyScene(
  projectId,
  3,                    // Scene 번호
  "점 추가해줘",
  true,                 // Scene만 수정
  currentCode,
  chatHistory
);
console.log(modifyResponse.updatedCode);

// 3. 프로젝트 저장
await api.saveProject(projectId, projectData);

// 4. 프로젝트 불러오기
const project = await api.getProject(projectId);

// 5. 프로젝트 목록
const projects = await api.getProjects();
```

### Toast 알림
```typescript
import { toast } from "sonner@2.0.3";

toast.success("Scene이 생성되었습니다!");
toast.error("오류가 발생했습니다");
toast.info("향후 구현 예정입니다");
```

---

## 5. Claude API 연동 방법

### 5.1 환경 변수 설정
Supabase Dashboard에서 설정:
```
CLAUDE_API_KEY=sk-ant-api03-...
```

### 5.2 코드 수정 위치

`/supabase/functions/server/index.tsx`에서 TODO 주석 찾기:

#### 초기 Scene 생성 (Line ~70)
```typescript
async function mockGenerateInitialScenes(prompt: string) {
  // TODO: 실제 Claude API 호출로 교체
  // const response = await fetch('https://api.anthropic.com/v1/messages', {...});
  
  // Claude API 연동 예시:
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `당신은 Manim 애니메이션 전문가입니다.
사용자의 요청에 따라 영상을 논리적인 Scene들로 나누고, 각 Scene의 Manim 코드를 생성하세요.

사용자 요청: ${prompt}

응답 형식 (JSON):
{
  "scenes": [1, 2, 3],
  "sceneCodes": {
    "1": "class Scene1(Scene): ...",
    "2": "class Scene2(Scene): ...",
    "3": "class Scene3(Scene): ...",
    "all": "class AllScenes(Scene): ..."
  },
  "description": "Scene 1: ..., Scene 2: ..."
}`
      }]
    })
  });

  const data = await response.json();
  return JSON.parse(data.content[0].text);
}
```

#### Scene 수정 (Line ~120)
```typescript
async function mockModifyScene(...) {
  // TODO: 실제 Claude API 호출로 교체
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        ...chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: `현재 코드:\n${currentCode}\n\n수정 요청: ${prompt}`
        }
      ]
    })
  });

  const data = await response.json();
  return {
    updatedCode: extractCode(data.content[0].text),
    explanation: extractExplanation(data.content[0].text)
  };
}
```

---

## 6. 에러 처리

모든 API는 다음과 같은 에러 응답을 반환합니다:

```json
{
  "success": false,
  "error": "상세한 오류 메시지"
}
```

HTTP 상태 코드:
- `200`: 성공
- `400`: 잘못된 요청 (필수 파라미터 누락 등)
- `404`: 리소스 없음 (프로젝트 미발견)
- `500`: 서버 오류

Frontend에서 에러 처리:
```typescript
try {
  const response = await api.generateInitial(prompt);
  if (!response.success) {
    throw new Error(response.error);
  }
  // 성공 처리
} catch (error: any) {
  console.error(error);
  toast.error(error.message);
}
```

---

## 7. 로깅

서버 로그는 Hono logger를 통해 자동으로 출력됩니다:

```
[generate-initial] Prompt: 피타고라스 정리...
[generate-initial] Project created: project_...
[modify-scene] Project: project_..., Scene: 3, Prompt: ...
[modify-scene] Scene 3 updated
```

Supabase Dashboard → Functions → Logs에서 확인 가능합니다.

---

## 8. 보안

### API 인증
- Authorization 헤더에 Supabase Anon Key 필요
- CORS 정책: 모든 origin 허용 (프로덕션에서는 제한 권장)

### 환경 변수 보호
- `CLAUDE_API_KEY`는 서버 측에서만 접근
- Frontend에서는 절대 노출되지 않음

### KV Store 접근
- Edge Function 내부에서만 접근 가능
- 외부에서 직접 접근 불가

---

## 9. 테스트

### Health Check
```bash
curl https://{projectId}.supabase.co/functions/v1/make-server-36e21242/health
```

### 초기 Scene 생성 테스트
```bash
curl -X POST \
  https://{projectId}.supabase.co/functions/v1/make-server-36e21242/api/generate-initial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {anonKey}" \
  -d '{"prompt":"테스트 영상"}'
```

---

## 10. 다음 단계

### 우선순위 높음
- [ ] Claude API 실제 연동
- [ ] Scene 삭제 API 추가
- [ ] Scene 순서 변경 API
- [ ] 프로젝트 삭제 API

### 우선순위 중간
- [ ] Manim 렌더링 서버 구축
- [ ] 렌더링 진행 상태 WebSocket
- [ ] 영상 파일 스토리지 (Supabase Storage)
- [ ] 사용자 인증 (Supabase Auth)

### 우선순위 낮음
- [ ] Rate Limiting
- [ ] 렌더링 큐 관리
- [ ] 프로젝트 공유 기능
- [ ] 협업 기능

---

## 완료된 기능 ✅

1. ✅ Supabase Edge Functions 서버 구축
2. ✅ 5개 API 엔드포인트 구현
3. ✅ KV Store 데이터 저장
4. ✅ Frontend API 클라이언트
5. ✅ Toast 알림 시스템
6. ✅ 프로젝트 저장/불러오기
7. ✅ Scene별 코드/대화 관리
8. ✅ 에러 처리 및 로깅
9. ✅ TypeScript 타입 정의

**Backend가 완전히 구축되었습니다!**  
이제 Claude API 키만 연결하면 실제로 AI가 Manim 코드를 생성할 수 있습니다.
