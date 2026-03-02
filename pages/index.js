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
    if (act && act.length
