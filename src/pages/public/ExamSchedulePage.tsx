import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ExamSchedule {
  id: string;
  title: string;
  exam_type: string;
  scheduled_at: string;
  duration_minutes: number | null;
  total_marks: number | null;
  room: string | null;
  courses: { name: string; code: string } | null;
}

const ExamSchedulePage = () => {
  useDocumentTitle('Exam Schedule | Gono Bishwabidyalay');
  const { data: exams = [], isLoading } = useQuery<ExamSchedule[]>({
    queryKey: ['public-exam-schedule'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_schedules')
        .select('*, courses(name, code)')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
      return (data ?? []) as ExamSchedule[];
    },
  });

  const typeBadge = (type: string) => {
    if (type === 'mid') return 'bg-gold text-gold-foreground';
    if (type === 'final') return 'bg-primary text-primary-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <div>
      {/* Banner */}
      <section className="navy-gradient py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto mb-3 h-px w-16 bg-gold" />
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Exam Schedule</h1>
          <p className="text-primary-foreground/70">Upcoming examinations at Gono Bishwabidyalay.</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-14">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-2/3" /></CardContent></Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Calendar className="h-12 w-12" />
            <p>No upcoming exams scheduled.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((e, i) => (
              <Card
                key={e.id}
                className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
              >
                <div className="h-1 bg-gold" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{e.title}</CardTitle>
                    <Badge className={`shrink-0 text-[10px] uppercase ${typeBadge(e.exam_type)}`}>{e.exam_type}</Badge>
                  </div>
                  {e.courses && (
                    <p className="text-xs text-muted-foreground">{e.courses.code} — {e.courses.name}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gold/70" /> {format(new Date(e.scheduled_at), 'dd MMM yyyy')}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-gold/70" /> {format(new Date(e.scheduled_at), 'hh:mm a')} &middot; {e.duration_minutes ?? 120} min
                  </p>
                  {e.room && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-gold/70" /> Room {e.room}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-gold/70" /> Total Marks: {e.total_marks ?? 100}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamSchedulePage;
