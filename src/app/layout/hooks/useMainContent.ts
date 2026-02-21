import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';

interface RecentLesson {
  id: number;
  titulo: string;
  descripcion: string | null;
  nivel: string | null;
  created_at: string;
}

export function useMainContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch 3 most recent lessons
  useEffect(() => {
    const fetchRecentLessons = async () => {
      setLoadingLessons(true);
      const { data, error } = await supabase
        .from("leccion")
        .select("id, titulo, descripcion, nivel, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching recent lessons:", error);
      } else {
        setRecentLessons(data || []);
      }
      setLoadingLessons(false);
    };

    fetchRecentLessons();

    // Subscribe to realtime changes on leccion table
    const channel = supabase
      .channel('leccion_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leccion' }, () => {
        fetchRecentLessons();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    isLoggedIn,
    recentLessons,
    loadingLessons,
  };
}
