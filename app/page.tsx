"use client";

import { useEffect, useState, useMemo, CSSProperties } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Lead = {
  id: string;
  created_at: string;
  phone: string;
  full_name: string;
  summary_sentence: string;
  meeting_time: string;
  status: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  NEW_LEAD:          { label: 'ליד חדש',      bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  MEETING_SCHEDULED: { label: 'פגישה קבועה',  bg: '#FFFBEB', color: '#B45309', dot: '#F59E0B' },
  IN_PROCESS:        { label: 'בטיפול',        bg: '#FAF5FF', color: '#7E22CE', dot: '#A855F7' },
  CLIENT:            { label: 'לקוח ✓',        bg: '#ECFDF5', color: '#065F46', dot: '#10B981' },
  CANCELLED:         { label: 'בוטל',           bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
};

const s = {
  page:    { minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Segoe UI', Arial, sans-serif", direction: 'rtl' as const },
  header:  { background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 32px', display: 'flex' as const, justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as const, top: 0, zIndex: 10 },
  h1:      { fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 },
  sub:     { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  btn:     { background: '#0F172A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  main:    { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
  grid:    { display: 'grid' as const, gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  card:    { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' },
  cl:      { fontSize: 12, color: '#64748B', marginBottom: 4 },
  cv:      { fontSize: 32, fontWeight: 700, margin: 0 },
  filters: { display: 'flex' as const, gap: 12, marginBottom: 20, flexWrap: 'wrap' as const },
  input:   { flex: 1, minWidth: 200, border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', background: '#fff' },
  fbtn:    (active: boolean): CSSProperties => ({ padding: '8px 14px', border: '1px solid', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? '#0F172A' : '#fff', color: active ? '#fff' : '#475569', borderColor: active ? '#0F172A' : '#CBD5E1' }),
  table:   { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)', border: '1px solid #E2E8F0' },
  th:      { padding: '12px 18px', textAlign: 'right' as const, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: 1, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  td:      { padding: '14px 18px', fontSize: 13, color: '#334155', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' as const },
  badge:   (s: string): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: STATUS_CONFIG[s]?.bg || '#F1F5F9', color: STATUS_CONFIG[s]?.color || '#64748B' }),
  dot:     (s: string): CSSProperties => ({ width: 6, height: 6, borderRadius: '50%', background: STATUS_CONFIG[s]?.dot || '#94A3B8' }),
  sel:     { border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', fontSize: 12, background: '#fff', cursor: 'pointer', outline: 'none' },
  empty:   { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '64px 24px', textAlign: 'center' as const, color: '#94A3B8', fontSize: 15 },
  spin:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 },
};

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      console.log('Connecting to Supabase at:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase Error Details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert('שגיאה בחיבור למסד הנתונים: ' + error.message);
      }
      setLeads(data || []);
    } catch (err: any) {
      console.error('Unexpected Error:', err);
      alert('שגיאה בלתי צפויה: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function injectTestLead() {
    const testLead = {
      full_name: 'ישראל ישראלי (טסט)',
      phone: '0501234567',
      summary_sentence: 'ליד לדוגמה לבדיקת מערכת',
      meeting_time: 'היום ב-10:00',
      status: 'NEW_LEAD'
    };
    
    console.log('Injecting test lead...');
    const { data, error } = await supabase.from('leads').insert([testLead]);
    if (error) {
      console.error('Injection Error:', error);
      alert('שגיאה בהזרקת ליד: ' + error.message);
    } else {
      alert('ליד טסט הוזרק בהצלחה!');
      fetchLeads();
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    if (error) {
       console.error('Update Status Error:', error);
       alert('שגיאה בעדכון הסטטוס');
    } else {
       setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    }
  }

  const filtered = useMemo(() =>
    leads.filter(l =>
      (filter === 'ALL' || l.status === filter) &&
      (search === '' || [l.full_name, l.phone, l.summary_sentence].some(v => (v || '').includes(search)))
    ), [leads, filter, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW_LEAD').length,
    meetings: leads.filter(l => l.status === 'MEETING_SCHEDULED').length,
    clients: leads.filter(l => l.status === 'CLIENT').length,
  }), [leads]);

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.h1}>אדמתנו ביתנו — CRM</h1>
          <p style={s.sub}>ניהול לידים ולקוחות</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={injectTestLead}
            style={{ ...s.btn, background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }}
          >
            🧪 הזרק ליד טסט
          </button>
          <button style={s.btn} onClick={fetchLeads}>↻ רענן</button>
        </div>
      </header>

      <main style={s.main}>
        {/* Stats */}
        <div style={s.grid}>
          {[
            { label: 'סה"כ לידים', value: stats.total, color: '#0F172A' },
            { label: 'לידים חדשים', value: stats.new, color: '#1D4ED8' },
            { label: 'פגישות קבועות', value: stats.meetings, color: '#B45309' },
            { label: 'לקוחות', value: stats.clients, color: '#065F46' },
          ].map(c => (
            <div key={c.label} style={s.card}>
              <p style={s.cl}>{c.label}</p>
              <p style={{ ...s.cv, color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={s.filters}>
          <input
            style={s.input}
            placeholder="חיפוש לפי שם, טלפון, סיכום..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {['ALL', 'NEW_LEAD', 'MEETING_SCHEDULED', 'CLIENT', 'CANCELLED'].map(st => (
            <button key={st} style={s.fbtn(filter === st)} onClick={() => setFilter(st)}>
              {st === 'ALL' ? 'הכל' : STATUS_CONFIG[st]?.label || st}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={s.spin}><div>טוען...</div></div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>אין לידים עדיין. ברגע שספיר תקבע פגישה — הם יופיעו כאן.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['שם', 'טלפון', 'סיכום שיחה', 'מועד פגישה', 'סטטוס', 'עדכון', 'נוצר'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{lead.full_name || '—'}</td>
                  <td style={{ ...s.td, direction: 'ltr', textAlign: 'right' }}>{lead.phone}</td>
                  <td style={{ ...s.td, maxWidth: 280 }}>
                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {lead.summary_sentence || '—'}
                    </span>
                  </td>
                  <td style={s.td}>{lead.meeting_time || '—'}</td>
                  <td style={s.td}>
                    <span style={s.badge(lead.status)}>
                      <span style={s.dot(lead.status)}></span>
                      {STATUS_CONFIG[lead.status]?.label || lead.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <select style={s.sel} value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}>
                      <option value="NEW_LEAD">ליד חדש</option>
                      <option value="MEETING_SCHEDULED">פגישה קבועה</option>
                      <option value="IN_PROCESS">בטיפול</option>
                      <option value="CLIENT">לקוח ✓</option>
                      <option value="CANCELLED">בוטל</option>
                    </select>
                  </td>
                  <td style={{ ...s.td, fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {new Date(lead.created_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
