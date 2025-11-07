import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState } from "react";

interface SceneSelectorProps {
  selectedScene: number | "all";
  onSceneSelect: (scene: number | "all") => void;
  scenes: number[];
  onAddScene: (position: number) => void;
}

export function SceneSelector({ selectedScene, onSceneSelect, scenes, onAddScene }: SceneSelectorProps) {
  const [isNewSceneMode, setIsNewSceneMode] = useState(false);
  const [insertPosition, setInsertPosition] = useState<string>("end");

  const handleAddScene = () => {
    if (insertPosition === "end") {
      onAddScene(scenes.length);
    } else {
      onAddScene(parseInt(insertPosition));
    }
    setIsNewSceneMode(false);
    setInsertPosition("end");
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-zinc-100">Manim Scene Editor</h1>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Scenes:</span>
          <Button
            variant={selectedScene === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onSceneSelect("all")}
            className={`rounded-full ${
              selectedScene === "all"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            전체
          </Button>
          {scenes.map((scene) => (
            <Button
              key={scene}
              variant={selectedScene === scene ? "default" : "outline"}
              size="sm"
              onClick={() => onSceneSelect(scene)}
              className={`rounded-full ${
                selectedScene === scene
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              }`}
            >
              Scene {scene}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="new-scene"
              checked={isNewSceneMode}
              onCheckedChange={(checked) => setIsNewSceneMode(checked as boolean)}
            />
            <Label
              htmlFor="new-scene"
              className="text-sm text-zinc-300 cursor-pointer"
            >
              새 Scene 추가
            </Label>
          </div>
        </div>
      </div>

      {isNewSceneMode && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-zinc-400">어디에 추가하시겠습니까?</span>
          <Select value={insertPosition} onValueChange={setInsertPosition}>
            <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="위치 선택" />
            </SelectTrigger>
            <SelectContent>
              {scenes.map((scene, index) => (
                <SelectItem key={`before-${scene}`} value={index.toString()}>
                  Scene {scene} 앞에
                </SelectItem>
              ))}
              <SelectItem value="end">맨 뒤에</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddScene} className="bg-blue-600 hover:bg-blue-700">
            추가
          </Button>
          <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => setIsNewSceneMode(false)}>
            취소
          </Button>
        </div>
      )}
    </div>
  );
}
