import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function ServerHealthCheck() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        console.log('[HealthCheck] Starting health check...');
        const response = await api.health();
        console.log('[HealthCheck] Response:', response);
        
        if (response.status === 'ok') {
          setStatus('ok');
        } else {
          setStatus('error');
          setError('서버가 올바르게 응답하지 않습니다');
        }
      } catch (err: any) {
        console.error('[HealthCheck] Error:', err);
        setStatus('error');
        setError(err.message || '서버 연결 실패');
      }
    };

    checkHealth();
  }, []);

  if (status === 'checking') {
    return (
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>서버 연결 확인 중...</AlertDescription>
      </Alert>
    );
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          서버 연결 실패: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500/50 bg-green-500/10">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <AlertDescription className="text-green-500">
        서버 연결 성공
      </AlertDescription>
    </Alert>
  );
}
