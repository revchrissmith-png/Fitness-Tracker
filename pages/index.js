import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Activity, Send, Beef, Trophy } from 'lucide-react';

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
    setSliderValue(10);
  }

  // Find the protein activity to show it at the top
  const proteinAct = activities.find(a => a.name === 'Protein');
  const proteinTotal = proteinAct ? getDailyTotal(name, proteinAct.id) : 0;
  const proteinGoal = proteinAct?.daily_goal || 100;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '24px', color: '#1e293b' }}>
          <Activity color="#3b82f6" /> Team Fitness
        </h1>
        <input 
          placeholder="Your Name" 
          value={name} 
          onChange={(e) => { setName(e.target.value); localStorage.setItem('fitness-name', e.target.value); }}
          style={{ width: '90%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', marginTop: '10px' }}
        />
      </header>

      {/* PROTEIN HIGHLIGHT CARD */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '20px', borderRadius: '24px', color: 'white', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>Daily Protein</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{proteinTotal}g <span style={{ fontSize: '16px', opacity: 0.7 }}>/ {proteinGoal}g</span></div>
          </div>
          <Beef size={40} opacity={0.5} />
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', marginTop: '15px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((proteinTotal / proteinGoal) * 100, 100)}%`, height: '100%', background: 'white', transition: 'width 1s ease' }} />
        </div>
      </div>

      <form onSubmit={handleLog} style={{ background: 'white', padding: '20px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <select 
          value={selectedActivityId}
          onChange={(e) => setSelectedActivityId(e.target.value)}
          style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #eee', background: '#f8fafc' }}
        >
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3b82f6' }}>{sliderValue}</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Amount to log</div>
        </div>

        <input 
          type="range" min="1" max="100" 
          value={sliderValue}
          onChange={(e) => setSliderValue(parseInt(e.target.value))}
          style={{ width: '100%', height: '8px', borderRadius: '5px', appearance: 'none', background: '#e2e8f0', outline: 'none', marginBottom: '25px' }}
        />

        <button type="submit" style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' }}>
          Log Entry
        </button>
      </form>

      <section>
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '15px', fontWeight: 'bold' }}>Movement Progress</h3>
        {activities.filter(a => a.name !== 'Protein').map(act => {
          const myTotal = getDailyTotal(name, act.id);
          const pct = Math.min((myTotal / act.daily_goal) * 100, 100);
          return (
            <div key={act.id} style={{ background: 'white', padding: '15px', borderRadius: '16px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{act.name}</span>
                <span style={{ fontSize: '14px', color: '#64748b' }}>{myTotal} / {act.daily_goal} {act.unit}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#22c55e' : '#3b82f6', transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
