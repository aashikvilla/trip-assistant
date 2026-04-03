import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);

  const shouldShowOnboarding = useCallback(async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences_completed, preferences')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return !data;
    }

    const profile = data as { preferences_completed?: boolean; preferences?: unknown };
    if (profile.preferences_completed === true) {
      return false;
    }

    const prefs = profile.preferences as { interests?: unknown[]; dietary?: unknown[] } | null | undefined;
    const hasInterests = Array.isArray(prefs?.interests) && prefs!.interests!.length > 0;
    const hasDietary = Array.isArray(prefs?.dietary) && prefs!.dietary!.length > 0;

    return !(hasInterests || hasDietary) || profile.preferences_completed === false;
  }, []);

  const handleAuthStateChange = useCallback(async (_event: string, session: Session | null) => {
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (_event === 'SIGNED_OUT' || !session) {
      setShowPreferences(false);
      setLoading(false);
    } else if (_event === 'SIGNED_UP' && currentUser) {
      setShowPreferences(true);
      setLoading(false);
    } else if (currentUser) {
      const needsOnboarding = await shouldShowOnboarding(currentUser.id);
      setShowPreferences(needsOnboarding);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [shouldShowOnboarding]);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      if (!mounted) return;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          setLoading(false);
          return;
        }

        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!mounted) return;
          handleAuthStateChange(event, newSession);
        });

        subscription = authSubscription;

        if (session?.user) {
          setUser(session.user);
          const needsOnboarding = await shouldShowOnboarding(session.user.id);
          setShowPreferences(needsOnboarding);
        }
        setLoading(false);
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [handleAuthStateChange, shouldShowOnboarding]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setShowPreferences(false);
      window.location.href = '/auth';
    } catch (error) {
      setUser(null);
      setShowPreferences(false);
      setLoading(false);
      throw error;
    }
  }, []);

  const handlePreferencesComplete = useCallback((): void => {
    setShowPreferences(false);
  }, []);

  return useMemo(() => ({
    user,
    loading,
    signOut,
    showPreferences,
    handlePreferencesComplete
  }), [user, loading, signOut, showPreferences, handlePreferencesComplete]);
};
