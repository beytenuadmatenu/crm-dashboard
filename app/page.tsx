"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, LayoutDashboard, KanbanSquare, Settings, LogOut, 
  Search, Plus, RefreshCw, Send, Calendar, Edit, FileText, 
  Trash2, Mail, MapPin, Phone, CheckCircle2, AlertCircle, X
} from 'lucide-react';

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
  city?: string;
};

type LeadDoc = {
  id: string;
  file_name: string;
  file_url: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, dot: string, border: string }> = {
  NEW_LEAD: { label: 'ליד חדש', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-200' },
  MEETING_SCHEDULED: { label: 'נקבעה פגישה', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500', border: 'border-amber-200' },
  CALL_BACK_LATER: { label: 'לחזור אח"כ', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500', border: 'border-purple-200' },
  DOC_COLLECTION: { label: 'איסוף מסמכים', color: 'text-sky-700', bg: 'bg-sky-50', dot: 'bg-sky-500', border: 'border-sky-200' },
  MEETING_HELD: { label: 'התקיימה פגישה', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  CLIENT: { label: 'אושר', color: 'text-green-800', bg: 'bg-green-100', dot: 'bg-green-600', border: 'border-green-300' },
  CANCELLED: { label: 'לא רלוונטי', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400', border: 'border-slate-200' },
};

// Kanban Pipeline Columns logic
const KANBAN_STAGES = ['NEW_LEAD', 'MEETING_SCHEDULED', 'MEETING_HELD', 'DOC_COLLECTION', 'CLIENT'];

function parseHebrewDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '—' || dateStr === 'בוטל') return null;
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

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  
  // Modals & Profile
  const [profileLead, setProfileLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'docs' | 'meetings'>('overview');
  const [leadDocs, setLeadDocs] = useState<LeadDoc[]>([]);
  const [manualModal, setManualModal] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: '', phone: '', summary_sentence: '', city: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Meeting State
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("10:00");
  
  // Kanban Drag & Drop
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

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
       if (profileLead?.id === id) {
         setProfileLead(prev => prev ? { ...prev, [field]: value } : prev);
       }
    }
  }

  async function deleteLead(id: string, name: string) {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הליד של "${name}"?`)) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) alert('שגיאה במחיקת הליד: ' + error.message);
      else {
        setLeads(prev => prev.filter(l => l.id !== id));
        setProfileLead(null);
        alert('הליד נמחק בהצלחה.');
      }
    } catch (err: any) {
      alert('שגיאה: ' + err.message);
    }
  }

  async function handleScheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!profileLead || !manualDate) return;

    try {
      const [y, m, d] = manualDate.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
      const daysHe = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
      const dayName = daysHe[dateObj.getDay()];
      const formattedTime = `יום ${dayName} ${d}.${m}.${y} בשעה ${manualTime}`;
      
      await updateLeadField(profileLead.id, 'meeting_time', formattedTime);
      await updateLeadField(profileLead.id, 'status', 'MEETING_SCHEDULED');
      alert('הפגישה נקבעה בהצלחה במערכת!');
    } catch (err: any) {
      alert('שגיאה בקביעת פגישה: ' + err.message);
    }
  }

  function shareByEmail(lead: Lead) {
    const recipient = "admateinu.beitenu@gmail.com";
    const subject = encodeURIComponent(`תזכורת פגישה: ${lead.full_name} ${lead.meeting_time}`);
    const body = encodeURIComponent(`שלום רב,\n\n להלן פרטי פגישת ייעוץ:\nשם הלקוח: ${lead.full_name}\nטלפון: ${lead.phone}\nמועד: ${lead.meeting_time}\n\nסיכום:\n${lead.summary_sentence}`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`, '_blank');
  }

  function addToCalendar(lead: Lead) {
    const startDate = parseHebrewDate(lead.meeting_time);
    if (!startDate) return alert('לא ניתן לקבוע פגישה ביומן ללא תאריך תקין.');
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
    const format = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dates = `${format(startDate)}/${format(endDate)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`פגישה: ${lead.full_name}`)}&dates=${dates}&details=${encodeURIComponent(`טלפון: ${lead.phone}\nסיכום: ${lead.summary_sentence}`)}&add=admateinu.beitenu@gmail.com&sf=true&output=xml`;
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
      setNewLead({ full_name: '', phone: '', summary_sentence: '', city: '' });
      fetchLeads();
    }
  }

  async function fetchDocs(leadId: string) {
    const { data } = await supabase.from('documents').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    setLeadDocs(data || []);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !profileLead) return;

    try {
      setUploading(true);
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const safeName = file.name.replace(/[^\x00-\x7F]/g, '').replace(/[\s\(\)\[\]\{\}]/g, '_');
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeName}`;
        
        const { error: uploadError } = await supabase.storage.from('lead-documents').upload(fileName, file);
        if (uploadError) throw new Error(`נכשל בהעלאת ${file.name}`);
        
        const { data: { publicUrl } } = supabase.storage.from('lead-documents').getPublicUrl(fileName);
        const { data: docRecord } = await supabase.from('documents').insert([{
          lead_id: profileLead.id, file_name: file.name, file_url: publicUrl, content_type: file.type, size_bytes: file.size
        }]).select().single();
        
        setUploadProgress(`הועלו ${index + 1} מתוך ${files.length}...`);
        return docRecord;
      });

      const results = await Promise.allSettled(uploadPromises);
      fetchDocs(profileLead.id);
      if (e.target) e.target.value = '';
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function deleteDocument(doc: LeadDoc) {
    if (!confirm(`למחוק את "${doc.file_name}"?`)) return;
    try {
      const fileName = doc.file_url.split('/').pop();
      if (fileName) await supabase.storage.from('lead-documents').remove([fileName]);
      await supabase.from('documents').delete().eq('id', doc.id);
      setLeadDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      alert('שגיאה במחיקה: ' + err.message);
    }
  }

  // Kanban Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLead(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedLead) {
      await updateLeadField(draggedLead, 'status', newStatus);
      setDraggedLead(null);
    }
  };

  const filtered = useMemo(() =>
    leads.filter(l =>
      (filter === 'ALL' || l.status === filter) &&
      (search === '' || [l.full_name, l.phone, l.city, l.summary_sentence, l.agent_notes].some(v => v?.includes(search)))
    ), [leads, filter, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW_LEAD').length,
    meetings: leads.filter(l => l.status === 'MEETING_SCHEDULED').length,
    docs: leads.filter(l => l.status === 'DOC_COLLECTION').length,
    clients: leads.filter(l => l.status === 'CLIENT').length,
  }), [leads]);

  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl w-full max-w-sm shadow-2xl text-center">
          <h1 className="text-white text-3xl font-bold mb-2">אדמתנו ביתנו</h1>
          <p className="text-slate-400 text-sm mb-8">התחברות ללוח הבקרה המאובטח</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <input 
              value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})}
              placeholder="שם משתמש" autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500 transition-colors"
            />
            <input 
              type="password" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
              placeholder="סיסמא"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500 transition-colors"
            />
            <button type="submit" className="w-full py-3 mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 transition-all">
              היכנס למערכת
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-l border-slate-200 flex flex-col justify-between transition-all duration-300 z-20">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-md">א</div>
            <span className="hidden lg:block mr-3 font-bold text-lg text-slate-800">אדמתנו ביתנו</span>
          </div>
          <nav className="p-4 flex flex-col gap-2">
            <button onClick={() => setViewMode('table')} className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
              <LayoutDashboard size={20} /> <span className="hidden lg:block">לוח בקרה</span>
            </button>
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
              <KanbanSquare size={20} /> <span className="hidden lg:block">ניהול תהליכים</span>
            </button>
            <button onClick={() => setManualModal(true)} className="flex items-center gap-3 w-full p-3 rounded-xl font-medium text-slate-500 hover:bg-slate-50 transition-all">
              <Plus size={20} /> <span className="hidden lg:block">ליד חדש הוספה ידנית</span>
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-xl font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut size={20} /> <span className="hidden lg:block">התנתק</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="חפש ליד, טלפון, עיר או הערה..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pr-10 pl-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchLeads} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="רענן נתונים">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 lg:p-8">
          
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div><p className="text-sm text-slate-500 font-medium mb-1">סה"כ לידים</p><h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3></div>
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Users size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div><p className="text-sm text-slate-500 font-medium mb-1">לידים חדשים</p><h3 className="text-2xl font-bold text-blue-700">{stats.new}</h3></div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><AlertCircle size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div><p className="text-sm text-slate-500 font-medium mb-1">ממתינים לפגישה</p><h3 className="text-2xl font-bold text-amber-700">{stats.meetings}</h3></div>
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Calendar size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div><p className="text-sm text-slate-500 font-medium mb-1">לקוחות מאושרים</p><h3 className="text-2xl font-bold text-emerald-700">{stats.clients}</h3></div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={24} /></div>
            </div>
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 p-4 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {['ALL', 'NEW_LEAD', 'MEETING_SCHEDULED', 'DOC_COLLECTION', 'CALL_BACK_LATER', 'MEETING_HELD', 'CLIENT'].map(st => (
                  <button 
                    key={st} 
                    onClick={() => setFilter(st)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${filter === st ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                  >
                    {st === 'ALL' ? 'כל הלידים' : STATUS_CONFIG[st]?.label}
                  </button>
                ))}
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 font-semibold text-right">שם הלקוח</th>
                      <th className="py-4 px-6 font-semibold text-right">סטטוס</th>
                      <th className="py-4 px-6 font-semibold text-right">מועד פגישה</th>
                      <th className="py-4 px-6 font-semibold text-right hidden lg:table-cell">עיר</th>
                      <th className="py-4 px-6 font-semibold text-right hidden xl:table-cell">תקציר AI</th>
                      <th className="py-4 px-6 font-semibold text-right">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500">אין נתונים להציג</td></tr>
                    ) : (
                      filtered.map(lead => {
                        const statusObj = STATUS_CONFIG[lead.status] || STATUS_CONFIG['NEW_LEAD'];
                        return (
                          <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors group cursor-pointer" onClick={() => { setProfileLead(lead); fetchDocs(lead.id); setActiveTab('overview'); }}>
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900">{lead.full_name || 'לקוח ללא שם'}</div>
                              <div className="text-sm text-slate-500 font-mono mt-0.5">{lead.phone}</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${statusObj.bg} ${statusObj.color} border ${statusObj.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`}></span>
                                {statusObj.label}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-700 whitespace-nowrap">
                              {lead.meeting_time || <span className="text-slate-400">טרם נקבע</span>}
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-600 hidden lg:table-cell">{lead.city || '—'}</td>
                            <td className="py-4 px-6 text-sm text-slate-600 hidden xl:table-cell max-w-xs truncate">
                              {lead.summary_sentence || 'אין תקציר'}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="פתח פרופיל מלא" onClick={(e) => { e.stopPropagation(); setProfileLead(lead); fetchDocs(lead.id); }}><Edit size={16}/></button>
                                <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="שלח לוואטסאפ" onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone}`, '_blank'); }}><Send size={16}/></button>
                                <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="מחק" onClick={(e) => { e.stopPropagation(); deleteLead(lead.id, lead.full_name); }}><Trash2 size={16}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Kanban Pipeline View
            <div className="flex gap-6 overflow-x-auto pb-8 h-[calc(100vh-200px)] items-start">
              {KANBAN_STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.status === stage);
                const stageObj = STATUS_CONFIG[stage];
                return (
                  <div 
                    key={stage} 
                    className="w-80 shrink-0 flex flex-col h-full bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage)}
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-bold text-slate-700">{stageObj.label}</h3>
                      <span className="bg-white text-slate-500 text-xs font-bold px-2 py-1 rounded-full shadow-sm">{stageLeads.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3">
                      {stageLeads.map(lead => (
                        <div 
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => { setProfileLead(lead); fetchDocs(lead.id); }}
                          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{lead.full_name || 'לקוח'}</h4>
                            {lead.meeting_time && <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded font-medium shrink-0">פגישה</span>}
                          </div>
                          <p className="text-xs text-slate-500 font-mono mb-3">{lead.phone}</p>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                             <div className="text-[10px] text-slate-400">{new Date(lead.created_at).toLocaleDateString('he-IL')}</div>
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={14} className="text-slate-400"/></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Manual Add Lead Modal */}
      {manualModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setManualModal(false)} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            <h2 className="text-xl font-bold text-slate-800 mb-6">הוספת ליד ידני</h2>
            <form onSubmit={handleAddLead} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">שם הלקוח</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors" value={newLead.full_name} onChange={e => setNewLead({...newLead, full_name: e.target.value})} placeholder="ישראל ישראלי" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">טלפון נייד</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors text-left" dir="ltr" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} placeholder="050-0000000" />
              </div>
              <button type="submit" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors">שמור במערכת</button>
            </form>
          </div>
        </div>
      )}

      {/* High-End Tabbed Profile Modal */}
      {profileLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">{profileLead.full_name || 'לקוח ללא שם'}</h2>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${STATUS_CONFIG[profileLead.status]?.bg} ${STATUS_CONFIG[profileLead.status]?.color} ${STATUS_CONFIG[profileLead.status]?.border}`}>
                      {STATUS_CONFIG[profileLead.status]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><Phone size={14}/> <span dir="ltr">{profileLead.phone}</span></span>
                    {profileLead.city && <span className="flex items-center gap-1.5"><MapPin size={14}/> {profileLead.city}</span>}
                    <span className="flex items-center gap-1.5"><Calendar size={14}/> נוצר ב: {new Date(profileLead.created_at).toLocaleDateString('he-IL')}</span>
                  </div>
               </div>
               <button onClick={() => setProfileLead(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-8 shrink-0">
               <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>סקירה כללית</button>
               <button onClick={() => setActiveTab('meetings')} className={`px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'meetings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>פגישות ולו"ז</button>
               <button onClick={() => setActiveTab('notes')} className={`px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>הערות סוכן</button>
               <button onClick={() => setActiveTab('docs')} className={`px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>מסמכים וטפסים</button>
            </div>

            {/* Tab Contents */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-8">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">סיכום המערכת (AI)</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {profileLead.summary_sentence || 'עדיין אין סיכום מהבוט.'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">עדכון סטטוס ידני</label>
                    <select 
                      value={profileLead.status} 
                      onChange={e => updateLeadField(profileLead.id, 'status', e.target.value)}
                      className="w-full max-w-sm bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium"
                    >
                      {Object.keys(STATUS_CONFIG).map(sk => <option key={sk} value={sk}>{STATUS_CONFIG[sk].label}</option>)}
                    </select>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <button onClick={() => deleteLead(profileLead.id, profileLead.full_name)} className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold text-sm px-4 py-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16}/> מחק פנייה זו מהמערכת בלתי הפיך
                    </button>
                  </div>
                </div>
              )}

              {/* Meetings Tab */}
              {activeTab === 'meetings' && (
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-indigo-600"/> מועד פגישה נוכחי</h3>
                    {profileLead.meeting_time ? (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-lg font-medium text-indigo-900 border-l-4 border-l-indigo-600 mb-6">
                        {profileLead.meeting_time}
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-500 mb-6">לא נקבעה פגישה</div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => addToCalendar(profileLead)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-md transition-colors flex justify-center items-center gap-2"><Calendar size={18}/> סנכרן לגוגל יומן</button>
                      <button onClick={() => shareByEmail(profileLead)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3 rounded-xl font-semibold transition-colors shadow-sm"><Mail size={20}/></button>
                      <button onClick={() => window.open(`https://wa.me/${profileLead.phone}`, '_blank')} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl font-semibold transition-colors shadow-sm"><Send size={20}/></button>
                    </div>
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">קביעת/עדכון מועד ידני</h3>
                    <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-slate-500 block mb-1">תאריך</label>
                          <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-slate-500 block mb-1">שעה</label>
                          <input type="time" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" value={manualTime} onChange={e => setManualTime(e.target.value)} />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg font-semibold mt-2 transition-colors">שמור פגישה ב-CRM</button>
                    </form>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="flex flex-col h-full">
                  <p className="text-sm text-slate-500 mb-4">אזור אישי לתיעוד מידע, הערות פנימיות והתקדמות אישית. (הלקוח לא רואה זאת).</p>
                  <textarea 
                    value={profileLead.agent_notes || ''} 
                    onChange={e => updateLeadField(profileLead.id, 'agent_notes', e.target.value)}
                    placeholder="הקלד/י כאן..."
                    className="w-full flex-1 min-h-[300px] p-5 rounded-2xl bg-amber-50/50 border border-amber-100 text-slate-800 leading-relaxed outline-none focus:border-amber-300 focus:bg-amber-50 transition-colors resize-none"
                  />
                </div>
              )}

              {/* Docs Tab */}
              {activeTab === 'docs' && (
                <div>
                   <div className="flex justify-between items-center mb-6">
                      <p className="text-sm text-slate-500">ניהול עותקי תעודות זהות, תלושים ומסמכים רלוונטיים.</p>
                      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} disabled={uploading} />
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-semibold text-sm transition-colors border border-indigo-200 flex items-center gap-2">
                        {uploading ? <RefreshCw size={16} className="animate-spin"/> : <Plus size={16}/>}
                        {uploading ? uploadProgress || 'מעלה...' : 'הוסף קבצים'}
                      </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {leadDocs.length === 0 ? (
                       <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                         <FileText size={48} className="mx-auto text-slate-300 mb-3"/>
                         <h3 className="text-slate-500 font-medium">אין מסמכים שהועלו.</h3>
                         <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 font-semibold text-sm mt-2">לחץ כאן להעלאה</button>
                       </div>
                     ) : (
                       leadDocs.map(doc => (
                         <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-white shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><FileText size={20}/></div>
                              <div className="truncate">
                                 <a href={doc.file_url} target="_blank" className="font-semibold text-sm text-slate-800 hover:text-indigo-600 truncate block">{doc.file_name}</a>
                                 <span className="text-xs text-slate-400">{(doc.size_bytes / 1024).toFixed(1)}KB • {new Date(doc.created_at).toLocaleDateString('he-IL')}</span>
                              </div>
                            </div>
                            <button onClick={() => deleteDocument(doc)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 transition-colors"><Trash2 size={16}/></button>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
