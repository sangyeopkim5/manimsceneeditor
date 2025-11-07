// 채팅 메시지 타입
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// 대화 타입
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// 스트리밍 이벤트 타입
export interface StreamEvent {
  type: 'text' | 'done' | 'error';
  content?: string;
  error?: string;
}

