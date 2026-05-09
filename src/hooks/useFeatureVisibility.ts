import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type VisibilityMap = Record<string, boolean>;

export function useFeatureVisibility() {
  const [visibility, setVisibility] = useState<VisibilityMap>({});
  const [loading, setLoading] = useState(true);

  const fetchVisibility = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .like('key', 'vis_%');

    if (data) {
      const map: VisibilityMap = {};
      data.forEach((row) => {
        map[row.key] = row.value !== 'false';
      });
      setVisibility(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  const isVisible = (key: string) => visibility[key] !== false;

  const toggle = async (key: string, value: boolean) => {
    setVisibility((prev) => ({ ...prev, [key]: value }));
    await supabase
      .from('settings')
      .update({ value: value ? 'true' : 'false', updated_at: new Date().toISOString() })
      .eq('key', key);
  };

  return { visibility, isVisible, toggle, loading, refetch: fetchVisibility };
}
