import { useParams, Link } from 'react-router-dom';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, BookOpen, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TeacherProfile {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface CourseInfo {
  id: string;
  name: string;
  code: string;
  credits: number | null;
  course_type: string | null;
  semester_number: number | null;
}

const FacultyProfilePage = () => {
  useDocumentTitle('Faculty Profile | Gono Bishwabidyalay');
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['public-faculty-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, designation, phone, avatar_url')
        .eq('id', id)
        .single();

      let courses: CourseInfo[] = [];
      if (profile) {
        const { data: tc } = await supabase.from('teacher_courses').select('course_id').eq('teacher_id', id);
        if (tc?.length) {
          const courseIds = tc.map((c) => c.course_id);
          const { data: coursesData } = await supabase
            .from('courses')
            .select('id, name, code, credits, course_type, semester_number')
            .in('id', courseIds)
            .order('code');
          courses = (coursesData ?? []) as CourseInfo[];
        }
      }

      return { teacher: profile as TeacherProfile | null, courses };
    },
    enabled: !!id,
  });

  const teacher = data?.teacher ?? null;
  const courses = data?.courses ?? [];

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          <Card><CardContent className="pt-6 space-y-4"><Skeleton className="h-24 w-24 rounded-full mx-auto" /><Skeleton className="h-5 w-3/4 mx-auto" /><Skeleton className="h-4 w-1/2 mx-auto" /></CardContent></Card>
          <Card className="md:col-span-2"><CardContent className="pt-6 space-y-3"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <GraduationCap className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">Faculty Member Not Found</h2>
        <p className="mt-2 text-muted-foreground">This profile may not exist.</p>
        <Button asChild variant="outline" className="mt-6 border-gold/30">
          <Link to="/faculty"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Faculty</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Button asChild variant="ghost" className="mb-6 text-muted-foreground hover:text-gold">
        <Link to="/faculty"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Faculty Directory</Link>
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gold" />
          <CardContent className="flex flex-col items-center pt-8 text-center">
            <Avatar className="h-28 w-28 ring-4 ring-gold/30 ring-offset-4 ring-offset-card">
              {teacher.avatar_url && <AvatarImage src={teacher.avatar_url} alt={teacher.full_name} />}
              <AvatarFallback className="bg-gold/10 text-gold text-3xl font-bold">
                {getInitials(teacher.full_name)}
              </AvatarFallback>
            </Avatar>
            <h1 className="mt-5 text-xl font-bold text-foreground">{teacher.full_name}</h1>
            <p className="text-sm font-medium text-gold">{teacher.designation ?? 'Lecturer'}</p>
            {teacher.department && (
              <Badge variant="secondary" className="mt-3 bg-gold/10 text-gold border-gold/20">{teacher.department}</Badge>
            )}

            <div className="mt-6 w-full space-y-3 text-left text-sm border-t border-border pt-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-gold/70" />
                <span className="truncate">{teacher.email}</span>
              </div>
              {teacher.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-gold/70" />
                  <span>{teacher.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Courses Card */}
        <Card className="md:col-span-2 border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gold" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-gold" /> Assigned Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses assigned.</p>
            ) : (
              <div className="space-y-3">
                {courses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-gold/10 p-3 hover:border-gold/30 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.course_type && (
                        <Badge variant="outline" className="text-[10px] border-gold/20">{c.course_type}</Badge>
                      )}
                      {c.credits != null && (
                        <Badge variant="secondary" className="text-[10px] bg-gold/10 text-gold">{c.credits} Credit{c.credits > 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FacultyProfilePage;
