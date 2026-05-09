import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PenLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const StudentAssessments = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('assessments')
      .select('*, courses(id, name, code)')
      .eq('student_id', user.id)
      .order('assessment_date', { ascending: false })
      .then(({ data }) => {
        setAssessments(data ?? []);
        setLoading(false);
      });
  }, [user]);

  // Group by course
  const grouped = useMemo(() => {
    const map = new Map<string, { course: any; items: any[]; avgPct: number }>();
    assessments.forEach(a => {
      const cid = a.course_id;
      if (!map.has(cid)) {
        map.set(cid, { course: a.courses, items: [], avgPct: 0 });
      }
      map.get(cid)!.items.push(a);
    });
    const groups = Array.from(map.values());
    groups.forEach(g => {
      const pcts = g.items
        .filter(a => a.marks_obtained != null && a.total_marks)
        .map(a => (a.marks_obtained / a.total_marks) * 100);
      g.avgPct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    });
    return groups;
  }, [assessments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Assessments</h1>
        <p className="text-muted-foreground text-sm">Your quiz and assignment marks</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <PenLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No assessments recorded yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => (
            <Card key={g.course?.id}>
              <CardHeader className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{g.course?.code} — {g.course?.name}</CardTitle>
                  <Badge variant="secondary">Avg: {g.avgPct}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4 px-5">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">Assessment</th>
                      <th className="text-right px-3 py-2 font-medium">Marks</th>
                      <th className="text-right px-3 py-2 font-medium">%</th>
                      <th className="text-right px-3 py-2 font-medium">Date</th>
                    </tr></thead>
                    <tbody>
                      {g.items.map(a => (
                        <tr key={a.id} className="border-t border-border/50">
                          <td className="px-3 py-2">{a.title}</td>
                          <td className="px-3 py-2 text-right font-medium">{a.marks_obtained ?? '—'} / {a.total_marks}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {a.marks_obtained != null ? `${Math.round((a.marks_obtained / (a.total_marks || 1)) * 100)}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                            {a.assessment_date ? format(new Date(a.assessment_date), 'MMM d') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAssessments;
