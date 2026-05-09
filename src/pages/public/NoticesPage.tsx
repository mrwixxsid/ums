import { useState } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

const PAGE_SIZE = 12;

const NoticesPage = () => {
  useDocumentTitle('Notices | Gono Bishwabidyalay');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['public-notices', typeFilter, page],
    queryFn: async () => {
      let query = supabase.from('notices').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (typeFilter !== 'all') query = query.eq('notice_type', typeFilter as any);
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, count } = await query;
      return { notices: (data ?? []) as Tables<'notices'>[], total: count ?? 0 };
    },
  });

  const notices = data?.notices ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const badgeClass = (type: string | null) => {
    if (type === 'urgent') return 'bg-destructive text-destructive-foreground';
    if (type === 'fun') return 'bg-gold text-gold-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <div>
      {/* Banner */}
      <section className="navy-gradient py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto mb-3 h-px w-16 bg-gold" />
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Notices</h1>
          <p className="text-primary-foreground/70">Stay updated with the latest university announcements.</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-14">
        <div className="mb-8 max-w-xs">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="border-gold/30 focus:ring-gold/30"><SelectValue placeholder="Filter by type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="informational">Informational</SelectItem>
              <SelectItem value="fun">Fun</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Bell className="h-12 w-12" />
            <p>No notices found.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notices.map((n, i) => (
                <Card
                  key={n.id}
                  className="border-l-4 border-l-gold/60 shadow-sm hover:shadow-lg hover:border-gold/30 transition-all duration-300 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-snug">{n.title}</CardTitle>
                      <Badge className={`shrink-0 text-[10px] ${badgeClass(n.notice_type)}`}>
                        {n.notice_type ?? 'general'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="line-clamp-3 text-xs text-muted-foreground">{n.content}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(n.created_at), 'dd MMM yyyy')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="border-gold/30">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="border-gold/30">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NoticesPage;
