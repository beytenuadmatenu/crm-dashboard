"use client";

import { useEffect, useState, useMemo, useRef, CSSProperties } from 'react';
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
  size_bytes: number;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, dot: string }> = {
  NEW_LEAD: { label: 'ליד חדש ✨', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  MEETING_SCHEDULED: { label: 'נקבעה פגישה 📅', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  CALL_BACK_LATER: { label: 'לחזור מאוחר יותר 📞', color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  DOC_COLLECTION: { label: 'איסוף מסמכים 📂', color: '#0EA5E9', bg: '#F0F9FF', dot: '#0EA5E9' },
  MEETING_HELD: { label: 'התקיימה פגישה 🤝', color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
  CLIENT: { label: 'אושר ✅', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
  CANCELLED: { label: 'לא רלוונטי 🗑️', color: '#64748B', bg: '#F8FAFC', dot: '#94A3B8' },
};

const s = {
  page:    { minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Segoe UI', Arial, sans-serif", direction: 'rtl' as const },
  header:  { background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 32px', display: 'flex' as const, justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as const, top: 0, zIndex: 10 },
  logoBox: { display: 'flex', alignItems: 'center', gap: 12 },
  h1:      { fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 },
  sub:     { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  btn:     { background: '#0F172A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  main:    { maxWidth: '100%', margin: '0 auto', padding: '24px 16px' },
  grid:    { display: 'grid' as const, gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 28 },
  card:    { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 8px', boxShadow: '0 1px 3px rgba(0,0,0,.04)', position: 'relative' as const, overflow: 'hidden' as const },
  cardIcon: { position: 'absolute' as const, top: 8, left: 8, fontSize: 16, opacity: 0.15 },
  cl:      { fontSize: 10, color: '#64748B', marginBottom: 2, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  cv:      { fontSize: 18, fontWeight: 700, margin: 0 },
  filters: { display: 'flex' as const, gap: 8, marginBottom: 24, flexWrap: 'nowrap' as const, alignItems: 'center', overflowX: 'auto' as const, paddingBottom: 8 },
  input:   { flex: '0 0 250px', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', background: '#fff' },
  fbtn:    (active: boolean): CSSProperties => ({ padding: '8px 12px', border: '1px solid', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? '#0F172A' : '#fff', color: active ? '#fff' : '#475569', borderColor: active ? '#0F172A' : '#CBD5E1', whiteSpace: 'nowrap' as const }),
  tableWrapper: { background: '#fff', borderRadius: 12, overflowX: 'auto' as const, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,.05)' },
  table:   { width: '100%', borderCollapse: 'collapse' as const },
  th:      { padding: '12px 10px', textAlign: 'right' as const, fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: 1, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  td:      { padding: '12px 10px', fontSize: 12, color: '#334155', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' as const },
  badge:   (s: string): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: STATUS_CONFIG[s]?.bg || '#F1F5F9', color: STATUS_CONFIG[s]?.color || '#64748B' }),
  dot:     (s: string): CSSProperties => ({ width: 6, height: 6, borderRadius: '50%', background: STATUS_CONFIG[s]?.dot || '#94A3B8' }),
  sel:     { border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', fontSize: 12, background: '#fff', cursor: 'pointer', outline: 'none' },
  empty:   { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '64px 24px', textAlign: 'center' as const, color: '#94A3B8', fontSize: 15 },
  spin:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 },
  modal:   { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 20 },
  modalContent: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: 32, position: 'relative' as const },
  closeBtn: { position: 'absolute' as const, top: 20, left: 20, border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#64748B' },
  notesArea: { width: '100%', minHeight: 100, border: '1px solid #2563EB', borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' as const, outline: 'none' },
  notesBox: { display: 'flex', flexDirection: 'column' as const, gap: 4, background: '#F8FAFC', padding: '8px 10px 8px 28px', borderRadius: 8, position: 'relative' as const, minWidth: 160, border: '1px solid #F1F5F9', cursor: 'pointer', transition: 'all 0.2s' },
  notesText: { fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' },
  editIcon: { position: 'absolute' as const, top: 10, left: 10, fontSize: 14, color: '#94A3B8' },
  docItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 8, marginBottom: 8, fontSize: 13 },
  fileLink: { color: '#2563EB', textDecoration: 'none', fontWeight: 500 },
  deleteBtn: { background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 4, transition: 'background 0.2s' },
  actionBtn: { border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' },
  
  // Calendar styles
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#E2E8F0', borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' },
  calendarDay: { background: '#fff', minHeight: 120, padding: 10, display: 'flex', flexDirection: 'column' as const, transition: 'background 0.2s' },
  dayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayNum: { fontSize: 14, fontWeight: 600, color: '#64748B' },
  isToday: { background: '#EFF6FF' },
  meetingItem: { padding: '4px 8px', borderRadius: 6, fontSize: 10, marginBottom: 4, cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' },
  calendarNav: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  navTitle: { fontSize: 18, fontWeight: 700, minWidth: 160, textAlign: 'center' as const },
  navBtn: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#475569' },
};

function parseHebrewDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === 'בוטל') return null;
  // Support "DD.MM.YYYY" or any string containing it
  const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [_, d, m, y] = match;
  const timeMatch = dateStr.match(/(\d{2}):(\d{2})/);
  if (timeMatch) {
    const [__, hh, mm] = timeMatch;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
  }
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

const ResponsiveStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @media (max-width: 768px) {
      .header-container {
        flex-direction: column !important;
        padding: 16px !important;
        gap: 16px !important;
        text-align: center !important;
      }
      .header-actions {
        width: 100% !important;
        justify-content: center !important;
        flex-wrap: wrap !important;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
      }
      .stats-card {
        padding: 12px 8px !important;
      }
      .filter-bar {
        padding: 12px !important;
        gap: 8px !important;
      }
      .search-input {
        flex: 1 1 100% !important;
      }
      .modal-container {
        padding: 12px !important;
      }
      .modal-content {
        padding: 20px !important;
        width: 95% !important;
      }
      .calendar-day {
        min-height: 80px !important;
      }
      .day-num {
        font-size: 12px !important;
      }
      .meeting-item {
        font-size: 8px !important;
        padding: 2px 4px !important;
      }
    }
  `}} />
);

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modals state
  const [docModalLead, setDocModalLead] = useState<Lead | null>(null);
  const [leadDocs, setLeadDocs] = useState<LeadDoc[]>([]);
  const [manualModal, setManualModal] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: '', phone: '', summary_sentence: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [debugStatus, setDebugStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.onerror = (msg) => setDebugStatus(`Err: ${msg}`);
  }, []);

  // Manual Meeting State
  const [meetingModalLead, setMeetingModalLead] = useState<Lead | null>(null);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("10:00");
  
  // Inline editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  useEffect(() => {
    const auth = sessionStorage.getItem('crm_auth');
    setIsAuthenticated(auth === 'true');
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginForm.user.toUpperCase() === 'SAPIR' && loginForm.pass === 'S102030!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('crm_auth', 'true');
    } else {
      alert('פרטי התחברות שגויים');
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    sessionStorage.removeItem('crm_auth');
  }

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
       setEditingNoteId(null);
    }
  }

  async function deleteLead(id: string, name: string) {
    console.log('Attempting to delete lead:', id, name);
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הליד של "${name}"?`)) return;

    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) {
        console.error('Delete error details:', error);
        setDebugStatus(`Delete Error: ${error.message} (Code: ${error.code})`);
        alert('שגיאה במחיקת הליד: ' + error.message);
      } else {
        setLeads(prev => prev.filter(l => l.id !== id));
        alert('הליד נמחק בהצלחה.');
      }
    } catch (err: any) {
      setDebugStatus(`Critical Delete Exception: ${err.message}`);
      alert('שגיאה: ' + err.message);
    }
  }

  async function handleScheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingModalLead || !manualDate) return;

    try {
      const [y, m, d] = manualDate.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
      const daysHe = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
      const dayName = daysHe[dateObj.getDay()];
      
      const formattedTime = `יום ${dayName} ${d}.${m}.${y} בשעה ${manualTime}`;
      
      const { error } = await supabase.from('leads').update({
        meeting_time: formattedTime,
        status: 'MEETING_SCHEDULED'
      }).eq('id', meetingModalLead.id);

      if (error) throw error;
      
      setLeads(prev => prev.map(l => l.id === meetingModalLead.id ? { ...l, meeting_time: formattedTime, status: 'MEETING_SCHEDULED' } : l));
      setMeetingModalLead(null);
      // Automatically prompt for sync if it wasn't a direct "Save & Sync" click (handled by button text usually)
      alert('הפגישה נקבעה בהצלחה במערכת!');
    } catch (err: any) {
      alert('שגיאה בקביעת פגישה: ' + err.message);
    }
  }

  function shareByEmail(lead: Lead) {
    const recipient = "admateinu.beitenu@gmail.com";
    const subject = encodeURIComponent(`תזכורת פגישה: ${lead.full_name} ${lead.meeting_time}`);
    const body = encodeURIComponent(`שלום רב,
 
 להלן פרטי פגישת ייעוץ חדשה שתואמה במערכת:
 
 שם הלקוח: ${lead.full_name}
 טלפון: ${lead.phone}
 מועד הפגישה: ${lead.meeting_time}
 
 סיכום ופרטים:
 ${lead.summary_sentence || 'אין סיכום זמין'}
 
 בברכה,
 מערכת CRM - אדמתנו ביתנו`);
    
    // Using Gmail Web Compose link
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
  }

  function addToCalendar(lead: Lead) {
    const startDate = parseHebrewDate(lead.meeting_time);
    if (!startDate) return alert('לא ניתן לקבוע פגישה ביומן ללא תאריך תקין.');
    
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
    
    const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dates = `${format(startDate)}/${format(endDate)}`;
    
    const details = `טלפון: ${lead.phone}\nסיכום: ${lead.summary_sentence || ''}`;
    const guestEmail = "admateinu.beitenu@gmail.com";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`פגישה: ${lead.full_name}`)}&dates=${dates}&details=${encodeURIComponent(details)}&add=${encodeURIComponent(guestEmail)}&sf=true&output=xml`;
    
    window.open(url, '_blank');
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
    const files = e.target.files;
    if (!files || files.length === 0 || !docModalLead) return;

    try {
      setUploading(true);
      
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Sanitize filename: ASCII only, no special chars for storage key
        const safeName = file.name.replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
                                  .replace(/[\s\(\)\[\]\{\}]/g, '_'); // Replace spaces and brackets
        const rnd = Math.random().toString(36).substring(2, 7);
        const fileName = `${Date.now()}_${rnd}_${safeName || 'file'}`;
        
        console.log('Uploading file:', fileName);
        const { error: uploadError } = await supabase.storage.from('lead-documents').upload(fileName, file);
        if (uploadError) {
          console.error('Upload error details:', uploadError);
          setDebugStatus(`Storage Error: ${uploadError.message}`);
          throw new Error(`נכשל בהעלאת ${file.name}: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage.from('lead-documents').getPublicUrl(fileName);
        const { data: docRecord, error: dbError } = await supabase.from('documents').insert([{
          lead_id: docModalLead.id,
          file_name: file.name,
          file_url: publicUrl,
          content_type: file.type,
          size_bytes: file.size
        }]).select().single();
        
        if (dbError) throw new Error(`נכשל בשמירת ${file.name} בטבלה: ${dbError.message}`);
        setUploadProgress(`הועלו ${index + 1} מתוך ${files.length}...`);
        return docRecord;
      });

      const results = await Promise.allSettled(uploadPromises);
      
      const successfulDocs = results
        .filter((r): r is PromiseFulfilledResult<LeadDoc> => r.status === 'fulfilled')
        .map(r => r.value);
      
      if (successfulDocs.length > 0) {
        setLeadDocs(prev => [...successfulDocs, ...prev]);
        // alert removed as per user request
      }
      
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason.message);
      
      if (errors.length > 0) {
        alert('חלק מהקבצים לא הועלו:\n' + errors.join('\n'));
      }

      if (e.target) e.target.value = ''; // Reset input
    } catch (err: any) {
      alert('שגיאה כללית בהעלאה: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function deleteDocument(doc: LeadDoc) {
    console.log('Deleting document:', doc);
    setDebugStatus(`מנסה למחוק את: ${doc.file_name}...`);
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המסמך "${doc.file_name}"?`)) {
      setDebugStatus(null);
      return;
    }

    try {
      setUploading(true);
      // Extract filename from URL (it's the last part)
      const fileName = doc.file_url.split('/').pop();
      console.log('Storage filename extracted:', fileName);
      
      if (fileName) {
        const { error: storageErr } = await supabase.storage.from('lead-documents').remove([fileName]);
        if (storageErr) console.warn('Storage removal warning (might already be deleted):', storageErr);
      }
      
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) {
        console.error('DB delete error:', error);
        setDebugStatus(`DB Error: ${error.message}`);
        throw error;
      }
      
      console.log('Document deleted successfully');
      setLeadDocs(prev => prev.filter(d => d.id !== doc.id));
      setDebugStatus('מסמך נמחק בהצלחה');
      setTimeout(() => setDebugStatus(null), 3000);
    } catch (err: any) {
      console.error('Critical delete error:', err);
      setDebugStatus(`Error: ${err.message}`);
      alert('שגיאה במחיקה: ' + err.message);
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
    held: leads.filter(l => l.status === 'MEETING_HELD').length,
    docs: leads.filter(l => l.status === 'DOC_COLLECTION').length,
    later: leads.filter(l => l.status === 'CALL_BACK_LATER').length,
    clients: leads.filter(l => l.status === 'CLIENT').length,
    cancelled: leads.filter(l => l.status === 'CANCELLED').length,
  }), [leads]);

  // Calendar logic
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Fill up prefix (days from prev month)
    const days = [];
    const prefixCount = firstDay.getDay(); // Sunday=0, etc.
    for (let i = prefixCount - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrent: false });
    }
    
    // Fill current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrent: true });
    }
    
    // Fill suffix
    const suffixCount = 42 - days.length; // 6 rows of 7
    for (let i = 1; i <= suffixCount; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrent: false });
    }
    
    return days;
  }, [currentMonth]);

  const meetingsByDay = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    leads.forEach(l => {
      const d = parseHebrewDate(l.meeting_time);
      if (d) {
        const key = d.toDateString();
        if (!map[key]) map[key] = [];
        map[key].push(l);
      }
    });
    return map;
  }, [leads]);

  if (isAuthenticated === null) return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0F172A', color: '#64748B' }}>טוען...</div>;

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <ResponsiveStyles />
        <div className="modal-content" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(16px)', borderRadius: 24, padding: 48, width: '100%', maxWidth: 420, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>🛡️</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.025em' }}>כניסה למערכת</h1>
          <p style={{ color: '#94A3B8', fontSize: 16, marginBottom: 40 }}>אדמתנו ביתנו — CRM מאובטח</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ textAlign: 'right' }}>
              <label htmlFor="crm-user" style={{ color: '#CBD5E1', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}>שם משתמש</label>
              <input 
                id="crm-user"
                name="username"
                autoComplete="username"
                value={loginForm.user} 
                onChange={e => setLoginForm({...loginForm, user: e.target.value})}
                placeholder="הזן שם משתמש"
                autoFocus
                style={{ width: '100%', padding: '14px 18px', borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
            <div style={{ textAlign: 'right' }}>
              <label htmlFor="crm-pass" style={{ color: '#CBD5E1', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 10 }}>סיסמא</label>
              <input 
                id="crm-pass"
                type="password"
                name="password"
                autoComplete="current-password"
                value={loginForm.pass} 
                onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
                placeholder="••••••••"
                style={{ width: '100%', padding: '14px 18px', borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
            <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: 12, background: '#3B82F6', color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)', transition: 'transform 0.1s' }}>
              התחברות למערכת
            </button>
          </form>
          
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748B', fontSize: 12 }}>
            המערכת מיועדת לצוות מורשה בלבד
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <ResponsiveStyles />
      {/* Header */}
      <header className="header-container" style={s.header}>
        <div style={s.logoBox}>
          <div style={{ fontSize: 28 }}>🏠</div>
          <div>
            <h1 style={s.h1}>אדמתנו ביתנו — CRM</h1>
            <p style={s.sub}>ניהול לידים ופגישות חכם</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            style={{ ...s.btn, background: 'none', color: '#64748B', border: '1px solid #E2E8F0', padding: '6px 12px', fontSize: 12, gap: 8 }} 
            onClick={handleLogout}
            title="התנתקות מהמערכת"
          >
            <span>🚪</span> התנתקות
          </button>
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 4, marginRight: 12 }}>
             <button style={{ ...s.fbtn(viewMode === 'table'), padding: '6px 12px' }} onClick={() => setViewMode('table')}>📋 טבלה</button>
             <button style={{ ...s.fbtn(viewMode === 'calendar'), padding: '6px 12px' }} onClick={() => setViewMode('calendar')}>📅 יומן</button>
          </div>
          <button style={s.btn} onClick={() => setManualModal(true)}>
            <span style={{ fontSize: 18 }}>+</span> הוספת ליד ידני
          </button>
          <button style={{ ...s.btn, background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' }} onClick={fetchLeads}>↻ רענן</button>
        </div>
      </header>

      <main style={s.main}>
        <div className="stats-grid" style={s.grid}>
          {[
            { label: 'סה"כ לידים', value: stats.total, color: '#0F172A', icon: '👥' },
            { label: 'לידים חדשים', value: stats.new, color: '#1D4ED8', icon: '✨' },
            { label: 'נקבעו פגישות', value: stats.meetings, color: '#B45309', icon: '📅' },
            { label: 'התקיימו פגישות', value: stats.held, color: '#059669', icon: '🤝' },
            { label: 'איסוף מסמכים', value: stats.docs, color: '#0EA5E9', icon: '📂' },
            { label: 'לחזור מאוחר יותר', value: stats.later, color: '#7C3AED', icon: '📞' },
            { label: 'אושרו', value: stats.clients, color: '#065F46', icon: '✅' },
            { label: 'לא רלוונטי', value: stats.cancelled, color: '#64748B', icon: '🗑️' },
          ].map(c => (
            <div key={c.label} className="stats-card" style={s.card}>
              <span style={s.cardIcon}>{c.icon}</span>
              <p style={s.cl}>{c.label}</p>
              <p style={{ ...s.cv, color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {viewMode === 'table' ? (
          <>
            <div className="filter-bar" style={s.filters}>
              <input
                className="search-input"
                style={s.input}
                placeholder="חיפוש לפי שם, טלפון, סיכום או הערות..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {['ALL', 'NEW_LEAD', 'MEETING_SCHEDULED', 'DOC_COLLECTION', 'CALL_BACK_LATER', 'MEETING_HELD', 'CLIENT', 'CANCELLED'].map(st => (
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
                      <td style={{ ...s.td, width: '30%', minWidth: 250 }}>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: 12 }}>{lead.summary_sentence || '—'}</div>
                      </td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{lead.meeting_time || '—'}</td>
                      <td style={s.td}>
                        {editingNoteId === lead.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
                            <textarea
                              style={s.notesArea}
                              autoFocus
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button style={{ ...s.actionBtn, background: '#0F172A', color: '#fff' }} onClick={() => updateLeadField(lead.id, 'agent_notes', tempNoteText)}>שמור</button>
                              <button style={{ ...s.actionBtn, background: '#E2E8F0', color: '#475569' }} onClick={() => setEditingNoteId(null)}>ביטול</button>
                            </div>
                          </div>
                        ) : (
                          <div style={s.notesBox} onClick={() => { setEditingNoteId(lead.id); setTempNoteText(lead.agent_notes || ""); }}>
                            <span style={s.editIcon}>✏️</span>
                            <div style={s.notesText}>{lead.agent_notes || <i style={{ color: '#CBD5E1' }}>הוסף הערות...</i>}</div>
                          </div>
                        )}
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
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button 
                              style={{ ...s.btn, background: '#EFF6FF', color: '#1D4ED8', padding: '4px 8px', fontSize: 11 }} 
                              title="ניהול פגישה" 
                              onClick={() => { 
                                setMeetingModalLead(lead);
                                const existingDate = parseHebrewDate(lead.meeting_time);
                                if (existingDate) {
                                  setManualDate(existingDate.toISOString().split('T')[0]);
                                  setManualTime(existingDate.toTimeString().split(' ')[0].substring(0, 5));
                                } else {
                                  setManualDate(new Date().toISOString().split('T')[0]);
                                  setManualTime("10:00");
                                }
                              }}
                            >
                              📅 ניהול פגישה
                            </button>
                            
                            <button 
                              style={{ ...s.btn, background: '#F0FDF4', color: '#15803D', padding: '6px 8px', fontSize: 13 }} 
                               title="שלח תזכורת במייל" 
                               onClick={() => shareByEmail(lead)}
                            >
                              ✉️
                            </button>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', marginLeft: 8 }}>
                              <span style={{ fontSize: 10, color: '#94A3B8' }}>{new Date(lead.created_at).toLocaleDateString('he-IL')}</span>
                              <button style={{ ...s.deleteBtn, fontSize: 11 }} title="מחק ליד" onClick={(e) => { e.stopPropagation(); deleteLead(lead.id, lead.full_name); }}>🗑️ מחק</button>
                           </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          </>
        ) : (
          <div style={s.tableWrapper}>
              <div style={s.calendarNav}>
                  <button style={s.navBtn} onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>→</button>
                  <div style={s.navTitle}>
                      {currentMonth.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                  </div>
                  <button style={s.navBtn} onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>←</button>
              </div>
              
              <div style={s.calendarGrid}>
                  {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
                    <div key={d} style={{ background: '#F1F5F9', padding: 12, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748B' }}>{d}</div>
                  ))}
                  {calendarDays.map((cd, idx) => {
                      const dayMeetings = meetingsByDay[cd.date.toDateString()] || [];
                      const today = new Date();
                      const isToday = cd.date.toDateString() === today.toDateString();
                      
                      return (
                        <div key={idx} style={{ ...s.calendarDay, ...(isToday ? s.isToday : {}), opacity: cd.isCurrent ? 1 : 0.4 }}>
                            <div style={s.dayHeader}>
                                <span style={s.dayNum}>{cd.date.getDate()}</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {dayMeetings.slice(0, 3).map(m => (
                                    <div 
                                      key={m.id} 
                                      style={{ ...s.meetingItem, background: STATUS_CONFIG[m.status]?.bg || '#F1F5F9', color: STATUS_CONFIG[m.status]?.color || '#1e293b' }}
                                      onClick={() => { setViewMode('table'); setSearch(m.phone); }}
                                      title={m.full_name}
                                    >
                                        <b>{m.meeting_time.split(' בשעה ')[1]}</b> {m.full_name}
                                    </div>
                                ))}
                                {dayMeetings.length > 3 && <div style={{ fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>+{dayMeetings.length - 3} נוספים</div>}
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
        )}
      </main>

      {/* Manual Add Lead Modal */}
      {manualModal && (
        <div className="modal-container" style={s.modal} onClick={() => setManualModal(false)}>
          <div className="modal-content" style={s.modalContent} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setManualModal(false)}>✕</button>
            <h2 style={{ fontSize: 20, marginBottom: 24, paddingLeft: 30 }}>הוספת ליד חדש למערכת</h2>
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
                <textarea style={{ ...s.notesArea, minHeight: 120, border: '1px solid #E2E8F0' }} value={newLead.summary_sentence} onChange={e => setNewLead({...newLead, summary_sentence: e.target.value})} placeholder="פרטים על ההלוואה..." />
              </div>
              <button type="submit" style={{ ...s.btn, width: '100%', justifyContent: 'center', padding: 14, marginTop: 10 }}>שמור ליד למערכת</button>
            </form>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {docModalLead && (
        <div className="modal-container" style={s.modal} onClick={() => setDocModalLead(null)}>
          <div className="modal-content" style={s.modalContent} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setDocModalLead(null)}>✕</button>
            <h2 style={{ marginBottom: 4 }}>מסמכים: {docModalLead.full_name}</h2>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>{docModalLead.phone}</p>
            
            <div style={{ marginBottom: 20 }}>
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }} 
                multiple={true} 
                onChange={handleFileUpload} 
                disabled={uploading} 
              />
              <button 
                style={{ ...s.btn, width: 'fit-content' }} 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={uploading}
              >
                <span>➕</span> {uploading ? (uploadProgress || 'מעלה קבצים...') : 'העלאת מסמכים'}
              </button>
            </div>

            <div style={{ minHeight: 100 }}>
              {leadDocs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>אין מסמכים עדיין לליד זה.</div>
              ) : (
                leadDocs.map(doc => (
                  <div key={doc.id} style={s.docItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <span style={{ fontSize: 18 }}>📄</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <a href={doc.file_url} target="_blank" style={s.fileLink}>{doc.file_name}</a>
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>
                          {(doc.size_bytes / 1024).toFixed(1)}KB • {new Date(doc.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    </div>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#94A3B8' }} 
                      onClick={(e) => { e.stopPropagation(); deleteDocument(doc); }}
                      title="מחק מסמך"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {meetingModalLead && (
        <div className="modal-container" style={s.modal} onClick={() => setMeetingModalLead(null)}>
          <div className="modal-content" style={s.modalContent} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setMeetingModalLead(null)}>✕</button>
            <h2 style={{ fontSize: 20, marginBottom: 24, paddingLeft: 30 }}>קביעת פגישה ידנית עבור {meetingModalLead.full_name}</h2>
            <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>תאריך</label>
                <input type="date" style={s.input} value={manualDate} onChange={e => setManualDate(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>שעה</label>
                <input type="time" style={s.input} value={manualTime} onChange={e => setManualTime(e.target.value)} required />
              </div>
               <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="submit" style={{ ...s.btn, flex: 1, justifyContent: 'center', padding: 14 }}>שמור ב-CRM בלבד</button>
                <button 
                  type="button" 
                  onClick={async (e) => {
                    await handleScheduleMeeting(e as any);
                    // The updated meeting time is needed for sync
                    const formattedDate = manualDate.split('-').reverse().join('.');
                    const updatedLead = { ...meetingModalLead, meeting_time: `${formattedDate} ${manualTime}` };
                    addToCalendar(updatedLead);
                  }}
                  style={{ ...s.btn, flex: 1, background: '#7C3AED', justifyContent: 'center', padding: 14 }}
                >
                  שמור וסנכרן ל-Google
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
