import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Activity, Send, Beef, Trophy, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

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
      // FILTER: Only count non-protein activities toward the leaderboard score
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

      <header style={{ marginBottom: '24px', textAlign: 'center', paddingTop: 'env(safe-area-inset-top)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>
          <Activity color="#3b82f6" strokeWidth={3} /> TEAM FITNESS
        </h1>
        <input 
          placeholder="Enter Your Name" 
          value={name} 
          onChange={(e) => { setName(e.target.value); localStorage.setItem('fitness-name', e.target.value); }}
          style={{ width: '85%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '16px', marginTop: '12px', textAlign: 'center' }}
        />
      </header>

      {/* PROTEIN (PRIVATE TRACKER) */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '24
