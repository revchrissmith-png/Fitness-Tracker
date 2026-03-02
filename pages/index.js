import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Flame, Send, Activity, CheckCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function App() {
  const [logs, setLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('fitness-name');
    if (savedName) setName(savedName);
    fetchData();

    const channel = supabase.channel('realtime-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchData() {
    // 1. Fetch activities and logs
    const { data: act } = await supabase.from('activities').select('*');
    // We fetch logs from "today" specifically to calculate progress
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const { data: lg } = await supabase
      .from('logs')
      .select('*, activities(name, unit, daily_goal)')
      .order('created_at', { ascending: false });

    setActivities(act || []);
    setLogs(lg || []);
  }

  // Helper to calculate total for a specific person + activity today
  const getProgress = (userName, activityId) => {
    const today = new Date().setHours(0,0,0,0);
    return logs
      .filter(l => l.user_name === userName && l.activity_id === activityId && new Date(l.created_at) > today)
      .reduce((sum, current) => sum + Number(current.value), 0);
  };

  async function handleLog(e) {
    e.preventDefault();
    const actId = e.target.activity.value;
    const val = e.target.value.value;
    if (!name) { alert("Enter your name!"); return; }
    
    await supabase.from('logs').insert([{ activity_id: actId, user_name: name, value: val }]);
    e.target.reset();
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui', backgroundColor: '#fdfdfd' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Activity color="#3b82f6" /> Team Fitness</h1>
      
      <input 
        placeholder="Your Name" 
        value={name} 
        onChange={(e) => { setName(e.target.value); localStorage.setItem('fitness-name', e.target.value); }}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '12px', border: '1px solid #eee', fontSize: '16px' }}
      />

      <form onSubmit={handleLog} style={{ background: 'white', padding: '20px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <select name="activity" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #eee' }}>
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input name="value" type="number" placeholder="Amount" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #eee' }} />
          <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px' }}><Send size={20} /></button>
        </div>
      </form>

      <h3 style={{ color: '#666', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Daily Progress</h3>
      <div style={{ marginBottom: '30px' }}>
        {logs.slice(0, 8).map(log => {
          const totalToday = getProgress(log.user_name, log.activity_id);
          const goal = log.activities?.daily_goal || 100;
          const isComplete = totalToday >= goal;

          return (
            <div key={log.id} style={{ padding: '15px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600' }}>
                  {log.user_name} did {log.value} {log.activities?.name}
                </span>
                {isComplete && <CheckCircle size={16} color="#22c55e" />}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                Total today: <span style={{ color: isComplete ? '#22c55e' : '#3b82f6', fontWeight: 'bold' }}>{totalToday}</span> / {goal} {log.activities?.unit}
              </div>
              {/* Simple Progress Bar */}
              <div style={{ width: '100%', height: '6px', background: '#eee', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((totalToday/goal)*100, 100)}%`, height: '100%', background: isComplete ? '#22c55e' : '#3b82f6', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
