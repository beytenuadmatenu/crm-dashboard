"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, LayoutDashboard, KanbanSquare, LogOut, 
  Search, Plus, RefreshCw, Send, Calendar, Edit, FileText, 
  Trash2, Mail, MapPin, Phone, CheckCircle2, AlertCircle, X, 
  ChevronRight, ChevronLeft, TrendingUp, Zap, History, Lightbulb, AlertTriangle,
  UserPlus, PenTool, Archive
} from 'lucide-react';

// Tooltip wrapper — pure CSS, no library needed
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="relative group/tip inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full mb-2 right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-all duration-200 delay-200 z-[100]">
        {label}
        <span className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  );
}

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
  consultant?: string;
  last_contact_at?: string;
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
  APPRAISALS_AND_SIGNATURES: { label: 'שמאות וחתימות', color: 'text-pink-700', bg: 'bg-pink-50', dot: 'bg-pink-500', border: 'border-pink-200' },
  MEETING_HELD: { label: 'התקיימה פגישה', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  CLIENT: { label: 'אישור עקרוני', color: 'text-green-800', bg: 'bg-green-100', dot: 'bg-green-600', border: 'border-green-300' },
  LEAD_FOR_PRESERVATION: { label: 'ליד לשימור', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500', border: 'border-rose-200' },
  CANCELLED: { label: 'לא רלוונטי', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400', border: 'border-slate-200' },
};

// Kanban Pipeline Columns logic
const KANBAN_STAGES = ['NEW_LEAD', 'MEETING_SCHEDULED', 'DOC_COLLECTION', 'CLIENT', 'APPRAISALS_AND_SIGNATURES', 'LEAD_FOR_PRESERVATION'];

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
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar' | 'insights'>('table');
  const [calMonth, setCalMonth] = useState(new Date());
  
  // Modals & Profile
  const [profileLead, setProfileLead] = useState<Lead | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'docs' | 'meetings' | 'timeline'>('overview');
  const [leadDocs, setLeadDocs] = useState<LeadDoc[]>([]);
  const [manualModal, setManualModal] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: '', phone: '', summary_sentence: '', city: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Meeting State
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("10:00");
  const [manualMeetingType, setManualMeetingType] = useState<"phone" | "physical">("phone");
  
  // Kanban Drag & Drop
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  // Drill-down Modal State
  const [drillDownData, setDrillDownData] = useState<{ title: string; leads: Lead[] } | null>(null);

  // Debounced agent notes — local state to prevent input lag
  const [notesText, setNotesText] = useState('');
  useEffect(() => {
    if (profileLead) setNotesText(profileLead.agent_notes || '');
  }, [profileLead?.id]);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loggedUser, setLoggedUser] = useState<{username: string, role: string, displayName: string} | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setupUser(session.user);
      } else {
        setIsAuthenticated(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setupUser(session.user);
      } else {
        setIsAuthenticated(false);
        setLoggedUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function setupUser(user: any) {
    setIsAuthenticated(true);
    const email = user.email || '';
    const username = email.split('@')[0];
    const role = username.toLowerCase() === 'sapir' ? 'admin' : 'consultant';
    
    // Fallbacks for display names based on email prefixes
    const displayNames: Record<string, string> = { 'sapir': 'ספיר', 'uzi': 'עוזי', 'alex': 'אלכס', 'yosef': 'יוסף' };
    const displayName = user.user_metadata?.displayName || displayNames[username.toLowerCase()] || username;

    setLoggedUser({ username, role, displayName });
    setFilter('ALL');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.user,
      password: loginForm.pass,
    });
    if (error) {
      alert('פרטי התחברות שגויים: ' + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  useEffect(() => { 
    if (isAuthenticated) fetchLeads(); 
  }, [isAuthenticated]);

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
       alert('שגיאה בעדכון: ' + error.message);
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
      const formattedTime = `(${manualMeetingType === 'phone' ? 'פגישה טלפונית' : 'פגישה פיזית'}) יום ${dayName} ${d}.${m}.${y} בשעה ${manualTime}`;
      
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
      summary_sentence: newLead.summary_sentence ? `[ידני]: ${newLead.summary_sentence}` : '[ידני]',
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
      (filter === 'ALL' || l.status === filter || (filter === 'HOT' && getLeadScore(l) >= 80) || (filter === 'MY_LEADS' && l.consultant === loggedUser?.username)) &&
      (search === '' || [l.full_name, l.phone, l.city, l.summary_sentence, l.agent_notes].some(v => v?.includes(search)))
    ), [leads, filter, search, loggedUser]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW_LEAD').length,
    meetings: leads.filter(l => l.status === 'MEETING_SCHEDULED').length,
    docs: leads.filter(l => l.status === 'DOC_COLLECTION').length,
    clients: leads.filter(l => l.status === 'CLIENT').length,
  }), [leads]);

  // Lead Scoring Logic
  function getLeadScore(lead: Lead) {
    let score = 30; // Base score
    if (['MEETING_SCHEDULED', 'MEETING_HELD'].includes(lead.status)) score += 40;
    if (lead.status === 'DOC_COLLECTION') score += 20;
    if (lead.agent_notes && lead.agent_notes.length > 50) score += 10;
    if (lead.status === 'CANCELLED') score = 0;
    return Math.min(score, 100);
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'from-orange-500 to-red-600'; // HOT
    if (score >= 50) return 'from-amber-400 to-orange-500'; // WARM
    return 'from-slate-400 to-slate-500'; // COLD
  }

  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl w-full max-w-sm shadow-2xl text-center">
          <img src="/LOGO.png" alt="" className="h-20 mx-auto mb-6 drop-shadow-xl" />
          <h1 className="text-white text-3xl font-bold mb-2">אדמתנו ביתנו</h1>
          <p className="text-slate-400 text-sm mb-8">התחברות ללוח הבקרה המאובטח</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <input 
              type="email"
              value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})}
              placeholder="כתובת אימייל" autoFocus
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
    <div className="flex h-screen overflow-hidden" style={{background: 'var(--color-bg)'}} dir="rtl">
      
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* ═══════════════════════════════════════════
          SIDEBAR
      ═══════════════════════════════════════════ */}
      <aside className={`fixed top-0 right-0 h-full w-56 bg-white z-50 lg:static lg:w-48 flex flex-col border-l border-slate-200 transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
          <img src="/LOGO.png" alt="" className="w-8 h-8 object-contain" />
          <span className="text-sm font-bold text-slate-800 tracking-tight">אדמתנו ביתנו</span>
          <button onClick={() => setIsMenuOpen(false)} className="lg:hidden mr-auto p-1.5 text-slate-400 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {[
            { id: 'table',    label: 'לוח בקרה',       icon: LayoutDashboard },
            { id: 'kanban',   label: 'ניהול תהליכים',  icon: KanbanSquare },
            { id: 'calendar', label: 'יומן פגישות',    icon: Calendar },
            { id: 'insights', label: 'דשבורד ניהולי',  icon: TrendingUp },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setViewMode(item.id as any); setFilter('ALL'); setSearch(''); setIsMenuOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                viewMode === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <item.icon size={16} className={viewMode === item.id ? 'text-white' : 'text-slate-400'} />
              {item.label}
            </button>
          ))}

          <div className="my-2 h-px bg-slate-100" />

          <button
            onClick={() => { setManualModal(true); setIsMenuOpen(false); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <Plus size={16} className="text-slate-400" />
            ליד חדש (ידני)
          </button>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={16} className="text-slate-400" />
            התנתק
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* ═══════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════ */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-5 lg:px-6 shrink-0 z-10">
          {/* Mobile menu toggle */}
          <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <LayoutDashboard size={20} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-sm hidden md:block">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם, טלפון, עיר..."
              className="w-full bg-slate-100 border-0 rounded-xl py-2 pr-8 pl-4 text-sm text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Clock */}
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-700">{currentTime.toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="text-xs text-slate-400 font-medium">{currentTime.toLocaleDateString('he-IL')}</span>
          </div>

          {/* User pill */}
          {loggedUser?.displayName && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {loggedUser.displayName.charAt(0)}
              </div>
              <span className="text-sm font-medium text-slate-700">{loggedUser.displayName}</span>
            </div>
          )}

          {/* Mobile search toggle */}
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            {isSearchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {/* Refresh */}
          <button onClick={fetchLeads} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="רענן">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        {/* Mobile Search Overlay */}
        {isSearchOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 absolute top-16 left-0 right-0 z-20 shadow-sm animate-in slide-in-from-top-2">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                autoFocus
                type="text" 
                placeholder="חפש ליד, טלפון, עיר..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 pr-10 pl-4 text-sm outline-none focus:border-indigo-500 transition-all font-bold"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Workspace */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-100/60 p-2 lg:p-3 gap-3 min-h-0">
          
          {/* KPI Stats Grid - Only on insights view */}
          {viewMode === 'insights' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-6 animate-in slide-in-from-top-4 duration-700">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between transition-all cursor-default group hover:shadow-md hover:border-indigo-100">
                <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">סה"כ לידים</p><h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats.total}</h3></div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm"><Users size={22} /></div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between transition-all cursor-default group hover:shadow-md hover:border-blue-100">
                <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">לידים חדשים</p><h3 className="text-2xl font-black text-blue-700 tracking-tight">{stats.new}</h3></div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm"><AlertCircle size={22} /></div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between transition-all cursor-default group hover:shadow-md hover:border-amber-100">
                <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">ממתינים לפגישה</p><h3 className="text-2xl font-black text-amber-600 tracking-tight">{stats.meetings}</h3></div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500 shadow-sm"><Calendar size={22} /></div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between transition-all cursor-default group hover:shadow-md hover:border-emerald-100">
                <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">לקוחות מאושרים</p><h3 className="text-2xl font-black text-emerald-700 tracking-tight">{stats.clients}</h3></div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm"><CheckCircle2 size={22} /></div>
              </div>
            </div>
          )}

          {viewMode === 'table' ? (
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{boxShadow: 'var(--shadow-card)'}}>

              {/* ── Filter Tabs ── */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {[
                  { id: 'MY_LEADS',                label: 'הלידים שלי' },
                  { id: 'ALL',                     label: 'הכל' },
                  { id: 'HOT',                     label: '🔥 חמים' },
                  { id: 'NEW_LEAD',                label: STATUS_CONFIG['NEW_LEAD']?.label },
                  { id: 'CALL_BACK_LATER',         label: STATUS_CONFIG['CALL_BACK_LATER']?.label },
                  { id: 'MEETING_SCHEDULED',       label: STATUS_CONFIG['MEETING_SCHEDULED']?.label },
                  { id: 'DOC_COLLECTION',          label: STATUS_CONFIG['DOC_COLLECTION']?.label },
                  { id: 'CLIENT',                  label: STATUS_CONFIG['CLIENT']?.label },
                  { id: 'APPRAISALS_AND_SIGNATURES', label: STATUS_CONFIG['APPRAISALS_AND_SIGNATURES']?.label },
                  { id: 'LEAD_FOR_PRESERVATION',   label: STATUS_CONFIG['LEAD_FOR_PRESERVATION']?.label },
                  { id: 'CANCELLED',               label: STATUS_CONFIG['CANCELLED']?.label },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      filter === id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Desktop Table ── */}
              <div className="hidden lg:block overflow-auto scrollbar-thin" style={{height: 'calc(100vh - 168px)'}}>
                <table className="w-full text-right border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide">שם הלקוח</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide text-center">סטטוס</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide">מועד פגישה</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide">עיר</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide text-center">יועץ</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide">סיכום</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide">הערות</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide">נוצר</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide text-center">מקור</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 tracking-wide text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead, idx) => (
                      <tr
                        key={lead.id}
                        onClick={() => { setProfileLead(lead); fetchDocs(lead.id); }}
                        className="group cursor-pointer border-b border-slate-100 hover:bg-indigo-50/40 transition-colors"
                        style={{animationDelay: `${idx * 20}ms`}}
                      >
                        {/* Name + Phone */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-semibold text-xs flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {lead.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-indigo-700 transition-colors">{lead.full_name || 'לקוח'}</div>
                              <div className="text-xs text-slate-400 font-normal mt-0.5" dir="ltr">{lead.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_CONFIG[lead.status]?.bg} ${STATUS_CONFIG[lead.status]?.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[lead.status]?.dot} dot-pulse`} />
                            {STATUS_CONFIG[lead.status]?.label}
                          </span>
                        </td>

                        {/* Meeting */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-600">
                            {lead.meeting_time || <span className="text-slate-300">—</span>}
                          </span>
                        </td>

                        {/* City */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-600">{lead.city || '—'}</span>
                        </td>

                        {/* Consultant */}
                        <td className="px-4 py-3 text-center">
                          {lead.consultant
                            ? <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">{lead.consultant}</span>
                            : <span className="text-slate-300 text-xs">—</span>
                          }
                        </td>

                        {/* Summary */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-slate-500 font-normal leading-relaxed line-clamp-2">
                            {lead.summary_sentence?.replace(/^\[פייסבוק\]:\s*/, '').replace(/^\[פייסבוק\]/, '').replace(/^\[ידני\]:\s*/, '').replace(/^\[ידני\]/, '') || '—'}
                          </p>
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-slate-400 font-normal leading-relaxed line-clamp-2">{lead.agent_notes || '—'}</p>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-400">
                            {new Date(lead.created_at).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year:'2-digit'})}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium border ${
                            lead.summary_sentence?.includes('[פייסבוק]') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            lead.summary_sentence?.includes('[ידני]')    ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {lead.summary_sentence?.includes('[פייסבוק]') ? 'פייסבוק' : lead.summary_sentence?.includes('[ידני]') ? 'ידני' : 'בוט'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                             <Tip label="צפה בפרופיל">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setProfileLead(lead); fetchDocs(lead.id); }}
                                 className="p-1.5 bg-white text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
                               >
                                 <FileText size={16}/>
                               </button>
                             </Tip>
                             <Tip label="שלח וואטסאפ">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/972${lead.phone.replace(/^0/, '')}`, '_blank'); }}
                                 className="p-1.5 bg-white text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-50 hover:shadow-md transition-all"
                               >
                                 <Send size={16}/>
                               </button>
                             </Tip>
                             <Tip label="חיוג">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${lead.phone}`; }}
                                 className="p-1.5 bg-white text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-50 hover:shadow-md transition-all"
                               >
                                 <Phone size={16}/>
                               </button>
                             </Tip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (Mobile/Tablet Only) */}
              <div className="lg:hidden flex-1 overflow-y-auto flex flex-col divide-y divide-slate-100 scrollbar-thin">
                 {filtered.map(lead => (
                   <div 
                    key={lead.id} 
                    onClick={() => { setProfileLead(lead); fetchDocs(lead.id); }}
                    className="p-5 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer flex flex-col gap-4"
                   >
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-indigo-200">
                             {lead.full_name?.charAt(0) || 'L'}
                           </div>
                           <div>
                              <div className="font-bold text-slate-800 text-base">{lead.full_name || 'לקוח'}</div>
                              <div className="text-sm text-slate-400 font-mono font-medium">{lead.phone}</div>
                           </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ring-1 ring-inset ${STATUS_CONFIG[lead.status]?.bg} ${STATUS_CONFIG[lead.status]?.color} ${STATUS_CONFIG[lead.status]?.border} shadow-sm inline-flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[lead.status]?.dot}`}></span>
                          {STATUS_CONFIG[lead.status]?.label}
                        </span>
                     </div>
                     
                     {lead.summary_sentence && (
                       <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pr-2 border-r-2 border-slate-100">
                         {lead.summary_sentence}
                       </p>
                     )}

                     <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                           <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`); }} className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm active:scale-95 transition-transform"><Phone size={18}/></button>
                           <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone}`, '_blank'); }} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm active:scale-95 transition-transform"><Send size={18}/></button>
                        </div>
                        <button className="text-xs font-bold text-slate-400 flex items-center gap-1 px-3 py-2 bg-slate-50 rounded-lg">צפה בהיסטוריה <ChevronLeft size={14}/></button>
                     </div>
                   </div>
                 ))}
                 {filtered.length === 0 && (
                   <div className="p-10 text-center text-slate-400 font-bold text-sm">אין נתונים להצגה</div>
                 )}
              </div>
            </div>
          ) : viewMode === 'insights' ? (
            // MASTER MANAGEMENT DASHBOARD (The "WOW" Screen)
            <div className="flex-1 overflow-y-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 pr-1 scrollbar-thin">
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-3xl"></div>)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    onClick={() => setDrillDownData({ title: 'לידים "חמים" (Hot)', leads: leads.filter(l => getLeadScore(l) >= 80) })}
                    className="bg-white border border-slate-200 p-6 lg:p-8 rounded-3xl shadow-sm flex flex-col lg:flex-row items-center justify-between cursor-pointer hover:border-orange-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-orange-50 text-orange-500 rounded-2xl group-hover:bg-orange-100 transition-colors"><Zap size={32} fill="currentColor"/></div>
                      <div>
                        <p className="text-slate-500 font-medium mb-1 text-sm lg:text-base">מדד לידים "חמים" (Hot)</p>
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-orange-600 group-hover:scale-105 transition-transform origin-right">{leads.filter(l => getLeadScore(l) >= 80).length}</h2>
                      </div>
                    </div>
                    <div className="mt-6 lg:mt-0 text-right">
                      <p className="text-xs lg:text-sm text-slate-500 mb-2">לידים עם סיכוי סגירה גבוה.</p>
                      <span className="text-orange-500 font-bold bg-orange-50 px-4 py-2 rounded-xl inline-block group-hover:bg-orange-600 group-hover:text-white transition-all text-sm">הצג הכל ←</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setDrillDownData({ title: 'לידים שבוטלו (Cancelled)', leads: leads.filter(l => l.status === 'CANCELLED') })}
                    className="bg-white border border-slate-200 p-6 lg:p-8 rounded-3xl shadow-sm flex flex-col lg:flex-row items-center justify-between cursor-pointer hover:border-red-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-red-50 text-red-500 rounded-2xl group-hover:bg-red-100 transition-colors"><AlertTriangle size={32} fill="currentColor"/></div>
                      <div>
                        <p className="text-slate-500 font-medium mb-1 text-sm lg:text-base">לידים שבוטלו</p>
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-red-600 group-hover:scale-105 transition-transform origin-right">{leads.filter(l => l.status === 'CANCELLED').length}</h2>
                      </div>
                    </div>
                    <div className="mt-6 lg:mt-0 text-right">
                      <p className="text-xs lg:text-sm text-slate-500 mb-2">לידים שהוסרו מהתהליך.</p>
                      <span className="text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl inline-block group-hover:bg-red-600 group-hover:text-white transition-all text-sm">בדוק סיבות ←</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Visuals Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Conversion Funnel (Custom SVG) */}
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm min-h-[400px]">
                  <h3 className="text-lg font-bold text-slate-800 mb-8">משפך המרה (Conversion Funnel)</h3>
                  <div className="flex flex-col gap-4 relative">
                    {[
                      { label: 'כל הלידים', count: stats.total, color: 'bg-indigo-600', w: '100%', leads: leads },
                      { label: 'פגישות (נקבעו+בוצעו)', count: stats.meetings, color: 'bg-indigo-500', w: '75%', leads: leads.filter(l => ['MEETING_SCHEDULED', 'MEETING_HELD'].includes(l.status)) },
                      { label: 'מסמכים בטיפול', count: stats.docs, color: 'bg-indigo-400', w: '50%', leads: leads.filter(l => l.status === 'DOC_COLLECTION') },
                      { label: 'לקוחות מאושרים', count: stats.clients, color: 'bg-emerald-500', w: '30%', leads: leads.filter(l => l.status === 'CLIENT') }
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-4 group cursor-pointer" onClick={() => setDrillDownData({ title: step.label, leads: step.leads })}>
                        <div className="w-32 text-sm font-bold text-slate-500 text-left shrink-0">{step.label}</div>
                        <div className="flex-1 h-12 bg-slate-50 rounded-xl relative overflow-hidden group-hover:bg-slate-100 transition-colors">
                          <div 
                            className={`absolute inset-y-0 right-0 ${step.color} opacity-90 transition-all duration-1000 ease-out flex items-center pr-4 text-white font-bold text-sm shadow-sm`}
                            style={{width: step.w}}
                          >
                            {step.count}
                          </div>
                        </div>
                        <div className="w-12 text-slate-400 text-xs font-bold shrink-0">{stats.total > 0 ? Math.round((step.count / stats.total) * 100) : 0}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Consultant Performance Leaderboard */}
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                   <h3 className="text-lg font-bold text-slate-800 mb-6">ביצועי יועצים (Leaderboard)</h3>
                   <div className="divide-y divide-slate-100">
                      {[
                        { name: 'ספיר', files: leads.filter(l => l.consultant === 'sapir').length, color: 'bg-indigo-50 text-indigo-600', id: 'sapir' },
                        { name: 'עוזי', files: leads.filter(l => l.consultant === 'uzi').length, color: 'bg-amber-50 text-amber-600', id: 'uzi' },
                        { name: 'אלכס', files: leads.filter(l => l.consultant === 'alex').length, color: 'bg-emerald-50 text-emerald-600', id: 'alex' },
                        { name: 'יוסף', files: leads.filter(l => l.consultant === 'yosef').length, color: 'bg-blue-50 text-blue-600', id: 'yosef' }
                      ].sort((a,b) => b.files - a.files).map((con, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setDrillDownData({ title: `לידים בטיפול: ${con.name}`, leads: leads.filter(l => l.consultant === con.id) })}
                          className="flex items-center justify-between py-4 group hover:px-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-xl font-bold text-slate-300 w-6">#{idx+1}</div>
                            <div className={`w-10 h-10 rounded-xl ${con.color} flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-110 transition-transform`}>
                              {con.name.charAt(0)}
                            </div>
                            <div>
                               <div className="font-bold text-slate-800 text-sm">{con.name}</div>
                               <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{con.files} תיקים בטיפול</div>
                            </div>
                          </div>
                          <div className="text-left">
                             <div className="text-[10px] text-emerald-500 font-bold overflow-hidden">
                               <div className="flex items-center gap-1 justify-end"><TrendingUp size={10}/> 4.8★</div>
                             </div>
                             <div className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">צפה בכולם ←</div>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* Geo & Alerts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right">
                 {/* Geo Heatmap Simulation */}
                 <div className="lg:col-span-2 bg-white border border-slate-200 p-6 lg:p-8 rounded-3xl shadow-sm min-h-[300px]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800">פילוח גיאוגרפי (Top Cities)</h3>
                      <MapPin size={20} className="text-slate-400"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 lg:gap-y-6">
                       {(() => {
                         const citiesMap: Record<string, number> = {};
                         leads.forEach(l => { if(l.city) citiesMap[l.city] = (citiesMap[l.city] || 0) + 1 });
                         const sortedCities = Object.entries(citiesMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
                         if (sortedCities.length === 0) return <div className="text-slate-400 text-sm">אין נתוני ערים</div>;
                         return sortedCities.map(([city, count]) => (
                             <div 
                               key={city} 
                               onClick={() => setDrillDownData({ title: `לידים מהעיר: ${city}`, leads: leads.filter(l => l.city === city) })}
                               className="flex flex-col gap-1.5 cursor-pointer group/city border-r-2 border-transparent hover:border-indigo-500 pr-2 transition-all w-full"
                             >
                               <div className="flex justify-between text-xs font-bold text-slate-600 group-hover/city:text-indigo-600 transition-colors">
                                 <span>{city}</span>
                                 <span>{count} לידים</span>
                                </div>
                               <div className="relative h-2 bg-slate-50 rounded-full overflow-hidden">
                                 <div className="absolute inset-y-0 right-0 bg-indigo-500/60 rounded-full group-hover/city:bg-indigo-600 transition-all duration-500" style={{width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%`}}></div>
                               </div>
                             </div>
                           ));
                       })()}
                    </div>
                 </div>

                 {/* Lead Control Alerts */}
                 <div className="bg-red-50/50 border border-red-100 p-6 lg:p-8 rounded-3xl flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={24}/>
                      <h3 className="font-bold text-lg">בקרת לידים והתראות</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                       <div 
                         onClick={() => {
                           const delayed = leads.filter(l => l.status === 'NEW_LEAD' && (new Date().getTime() - new Date(l.created_at).getTime() > 48 * 60 * 60 * 1000));
                           setDrillDownData({ title: 'טיפול מושהה (>48 שעות)', leads: delayed });
                         }}
                         className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 group hover:shadow-md hover:border-red-300 transition-all cursor-pointer"
                       >
                          <p className="text-xs text-slate-500 mb-1">טיפול מושהה</p>
                          <p className="font-bold text-slate-800 text-sm">{(leads.filter(l => l.status === 'NEW_LEAD' && (new Date().getTime() - new Date(l.created_at).getTime() > 48 * 60 * 60 * 1000)).length)} לידים חדשים ללא מענה מעל 48 שעות</p>
                          <div className="text-[10px] text-red-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">צפה ברשימה ←</div>
                       </div>
                       <div 
                         onClick={() => {
                           const outdated = leads.filter(l => l.status === 'MEETING_SCHEDULED' && parseHebrewDate(l.meeting_time) && parseHebrewDate(l.meeting_time)! < new Date());
                           setDrillDownData({ title: 'פגישות ללא עדכון', leads: outdated });
                         }}
                         className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 group hover:shadow-md hover:border-red-300 transition-all cursor-pointer"
                       >
                          <p className="text-xs text-slate-500 mb-1">פגישות ללא עדכון</p>
                          <p className="font-bold text-slate-800 text-sm">{(leads.filter(l => l.status === 'MEETING_SCHEDULED' && parseHebrewDate(l.meeting_time) && parseHebrewDate(l.meeting_time)! < new Date()).length)} פגישות שהסתיימו ללא עדכון סטטוס</p>
                          <div className="text-[10px] text-red-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">צפה ברשימה ←</div>
                       </div>
                    </div>
                    <button onClick={fetchLeads} className="mt-auto w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2">
                       רענן ובדוק שוב <RefreshCw size={16}/>
                    </button>
                 </div>
              </div>
            </div>
          ) : viewMode === 'calendar' ? (
            (() => {
              const year = calMonth.getFullYear();
              const month = calMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const today = new Date();
              const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
              const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];
              const meetingLeads = leads.filter(l => l.meeting_time && parseHebrewDate(l.meeting_time));

              function getMeetingsForDay(day: number) {
                return meetingLeads.filter(l => {
                  const d = parseHebrewDate(l.meeting_time);
                  return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
                });
              }

              return (
                <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1 scrollbar-thin pb-12">
                  {/* Desktop Grid View */}
                  <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setCalMonth(new Date(year, month - 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight size={20}/></button>
                        <h2 className="text-lg font-bold text-slate-800">{calMonth.toLocaleString('he-IL', {month: 'long', year: 'numeric'})}</h2>
                        <button onClick={() => setCalMonth(new Date(year, month + 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft size={20}/></button>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> פגישה טלפונית</div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600"></span> פגישה פיזית</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                      {dayLabels.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-slate-400">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7">
                      {cells.map((day, idx) => {
                        if (!day) return <div key={idx} className="min-h-[120px] border-b border-l border-slate-100 bg-slate-50/20" />;
                        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                        const dayMeetings = getMeetingsForDay(day);
                        return (
                          <div key={idx} className={`min-h-[120px] p-2 border-b border-l border-slate-100 transition-colors ${isToday ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                            <div className={`text-sm font-bold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>{day}</div>
                            <div className="flex flex-col gap-1.5">
                              {dayMeetings.slice(0, 3).map(l => (
                                <button key={l.id} onClick={() => { setProfileLead(l); fetchDocs(l.id); setActiveTab('meetings'); }}
                                  className={`text-right text-[10px] font-bold px-2 py-1 rounded-md border shadow-sm truncate w-full transition-all ${
                                    l.meeting_time?.includes('פגישה פיזית') ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:border-indigo-300' :
                                    (l.meeting_time?.includes('פגישה טלפונית') || (!l.summary_sentence?.includes('[פייסבוק]') && !l.summary_sentence?.includes('[ידני]')))
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-200' 
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:border-indigo-300'
                                  }`}>
                                  {l.meeting_time?.match(/(\d{2}):(\d{2})/)?.[0]} • {l.full_name}
                                </button>
                              ))}
                              {dayMeetings.length > 3 && <span className="text-[10px] text-slate-400 font-bold px-1">+{dayMeetings.length - 3} נוספים...</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile Agenda View */}
                  <div className="lg:hidden flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-10">
                       <button onClick={() => setCalMonth(new Date(year, month - 1))} className="p-2 active:bg-slate-100 rounded-lg"><ChevronRight size={20}/></button>
                       <h2 className="text-base font-bold text-slate-800">{calMonth.toLocaleString('he-IL', {month: 'long', year: 'numeric'})}</h2>
                       <button onClick={() => setCalMonth(new Date(year, month + 1))} className="p-2 active:bg-slate-100 rounded-lg"><ChevronLeft size={20}/></button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {cells.filter(d => d !== null).map((day, idx) => {
                          const dayMeetings = getMeetingsForDay(day!);
                          if (dayMeetings.length === 0) return null;
                          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                          
                          return (
                            <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                               <div className={`px-4 py-2 border-b border-slate-100 flex items-center justify-between ${isToday ? 'bg-indigo-50' : 'bg-slate-50/50'}`}>
                                  <div className="flex items-center gap-2">
                                     <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'}`}>{day}</span>
                                     <span className={`text-sm font-bold ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>{isToday ? 'היום' : dayLabels[(idx+firstDay)%7]} {day}.{month+1}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{dayMeetings.length} פגישות</span>
                               </div>
                               <div className="divide-y divide-slate-100">
                                  {dayMeetings.map(l => (
                                    <div 
                                      key={l.id} 
                                      onClick={() => { setProfileLead(l); fetchDocs(l.id); setActiveTab('meetings'); }}
                                      className="p-4 flex items-center justify-between active:bg-slate-50 transition-all cursor-pointer"
                                    >
                                       <div className="flex items-center gap-3">
                                          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg tabular-nums">
                                            {l.meeting_time?.match(/(\d{2}):(\d{2})/)?.[0] || '??:??'}
                                          </div>
                                          <div>
                                             <div className="text-sm font-bold text-slate-800 tabular-nums">{l.full_name}</div>
                                             <div className="text-[10px] text-slate-400 font-medium">{l.city || 'ללא עיר'}</div>
                                          </div>
                                       </div>
                                       <ChevronLeft size={16} className="text-slate-300"/>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          );
                       })}
                       {meetingLeads.length === 0 && (
                         <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <Calendar size={48} className="mx-auto text-slate-200 mb-3"/>
                            <p className="text-slate-400 font-bold">אין פגישות מתוזמנות לחודש זה</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            // Kanban Pipeline View
            <div className="flex gap-4 overflow-x-auto flex-1 min-h-0 pt-2 pb-4 scrollbar-thin" dir="rtl">
              {KANBAN_STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.status === stage);
                const stageObj = STATUS_CONFIG[stage];
                
                // Icon mapping for "surprising" the user
                const StageIcon = stage === 'NEW_LEAD' ? UserPlus : 
                                stage === 'MEETING_SCHEDULED' ? Calendar : 
                                stage === 'DOC_COLLECTION' ? FileText : 
                                stage === 'CLIENT' ? CheckCircle2 : 
                                stage === 'APPRAISALS_AND_SIGNATURES' ? PenTool : 
                                Archive;

                return (
                  <div 
                    key={stage} 
                    className="w-72 shrink-0 flex flex-col min-h-0 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage)}
                  >
                    <div className={`px-4 py-3 border-b flex flex-col gap-2 ${stageObj.bg} ${stageObj.border}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg bg-white/80 shadow-sm ${stageObj.color}`}><StageIcon size={15}/></div>
                            <h3 className={`font-semibold text-sm ${stageObj.color}`}>{stageObj.label}</h3>
                          </div>
                          <span className="bg-white/70 px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 border border-white/50">{stageLeads.length}</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-white/50 overflow-hidden">
                          <div className={`h-full rounded-full ${stageObj.dot} transition-all duration-700`} style={{ width: `${Math.min(100, (stageLeads.length / (leads.length || 1)) * 100)}%` }}></div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 p-3">
                      {stageLeads.map(lead => (
                        <div 
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => { setProfileLead(lead); fetchDocs(lead.id); }}
                          className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className="font-semibold text-slate-800 text-sm truncate pr-2">{lead.full_name || 'לקוח'}</h4>
                          </div>
                          <p className="text-xs text-slate-400 mb-2" dir="ltr">{lead.phone}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                             <div className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleDateString('he-IL')}</div>
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={13} className="text-slate-400"/></div>
                          </div>
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="flex-1 flex items-center justify-center py-8 text-slate-300 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl m-1">
                          אין לידים בשלב זה
                        </div>
                      )}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-white rounded-t-3xl lg:rounded-2xl shadow-xl w-full lg:max-w-md p-6 relative animate-in slide-in-from-bottom duration-300 lg:animate-in lg:zoom-in-95">
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
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">יישוב</label>
                <input
                  list="city-suggestions"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  value={newLead.city}
                  onChange={e => setNewLead({...newLead, city: e.target.value})}
                  placeholder="הקלד עיר..."
                />
                <datalist id="city-suggestions">
                  {['נצרת','כפר קרע','בקה אל-גרביה','טמרה','שפרעם','סח\'נין','אום אל-פחם','עראבה','דייר חנא','עכו','חיפה','ריינה','ירכא','מגאר','כאבול','עילבון','בית ג\'ן','מע\'אר','כסרא','פסוטה','בועינה נוג\'ידאת','עין מאהל','כפר ברא','טייבה','כפר סבא','לוד'].map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">סיכום ראשוני</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition-colors resize-none"
                  rows={3}
                  value={newLead.summary_sentence}
                  onChange={e => setNewLead({...newLead, summary_sentence: e.target.value})}
                  placeholder="פרטים על הלוואה, מטרה, סכום..."
                />
              </div>
              <button type="submit" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors">שמור במערכת</button>
            </form>
          </div>
        </div>
      )}

      {/* High-End Tabbed Profile Modal */}
      {profileLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-10">
          <div className="bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl w-full lg:max-w-4xl h-[92vh] lg:h-auto lg:max-h-[90vh] flex flex-col overflow-hidden relative animate-in slide-in-from-bottom duration-300 lg:animate-in lg:zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 lg:px-8 py-4 lg:py-6 shrink-0 flex justify-between items-start">
               <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 lg:gap-3 mb-1 lg:mb-2">
                    <input 
                      defaultValue={profileLead.full_name || ''} 
                      onBlur={e => { if(e.target.value !== profileLead.full_name) updateLeadField(profileLead.id, 'full_name', e.target.value) }}
                      className="text-xl lg:text-2xl font-bold text-slate-900 max-w-[200px] lg:max-w-xs bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg px-2 py-0.5 outline-none transition-all placeholder-slate-300"
                      placeholder="שם הלקוח"
                    />
                    <span className={`px-2 py-0.5 lg:px-2.5 lg:py-1 text-[10px] lg:text-xs font-bold rounded-lg border ${STATUS_CONFIG[profileLead.status]?.bg} ${STATUS_CONFIG[profileLead.status]?.color} ${STATUS_CONFIG[profileLead.status]?.border}`}>
                      {STATUS_CONFIG[profileLead.status]?.label}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium px-2">
                    <div className="flex items-center gap-1.5 group relative">
                       <Phone size={14} className="text-indigo-500 absolute right-0 pointer-events-none"/> 
                       <input 
                         dir="ltr" 
                         defaultValue={profileLead.phone || ''} 
                         onBlur={e => { if(e.target.value !== profileLead.phone) updateLeadField(profileLead.id, 'phone', e.target.value) }}
                         className="text-left bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md pl-2 pr-6 py-0.5 outline-none transition-all w-[110px]"
                         placeholder="050-0000000"
                       />
                    </div>
                    <div className="flex items-center gap-1.5 group relative">
                       <MapPin size={14} className="text-indigo-500 absolute right-0 pointer-events-none"/>
                       <input 
                         defaultValue={profileLead.city || ''} 
                         onBlur={e => { if(e.target.value !== profileLead.city) updateLeadField(profileLead.id, 'city', e.target.value) }}
                         className="bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-md pr-6 pl-2 py-0.5 outline-none transition-all w-[100px]"
                         placeholder="עיר מגורים"
                       />
                    </div>
                  </div>
               </div>
               <button onClick={() => setProfileLead(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors lg:mr-4"><X size={24}/></button>
            </div>

            {/* Modal Tabs - Horizontal Scrollable on Mobile */}
            <div className="flex border-b border-slate-200 px-4 lg:px-8 overflow-x-auto no-scrollbar shrink-0 bg-white">
                <button onClick={() => setActiveTab('overview')} className={`px-4 lg:px-6 py-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>סקירה כללית</button>
                <button onClick={() => setActiveTab('notes')} className={`px-4 lg:px-6 py-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>הערות סוכן</button>
                <button onClick={() => setActiveTab('meetings')} className={`px-4 lg:px-6 py-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'meetings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>פגישות ולו"ז</button>
                <button onClick={() => setActiveTab('timeline')} className={`px-4 lg:px-6 py-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'} flex items-center gap-1.5`}><History size={16}/> ציר זמן</button>
                <button onClick={() => setActiveTab('docs')} className={`px-4 lg:px-6 py-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>מסמכים</button>
            </div>

            {/* Tab Contents */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-8">
                  {/* AI Suggestion Banner */}
                  {(() => {
                    let suggestion = "";
                    if (profileLead.agent_notes?.includes("יקר")) suggestion = "הלקוח חושש ממחיר - מומלץ לשלוח השוואת ריביות ותועלות.";
                    if (profileLead.status === 'DOC_COLLECTION' && leadDocs.length === 0) suggestion = "חסרים מסמכים - שלח תזכורת בוואטסאפ לצילום ת.ז.";
                    
                    if (!suggestion) return null;
                    return (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 animate-pulse shadow-sm">
                        <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm"><Lightbulb size={20}/></div>
                        <div>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">AI Next Step Suggested</p>
                          <p className="text-indigo-800 font-bold text-sm leading-tight">{suggestion}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">סיכום המערכת (AI)</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {profileLead.summary_sentence?.replace(/^\[פייסבוק\]:\s*/, '').replace(/^\[פייסבוק\]/, '').replace(/^\[ידני\]:\s*/, '').replace(/^\[ידני\]/, '') || 'עדיין אין סיכום מהבוט.'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">שיוך יועץ</label>
                      <select
                        value={profileLead.consultant || ''}
                        onChange={e => updateLeadField(profileLead.id, 'consultant', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="">— בחר יועץ —</option>
                        <option value="sapir">ספיר</option>
                        <option value="uzi">עוזי</option>
                        <option value="alex">אלכס</option>
                        <option value="yosef">יוסף</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">מקור הליד</label>
                      <select
                        value={profileLead.summary_sentence?.includes('[פייסבוק]') ? 'facebook' : profileLead.summary_sentence?.includes('[ידני]') ? 'manual' : 'bot'}
                        onChange={async (e) => {
                          const newSrc = e.target.value;
                          let baseText = (profileLead.summary_sentence || '').replace(/^\[פייסבוק\]:\s*/, '').replace(/^\[פייסבוק\]/, '').replace(/^\[ידני\]:\s*/, '').replace(/^\[ידני\]/, '');
                          
                          let newSummary = baseText;
                          if (newSrc === 'facebook') newSummary = `[פייסבוק]: ${baseText || 'ליד חדש הגיע מהפייסבוק'}`;
                          else if (newSrc === 'manual') newSummary = `[ידני]: ${baseText}`;
                          
                          await updateLeadField(profileLead.id, 'summary_sentence', newSummary);
                          setProfileLead(prev => prev ? {...prev, summary_sentence: newSummary} : null);
                        }}
                        className={`w-full px-4 py-3 rounded-xl border font-bold text-sm outline-none transition-all ${profileLead.summary_sentence?.includes('[פייסבוק]') ? 'bg-blue-50 text-blue-700 border-blue-200' : profileLead.summary_sentence?.includes('[ידני]') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                      >
                         <option value="bot">הגיע מהבוט (וואטסאפ)</option>
                         <option value="facebook">הגיע מהפייסבוק (API)</option>
                         <option value="manual">נוצר ידנית במערכת</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">סטטוס התקדמות</label>
                    <select 
                      value={profileLead.status} 
                      onChange={e => updateLeadField(profileLead.id, 'status', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold"
                    >
                      {Object.keys(STATUS_CONFIG).map(sk => <option key={sk} value={sk}>{STATUS_CONFIG[sk].label}</option>)}
                    </select>
                  </div>

                  {loggedUser?.role === 'admin' && (
                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                       <button
                         onClick={async () => {
                           if (!confirm(`האם אתה בטוח שברצונך למחוק את הליד של ${profileLead.full_name}?`)) return;
                           const { error } = await supabase.from('leads').delete().eq('id', profileLead.id);
                           if (error) {
                             alert('שגיאה במחיקה: ' + error.message);
                           } else {
                             setLeads(prev => prev.filter(l => l.id !== profileLead.id));
                             setProfileLead(null);
                           }
                         }}
                         className="flex items-center gap-2 text-red-500 hover:text-red-700 font-bold text-sm p-3 hover:bg-red-50 rounded-xl transition-all"
                       >
                         <Trash2 size={18}/> מחק ליד
                       </button>
                    </div>
                  )}
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
                    <div className="flex gap-3 flex-wrap">
                      <button onClick={() => addToCalendar(profileLead)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-md transition-colors flex justify-center items-center gap-2"><Calendar size={18}/> סנכרן לגוגל יומן</button>
                      <button onClick={() => shareByEmail(profileLead)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3 rounded-xl font-semibold transition-colors shadow-sm"><Mail size={20}/></button>
                      <button onClick={() => window.open(`https://wa.me/${profileLead.phone}`, '_blank')} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl font-semibold transition-colors shadow-sm"><Send size={20}/></button>
                    </div>
                    {profileLead.meeting_time && (
                      <button
                        onClick={async () => {
                          if (!confirm('לבטל את הפגישה ולשלוח מייל ללקוח?')) return;
                          await updateLeadField(profileLead.id, 'meeting_time', null);
                          await updateLeadField(profileLead.id, 'status', 'CANCELLED');
                          const body = encodeURIComponent(`שלום ${profileLead.full_name},\n\nאנו מתנצלים, הפגישה שנקבעה בוטלה.\nנשמח לתאם עמך מועד חדש בהקדם.\n\nבברכה,\nצוות אדמתנו ביתנו משכנתאות`);
                          const sub = encodeURIComponent(`ביטול פגישה — ${profileLead.full_name}`);
                          window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${sub}&body=${body}`, '_blank');
                        }}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2.5 rounded-xl font-semibold transition-colors"
                      >
                        <X size={16}/> ביטול פגישה
                      </button>
                    )}
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
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-slate-500 block mb-1">סוג פגישה</label>
                          <div className="grid grid-cols-2 gap-2">
                             <button type="button" onClick={() => setManualMeetingType('phone')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${manualMeetingType === 'phone' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>טלפונית</button>
                             <button type="button" onClick={() => setManualMeetingType('physical')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${manualMeetingType === 'physical' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>פיזית</button>
                          </div>
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg font-semibold mt-2 transition-colors">שמור פגישה ב-CRM</button>
                    </form>
                  </div>
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="flex flex-col gap-6">
                   <div className="relative">
                      <div className="absolute top-0 bottom-0 right-4 w-0.5 bg-slate-100"></div>
                      <div className="space-y-8 relative">
                         <div className="flex gap-6 items-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 border-4 border-white shadow-sm z-10 shrink-0"></div>
                            <div className="bg-slate-50 p-4 rounded-2xl flex-1 border border-slate-100">
                               <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">נוצר במערכת</p>
                               <p className="text-sm font-bold text-slate-800 leading-tight">
                                  {profileLead.summary_sentence?.includes('[פייסבוק]') ? 'ליד חדש הגיע מהפייסבוק' : 
                                   profileLead.summary_sentence?.includes('[ידני]') ? 'ליד חדש הוקם ידנית' : 
                                   'ליד חדש הגיע מוואטסאפ (בוט)'}
                                </p>
                               <p className="text-[11px] text-slate-500 mt-1">{new Date(profileLead.created_at).toLocaleString('he-IL')}</p>
                            </div>
                         </div>
                         {profileLead.meeting_time && (
                           <div className="flex gap-6 items-start">
                              <div className="w-8 h-8 rounded-full bg-amber-500 border-4 border-white shadow-sm z-10 shrink-0"></div>
                              <div className="bg-amber-50/50 p-4 rounded-2xl flex-1 border border-amber-100">
                                 <p className="text-[10px] font-bold text-amber-600 mb-1 uppercase tracking-widest leading-none">פגישה</p>
                                 <p className="text-sm font-bold text-slate-800 leading-tight">נקבעה פגישה עם הלקוח</p>
                                 <p className="text-xs text-indigo-700 font-bold mt-1 tracking-tight">{profileLead.meeting_time}</p>
                              </div>
                           </div>
                         )}
                         {leadDocs.length > 0 && (
                           <div className="flex gap-6 items-start">
                              <div className="w-8 h-8 rounded-full bg-emerald-500 border-4 border-white shadow-sm z-10 shrink-0"></div>
                              <div className="bg-emerald-50/50 p-4 rounded-2xl flex-1 border border-emerald-100">
                                 <p className="text-[10px] font-bold text-emerald-600 mb-1 uppercase tracking-widest leading-none">מסמכים</p>
                                 <p className="text-sm font-bold text-slate-800 leading-tight">הועלו {leadDocs.length} מסמכים לתיק</p>
                                 <ul className="mt-2 space-y-1">
                                    {leadDocs.slice(0, 2).map(d => <li key={d.id} className="text-[11px] text-slate-500 flex items-center gap-1.5"><FileText size={12}/> {d.file_name}</li>)}
                                 </ul>
                              </div>
                           </div>
                         )}
                         <div className="flex gap-6 items-start">
                            <div className="w-8 h-8 rounded-full bg-slate-300 border-4 border-white shadow-sm z-10 shrink-0"></div>
                            <div className="bg-slate-50 p-4 rounded-2xl flex-1 border border-slate-100">
                               <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">עדכון אחרון</p>
                               <p className="text-sm font-bold text-slate-800 leading-tight">הלקוח נמצא בסטטוס {STATUS_CONFIG[profileLead.status]?.label}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="flex flex-col h-full gap-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500">פירוט שיחות, הערות פנימיות ותיעוד התקדמות.</p>
                  </div>
                  <textarea 
                    value={notesText} 
                    onChange={e => setNotesText(e.target.value)}
                    placeholder="הקלד/י כאן את ההערות שלך..."
                    className="w-full flex-1 min-h-[300px] p-5 rounded-2xl bg-amber-50/50 border border-amber-100 text-slate-800 leading-relaxed outline-none focus:border-amber-300 focus:bg-amber-50 transition-colors resize-none font-sans shadow-inner"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={() => {
                        const now = new Date();
                        const timeStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
                        const prefix = `[${loggedUser?.displayName || 'יועץ'} - ${timeStr}]: `;
                        
                        // Check if the timestamp is already added to prevent duplicate on multiple clicks
                        const finalNotes = notesText.startsWith(`[${loggedUser?.displayName || 'יועץ'}`) 
                          ? notesText 
                          : prefix + notesText;

                        updateLeadField(profileLead.id, 'agent_notes', finalNotes);
                        setNotesText(finalNotes); // Sync local state
                        alert('הערה נשמרה בהצלחה!');
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-amber-200 transition-all active:scale-95"
                    >
                      שמור הערות
                    </button>
                  </div>
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

      {/* Drill-down Leads Modal */}
      {drillDownData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full lg:max-w-lg h-[80vh] lg:max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 lg:animate-in lg:zoom-in-95">
             <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">{drillDownData.title} ({drillDownData.leads.length})</h3>
                <button onClick={() => setDrillDownData(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {drillDownData.leads.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-medium">אין לידים בשלב זה</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {drillDownData.leads.map(lead => (
                      <div 
                        key={lead.id} 
                        onClick={() => { setDrillDownData(null); setProfileLead(lead); fetchDocs(lead.id); }}
                        className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                             {lead.full_name?.charAt(0) || '?'}
                           </div>
                           <div>
                              <div className="font-bold text-slate-800">{lead.full_name}</div>
                              <div className="text-xs text-slate-400 font-mono" dir="ltr">{lead.phone}</div>
                           </div>
                        </div>
                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold border ${STATUS_CONFIG[lead.status]?.bg} ${STATUS_CONFIG[lead.status]?.color} ${STATUS_CONFIG[lead.status]?.border}`}>
                           {STATUS_CONFIG[lead.status]?.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
