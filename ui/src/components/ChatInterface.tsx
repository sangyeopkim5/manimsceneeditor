import { useState, useEffect, useRef } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ScrollArea } from './ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { Conversation, Message } from '../types/chat';
import {
  getAllConversations,
  getConversation,
  createNewConversation,
  deleteConversation as deleteConversationStorage,
  addMessageToConversation,
  createMessage,
  getActiveConversationId,
  setActiveConversationId,
} from '../utils/chatStorage';
import { api } from '../utils/api';
import { toast } from 'sonner';

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 초기 로드
  useEffect(() => {
    loadConversations();
    const savedActiveId = getActiveConversationId();
    if (savedActiveId) {
      setActiveConversationIdState(savedActiveId);
    }
  }, []);

  // 대화 목록 새로고침
  const loadConversations = () => {
    const loaded = getAllConversations();
    setConversations(loaded);
  };

  // 스크롤 자동 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, activeConversationId, streamingContent]);

  // 현재 대화 가져오기
  const currentConversation = activeConversationId
    ? conversations.find(c => c.id === activeConversationId)
    : null;

  // 새 대화 생성
  const handleNewConversation = () => {
    const newConv = createNewConversation();
    loadConversations();
    setActiveConversationIdState(newConv.id);
    setActiveConversationId(newConv.id);
  };

  // 대화 선택
  const handleSelectConversation = (id: string) => {
    setActiveConversationIdState(id);
    setActiveConversationId(id);
  };

  // 대화 삭제
  const handleDeleteConversation = (id: string) => {
    if (window.confirm('이 대화를 삭제하시겠습니까?')) {
      deleteConversationStorage(id);
      loadConversations();
      if (activeConversationId === id) {
        setActiveConversationIdState(null);
      }
    }
  };

  // 메시지 전송
  const handleSendMessage = async (content: string) => {
    // 활성 대화가 없으면 새로 생성
    let conversationId = activeConversationId;
    if (!conversationId) {
      const newConv = createNewConversation();
      conversationId = newConv.id;
      setActiveConversationIdState(conversationId);
      setActiveConversationId(conversationId);
    }

    // 사용자 메시지 저장
    const userMessage = createMessage('user', content);
    addMessageToConversation(conversationId, userMessage);
    loadConversations();

    // 스트리밍 시작
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // 현재 대화의 전체 메시지 히스토리 가져오기
      const conversation = getConversation(conversationId);
      if (!conversation) {
        throw new Error('대화를 찾을 수 없습니다');
      }

      const messages = conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // 스트리밍 응답 받기
      let fullResponse = '';
      for await (const chunk of api.streamChat(messages)) {
        fullResponse += chunk;
        setStreamingContent(fullResponse);
      }

      // 어시스턴트 메시지 저장
      const assistantMessage = createMessage('assistant', fullResponse);
      addMessageToConversation(conversationId, assistantMessage);
      loadConversations();
      setStreamingContent('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(`메시지 전송 실패: ${error.message}`);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="h-screen flex bg-zinc-950">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation || streamingContent ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="max-w-4xl mx-auto w-full">
                {currentConversation?.messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                
                {/* 스트리밍 중인 메시지 */}
                {streamingContent && (
                  <div className="flex gap-3 px-4 py-4 bg-zinc-950">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-400 mb-1">Claude</div>
                      <div className="text-zinc-100 whitespace-pre-wrap break-words">
                        {streamingContent}
                        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <ChatInput
              onSend={handleSendMessage}
              disabled={isStreaming}
              placeholder={isStreaming ? '응답을 기다리는 중...' : '메시지를 입력하세요...'}
            />
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <div className="text-lg mb-2">새 대화를 시작하세요</div>
              <div className="text-sm">왼쪽의 "새 대화" 버튼을 클릭하거나</div>
              <div className="text-sm">아래에 메시지를 입력하세요</div>
            </div>
          </div>
        )}
        
        {/* Empty State에서도 입력창 표시 */}
        {!currentConversation && !streamingContent && (
          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming}
            placeholder="메시지를 입력하세요..."
          />
        )}
      </div>
    </div>
  );
}

