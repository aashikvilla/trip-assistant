import { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);

  // Handle auth state changes
  const handleAuthStateChange = useCallback((event: string, session: Session | null) => {
    console.log('Auth state changed:', event, session);
    
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    
    if (event === 'SIGNED_OUT' || !session) {
      console.log('User signed out or no session');
      setShowPreferences(false);
      setLoading(false);
    } else if (event === 'SIGNED_UP' && currentUser) {
      // Only show preferences for new users after signup
      console.log('New user signed up, showing preferences');
      setShowPreferences(true);
      setLoading(false);
    } else if (currentUser) {
      // Existing user signed in - don't show preferences
      console.log('Existing user signed in');
      setShowPreferences(false);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  // Initialize auth state and set up listeners
  useEffect(() => {
    console.log('Initializing auth...');
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    
    const initializeAuth = async () => {
      if (!mounted) return;
      
      try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          setLoading(false);
          return;
        }
        
        // Set up the auth state change listener
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!mounted) return;
          handleAuthStateChange(event, newSession);
        });
        
        subscription = authSubscription;
        
        // Process the initial session
        if (session?.user) {
          console.log('Found existing user session');
          setUser(session.user);
          setShowPreferences(false); // Never show preferences for existing sessions
        }
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
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
  }, [handleAuthStateChange]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('Signing out...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('Sign out successful');
      setUser(null);
      setShowPreferences(false);
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
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