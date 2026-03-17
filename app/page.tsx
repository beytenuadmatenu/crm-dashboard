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
  agent_notes: string;
};

type LeadDoc = {
  id: string;
  file_name: string;
  file_url: string;
  content_type: string;
  created_at: string;
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
  btn:     { background: '#0F172A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  main:    { maxWidth: 1400, margin: '0 auto', padding: '32px 24px' },
  grid:    { display: 'grid' as const, gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  card:    { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' },
  cl:      { fontSize: 12, color: '#64748B', marginBottom: 4 },
  cv:      { fontSize: 32, fontWeight: 700, margin: 0 },
  filters: { display: 'flex' as const, gap: 12, marginBottom: 20, flexWrap: 'wrap' as const },
  input:   { flex: 1, minWidth: 200, border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', background: '#fff' },
  fbtn:    (active: boolean): CSSProperties => ({ padding: '8px 14px', border: '1px solid', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? '#0F172A' : '#fff', color: active ? '#fff' : '#475569', borderColor: active ? '#0F172A' : '#CBD5E1' }),
  tableWrapper: { background: '#fff', borderRadius: 12, overflowX: 'auto' as const, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,.05)' },
  table:   { width: '100%', borderCollapse: 'collapse' as const },
  th:      { padding: '12px 18px', textAlign: 'right' as const, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: 1, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  td:      { padding: '14px 18px', fontSize: 13, color: '#334155', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' as const },
  badge:   (s: string): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: STATUS_CONFIG[s]?.bg || '#F1F5F9', color: STATUS_CONFIG[s]?.color || '#64748B' }),
  dot:     (s: string): CSSProperties => ({ width: 6, height: 6, borderRadius: '50%', background: STATUS_CONFIG[s]?.dot || '#94A3B8' }),
  sel:     { border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', fontSize: 12, background: '#fff', cursor: 'pointer', outline: 'none' },
  empty:   { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '64px 24px', textAlign: 'center' as const, color: '#94A3B8', fontSize: 15 },
  spin:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 },
  modal:   { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 20 },
  modalContent: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: 32, position: 'relative' as const },
  closeBtn: { position: 'absolute' as const, top: 20, left: 20, border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#64748B' },
  notesArea: { width: '100%', minHeight: 80, border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' as const, marginTop: 8 },
  docItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 8, marginBottom: 8, fontSize: 13 },
  fileLink: { color: '#2563EB', textDecoration: 'none', fontWeight: 500 },
  deleteBtn: { background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 4, transition: 'background 0.2s' },
  saveNoteBtn: { border: 'none', background: '#2563EB', color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', marginTop: 4, alignSelf: 'flex-start' },
};

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  
  // Modals state
  const [docModalLead, setDocModalLead] = useState<Lead | null>(null);
  const [leadDocs, setLeadDocs] = useState<LeadDoc[]>([]);
  const [manualModal, setManualModal] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: '', phone: '', summary_sentence: '' });
  const [uploading, setUploading] = useState(false);
  
  // Notes temporary state
  const [tempNotes, setTempNotes] = useState<Record<string, string>>({});

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) alert('שגיאה בחיבור: ' + error.message);
      setLeads(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadField(id: string, field: string, value: any) {
    const { error } = await supabase.from('leads').update({ [field]: value }).eq('id', id);
    if (error) {
       alert('שגיאה בעדכון');
    } else {
       setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    }
  }

  async function deleteLead(id: string, name: string) {
    const confirmText = prompt(`אתה עומד למחוק את הליד של "${name}". כדי לאשר, הקלד את המילה DELETE:`);
    if (confirmText !== 'DELETE') {
      if (confirmText !== null) alert('מחיקה לא אושרה. וודא שהקלדת DELETE באותיות גדולות.');
      return;
    }

    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      alert('שגיאה במחיקת הליד: ' + error.message);
    } else {
      setLeads(prev => prev.filter(l => l.id !== id));
      alert('הליד נמחק בהצלחה.');
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newLead.phone) return alert('חובה להזין טלפון');
    
    let formattedPhone = newLead.phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('972')) formattedPhone = '0' + formattedPhone.substring(3);
    else if (!formattedPhone.startsWith('0')) formattedPhone = '0' + formattedPhone;

    const { error } = await supabase.from('leads').insert([{ 
      ...newLead, 
      phone: formattedPhone,
      status: 'NEW_LEAD' 
    }]);

    if (error) alert('שגיאה: ' + error.message);
    else {
      setManualModal(false);
      setNewLead({ full_name: '', phone: '', summary_sentence: '' });
      fetchLeads();
    }
  }

  async function openDocModal(lead: Lead) {
    setDocModalLead(lead);
    setUploading(false);
    const { data, error } = await supabase.from('documents').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false });
    if (!error) setLeadDocs(data || []);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !docModalLead) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;

      // 1. Upload to Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('lead-documents').getPublicUrl(fileName);

      // 3. Save to Table
      const { data: docRecord, error: dbError } = await supabase.from('documents').insert([{
        lead_id: docModalLead.id,
        file_name: file.name,
        file_url: publicUrl,
        content_type: file.type,
        size_bytes: file.size
      }]).select().single();

      if (dbError) throw dbError;
      setLeadDocs(prev => [docRecord, ...prev]);

    } catch (err: any) {
      alert('שגיאה בהעלאה: ' + err.message + '\n\nוודא שהגדרת Storage Policies ב-Supabase (ניתן להריץ את ה-SQL ששלחתי בבוט).');
    } finally {
      setUploading(false);
    }
  }

  const filtered = useMemo(() =>
    leads.filter(l =>
      (filter === 'ALL' || l.status === filter) &&
      (search === '' || [l.full_name, l.phone, l.summary_sentence, l.agent_notes].some(v => (v || '').includes(search)))
    ), [leads, filter, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW_LEAD').length,
    meetings: leads.filter(l => l.status === 'MEETING_SCHEDULED').length,
    clients: leads.filter(l => l.status === 'CLIENT').length,
  }), [leads]);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.h1}>אדמתנו ביתנו — CRM</h1>
          <p style={s.sub}>ניהול לידים ולקוחות</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btn} onClick={() => setManualModal(true)}>
            <span style={{ fontSize: 18 }}>+</span> הוספת ליד ידני
          </button>
          <button style={{ ...s.btn, background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }} onClick={fetchLeads}>↻ רענן</button>
        </div>
      </header>

      <main style={s.main}>
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

        <div style={s.filters}>
          <input
            style={s.input}
            placeholder="חיפוש לפי שם, טלפון, סיכום או הערות..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {['ALL', 'NEW_LEAD', 'MEETING_SCHEDULED', 'IN_PROCESS', 'CLIENT', 'CANCELLED'].map(st => (
            <button key={st} style={s.fbtn(filter === st)} onClick={() => setFilter(st)}>
              {st === 'ALL' ? 'הכל' : STATUS_CONFIG[st]?.label || st}
            </button>
          ))}
        </div>

        <div style={s.tableWrapper}>
        {loading ? (
          <div style={s.spin}><div>טוען...</div></div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>אין לידים להצגה.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['שם', 'טלפון', 'סיכום המערכת', 'מועד פגישה', 'הערות סוכן', 'מסמכים', 'סטטוס', 'ניהול'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ ...s.td, fontWeight: 700, color: '#0F172A' }}>{lead.full_name || '—'}</td>
                  <td style={{ ...s.td, direction: 'ltr', textAlign: 'right', fontFamily: 'monospace' }}>{lead.phone}</td>
                  <td style={{ ...s.td, maxWidth: 280 }}>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', fontSize: 12 }}>{lead.summary_sentence || '—'}</div>
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{lead.meeting_time || '—'}</td>
                  <td style={{ ...s.td, maxWidth: 250 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <textarea
                        style={s.notesArea}
                        placeholder="הוסף הערות סוכן..."
                        value={tempNotes[lead.id] !== undefined ? tempNotes[lead.id] : (lead.agent_notes || '')}
                        onChange={(e) => setTempNotes({ ...tempNotes, [lead.id]: e.target.value })}
                      />
                      {(tempNotes[lead.id] !== undefined && tempNotes[lead.id] !== lead.agent_notes) && (
                        <button 
                          style={s.saveNoteBtn}
                          onClick={() => updateLeadField(lead.id, 'agent_notes', tempNotes[lead.id])}
                        >
                          💾 שמור הערה
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={s.td}>
                    <button style={{ ...s.btn, background: '#E2E8F0', color: '#0F172A', padding: '6px 12px', fontSize: 11 }} onClick={() => openDocModal(lead)}>
                      📂 מסמכים
                    </button>
                  </td>
                  <td style={s.td}>
                    <select style={s.sel} value={lead.status} onChange={e => updateLeadField(lead.id, 'status', e.target.value)}>
                      {Object.keys(STATUS_CONFIG).map(sk => <option key={sk} value={sk}>{STATUS_CONFIG[sk].label}</option>)}
                    </select>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                       <span style={{ fontSize: 10, color: '#94A3B8' }}>
                         {new Date(lead.created_at).toLocaleDateString('he-IL')}
                       </span>
                       <button 
                         style={s.deleteBtn} 
                         title="מחק ליד"
                         onClick={() => deleteLead(lead.id, lead.full_name)}
                       >
                         🗑️ מחק
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </main>

      {manualModal && (
        <div style={s.modal} onClick={() => setManualModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setManualModal(false)}>✕</button>
            <h2 style={{ marginBottom: 24 }}>הוספת ליד חדש למערכת</h2>
            <form onSubmit={handleAddLead} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>שם מלא</label>
                <input style={s.input} value={newLead.full_name} onChange={e => setNewLead({...newLead, full_name: e.target.value})} placeholder="שם הלקוח" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>טלפון</label>
                <input style={s.input} value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} placeholder="0501234567" required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>סיכום ראשוני / פרטים</label>
                <textarea style={{ ...s.notesArea, minHeight: 120 }} value={newLead.summary_sentence} onChange={e => setNewLead({...newLead, summary_sentence: e.target.value})} placeholder="פרטים על ההלוואה, נכס, וכו'..." />
              </div>
              <button type="submit" style={{ ...s.btn, width: '100%', justifyContent: 'center', padding: 14, marginTop: 10 }}>שמור ליד למערכת</button>
            </form>
          </div>
        </div>
      )}

      {docModalLead && (
        <div style={s.modal} onClick={() => setDocModalLead(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setDocModalLead(null)}>✕</button>
            <h2 style={{ marginBottom: 4 }}>מסמכים: {docModalLead.full_name}</h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>{docModalLead.phone}</p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...s.btn, width: 'fit-content' }}>
                <span>⬆</span> {uploading ? 'מעלה קובץ...' : 'העלאת מסמך חדש'}
                <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>

            <div style={{ minHeight: 100 }}>
              {leadDocs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>אין מסמכים עדיין לליד זה.</div>
              ) : (
                leadDocs.map(doc => (
                  <div key={doc.id} style={s.docItem}>
                    <a href={doc.file_url} target="_blank" style={s.fileLink}>{doc.file_name}</a>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
