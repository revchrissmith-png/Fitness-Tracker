import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Activity, Send, Beef, Trophy, Calendar, CheckCircle, XCircle } from 'lucide-react';

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
    if (!name) { alert("Enter your name!"); return; }
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
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui', background: '#f8fafc', minHeight: '1
