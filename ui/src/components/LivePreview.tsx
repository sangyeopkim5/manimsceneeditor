import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Play, Download, Loader2, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface LivePreviewProps {
  videoUrl?: string;
  isRendering?: boolean;
  onDownload?: () => void;
  sceneNumber?: number | 'all';
}

export function LivePreview({ videoUrl, isRendering, sceneNumber }: LivePreviewProps) {
  const [timelineValue, setTimelineValue] = useState([0]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // videoUrl prop 변경 추적
  useEffect(() => {
    console.log(`[LivePreview] videoUrl prop changed:`, videoUrl);
    setVideoError(null); // 새로운 URL이 들어오면 에러 초기화
  }, [videoUrl]);

  // videoUrl이 변경될 때 비디오 상태 초기화 및 강제 리로드
  useEffect(() => {
    console.log(`[LivePreview] videoUrl effect triggered, videoUrl:`, videoUrl);
    if (videoUrl && videoRef.current) {
      const video = videoRef.current;
      console.log(`[LivePreview] Loading video with URL:`, videoUrl);
      
      // 상태 초기화
      setCurrentTime(0);
      setTimelineValue([0]);
      setDuration(0);
      setVideoError(null);
      
      // 비디오 강제 리로드
      video.load();
      
      // 메타데이터 로드 시도
      video.addEventListener('loadedmetadata', () => {
        console.log('[LivePreview] Video metadata loaded after URL change');
      }, { once: true });
    } else if (!videoUrl) {
      console.log(`[LivePreview] No videoUrl provided`);
      setVideoError(null);
    }
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isNaN(video.currentTime) && !isNaN(video.duration)) {
        setCurrentTime(video.currentTime);
        setTimelineValue([video.currentTime]);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };

    const handleLoadedData = () => {
      if (!isNaN(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };

    const handleEnded = () => {
      setCurrentTime(0);
      setTimelineValue([0]);
    };

    const handleError = (e: any) => {
      console.error('[LivePreview] Video error:', e);
      console.error('[LivePreview] Video URL:', videoUrl);
      console.error('[LivePreview] Video src:', video?.src);
      console.error('[LivePreview] Video error details:', {
        code: video?.error?.code,
        message: video?.error?.message,
        networkState: video?.networkState,
        readyState: video?.readyState,
      });
      
      let errorMessage = '비디오를 로드할 수 없습니다';
      if (video?.error) {
        switch (video.error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMessage = '비디오 로드가 중단되었습니다';
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage = '네트워크 오류로 비디오를 로드할 수 없습니다';
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = '비디오 디코딩 오류';
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage = '지원하지 않는 비디오 형식입니다';
            break;
        }
      }
      setVideoError(errorMessage);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    const newTime = value[0];
    if (!isNaN(newTime) && newTime >= 0 && newTime <= duration) {
      video.currentTime = newTime;
      setTimelineValue(value);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) {
      return;
    }
    setShowVideoModal(true);
  };

  const handleActualDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    const sceneName = sceneNumber === 'all' ? 'all' : `scene${sceneNumber}`;
    a.download = `${sceneName}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-zinc-100">Live Preview</h2>
        {videoUrl && !isRendering && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadVideo}
            className="border-blue-600 bg-blue-600 hover:bg-gray-600 text-white font-medium"
            title="영상 다운로드"
          >
            <Download className="w-4 h-4 mr-2" />
            다운로드
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4 gap-4">
        <div className="flex-1 flex items-center justify-center bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          {isRendering ? (
            <div className="text-center space-y-3">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-400" />
              <p className="text-zinc-400">영상 렌더링 중...</p>
            </div>
          ) : videoUrl ? (
            <div className="w-full h-full relative">
              {videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 rounded-lg p-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto bg-red-900/20 rounded-full flex items-center justify-center">
                      <span className="text-red-400 text-2xl">⚠</span>
                    </div>
                    <p className="text-red-400 text-sm font-medium">{videoError}</p>
                    <p className="text-zinc-500 text-xs break-all">{videoUrl}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.load();
                          setVideoError(null);
                        }
                      }}
                      className="mt-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                    >
                      다시 시도
                    </Button>
                  </div>
                </div>
              ) : (
                <video
                  key={videoUrl} // URL이 변경되면 비디오 요소를 완전히 재생성
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls={false}
                  preload="metadata"
                  crossOrigin="anonymous"
                  onLoadedMetadata={() => {
                    console.log('[LivePreview] Video metadata loaded');
                    if (videoRef.current && !isNaN(videoRef.current.duration)) {
                      setDuration(videoRef.current.duration);
                      console.log('[LivePreview] Video duration:', videoRef.current.duration);
                    }
                  }}
                  onLoadedData={() => {
                    console.log('[LivePreview] Video data loaded');
                    setVideoError(null); // 성공적으로 로드되면 에러 초기화
                  }}
                  onCanPlay={() => {
                    console.log('[LivePreview] Video can play');
                  }}
                  onError={(e) => {
                    console.error('[LivePreview] Video load error:', e);
                    console.error('[LivePreview] Video URL:', videoUrl);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">영상을 렌더링하면 여기에 표시됩니다</p>
              <p className="text-zinc-600 text-xs">Scene 생성 후 자동으로 렌더링됩니다</p>
            </div>
          )}
        </div>

        {videoUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-12">{formatTime(currentTime)}</span>
              <Slider
                value={timelineValue}
                onValueChange={handleSeek}
                max={duration > 0 ? duration : 100}
                step={0.1}
                className="flex-1"
                disabled={!videoUrl || duration === 0}
              />
              <span className="text-xs text-zinc-500 w-12 text-right">{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {!isRendering && !videoUrl && (
          <div className="text-center text-sm text-zinc-500 border-t border-zinc-800 pt-3">
            Scene을 생성하면 자동으로 렌더링됩니다
          </div>
        )}
      </div>

      {/* 전체화면 비디오 모달 */}
      {showVideoModal && videoUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* X 버튼 - 오른쪽 상단 */}
          <button
            onClick={() => setShowVideoModal(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors z-10"
            title="닫기"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* 비디오 크게 표시 */}
          <div className="w-[90%] h-[90%] flex flex-col items-center justify-center gap-4">
            <video
              src={videoUrl}
              controls
              autoPlay
              className="max-w-full max-h-[calc(100%-80px)] object-contain"
            />
            
            {/* 다운로드 버튼 */}
            <Button
              onClick={handleActualDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              비디오 다운로드
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
