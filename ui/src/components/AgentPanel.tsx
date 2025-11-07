import { ChatHistory, ChatMessage } from './ChatHistory';
import { PromptEditor } from './PromptEditor';

interface AgentPanelProps {
  sceneName: string;
  messages: ChatMessage[];
  onSubmit: (prompt: string, sceneOnly: boolean, images?: string[]) => void;
  isLoading: boolean;
}

export function AgentPanel({ sceneName, messages, onSubmit, isLoading }: AgentPanelProps) {
  return (
    <div className="h-full flex flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Chat History */}
      <div className="flex-1 overflow-hidden border-b border-zinc-800">
        <ChatHistory messages={messages} sceneName={sceneName} />
      </div>
      
      {/* Prompt Editor */}
      <div className="h-[280px]">
        <PromptEditor 
          sceneName={sceneName}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

