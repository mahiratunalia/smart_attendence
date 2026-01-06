// src/components/attendance/ClassroomCodeInput.tsx
import React, { useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Props = {
  lectureId: string;
  onSuccess?: () => void;
};

export default function ClassroomCodeInput({ lectureId, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = useMemo(() => /^\d{4}$/.test(code), [code]);

  const submit = async () => {
    setMsg('');
    if (!lectureId) return setMsg('No lecture selected.');
    if (!valid) return setMsg('Enter a 4-digit code.');

    setLoading(true);

    // Prefer new endpoint if you added it; fallback to existing /attendance/mark
    const res = await api.markAttendanceByCode
      ? await api.markAttendanceByCode(lectureId, code)
      : await api.markAttendance({ lectureId, markedBy: 'code', code });

    setLoading(false);

    if (!res.success) return setMsg(res.message || 'Failed to mark attendance.');
    setMsg(`✅ Marked as "${res.data?.status || 'present'}"`);
    onSuccess?.();
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Enter Classroom Code</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          inputMode="numeric"
          style={{ width: 150, padding: 10, fontFamily: 'monospace', fontSize: 20, letterSpacing: 6 }}
        />
        <button onClick={submit} disabled={loading || !valid}>
          {loading ? 'Submitting…' : 'Mark Attendance'}
        </button>
      </div>

      {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
    </div>
  );
}