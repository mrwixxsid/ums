import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, BarChart3, TrendingUp } from 'lucide-react';
import { GRADE_COLORS, gradeFromPercentage, percentageFromMarks, type Grade } from '@/lib/gradeScale';

const StudentResults = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('exam_results')
      .select('*, exam_schedules(title, total_marks, exam_type, course_id, courses(name, code))')
      .eq('student_id', user.id)
      .eq('is_published', true)
      .order('entered_at', { ascending: false })
      .then(({ data }) => setResults(data ?? []));
  }, [user]);

  const courseMap = new Map<string, { name: string; code: string; results: any[] }>();
  for (const r of results) {
    const course = (r.exam_schedules as any)?.courses;
    if (!course) continue;
    const cid = course.id || course.code;
    if (!courseMap.has(cid)) {
      courseMap.set(cid, { name: course.name, code: course.code, results: [] });
    }
    courseMap.get(cid)!.results.push(r);
  }
  const courseGroups = Array.from(courseMap.values());

  const scored = results.filter((r) => r.marks_obtained != null && (r.exam_schedules as any)?.total_marks);
  const totalPct = scored.length > 0
    ? Math.round(scored.reduce((sum, r) => sum + percentageFromMarks(r.marks_obtained, (r.exam_schedules as any).total_marks), 0) / scored.length)
    : null;
  const overallGrade = totalPct !== null ? gradeFromPercentage(totalPct) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Results</h1>
        <p className="text-muted-foreground">Published exam results</p>
      </div>

      {scored.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Exams</p>
                  <p className="text-xl font-bold">{scored.length}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-sm text-muted-foreground">Average</p>
                <p className="text-xl font-bold">{totalPct}%</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-sm text-muted-foreground">Grade</p>
                <span className={`px-2.5 py-1 rounded-full text-sm font-bold border ${GRADE_COLORS[overallGrade as Grade] || ''}`}>
                  {overallGrade}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No results published yet.</p>
          </CardContent>
        </Card>
      ) : (
        courseGroups.map((course) => (
          <Card key={course.code}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">{course.name}</CardTitle>
                <Badge variant="outline" className="text-xs">{course.code}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {course.results.map((r: any) => {
                const exam = r.exam_schedules as any;
                const total = exam?.total_marks ?? 100;
                const marks = r.marks_obtained;
                const pct = marks != null ? percentageFromMarks(marks, total) : null;
                const typeColors: Record<string, string> = { mid: 'default', lab: 'secondary', final: 'destructive' };

                return (
                  <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{exam?.title}</span>
                        <Badge variant={(typeColors[exam?.exam_type] ?? 'secondary') as any} className="text-xs capitalize">{exam?.exam_type}</Badge>
                      </div>
                      {pct !== null && (
                        <div className="mt-2">
                          <Progress value={pct} className="h-2" />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">
                        {marks ?? '–'}<span className="text-sm font-normal text-muted-foreground">/{total}</span>
                        {pct !== null && <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>}
                      </p>
                      {r.grade && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${GRADE_COLORS[r.grade as Grade] || 'bg-muted'}`}>
                          {r.grade}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default StudentResults;
