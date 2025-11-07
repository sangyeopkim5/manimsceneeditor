import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Send, Sparkles, ImagePlus, X } from "lucide-react";
import { ServerHealthCheck } from "./ServerHealthCheck";

interface InitialPromptProps {
  onSubmit: (prompt: string, images?: string[]) => void;
  isLoading: boolean;
}

export function InitialPrompt({ onSubmit, isLoading }: InitialPromptProps) {
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
      onSubmit(prompt, images.length > 0 ? images : undefined);
    }
  };

  const examplePrompts = [
    "피타고라스 정리를 증명하는 애니메이션 영상",
    "이차방정식의 근의 공식 유도 과정",
    "미분의 기하학적 의미 시각화",
    "행렬의 곱셈 과정을 단계별로 보여주기"
  ];

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 overflow-auto">
      <div className="w-full max-w-2xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl mb-2 text-zinc-100">Manim Scene Editor</h1>
          <p className="text-zinc-400">어떤 Manim 영상을 생성하시겠습니까?</p>
        </div>

        <div className="mb-4">
          <ServerHealthCheck />
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="initial-prompt" className="text-zinc-300">
              영상 설명을 입력하세요
            </Label>
            <Textarea
              id="initial-prompt"
              placeholder="예: 피타고라스 정리를 증명하는 애니메이션 영상을 만들고 싶습니다."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-2 min-h-[120px] bg-zinc-900 border-zinc-700 text-zinc-100 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* 이미지 미리보기 */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 rounded border border-zinc-800">
              {images.map((img, index) => (
                <div key={index} className="relative">
                  <img 
                    src={img} 
                    alt={`Upload ${index + 1}`} 
                    className="w-12 h-12 object-cover rounded border border-zinc-700"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-0 right-0 w-4 h-4 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all"
                    title="이미지 삭제"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scene 생성 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Scene 생성하기
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
              className="border-2 border-white text-white bg-white/10 whitespace-nowrap"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              사진 찾기
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-xs text-zinc-500 mb-3">예시 프롬프트:</p>
            <div className="grid grid-cols-1 gap-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(example)}
                  className="text-left text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 p-3 rounded border border-zinc-800 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-zinc-600 text-center mt-4">
            Ctrl + Enter를 눌러 빠르게 제출할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
