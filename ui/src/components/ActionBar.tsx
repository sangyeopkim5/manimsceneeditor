import { Button } from "./ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ActionBarProps {
  projectId: string;
  onExport?: () => void;
}

export function ActionBar({ projectId, onExport }: ActionBarProps) {
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      toast.info("내보내기 기능은 향후 구현 예정입니다.");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 shadow-lg z-50">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          Project ID: {projectId || "미생성"}
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            영상 내보내기
          </Button>
        </div>
      </div>
    </div>
  );
}
