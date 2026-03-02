import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Activity, Send, Beef, Trophy, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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
  const [peekUser, setPeekUser] = useState(null);

  const iconUrl = "https://i.imgur.com/udcNtk8.png";

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

  const getDailyTotal = (userName, activityId, dateOffset = 0) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - dateOffset);
    return logs
      .filter(l => 
        l.user_name === userName && 
        l.activity_id === activityId &&
        new Date(l.created_at).toDateString() === targetDate.toDateString()
      )
      .reduce((sum, current) => sum + Number(current.value), 0);
  };

  const getLeaderboard = () => {
    const users = [...new Set(logs.map(l => l.user_name))];
    return users.map(user => {
      let goalsMet = 0;
      activities.filter(a => a.name !== 'Protein').forEach(act => {
        if (getDailyTotal(user, act.id) >= act.daily_goal) goalsMet++;
      });
      return { user, score: goalsMet };
    }).sort((a, b) => b.score - a.score);
  };

  async function handleLog(e) {
    e.preventDefault();
    if (!name) { alert("Please enter your name first!"); return; }
    await supabase.from('logs').insert([{ 
      activity_id: selectedActivityId, 
      user_name: name, 
      value: sliderValue 
    }]);
    setSliderValue(10);
  }

  async function deleteLog(id) {
    if (confirm("Delete this log?")) {
      await supabase.from('logs').delete().eq('id', id);
      fetchData();
    }
  }

  const proteinAct = activities.find(a => a.name === 'Protein');
  const proteinTotal = proteinAct ? getDailyTotal(name, proteinAct.id) : 0;
  const proteinGoal = proteinAct?.daily_goal || 100;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: '-apple-system, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', paddingBottom: '120px', WebkitTapHighlightColor: 'transparent' }}>
      <Head>
        <title>Team Fitness</title>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href={iconUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#f8fafc" />
      </Head>

      <header style={{ marginBottom: '24px', textAlign: 'center', paddingTop: 'env(safe-area-inset-top)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '22px', fontWeight: '900' }}>
          <Activity color="#3b82f6" strokeWidth={3} /> TEAM FITNESS
        </h1>
        <input 
          placeholder="Who are you?" 
          value={name} 
          onChange={(e) => { setName(e.target.value); localStorage.setItem('fitness-name', e.target.value); }}
          style={{ width: '85%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '12px', textAlign: 'center' }}
        />
      </header>

      {/* PROTEIN (PRIVATE) */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '24px', borderRadius: '28px', color: 'white', marginBottom: '24px', boxShadow: '0 8px 16px rgba(59,130,246,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '900', opacity: 0.8 }}>DAILY PROTEIN</div>
            <div style={{ fontSize: '36px', fontWeight: '800' }}>{proteinTotal}g <span style={{ fontSize: '16px', opacity: 0.6 }}>/ {proteinGoal}g</span></div>
          </div>
          <Beef size={32} opacity={0.6} />
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', marginTop: '15px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((proteinTotal / proteinGoal) * 100, 100)}%`, height: '100%', background: 'white', transition: 'width 1s ease' }} />
        </div>
      </div>

      <form onSubmit={handleLog} style={{ background: 'white', padding: '24px', borderRadius: '28px', marginBottom: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
        <select value={selectedActivityId} onChange={(e) => setSelectedActivityId(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #eee' }}>
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <div style={{ fontSize: '56px', fontWeight: '900', color: '#3b82f6' }}>{sliderValue}</div>
        </div>
        <input type="range" min="1" max="100" value={sliderValue} onChange={(e) => setSliderValue(parseInt(e.target.value))} style={{ width: '100%', marginBottom: '25px', accentColor: '#3b82f6' }} />
        <button type="submit" style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '16px', borderRadius: '18px', fontWeight: '800' }}>LOG ENTRY</button>
      </form>

      {/* LEADERBOARD (TAP TO PEEK) */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Trophy size={14} color="#f59e0b" /> STANDINGS (MOVEMENTS)
        </h3>
        <div style={{ background: '#fffbeb', borderRadius: '24px', border: '1px solid #fef3c7', overflow: 'hidden' }}>
          {getLeaderboard().map((entry, i) => (
            <div key={entry.user} style={{ borderBottom: i === 0 && getLeaderboard().length > 1 ? '1px solid #fde68a' : 'none' }}>
              <div onClick={() => setPeekUser(peekUser === entry.user ? null : entry.user)} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px', cursor: 'pointer', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', color: '#92400e' }}>{i === 0 ? '👑' : '🥈'} {entry.user}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#b45309' }}>{entry.score} / 5</span>
                  {peekUser === entry.user ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {peekUser === entry.user && (
                <div style={{ padding: '0 18px 20px 18px', background: 'rgba(255,255,255,0.6)' }}>
                  {activities.map(act => {
                    const total = getDailyTotal(entry.user, act.id);
                    const pct = Math.min((total / act.daily_goal) * 100, 100);
                    return (
                      <div key={act.id} style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
                          <span>{act.name}</span>
                          <span>{total}/{act.daily_goal}</span>
                        </div>
                        <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#22c55e' : '#3b82f6' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY (WITH DELETE) */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '900', marginBottom: '12px' }}>MY RECENT ACTIVITY</h3>
        <div style={{ background: 'white', borderRadius: '22px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {logs.filter(l => l.user_name === name).slice(0, 5).map((log, i) => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: i === 4 ? 'none' : '1px solid #f8fafc', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{log.value} {log.activities?.name}</div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', color: '#fca5a5', padding: '10px' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CONSISTENCY */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={14} color="#64748b" /> STREAK
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          {[6, 5, 4, 3, 2, 1, 0].map(offset => {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            const goals = activities.filter(act => getDailyTotal(name, act.id, offset) >= act.daily_goal).length;
            return (
              <div key={offset} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#cbd5e1' }}>{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: goals === activities.length ? '#22c55e' : goals > 0 ? '#eff6ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', color: goals === activities.length ? 'white' : '#3b82f6', marginTop: '5px' }}>{goals}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
