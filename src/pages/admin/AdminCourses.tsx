import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, BookOpen, ArrowRight } from 'lucide-react';

interface DeptWithCounts {
  id: string;
  name: string;
  code: string;
  courseCount: number;
}

const AdminCourses = () => {
  const navigate = useNavigate();
  const [depts, setDepts] = useState<DeptWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: departments } = await supabase.from('departments').select('*').order('name');
      const { data: courses } = await supabase.from('courses').select('id, department_id').eq('is_active', true);

      const counts: Record<string, number> = {};
      (courses ?? []).forEach(c => {
        if (c.department_id) counts[c.department_id] = (counts[c.department_id] || 0) + 1;
      });

      setDepts((departments ?? []).map(d => ({
        ...d,
        courseCount: counts[d.id] || 0,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Course Management</h1>
        <p className="text-muted-foreground">Select a department to manage its courses</p>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground">No departments yet. Create departments first.</p>
              </CardContent>
            </Card>
          ) : depts.map(d => (
            <Card
              key={d.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/admin/courses/${d.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">{d.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{d.code}</Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {d.courseCount} courses
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
