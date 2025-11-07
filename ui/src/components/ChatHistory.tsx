import { ScrollArea } from "./ui/scroll-area";
import { User, Bot } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface ChatHistoryProps {
  messages: ChatMessage[];
  sceneName: string;
}

export function ChatHistory({ messages, sceneName }: ChatHistoryProps) {
  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 overflow-hidden">
      <div className="px-2 py-1.5 border-b border-zinc-800 flex-shrink-0">
        <h2 className="text-[10px] text-zinc-400 font-medium">CHAT HISTORY</h2>
        <p className="text-[9px] text-zinc-500 mt-0.5">{sceneName}</p>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 py-4 text-[10px]">
              수정 명령을 입력하면 대화 내용이 여기에 표시됩니다.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className="flex gap-2"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                  {message.role === "user" ? (
                    <User className="w-3 h-3 text-zinc-400" />
                  ) : (
                    <Bot className="w-3 h-3 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-[9px] text-zinc-500">
                    {message.role === "user" ? "사용자" : "AI"}
                  </div>
                  <div
                    className={`rounded p-1.5 text-[10px] ${
                      message.role === "user"
                        ? "bg-zinc-900 text-zinc-200"
                        : "bg-blue-950/30 text-zinc-300 border border-blue-900/30"
                    }`}
                  >
                    {message.content}
                  </div>
                  {/* 이미지 표시 */}
                  {message.images && message.images.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {message.images.map((img, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={img}
                          alt={`Image ${imgIndex + 1}`}
                          className="w-8 h-8 object-cover rounded border border-zinc-700"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
