// src/components/attendance/QRScanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Props = {
  onSuccess?: () => void;
};

export default function QRScanner({ onSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [supported, setSupported] = useState(false);
  const [running, setRunning] = useState(false);
  const [manual, setManual] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // @ts-ignore
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  const stop = () => {
    setRunning(false);
    const v = videoRef.current;
    const stream = v?.srcObject as MediaStream | null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
  };

  const start = async () => {
    setMsg('');
    if (!supported) return setMsg('Camera scanning not supported. Use manual paste.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setRunning(true);
    } catch (e: any) {
      setMsg(e.message || 'Camera permission denied.');
    }
  };

  const submitPayload = async (qrPayload: string) => {
    setMsg('');
    // Prefer new endpoint if you added it; fallback to /attendance/mark with qr
    const res = await api.markAttendanceByQr
      ? await api.markAttendanceByQr(qrPayload)
      : await api.markAttendance({ lectureId: '', markedBy: 'qr' }); // fallback not usable without lectureId; keep endpoint

    if (!res.success) return setMsg(res.message || 'Failed to mark attendance.');
    setMsg(`✅ Marked as "${res.data?.status || 'present'}"`);
    onSuccess?.();
  };

  const submitManual = async () => {
    if (!manual.trim()) return setMsg('Paste QR payload first.');
    await submitPayload(manual.trim());
  };

  // scanning loop (BarcodeDetector)
  useEffect(() => {
    if (!running || !supported) return;

    let raf = 0;
    let stopped = false;

    // @ts-ignore
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

    const tick = async () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        try {
          const codes = await detector.detect(v);
          if (codes?.length) {
            const raw = codes[0]?.rawValue;
            if (raw) {
              stop();
              await submitPayload(raw);
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, supported]);

  useEffect(() => () => stop(), []);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>QR Scanner</div>

      {supported ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!running ? <button onClick={start}>Start Camera Scan</button> : <button onClick={stop}>Stop</button>}
          <span style={{ fontSize: 12, opacity: 0.75 }}>If camera doesn’t work, use manual paste below.</span>
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.75 }}>Camera scan not supported here. Use manual paste below.</div>
      )}

      {supported ? (
        <div style={{ marginTop: 10 }}>
          <video ref={videoRef} style={{ width: '100%', maxHeight: 240, borderRadius: 12, background: '#000' }} playsInline muted />
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Manual QR payload</div>
        <textarea
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder='{"lectureId":"...","code":"1234","exp":"..."}'
          style={{ width: '100%', height: 100, fontFamily: 'monospace', fontSize: 12 }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={submitManual}>Submit QR Payload</button>
        </div>
      </div>

      {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
    </div>
  );
}