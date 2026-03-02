import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Activity, Send, Beef, Trophy, Calendar, ChevronDown, ChevronUp, User } from 'lucide-react';

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
    const dateString = targetDate.toDateString();
    
    return logs
      .filter(l => 
        l.user_name === userName && 
        l.activity_id === activityId &&
        new Date(l.created_at).toDateString() === dateString
      )
      .reduce((sum, current) => sum + Number(current.value), 0);
  };

  const getLeaderboard = () => {
    const users = [...new Set(logs.map(l => l.user_name))];
    return users.map(user => {
      let goalsMet = 0;
      activities.forEach(act => {
        if (getDailyTotal(user, act.id) >= act.daily_goal) goalsMet++;
      });
      return { user, score: goalsMet };
    }).sort((a, b) => b.score - a.score);
  };

  async function handleLog(e) {
    e.preventDefault();
    if (!name) { alert("Please enter your name at the top first!"); return; }
    await supabase.from('logs').insert([{ 
      activity_id: selectedActivityId, 
      user_name: name, 
      value: sliderValue 
    }]);
    setSliderValue(10);
  }

  const proteinAct = activities.find(a => a.name === 'Protein');
  const proteinTotal = proteinAct ? getDailyTotal(name, proteinAct.id) : 0;
  const proteinGoal = proteinAct?.daily_goal || 100;

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: '-apple-system, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px', WebkitTapHighlightColor: 'transparent' }}>
      <Head>
        <title>Team Fitness</title>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href={iconUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#f8fafc" />
      </Head>

      {/* HEADER & NAME INPUT */}
      <header style={{ marginBottom: '24px', textAlign: 'center', paddingTop: 'env(safe-area-inset-top)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>
          <Activity color="#3b82f6" strokeWidth={3} /> TEAM FITNESS
        </h1>
        <input 
          placeholder="Enter Your Name" 
          value={name} 
          onChange={(e) => { setName(e.target.value); localStorage.setItem('fitness-name', e.target.value); }}
          style={{ width: '85%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '16px', marginTop: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
        />
      </header>

      {/* PROTEIN HIGHLIGHT */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '24px', borderRadius: '28px', color: 'white', marginBottom: '24px', boxShadow: '0 10px 20px rgba(59,130,246,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '900', opacity: 0.8, letterSpacing: '0.1em' }}>DAILY PROTEIN</div>
            <div style={{ fontSize: '36px', fontWeight: '800' }}>{proteinTotal}g <span style={{ fontSize: '16px', opacity: 0.6, fontWeight: '400' }}>/ {proteinGoal}g</span></div>
          </div>
          <Beef size={32} opacity={0.6} />
        </div>
        <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '5px', marginTop: '15px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((proteinTotal / proteinGoal) * 100, 100)}%`, height: '100%', background: 'white', transition: 'width 1s ease-out' }} />
        </div>
      </div>

      {/* LOGGING FORM */}
      <form onSubmit={handleLog} style={{ background: 'white', padding: '24px', borderRadius: '28px', marginBottom: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
        <select 
          value={selectedActivityId}
          onChange={(e) => setSelectedActivityId(e.target.value)}
          style={{ width: '100%', padding: '14px', marginBottom: '15px', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '16px', fontWeight: '600' }}
        >
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <div style={{ fontSize: '56px', fontWeight: '900', color: '#3b82f6' }}>{sliderValue}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>AMOUNT TO LOG</div>
        </div>
        <input type="range" min="1" max="100" value={sliderValue} onChange={(e) => setSliderValue(parseInt(e.target.value))} style={{ width: '100%', marginBottom: '25px', accentColor: '#3b82f6' }} />
        <button type="submit" style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '800', fontSize: '16px' }}>
          LOG MOVEMENT
        </button>
      </form>

      {/* LEADERBOARD (WITH REWRITTEN PEEK) */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Trophy size={14} color="#f59e0b" /> TEAM STANDINGS (TAP TO PEEK)
        </h3>
        <div style={{ background: '#fffbeb', borderRadius: '24px', border: '1px solid #fef3c7', overflow: 'hidden' }}>
          {getLeaderboard().map((entry, i) => (
            <div key={entry.user} style={{ borderBottom: i === 0 && getLeaderboard().length > 1 ? '1px solid #fde68a' : 'none' }}>
              <div 
                onClick={() => setPeekUser(peekUser === entry.user ? null : entry.user)}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '18px', cursor: 'pointer', alignItems: 'center', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ fontSize: '18px' }}>{i === 0 ? '👑' : '🥈'}</span>
                   <span style={{ fontWeight: '800', color: '#92400e' }}>{entry.user}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#b45309', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                    {entry.score} GOALS
                  </span>
                  {peekUser === entry.user ? <ChevronUp size={16} color="#b45309" /> : <ChevronDown size={16} color="#b45309" />}
                </div>
              </div>
              
              {/* PEEK DETAIL VIEW */}
              {peekUser === entry.user && (
                <div style={{ padding: '0 18px 20px 18px', background: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(245, 158, 11, 0.1)' }}>
                  <div style={{ paddingTop: '10px' }}>
                    {activities.map(act => {
                      const total = getDailyTotal(entry.user, act.id);
                      const pct = Math.min((total / act.daily_goal) * 100, 100);
                      return (
                        <div key={act.id} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>
                            <span>{act.name}</span>
                            <span>{total} / {act.daily_goal}</span>
                          </div>
                          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#22c55e' : '#3b82f6', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7-DAY CONSISTENCY */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Calendar size={14} color="#64748b" /> MY 7-DAY STREAK
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          {[6, 5, 4, 3, 2, 1, 0].map(offset => {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            const goals = activities.filter(act => getDailyTotal(name, act.id, offset) >= act.daily_goal).length;
            const isToday = offset === 0;
            return (
              <div key={offset} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: isToday ? '#3b82f6' : '#cbd5e1', fontWeight: '900', marginBottom: '6px' }}>
                  {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </div>
                <div style={{ 
                  width: '34px', height: '34px', borderRadius: '12px', 
                  background: goals === activities.length ? '#22c55e' : goals > 0 ? '#eff6ff' : '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '900',
                  color: goals === activities.length ? 'white' : '#3b82f6',
                  border: isToday ? '2px solid #3b82f6' : 'none'
                }}>
                  {goals}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MY DAILY MOVEMENT LIST */}
      <section>
        <h3 style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '900', marginBottom: '16px' }}>MY GOALS TODAY</h3>
        {activities.filter(a => a.name !== 'Protein').map(act => {
          const myTotal = getDailyTotal(name, act.id);
          const pct = Math.min((myTotal / act.daily_goal) * 100, 100);
          return (
            <div key={act.id} style={{ background: 'white', padding: '18px', borderRadius: '22px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{act.name}</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: pct === 100 ? '#22c55e' : '#64748b' }}>
                  {myTotal} / {act.daily_goal}
                </span>
              </div>
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#22c55e' : '#3b82f6', transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
