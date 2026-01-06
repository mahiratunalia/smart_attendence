// src/components/lectures/QRGenerator.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Props = {
  lectureId: string;
  courseName?: string;
};

export default function QRGenerator({ lectureId, courseName }: Props) {
  const [session, setSession] = useState<any>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const expiresInSec = useMemo(() => {
    const exp = session?.codeExpiresAt;
    if (!exp) return 0;
    const ms = new Date(exp).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  }, [session?.codeExpiresAt]);

  const refreshSession = async () => {
    const res = await api.getLectureSession(lectureId);
    if (res.success) setSession(res.data);
  };

  const refreshCount = async () => {
    const r = await api.getAttendanceByLecture(lectureId);
    if (!r.success) return;
    const count = (r.data || []).filter((x: any) => ['present', 'late', 'excused'].includes(x.status)).length;
    setAttendanceCount(count);
  };

  useEffect(() => {
    refreshSession();
    refreshCount();
    const t = setInterval(() => {
      refreshSession();
      refreshCount();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  useEffect(() => {
    if (!autoRotate) return;
    if (!session?.isActive) return;
    if (expiresInSec !== 0) return;
    rotate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresInSec, session?.isActive, autoRotate]);

  const start = async () => {
    setLoading(true);
    setErr('');
    const res = await api.startLectureSession(lectureId);
    setLoading(false);
    if (!res.success) return setErr(res.message || 'Failed to start session');
    setSession(res.data);
  };

  const rotate = async () => {
    setLoading(true);
    setErr('');
    const res = await api.rotateLectureSession(lectureId);
    setLoading(false);
    if (!res.success) return setErr(res.message || 'Failed to rotate session');
    setSession(res.data);
  };

  const end = async () => {
    setLoading(true);
    setErr('');
    const res = await api.endLectureSession(lectureId);
    setLoading(false);
    if (!res.success) return setErr(res.message || 'Failed to end session');
    setSession(res.data);
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            Lecture Session {courseName ? `— ${courseName}` : ''}
          </div>
          <div style={{ opacity: 0.85 }}>
            Status: <b>{session?.isActive ? 'LIVE' : 'Inactive'}</b>
            {session?.isActive ? <span> • Expires in <b>{expiresInSec}s</b></span> : null}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, opacity: 0.85, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
            Auto rotate
          </label>

          {!session?.isActive ? (
            <button onClick={start} disabled={loading}>
              {loading ? 'Starting…' : 'Start'}
            </button>
          ) : (
            <>
              <button onClick={rotate} disabled={loading}>{loading ? 'Rotating…' : 'Rotate'}</button>
              <button onClick={end} disabled={loading}>{loading ? 'Ending…' : 'End'}</button>
            </>
          )}
        </div>
      </div>

      {err ? <div style={{ marginTop: 10, color: 'crimson' }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Classroom Code</div>
          <div style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 900, letterSpacing: 6 }}>
            {session?.classroomCode || '----'}
          </div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Present count: <b>{attendanceCount}</b>
          </div>
        </div>

        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div style={{ opacity: 0.8, fontSize: 12 }}>QR Payload (paste into QRScanner manual mode)</div>
          <textarea
            readOnly
            value={session?.qrCode || ''}
            style={{ width: '100%', height: 120, fontFamily: 'monospace', fontSize: 12 }}
          />
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            You can render this as a real QR image using your QR library by setting its value to <code>session.qrCode</code>.
          </div>
        </div>
      </div>
    </div>
  );
}