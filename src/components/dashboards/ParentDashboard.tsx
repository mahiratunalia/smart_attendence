// src/components/dashboards/ParentDashboard.tsx
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ParentDashboard() {
  const [links, setLinks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');

    const a = await api.getMyParentLinks();
    if (!a.success) setErr(a.message || 'Failed to load linked students');
    setLinks(a.data || []);

    const b = await api.getParentAttendanceSummary();
    if (!b.success) {
      // endpoint might not exist yet; keep dashboard usable
      setSummary(null);
      setErr((prev) => prev || b.message || 'Attendance summary not available yet.');
    } else {
      setSummary(b.data);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>Parent Dashboard</div>
          <div style={{ opacity: 0.8 }}>Linked students + attendance summary</div>
        </div>
        <button onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {err ? <div style={{ marginTop: 10, color: 'crimson' }}>{err}</div> : null}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Linked Students</div>
        {links.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {links.map((l) => {
              const s = l.studentId || l.student || {};
              return (
                <div key={l._id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 800 }}>{s.name || 'Student'}</div>
                  <div style={{ opacity: 0.85 }}>{s.studentId || ''} {s.email ? `— ${s.email}` : ''}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No linked students.</div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Attendance Summary</div>
        {summary ? (
          <pre style={{ background: '#fafafa', padding: 12, borderRadius: 12, overflowX: 'auto' }}>
            {JSON.stringify(summary, null, 2)}
          </pre>
        ) : (
          <div style={{ opacity: 0.8 }}>Summary not available.</div>
        )}
      </div>
    </div>
  );
}