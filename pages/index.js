import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Flame, Send, Activity } from 'lucide-react';

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchData() {
    const { data: act } = await supabase.from('activities').select('*');
    const { data: lg } = await supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(10);
    setActivities(act || []);
    setLogs(lg || []);
  }

  async function handleLog(e) {
    e.preventDefault();
    const actId = e.target.activity.value;
    const val = e.target.value.value;
    if (!name) { alert("Please enter your name first!"); return; }
    
    await supabase.from('logs').insert([{ activity_id: actId, user_name: name, value: val }]);
    e.target.reset();
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Activity color="#3b82f6" /> Team Fitness</h1>
      
      <input 
        placeholder="Your Name" 
        value={name} 
        onChange={(e) => { setName(e.target.value); localStorage.setItem('fitness-name', e.target.value); }}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #ddd' }}
      />

      <form onSubmit={handleLog} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '20px', marginBottom: '30px' }}>
        <select name="activity" style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
          {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.unit})</option>)}
        </select>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input name="value" type="number" placeholder="Amount" style={{ flex: 1, padding: '10px' }} />
          <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px' }}><Send size={18} /></button>
        </div>
      </form>

      <h3>Live Feed</h3>
      {logs.map(log => (
        <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: 'white', borderBottom: '1px solid #eee' }}>
          <Flame size={20} color="#f97316" />
          <div>
            <strong>{log.user_name}</strong> logged {log.value}
            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(log.created_at).toLocaleTimeString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
