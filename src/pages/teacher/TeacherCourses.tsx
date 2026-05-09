import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ClipboardCheck, FileText, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeacherCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tcData } = await supabase
        .from('teacher_courses')
        .select('courses(id, code, name, department, semester, credits, course_type, contact_hours, semester_number, year)')
        .eq('teacher_id', user.id);

      const mapped = (tcData ?? []).map((tc: any) => tc.courses).filter(Boolean).filter((c: any) => c.course_type !== 'Viva');
      if (mapped.length === 0) { setCourses([]); setLoading(false); return; }

      const courseIds = mapped.map((c: any) => c.id);

      const [enrollRes, assessRes, notesRes] = await Promise.all([
        supabase.from('enrollments').select('course_id').in('course_id', courseIds),
        supabase.from('assessments').select('course_id').eq('teacher_id', user.id),
        supabase.from('notes').select('course_id').eq('teacher_id', user.id),
      ]);

      const countBy = (arr: any[], key: string) => {
        const m: Record<string, number> = {};
        (arr ?? []).forEach(r => { m[r[key]] = (m[r[key]] || 0) + 1; });
        return m;
      };

      const enrollCounts = countBy(enrollRes.data, 'course_id');
      const assessCounts = countBy(assessRes.data, 'course_id');
      const notesCounts = countBy(notesRes.data, 'course_id');

      setCourses(mapped.map((c: any) => ({
        ...c,
        students: enrollCounts[c.id] || 0,
        assessments: assessCounts[c.id] || 0,
        notes: notesCounts[c.id] || 0,
      })));
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Courses</h1>
        <p className="text-muted-foreground">All courses assigned to you with stats and quick actions.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading courses...</p>
      ) : courses.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No courses assigned yet. Contact the admin.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((c: any) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{c.code}</CardTitle>
                  <Badge variant={c.course_type === 'Lab' ? 'secondary' : 'outline'} className="text-xs">
                    {c.course_type || 'Theory'}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.department} • {c.semester_number ? `Y${c.year}-S${c.semester_number}` : '-'} • {c.credits} credits</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <Users className="w-4 h-4 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold mt-1">{c.students}</p>
                    <p className="text-[10px] text-muted-foreground">Students</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <ClipboardCheck className="w-4 h-4 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold mt-1">{c.assessments}</p>
                    <p className="text-[10px] text-muted-foreground">Assessments</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <FileText className="w-4 h-4 mx-auto text-muted-foreground" />
                    <p className="text-lg font-bold mt-1">{c.notes}</p>
                    <p className="text-[10px] text-muted-foreground">Notes</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/teacher/attendance">Mark Attendance</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/teacher/assessments">Add Assessment</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/teacher/notes">Post Note</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherCourses;
