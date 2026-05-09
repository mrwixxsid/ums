import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, FileText, DoorOpen } from 'lucide-react';
import { format } from 'date-fns';
import { GRADE_COLORS, type Grade } from '@/lib/gradeScale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const StudentExams = () => {
  const { user } = useAuth();
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [pastExams, setPastExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('student_id', user.id);
      const courseIds = (enrollments ?? []).map((e: any) => e.course_id);
      if (courseIds.length === 0) return;

      const now = new Date().toISOString();
      const [upRes, pastRes, resultsRes] = await Promise.all([
        supabase.from('exam_schedules').select('*, courses(name, code)').in('course_id', courseIds).gte('scheduled_at', now).order('scheduled_at'),
        supabase.from('exam_schedules').select('*, courses(name, code)').in('course_id', courseIds).lt('scheduled_at', now).order('scheduled_at', { ascending: false }),
        supabase.from('exam_results').select('exam_id, marks_obtained, grade, is_published').eq('student_id', user.id).eq('is_published', true),
      ]);
      setUpcomingExams(upRes.data ?? []);
      setPastExams(pastRes.data ?? []);
      setResults(resultsRes.data ?? []);
    };
    fetchData();
  }, [user]);

  const typeColors: Record<string, string> = { mid: 'default', lab: 'secondary', final: 'destructive' };
  const getResult = (examId: string) => results.find((r: any) => r.exam_id === examId);

  const renderExamCard = (exam: any, showResult = false) => {
    const result = showResult ? getResult(exam.id) : null;
    return (
      <Card key={exam.id}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{exam.title}</span>
                <Badge variant={typeColors[exam.exam_type] as any} className="text-xs capitalize">{exam.exam_type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{exam.courses?.code} — {exam.courses?.name}</p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(exam.scheduled_at), 'MMM d, yyyy • h:mm a')}</span>
                {exam.room && <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" />{exam.room}</span>}
                <span>{exam.total_marks} marks</span>
              </div>
            </div>
            {showResult && (
              <div className="text-right shrink-0">
                {result ? (
                  <div>
                    <span className="text-sm font-bold">{result.marks_obtained}/{exam.total_marks}</span>
                    {result.grade && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${GRADE_COLORS[result.grade as Grade] || ''}`}>{result.grade}</span>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs">Awaiting result</Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exam Schedule</h1>
        <p className="text-muted-foreground">Your enrolled course exams</p>
      </div>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingExams.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastExams.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3">
          {upcomingExams.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No upcoming exams.</p></CardContent></Card>
          ) : upcomingExams.map((exam: any) => renderExamCard(exam))}
        </TabsContent>
        <TabsContent value="past" className="space-y-3">
          {pastExams.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No past exams.</p></CardContent></Card>
          ) : pastExams.map((exam: any) => renderExamCard(exam, true))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentExams;
