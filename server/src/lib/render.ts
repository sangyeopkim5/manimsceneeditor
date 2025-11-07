// Python 스크립트를 직접 실행하여 Manim 렌더링
import { spawn } from 'child_process';
import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// 경로 설정 - server 디렉토리에서 실행되므로 상위 디렉토리로 이동
// process.cwd()는 server 디렉토리를 가리킴
const MY_APP_DIR = join(process.cwd(), '..'); // server의 상위 디렉토리 (my-app)
const RENDER_SERVER_DIR = join(MY_APP_DIR, 'render-server');
const PUBLIC_VIDEO_DIR = join(MY_APP_DIR, 'public', 'media', 'video');

// 경로 디버깅
console.log('[render.ts] Path configuration:');
console.log(`  process.cwd(): ${process.cwd()}`);
console.log(`  MY_APP_DIR: ${MY_APP_DIR}`);
console.log(`  RENDER_SERVER_DIR: ${RENDER_SERVER_DIR}`);
console.log(`  PUBLIC_VIDEO_DIR: ${PUBLIC_VIDEO_DIR}`);

/**
 * Python 스크립트 실행 헬퍼
 */
function runPythonScript(
  scriptPath: string,
  input: string,
  cwd: string
): Promise<{ ok: boolean; video_relpath?: string; error?: string; stdout?: string; stderr?: string }> {
  return new Promise((resolve, reject) => {
    // Python 명령어 결정 (Windows: py, Linux/Mac: python3 또는 python)
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
    
    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32', // Windows에서 shell 사용
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // stdout에서 JSON 파싱 시도
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            resolve({
              ok: result.ok || false,
              video_relpath: result.video_relpath,
              error: result.error,
              stdout,
              stderr,
            });
          } else {
            resolve({
              ok: false,
              error: `JSON 파싱 실패: ${stdout}`,
              stdout,
              stderr,
            });
          }
        } catch (e) {
          resolve({
            ok: false,
            error: `JSON 파싱 오류: ${e instanceof Error ? e.message : 'Unknown error'}`,
            stdout,
            stderr,
          });
        }
      } else {
        resolve({
          ok: false,
          error: stderr || `Python 프로세스가 코드 ${code}로 종료됨`,
          stdout,
          stderr,
        });
      }
    });

    pythonProcess.on('error', (error) => {
      reject({
        ok: false,
        error: `Python 프로세스 시작 실패: ${error.message}`,
        stdout,
        stderr,
      });
    });
  });
}

/**
 * 파일 존재 확인
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Manim 코드 렌더링
 */
export async function renderManim(
  manimCode: string
): Promise<{ success: boolean; videoUrl: string | null; error?: string; stdout?: string; stderr?: string }> {
  const jobId = randomUUID();
  const videoPath = join(PUBLIC_VIDEO_DIR, `${jobId}.mp4`);

  try {
    // 디렉토리 생성
    await mkdir(PUBLIC_VIDEO_DIR, { recursive: true });

    console.log(`[renderManim] Starting render for job ${jobId}`);
    console.log(`[renderManim] Video will be saved to: ${videoPath}`);

    // 코드에 이미 import가 있는지 확인
    const trimmedCode = manimCode.trim();
    let finalCode = trimmedCode;

    // from manim import가 없으면 추가
    if (!trimmedCode.includes('from manim import')) {
      finalCode = `from manim import *\n\n${trimmedCode}`;
    }

    // Python 렌더링 스크립트에 전달할 JSON 입력
    const input = JSON.stringify({
      code: finalCode,
      dest_path: videoPath,
    });

    // Python 렌더링 스크립트 실행
    console.log(`[renderManim] Running: python render.py`);
    console.log(`[renderManim] Working directory: ${RENDER_SERVER_DIR}`);
    const result = await runPythonScript('render.py', input, RENDER_SERVER_DIR);

    console.log(`[renderManim] Pipeline result:`, {
      ok: result.ok,
      hasVideoPath: !!result.video_relpath,
      error: result.error,
    });

    if (result.ok && result.video_relpath) {
      // 비디오 파일이 실제로 생성되었는지 확인
      const videoExists = await fileExists(videoPath);
      
      if (videoExists) {
        // 백엔드 서버가 비디오를 서빙하는 URL 반환 (절대 경로)
        const backendPort = process.env.PORT || '8787';
        const videoUrl = `http://localhost:${backendPort}/api/v1/media/video/${jobId}.mp4`;
        console.log(`[renderManim] Rendering successful! Video URL: ${videoUrl}`);
        return {
          success: true,
          videoUrl,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      } else {
        console.error(`[renderManim] Video file not found at ${videoPath}`);
        return {
          success: false,
          videoUrl: null,
          error: `비디오 파일이 생성되지 않았습니다: ${videoPath}`,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }
    }

    // 에러 발생
    const errorMsg = result.error || '비디오 생성 실패';
    console.error(`[renderManim] Rendering failed:`, errorMsg);
    if (result.stdout) {
      console.error(`[renderManim] stdout:`, result.stdout.substring(0, 500));
    }
    if (result.stderr) {
      console.error(`[renderManim] stderr:`, result.stderr.substring(0, 500));
    }

    return {
      success: false,
      videoUrl: null,
      error: errorMsg,
      stdout: result.stdout,
      stderr: result.stderr,
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
  videoUrls: string[]
): Promise<{ success: boolean; videoUrl: string | null; error?: string }> {
  const jobId = randomUUID();
  const outputPath = join(PUBLIC_VIDEO_DIR, `merged_${jobId}.mp4`);

  try {
    // 디렉토리 생성
    await mkdir(PUBLIC_VIDEO_DIR, { recursive: true });

    console.log(`[mergeVideos] Starting merge for ${videoUrls.length} videos`);
    console.log(`[mergeVideos] Output will be saved to: ${outputPath}`);

    // URL을 로컬 파일 경로로 변환
    const localPaths: string[] = [];
    const backendPort = process.env.PORT || '8787';
    const urlPrefix = `http://localhost:${backendPort}/api/v1/media/video/`;
    
    for (const url of videoUrls) {
      // URL에서 파일명 추출
      let filename = '';
      if (url.startsWith(urlPrefix)) {
        filename = url.substring(urlPrefix.length).split('?')[0]; // 쿼리 파라미터 제거
      } else {
        // 다른 형식의 URL 처리
        const parts = url.split('/');
        filename = parts[parts.length - 1].split('?')[0];
      }
      
      const localPath = join(PUBLIC_VIDEO_DIR, filename);
      
      // 파일 존재 확인
      const exists = await fileExists(localPath);
      if (!exists) {
        console.error(`[mergeVideos] Video file not found: ${localPath}`);
        return {
          success: false,
          videoUrl: null,
          error: `영상 파일을 찾을 수 없습니다: ${filename}`,
        };
      }
      
      localPaths.push(localPath);
    }

    console.log(`[mergeVideos] Local paths:`, localPaths);

    // Python merge 스크립트 실행을 위한 간단한 래퍼 스크립트 작성
    const mergeScriptPath = join(RENDER_SERVER_DIR, 'merge_wrapper.py');
    const mergeScript = `
import sys
import json
from render import merge_videos

if __name__ == "__main__":
    raw = sys.stdin.read()
    payload = json.loads(raw)
    video_paths = payload.get("video_paths", [])
    output_path = payload.get("output_path")
    
    result = merge_videos(video_paths, output_path)
    print(json.dumps(result, ensure_ascii=False))
`;

    // 임시 스크립트 생성
    await writeFile(mergeScriptPath, mergeScript, 'utf-8');

    // Python 스크립트에 전달할 JSON 입력
    const input = JSON.stringify({
      video_paths: localPaths,
      output_path: outputPath,
    });

    // Python 병합 스크립트 실행
    console.log(`[mergeVideos] Running: python merge_wrapper.py`);
    const result = await runPythonScript('merge_wrapper.py', input, RENDER_SERVER_DIR);

    console.log(`[mergeVideos] Merge result:`, {
      ok: result.ok,
      hasVideoPath: !!result.video_relpath,
      error: result.error,
    });

    if (result.ok && result.video_relpath) {
      // 비디오 파일이 실제로 생성되었는지 확인
      const videoExists = await fileExists(outputPath);
      
      if (videoExists) {
        // 백엔드 서버가 비디오를 서빙하는 URL 반환
        const videoUrl = `${urlPrefix}merged_${jobId}.mp4`;
        console.log(`[mergeVideos] Merge successful! Video URL: ${videoUrl}`);
        return {
          success: true,
          videoUrl,
        };
      } else {
        console.error(`[mergeVideos] Merged video file not found at ${outputPath}`);
        return {
          success: false,
          videoUrl: null,
          error: `병합된 비디오 파일이 생성되지 않았습니다`,
        };
      }
    }

    // 에러 발생
    const errorMsg = result.error || '영상 병합 실패';
    console.error(`[mergeVideos] Merge failed:`, errorMsg);
    if (result.stdout) {
      console.error(`[mergeVideos] stdout:`, result.stdout.substring(0, 500));
    }
    if (result.stderr) {
      console.error(`[mergeVideos] stderr:`, result.stderr.substring(0, 500));
    }

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
