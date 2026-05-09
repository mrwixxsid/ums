import { useState } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Mail, Phone, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  phone: string | null;
  avatar_url: string | null;
  courseCount: number;
}

const FacultyPage = () => {
  useDocumentTitle('Faculty | Gono Bishwabidyalay');
  const [deptFilter, setDeptFilter] = useState('all');

  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ['public-faculty'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'teacher');
      if (!roles?.length) return [];
      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, designation, phone, avatar_url')
        .in('id', ids);

      const { data: tcData } = await supabase.from('teacher_courses').select('teacher_id').in('teacher_id', ids);
      const countMap: Record<string, number> = {};
      tcData?.forEach((tc) => { countMap[tc.teacher_id] = (countMap[tc.teacher_id] || 0) + 1; });

      return (profiles ?? []).map((p) => ({ ...p, courseCount: countMap[p.id] || 0 }));
    },
  });

  const departments = Array.from(new Set(teachers.map((t) => t.department).filter(Boolean))) as string[];
  const filtered = deptFilter === 'all' ? teachers : teachers.filter((t) => t.department === deptFilter);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      {/* Banner */}
      <section className="navy-gradient py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto mb-3 h-px w-16 bg-gold" />
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Faculty Directory</h1>
          <p className="text-primary-foreground/70">Meet our distinguished faculty members.</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-14">
        {departments.length > 0 && (
          <div className="mb-8 max-w-xs">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="border-gold/30 focus:ring-gold/30"><SelectValue placeholder="Filter by department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.sort().map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Users className="h-12 w-12" />
            <p>No faculty members found.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((t, i) => (
              <Link
                key={t.id}
                to={`/faculty/${t.id}`}
                className="block opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
              >
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-gold/30 border-0 shadow-sm group">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <Avatar className="h-14 w-14 ring-2 ring-gold/30 ring-offset-2 ring-offset-card">
                      {t.avatar_url && <AvatarImage src={t.avatar_url} alt={t.full_name} />}
                      <AvatarFallback className="bg-gold/10 text-gold font-semibold">
                        {getInitials(t.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-sm group-hover:text-gold transition-colors">{t.full_name}</CardTitle>
                      <p className="truncate text-xs text-gold/80 font-medium">{t.designation ?? 'Lecturer'}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                    {t.department && <p>{t.department}</p>}
                    <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {t.email}</p>
                    {t.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {t.phone}</p>}
                    {t.courseCount > 0 && (
                      <Badge variant="secondary" className="mt-1 gap-1 text-[10px] bg-gold/10 text-gold border-gold/20">
                        <BookOpen className="h-3 w-3" /> {t.courseCount} Course{t.courseCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyPage;
