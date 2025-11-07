import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Send, ImagePlus, X } from "lucide-react";

interface PromptEditorProps {
  sceneName: string;
  onSubmit: (prompt: string, sceneOnly: boolean, images?: string[]) => void;
  isLoading: boolean;
}

export function PromptEditor({ sceneName, onSubmit, isLoading }: PromptEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          newImages.push(base64);
          if (newImages.length === files.length) {
            setImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt, false, images.length > 0 ? images : undefined);
      setPrompt("");
      setImages([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      <div className="px-2 py-1.5 border-b border-zinc-800">
        <h2 className="text-[10px] text-zinc-400 font-medium">PROMPT</h2>
        <p className="text-[9px] text-zinc-500 mt-0.5">{sceneName}</p>
      </div>

      <div className="flex-1 flex flex-col p-2 gap-2 overflow-auto">
        <div className="flex flex-col gap-1">
          <Label htmlFor="prompt-input" className="text-zinc-300 text-[9px]">
            수정 명령
          </Label>
          <Textarea
            id="prompt-input"
            placeholder="예: 점 B를 왼쪽으로 2만큼 이동"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] bg-zinc-900 border-zinc-700 text-zinc-100 resize-none text-[10px] py-1.5 px-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmit();
              }
            }}
          />
        </div>

        {/* 이미지 미리보기 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-1 p-1.5 bg-zinc-900 rounded border border-zinc-800">
            {images.map((img, index) => (
              <div key={index} className="relative">
                <img 
                  src={img} 
                  alt={`Upload ${index + 1}`} 
                  className="w-8 h-8 object-cover rounded border border-zinc-700"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all"
                  title="이미지 삭제"
                >
                  <X className="w-2 h-2 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 버튼 그룹 */}
        <div className="flex gap-1.5">
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-7 text-[10px] px-2"
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 mr-1 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Send className="w-3 h-3 mr-1" />
                생성
              </>
            )}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <Button 
            type="button"
            variant="outline"
            className="border border-zinc-700 text-zinc-300 bg-zinc-800 whitespace-nowrap h-7 text-[10px] px-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <ImagePlus className="w-3 h-3 mr-1" />
            사진
          </Button>
        </div>

        <p className="text-[8px] text-zinc-600 text-center">
          Ctrl + Enter로 제출
        </p>
      </div>
    </div>
  );
}
