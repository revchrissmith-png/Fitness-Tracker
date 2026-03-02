import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Flame, Send, Activity, CheckCircle, Calendar } from 'lucide-react';

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
    const { data: act } = await supabase.from('activities').select('*').order('name');
    const { data: lg } = await supabase
      .from('logs')
      .select('*, activities(name, unit, daily_goal)')
      .order('created_at', { ascending: false });

    setActivities(act || []);
    setLogs(lg || []);
  }

  const getDailyTotal = (userName, activityId, dateOffset = 0) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - dateOffset);
    const startOfDay = new Date(targetDate.setHours(0,0,0,0)).getTime();
    const endOfDay = new Date(targetDate.setHours(23,59,59,999)).getTime();
    
    return logs
      .filter(l => l.user_name === userName && l.activity_id === activityId && 
              new Date(l.created_at).getTime() >= startOfDay && 
              new Date(l.created_at).getTime() <= endOfDay)
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
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
          <Activity color="#3b82f6" /> Team Fitness
        </h1>
        <input 
          placeholder="Your Name" 
          value={name} 
          onChange={(e) => { setName(e.target.value); localStorage.setItem('fitness-name', e.target.value); }}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px' }}
        />
      </header>

      <form onSubmit={handleLog} style={{ background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginBottom: '30px' }}>
        <select name="activity" style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', appearance: 'none' }}>
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input name="value" type="number" placeholder="Amount" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: '600' }}>Add</button>
        </div>
      </form>

      <section>
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '15px' }}>Today's Progress</h3>
        {activities.map(act => {
          const myTotal = getDailyTotal(name, act.id);
          const pct = Math.min((myTotal / act.daily_goal) * 100, 100);
          return (
            <div key={act.id} style={{ background: 'white', padding: '15px', borderRadius: '16px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600' }}>{act.name}</span>
                <span style={{ fontSize: '14px', color: '#64748b' }}>{myTotal} / {act.daily_goal} {act.unit}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#22c55e' : '#3b82f6', transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </section>

      <section style={{ marginTop: '40px' }}>
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={14} /> Recent Friend Activity
        </h3>
        {logs.slice(0, 5).map(log => (
          <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ height: '40px', width: '40px', borderRadius: '20px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#3b82f6', fontWeight: 'bold' }}>
              {log.user_name[0]}
            </div>
            <div>
              <div style={{ fontSize: '14px' }}>
                <strong>{log.user_name}</strong> did {log.value} {log.activities?.name}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
