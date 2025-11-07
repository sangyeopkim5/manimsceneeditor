# Manim Scene Editor - 시스템 사양서

## 1. 시스템 개요

Manim 영상을 Scene 단위로 생성하고 수정할 수 있는 AI 기반 플랫폼입니다. 사용자가 자연어로 영상을 요청하면, AI(Claude)가 Scene별로 Manim 코드를 생성하고, 각 Scene을 개별적으로 수정할 수 있습니다.

## 2. 주요 워크플로우

### 2.1 초기 영상 생성 플로우
```
1. 사용자: 초기 프롬프트 입력 
   예: "피타고라스 정리를 증명하는 애니메이션 영상"

2. Frontend → Backend: POST /api/generate-initial
   {
     "prompt": "피타고라스 정리를 증명하는 애니메이션 영상"
   }

3. Backend → Claude API: 초기 프롬프트 전송

4. Claude: Scene 구조 + 각 Scene별 Manim 코드 생성

5. Backend → Frontend: 
   {
     "scenes": [1, 2, 3, 4],
     "sceneCodes": {
       "1": "class Scene1(Scene): ...",
       "2": "class Scene2(Scene): ...",
       "3": "class Scene3(Scene): ...",
       "4": "class Scene4(Scene): ...",
       "all": "# 전체 Scene 통합 코드"
     },
     "description": "Scene 1: 제목, Scene 2: 정리 설명, ..."
   }

6. Frontend: Scene 목록 표시 + Scene 1 자동 선택
```

### 2.2 Scene 수정 플로우
```
1. 사용자: Scene 3 선택

2. 사용자: 수정 명령 입력
   예: "점 B를 왼쪽으로 2만큼 이동하고 각도 표시 추가"

3. Frontend → Backend: POST /api/modify-scene
   {
     "sceneNumber": 3,
     "prompt": "점 B를 왼쪽으로 2만큼 이동하고 각도 표시 추가",
     "sceneOnly": true,
     "currentCode": "class Scene3(Scene): ...",
     "chatHistory": [
       {"role": "user", "content": "..."},
       {"role": "assistant", "content": "..."}
     ]
   }

4. Backend → Claude API: 대화 컨텍스트 + 현재 코드 + 수정 명령

5. Claude: 수정된 Manim 코드 생성

6. Backend → Frontend:
   {
     "updatedCode": "class Scene3(Scene): ...",
     "explanation": "코드를 수정했습니다. 점 B를 LEFT*2로 이동하고...",
     "needsRender": true
   }

7. Frontend: 
   - 코드 패널 업데이트
   - 대화 히스토리에 추가
   - (선택적) 자동 렌더링 요청
```

## 3. 컴포넌트별 상세 기능

### 3.1 InitialPrompt (components/InitialPrompt.tsx)
**역할**: 앱 최초 실행 시 영상 생성 프롬프트 입력

**UI 요소**:
- 대형 타이틀: "어떤 Manim 영상을 생성하시겠습니까?"
- 텍스트 영역: 자유 형식 프롬프트 입력
- 예시 프롬프트 4개 (클릭하면 자동 입력)
- "Scene 생성하기" 버튼
- 로딩 상태 표시

**Props**:
```typescript
interface InitialPromptProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}
```

**키보드 단축키**: Ctrl + Enter로 제출

---

### 3.2 SceneSelector (components/SceneSelector.tsx)
**역할**: Scene 목록 표시 및 선택, Scene 추가

**UI 요소**:
- Scene 번호 버튼들 (1, 2, 3, ...)
- "전체" 버튼 (모든 Scene 통합 렌더링용)
- Scene 사이에 "+" 버튼 (새 Scene 삽입)

**Props**:
```typescript
interface SceneSelectorProps {
  selectedScene: number | "all";
  onSceneSelect: (scene: number | "all") => void;
  scenes: number[];
  onAddScene: (position: number) => void;
}
```

**상태**:
- `selectedScene`: 현재 선택된 Scene (1, 2, 3, ... 또는 "all")
- `scenes`: Scene 번호 배열 [1, 2, 3, 4]

---

### 3.3 ChatHistory (components/ChatHistory.tsx)
**역할**: Scene별 대화 내역 표시 (Figma Make 스타일)

**UI 요소**:
- Scene 이름 표시 (예: "Scene 3" 또는 "전체 Scene")
- 대화 메시지 목록 (스크롤 가능)
- 사용자 메시지: 회색 배경
- AI 메시지: 파란색 테두리 배경

**Props**:
```typescript
interface ChatHistoryProps {
  messages: ChatMessage[];
  sceneName: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

**데이터 구조**:
```typescript
// Scene별 독립적인 대화 히스토리
sceneChats = {
  1: [
    { role: "user", content: "제목 크기 키워줘" },
    { role: "assistant", content: "제목 크기를 1.5배로 키웠습니다." }
  ],
  2: [...],
  3: [...],
  all: [
    { role: "user", content: "피타고라스 정리 영상 만들어줘" },
    { role: "assistant", content: "4개 Scene으로 구성했습니다..." }
  ]
}
```

---

### 3.4 PromptEditor (components/PromptEditor.tsx)
**역할**: Scene 수정 명령 입력

**UI 요소**:
- Scene 이름 표시
- 텍스트 영역: 수정 명령 입력
- "이 Scene만 수정" 체크박스
- "코드 생성하기" 버튼
- 로딩 상태 표시

**Props**:
```typescript
interface PromptEditorProps {
  sceneName: string;
  onSubmit: (prompt: string, sceneOnly: boolean) => void;
  isLoading: boolean;
}
```

**키보드 단축키**: Ctrl + Enter로 제출

---

### 3.5 LivePreview (components/LivePreview.tsx)
**역할**: Scene 렌더링 결과 영상 미리보기

**현재 상태**: Mock 이미지 표시

**향후 기능**:
- Scene별 렌더링 영상 표시
- 재생/일시정지 컨트롤
- 재렌더링 버튼

**예상 데이터 플로우**:
```
1. Scene 코드 변경 시
2. Backend로 렌더링 요청
3. Manim 렌더링 (서버 측)
4. 영상 URL 반환
5. 비디오 플레이어에 표시
```

---

### 3.6 CodePanel (components/CodePanel.tsx)
**역할**: Scene별 Manim 코드 표시 및 복사

**UI 요소**:
- Scene 이름 표시
- 코드 에디터 (읽기 전용, 스크롤 가능)
- "복사" 버튼 (클립보드 복사)
- 복사 성공 시 체크 아이콘

**Props**:
```typescript
interface CodePanelProps {
  code: string;
  sceneName: string;
}
```

**기능**:
- `copyToClipboard()`: document.execCommand 방식으로 클립보드 복사

---

### 3.7 ActionBar (components/ActionBar.tsx)
**역할**: 전역 액션 버튼 (화면 하단 고정)

**UI 요소**:
- "전체 렌더링" 버튼
- "내보내기" 버튼
- "프로젝트 저장" 버튼

**현재 상태**: UI만 구현, 기능 미연결

---

### 3.8 App.tsx (메인 로직)
**상태 관리**:

```typescript
// 초기화 상태
const [initialized, setInitialized] = useState(false);
const [isLoading, setIsLoading] = useState(false);

// Scene 관리
const [selectedScene, setSelectedScene] = useState<number | "all">(1);
const [scenes, setScenes] = useState<number[]>([]);

// Scene별 코드 관리
const [sceneCodes, setSceneCodes] = useState<SceneCode>({
  1: "class Scene1(Scene): ...",
  2: "class Scene2(Scene): ...",
  all: "# 전체 Scene 통합 코드"
});

// Scene별 대화 히스토리 관리
const [sceneChats, setSceneChats] = useState<SceneChatHistory>({
  1: [...],
  2: [...],
  all: [...]
});
```

**주요 함수**:

1. `generateInitialScenes(prompt: string)`
   - 초기 프롬프트를 받아 Scene 생성
   - 현재: Mock 데이터 (3개 Scene)
   - 향후: Backend API 호출

2. `generateSceneCode(prompt: string, sceneOnly: boolean)`
   - Scene 수정 명령 처리
   - 현재: Mock 코드 업데이트
   - 향후: Backend API 호출

3. `handleAddScene(position: number)`
   - 새 Scene 추가 (Scene 사이 삽입)

4. `getCurrentCode()` / `getCurrentChat()` / `getSceneName()`
   - 선택된 Scene의 데이터 반환

---

## 4. Backend API 사양

### 4.1 POST /api/generate-initial
**설명**: 초기 프롬프트로 Scene 생성

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
  "scenes": [1, 2, 3, 4],
  "sceneCodes": {
    "1": "class Scene1(Scene):\n    def construct(self):\n        ...",
    "2": "class Scene2(Scene):\n    def construct(self):\n        ...",
    "3": "class Scene3(Scene):\n    def construct(self):\n        ...",
    "4": "class Scene4(Scene):\n    def construct(self):\n        ...",
    "all": "# 전체 Scene 통합\nclass AllScenes(Scene):\n    ..."
  },
  "description": "Scene 1: 제목과 소개\nScene 2: 정리 설명\nScene 3: 증명 과정\nScene 4: 마무리",
  "chatHistory": {
    "all": [
      {
        "role": "user",
        "content": "피타고라스 정리를 증명하는 애니메이션 영상"
      },
      {
        "role": "assistant",
        "content": "4개의 Scene으로 구성했습니다..."
      }
    ]
  }
}
```

---

### 4.2 POST /api/modify-scene
**설명**: Scene 수정 명령 처리

**Request**:
```json
{
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
  "explanation": "점 B를 LEFT*2로 이동했고, Angle() 객체를 추가하여 각도를 표시했습니다.",
  "needsRender": true
}
```

---

### 4.3 POST /api/render-scene
**설명**: Scene 렌더링 요청 (향후 구현)

**Request**:
```json
{
  "sceneNumber": 3,
  "code": "class Scene3(Scene):\n    def construct(self):\n        ..."
}
```

**Response**:
```json
{
  "success": true,
  "videoUrl": "https://storage.example.com/renders/scene3_abc123.mp4",
  "thumbnailUrl": "https://storage.example.com/renders/scene3_abc123_thumb.png",
  "renderTime": 12.5
}
```

---

### 4.4 POST /api/render-all
**설명**: 전체 Scene 통합 렌더링 (향후 구현)

**Request**:
```json
{
  "sceneCodes": {
    "1": "class Scene1(Scene): ...",
    "2": "class Scene2(Scene): ...",
    "3": "class Scene3(Scene): ..."
  }
}
```

**Response**:
```json
{
  "success": true,
  "videoUrl": "https://storage.example.com/renders/all_scenes_xyz789.mp4",
  "duration": 45.2,
  "renderTime": 38.7
}
```

---

## 5. Claude API 프롬프트 전략

### 5.1 초기 Scene 생성 프롬프트
```
당신은 Manim 애니메이션 전문가입니다.
사용자의 요청에 따라 영상을 논리적인 Scene들로 나누고, 각 Scene의 Manim 코드를 생성하세요.

사용자 요청:
{user_prompt}

응답 형식:
1. Scene 구조 설명 (각 Scene이 무엇을 보여줄지)
2. 각 Scene별 Manim 코드 (class Scene1(Scene), Scene2(Scene), ...)
3. 전체 Scene을 통합한 AllScenes 클래스

규칙:
- 각 Scene은 10-30초 분량
- Scene 간 논리적 흐름이 있어야 함
- Manim 3.0 최신 문법 사용
- 주석은 한국어로
```

### 5.2 Scene 수정 프롬프트
```
현재 Scene {scene_number}의 코드를 수정합니다.

현재 코드:
{current_code}

이전 대화:
{chat_history}

사용자 수정 요청:
{user_prompt}

응답 형식:
1. 수정된 완전한 코드
2. 무엇을 어떻게 수정했는지 설명

규칙:
- 기존 코드의 구조를 최대한 유지
- 수정 요청 부분만 변경
- 전체 Scene이 자연스럽게 동작해야 함
```

---

## 6. 데이터 타입 정의

```typescript
// Scene 코드 맵
interface SceneCode {
  [key: number]: string;  // Scene 번호별 코드
  all: string;             // 전체 통합 코드
}

// Scene 대화 히스토리 맵
interface SceneChatHistory {
  [key: number]: ChatMessage[];
  all: ChatMessage[];
}

// 대화 메시지
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

// Scene 정보
interface SceneInfo {
  number: number;
  code: string;
  chatHistory: ChatMessage[];
  lastModified: string;
  renderUrl?: string;
}

// 프로젝트 전체 데이터
interface ProjectData {
  id: string;
  title: string;
  initialPrompt: string;
  scenes: number[];
  sceneCodes: SceneCode;
  sceneChats: SceneChatHistory;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. 향후 구현 필요 기능

### 7.1 우선순위 높음
- [ ] 실제 Claude API 연동
- [ ] Scene 렌더링 (Manim 서버)
- [ ] 렌더링 진행 상태 표시
- [ ] Scene 삭제 기능
- [ ] 프로젝트 저장/불러오기

### 7.2 우선순위 중간
- [ ] 코드 직접 수정 (에디터 모드)
- [ ] Scene 순서 변경 (드래그 앤 드롭)
- [ ] Scene 복제
- [ ] 전체 코드 내보내기 (.py 파일)
- [ ] 영상 내보내기 (.mp4 파일)

### 7.3 우선순위 낮음
- [ ] 사용자 인증
- [ ] 프로젝트 공유
- [ ] 렌더링 큐 관리
- [ ] 템플릿 라이브러리
- [ ] 협업 기능

---

## 8. 기술 스택

### Frontend
- **프레임워크**: React 18 + TypeScript
- **스타일링**: Tailwind CSS v4.0
- **UI 컴포넌트**: shadcn/ui
- **아이콘**: lucide-react
- **상태 관리**: React useState (향후 Zustand/Redux 고려)

### Backend (권장 스택)
- **언어**: Python 3.10+
- **프레임워크**: FastAPI
- **AI**: Anthropic Claude API
- **렌더링**: Manim Community Edition
- **저장소**: PostgreSQL (프로젝트 데이터) + S3 (영상 파일)
- **큐**: Celery + Redis (렌더링 작업 관리)

---

## 9. 보안 고려사항

1. **코드 실행 샌드박스**: Manim 코드를 안전한 환경에서 실행
2. **Rate Limiting**: Claude API 호출 제한
3. **코드 검증**: 악의적인 코드 실행 방지
4. **파일 크기 제한**: 렌더링 영상 크기 제한
5. **세션 관리**: 프로젝트별 독립된 세션

---

## 10. 성능 최적화

1. **렌더링 캐싱**: 동일 코드 재렌더링 방지
2. **점진적 로딩**: Scene별 개별 렌더링
3. **WebSocket**: 실시간 렌더링 진행 상태
4. **CDN**: 렌더링 영상 캐싱
5. **코드 디바운싱**: 빠른 연속 수정 시 API 호출 최소화

---

## 11. 배포 환경

### 권장 구성
```
Frontend (Vercel/Netlify)
    ↓
API Gateway
    ↓
Backend API (AWS ECS/GCP Cloud Run)
    ↓
Render Queue (Celery Workers)
    ↓
Object Storage (S3/GCS)
```

### 환경 변수
```bash
# Frontend
VITE_API_URL=https://api.manim-editor.com

# Backend
CLAUDE_API_KEY=sk-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
S3_BUCKET=manim-renders
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

---

## 12. 참고 자료

- Manim Documentation: https://docs.manim.community/
- Claude API: https://docs.anthropic.com/claude/reference
- Shadcn UI: https://ui.shadcn.com/
