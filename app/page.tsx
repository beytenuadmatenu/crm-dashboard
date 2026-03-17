"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Phone, Calendar, Clock, User, FileText, CheckCircle, XCircle } from 'lucide-react';

type Lead = {
  id: string;
  created_at: string;
  phone: string;
  full_name: string;
  summary_sentence: string;
  meeting_time: string;
  status: string;
};

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW_LEAD':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">ליד חדש</span>;
      case 'MEETING_SCHEDULED':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">נקבעה פגישה</span>;
      case 'IN_PROCESS':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">בטיפול</span>;
      case 'CLIENT':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> לקוח</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"><XCircle className="w-4 h-4"/> בוטל</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">לא ידוע</span>;
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול לידים</h1>
          <p className="text-gray-500 mt-2">מעקב וניהול פניות מהבוט בוואטסאפ של אדמתנו ביתנו</p>
        </div>
        <button 
          onClick={fetchLeads}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-lg shadow hover:bg-gray-800 transition font-medium"
        >
          רענן נתונים
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-lg">אין לידים עדיין. כשלידים יכנסו דרך הבוט הם יופיעו כאן אוטומטית.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 p-2 rounded-full">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{lead.full_name || 'לקוח לא ידוע'}</h2>
                </div>
                {getStatusBadge(lead.status)}
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.phone}</p>
                    <p className="text-xs text-gray-500">מספר מזהה</p>
                  </div>
                </div>

                {lead.meeting_time && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.meeting_time}</p>
                      <p className="text-xs text-gray-500">מועד פגישה מתוכנן</p>
                    </div>
                  </div>
                )}

                {lead.summary_sentence && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">{lead.summary_sentence}</p>
                      <p className="text-xs text-gray-500 mt-1">סיכום שיחה נתפס ע"י הבוט</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3 pt-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">
                    נוצר: {new Date(lead.created_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 flex gap-2 border-t border-gray-100">
                 {/* כפתורים פשוטים לשלב הראשון - רק דמו לעתיד, בהמשך ייפתח מסך מלא */}
                 <button className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                    פרחים ומסמכים
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
