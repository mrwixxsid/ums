import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureLock(key: string) {
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', key).single().then(({ data }) => {
      setLocked(data?.value === 'true');
      setLoading(false);
    });
  }, [key]);

  return { locked, loading };
}
