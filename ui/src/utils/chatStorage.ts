import { Conversation, Message } from '../types/chat';

const STORAGE_KEY = 'claude_conversations';
const ACTIVE_CONVERSATION_KEY = 'claude_active_conversation';

/**
 * 모든 대화 목록 가져오기
 */
export function getAllConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Conversation[];
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

/**
 * 특정 대화 가져오기
 */
export function getConversation(id: string): Conversation | null {
  const conversations = getAllConversations();
  return conversations.find(c => c.id === id) || null;
}

/**
 * 대화 저장 (생성 또는 업데이트)
 */
export function saveConversation(conversation: Conversation): void {
  try {
    const conversations = getAllConversations();
    const index = conversations.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      // 업데이트
      conversations[index] = conversation;
    } else {
      // 새로 생성
      conversations.unshift(conversation); // 최신 대화가 위로
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
}

/**
 * 대화 삭제
 */
export function deleteConversation(id: string): void {
  try {
    const conversations = getAllConversations();
    const filtered = conversations.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // 활성 대화가 삭제된 경우 초기화
    if (getActiveConversationId() === id) {
      setActiveConversationId(null);
    }
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
}

/**
 * 새 대화 생성
 */
export function createNewConversation(): Conversation {
  const now = Date.now();
  const conversation: Conversation = {
    id: `conv_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title: '새 대화',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  
  saveConversation(conversation);
  return conversation;
}

/**
 * 대화에 메시지 추가
 */
export function addMessageToConversation(
  conversationId: string,
  message: Message
): void {
  const conversation = getConversation(conversationId);
  if (!conversation) return;
  
  conversation.messages.push(message);
  conversation.updatedAt = Date.now();
  
  // 첫 번째 사용자 메시지로 제목 자동 설정
  if (conversation.messages.length === 1 && message.role === 'user') {
    conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
  }
  
  saveConversation(conversation);
}

/**
 * 대화 제목 변경
 */
export function updateConversationTitle(id: string, title: string): void {
  const conversation = getConversation(id);
  if (!conversation) return;
  
  conversation.title = title;
  conversation.updatedAt = Date.now();
  saveConversation(conversation);
}

/**
 * 활성 대화 ID 가져오기
 */
export function getActiveConversationId(): string | null {
  return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
}

/**
 * 활성 대화 ID 설정
 */
export function setActiveConversationId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }
}

/**
 * 메시지 생성 헬퍼
 */
export function createMessage(role: 'user' | 'assistant', content: string): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: Date.now(),
  };
}

