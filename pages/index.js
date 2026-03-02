import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Flame, Send, Activity, Calendar } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function App() {
  const [logs, setLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [name, setName] = useState('');
  const [sliderValue, setSliderValue] = useState(10);
  const [selectedActivityId, setSelectedActivityId] = useState('');

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
    if (act && act.length > 0 && !selectedActivityId) setSelectedActivityId(act[0].id);
  }

  const getDailyTotal = (userName, activityId) => {
    return logs
      .filter(l => 
        l.user_name === userName && 
        l.activity_id === activityId &&
        new Date(l.created_at).toDateString() === new Date().toDateString()
      )
      .reduce((sum, current) => sum + Number(current.value), 0);
  };

  async function handleLog(e) {
    e.preventDefault();
    if (!name) { alert("Enter your name!"); return; }
    await supabase.from('logs').insert([{ 
      activity_id: selectedActivityId, 
      user_name: name, 
      value: sliderValue 
    }]);
    setSliderValue(10); // Reset slider after logging
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

      {/* NEW SLIDER INTERFACE */}
      <form onSubmit={handleLog} style={{ background: 'white', padding: '20px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <select 
          value={selectedActivityId}
          onChange={(e) => setSelectedActivityId(e.target.value)}
          style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #eee' }}
        >
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3b82f6' }}>{sliderValue}</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Amount to log</div>
        </div>

        <input 
          type="range" 
          min="1" 
          max="100" 
          value={sliderValue}
          onChange={(e) => setSliderValue(parseInt(e.target.value))}
          style={{ width: '100%', height: '8px', borderRadius: '5px', appearance: 'none', background: '#e2e8f0', outline: 'none', marginBottom: '20px' }}
        />

        <button type="submit" style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' }}>
          Log Movement
        </button>
      </form>

      <section>
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '15px' }}>Today's Goals</h3>
        {activities.map(act => {
          const myTotal = getDailyTotal(name, act.id);
          const pct = Math.min((myTotal / act.daily_goal) * 100, 100);
          return (
            <div key={act.id} style={{ background: 'white', padding: '15px', borderRadius: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong>{act.name}</strong>
                <span style={{ fontSize: '14px' }}>{myTotal}/{act.daily_goal} {act.unit}</span>
              </div>
              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#22c55e' : '#3b82f6' }} />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
