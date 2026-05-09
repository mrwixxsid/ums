import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Pin } from 'lucide-react';
import { format } from 'date-fns';

const StudentNotices = () => {
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotices(data ?? []));
  }, []);

  const typeColors: Record<string, string> = { urgent: 'destructive', informational: 'default', fun: 'secondary' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notice Board</h1>
        <p className="text-muted-foreground">Announcements from admin and teachers</p>
      </div>
      <div className="space-y-3">
        {notices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No notices yet.</p>
            </CardContent>
          </Card>
        ) : (
          notices.map((n: any) => (
            <Card key={n.id} className={n.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                      <span className="font-semibold text-sm">{n.title}</span>
                      <Badge variant={typeColors[n.notice_type] as any} className="text-xs">{n.notice_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(n.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentNotices;
