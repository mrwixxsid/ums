import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string;
  description: string | null;
  credits: number | null;
  department: string | null;
  semester: string | null;
}

const StudentCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('enrollments')
      .select('courses(id, name, code, description, credits, department, semester)')
      .eq('student_id', user.id)
      .then(({ data }) => {
        setCourses((data ?? []).map((e: any) => e.courses).filter(Boolean));
      });
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Courses</h1>
        <p className="text-muted-foreground">Courses you are enrolled in</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Not enrolled in any courses yet.</p>
            </CardContent>
          </Card>
        ) : (
          courses.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{c.department}</span>
                      <span>{c.semester}</span>
                      <span>{c.credits} credits</span>
                    </div>
                  </div>
                  <Badge variant="outline">{c.code}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentCourses;
