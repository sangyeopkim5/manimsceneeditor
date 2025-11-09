// Railway 렌더링 서버로 HTTP 요청을 보내 Manim 렌더링

/**
 * Manim 코드 렌더링
 */
export async function renderManim(
  manimCode: string,
  renderServerUrl: string
): Promise<{ success: boolean; videoUrl: string | null; error?: string; stdout?: string; stderr?: string }> {
  try {
    console.log(`[renderManim] Using render server: ${renderServerUrl}`);
    console.log(`[renderManim] Sending render request...`);

    // 코드에 이미 import가 있는지 확인
    const trimmedCode = manimCode.trim();
    let finalCode = trimmedCode;

    // from manim import가 없으면 추가
    if (!trimmedCode.includes('from manim import')) {
      finalCode = `from manim import *\n\n${trimmedCode}`;
    }

    // Railway 렌더링 서버로 요청
    const response = await fetch(`${renderServerUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: finalCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Render server error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.videoUrl) {
      // Railway 서버가 반환한 상대 경로를 절대 URL로 변환
      const videoUrl = result.videoUrl.startsWith('http') 
        ? result.videoUrl 
        : `${renderServerUrl}${result.videoUrl}`;
      
      console.log(`[renderManim] Rendering successful! Video URL: ${videoUrl}`);
      return {
        success: true,
        videoUrl,
      };
    }

    // 에러 발생
    const errorMsg = result.error || '비디오 생성 실패';
    console.error(`[renderManim] Rendering failed:`, errorMsg);

    return {
      success: false,
      videoUrl: null,
      error: errorMsg,
    };
  } catch (error) {
    console.error('[renderManim] Exception:', error);
    return {
      success: false,
      videoUrl: null,
      error: error instanceof Error ? error.message : '렌더링 실패',
    };
  }
}

/**
 * 여러 영상을 하나로 병합 (ffmpeg 사용)
 */
export async function mergeVideos(
  videoUrls: string[],
  renderServerUrl: string
): Promise<{ success: boolean; videoUrl: string | null; error?: string }> {
  try {
    console.log(`[mergeVideos] Using render server: ${renderServerUrl}`);
    console.log(`[mergeVideos] Sending merge request for ${videoUrls.length} videos`);

    // Railway 렌더링 서버로 요청
    // videoUrls를 Railway 서버가 접근 가능한 경로로 변환해야 함
    // 현재는 videoUrls가 백엔드 서버의 로컬 경로이므로 수정 필요
    
    const response = await fetch(`${renderServerUrl}/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_paths: videoUrls, // 실제로는 Railway에서 접근 가능한 URL이어야 함
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Merge server error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.videoUrl) {
      // Railway 서버가 반환한 상대 경로를 절대 URL로 변환
      const videoUrl = result.videoUrl.startsWith('http') 
        ? result.videoUrl 
        : `${RENDER_SERVER_URL}${result.videoUrl}`;
      
      console.log(`[mergeVideos] Merge successful! Video URL: ${videoUrl}`);
      return {
        success: true,
        videoUrl,
      };
    }

    // 에러 발생
    const errorMsg = result.error || '영상 병합 실패';
    console.error(`[mergeVideos] Merge failed:`, errorMsg);

    return {
      success: false,
      videoUrl: null,
      error: errorMsg,
    };
  } catch (error) {
    console.error('[mergeVideos] Exception:', error);
    return {
      success: false,
      videoUrl: null,
      error: error instanceof Error ? error.message : '영상 병합 실패',
    };
  }
}
