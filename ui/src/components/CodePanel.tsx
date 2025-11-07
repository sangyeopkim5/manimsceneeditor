import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Copy, Check, Play, Code2, Edit3 } from "lucide-react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";

interface CodePanelProps {
  code: string;
  sceneName: string;
  onCodeChange?: (newCode: string) => void;
  onRenderCode?: () => void;
  isRendering?: boolean;
  isEditable?: boolean;
}

export function CodePanel({ 
  code, 
  sceneName, 
  onCodeChange, 
  onRenderCode,
  isRendering = false,
  isEditable = true 
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const [originalCode, setOriginalCode] = useState(code); // 원본 코드 추적

  // code prop이 변경되면 editedCode와 originalCode도 업데이트
  useEffect(() => {
    setEditedCode(code);
    setOriginalCode(code); // 프롬프트로 업데이트되면 원본도 갱신
  }, [code]);

  // 코드가 수정되었는지 확인
  const hasCodeChanged = editedCode !== originalCode;

  const copyToClipboard = async (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // Silently fail
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode && onCodeChange && editedCode !== code) {
      // 수정 사항 저장
      onCodeChange(editedCode);
    }
    setIsEditMode(!isEditMode);
  };

  const handleRender = () => {
    // 수정이 없으면 실행 안 함
    if (!hasCodeChanged) {
      return;
    }
    // 수정된 코드가 있으면 먼저 저장
    if (editedCode !== code && onCodeChange) {
      onCodeChange(editedCode);
    }
    // 렌더링 실행
    if (onRenderCode) {
      onRenderCode();
    }
  };

  // Prism 하이라이팅 함수
  const highlightCode = (code: string) => {
    return Prism.highlight(code, Prism.languages.python, 'python');
  };

  return (
    <div className="bg-zinc-950 border-t border-zinc-800 h-full flex flex-col">
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-zinc-400" />
          <h3 className="text-zinc-100">Manim Code - {sceneName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <Button
                variant="outline"
                size="sm"
                className={`border-zinc-700 ${
                  isEditMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
                onClick={handleEditToggle}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                {isEditMode ? '저장' : '수정'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`border-zinc-700 ${
                  hasCodeChanged && !isRendering
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
                onClick={handleRender}
                disabled={!hasCodeChanged || isRendering}
                title={!hasCodeChanged ? '수정이력이 없습니다' : ''}
              >
                <Play className="w-4 h-4 mr-1" />
                {isRendering ? '렌더링 중...' : hasCodeChanged ? '수정된 코드 렌더링' : '수정이력 없음'}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
            onClick={() => copyToClipboard(isEditMode ? editedCode : code)}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div className="relative h-full">
          {isEditMode ? (
            <div className="h-full rounded border border-zinc-800 bg-zinc-900 overflow-auto">
              <Editor
                value={editedCode}
                onValueChange={setEditedCode}
                highlight={highlightCode}
                padding={16}
                className="font-mono text-sm"
                style={{
                  minHeight: '100%',
                  backgroundColor: '#18181b',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                }}
                textareaClassName="focus:outline-none"
              />
            </div>
          ) : (
            <ScrollArea className="h-full rounded border border-zinc-800 bg-zinc-900">
              <pre 
                className="p-4 text-sm font-mono"
                dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
              />
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
