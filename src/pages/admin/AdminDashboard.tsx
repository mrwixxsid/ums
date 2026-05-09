import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, GraduationCap, FileText, TrendingUp, Bell, Building2, DoorOpen, Calendar, BarChart3, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface Stats {
  students: number; teachers: number; courses: number; exams: number;
  departments: number; rooms: number; pendingUsers: number;
}

interface SystemStats {
  enrollments: number;
  attendanceRecords: number;
  publishedResults: number;
  draftResults: number;
  semesterProgress: number | null;
}

interface BatchOverview {
  batch_name: string;
  semester: number;
  student_count: number;
  department_code: string;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ students: 0, teachers: 0, courses: 0, exams: 0, departments: 0, rooms: 0, pendingUsers: 0 });
  const [activeSemester, setActiveSemester] = useState<any>(null);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({ enrollments: 0, attendanceRecords: 0, publishedResults: 0, draftResults: 0, semesterProgress: null });
  const [batches, setBatches] = useState<BatchOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [studentsRes, teachersRes, coursesRes, examsRes, deptsRes, roomsRes, semRes, noticesRes, enrollRes, attRes, pubRes, draftRes, batchRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('exam_schedules').select('id', { count: 'exact', head: true }),
        supabase.from('departments').select('id', { count: 'exact', head: true }),
        supabase.from('rooms').select('id', { count: 'exact', head: true }),
        supabase.from('academic_semesters').select('*').eq('is_active', true).maybeSingle(),
        supabase.from('notices').select('id, title, notice_type, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('id', { count: 'exact', head: true }),
        supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('exam_results').select('id', { count: 'exact', head: true }).eq('is_published', false),
        supabase.from('batches').select('batch_name, semester, student_count, departments(code)').eq('is_graduated', false).order('semester', { ascending: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }),
      ]);

      const pendingUsers = Math.max(0, (profilesRes.count ?? 0) - (rolesRes.count ?? 0));

      setStats({
        students: studentsRes.count ?? 0, teachers: teachersRes.count ?? 0,
        courses: coursesRes.count ?? 0, exams: examsRes.count ?? 0,
        departments: deptsRes.count ?? 0, rooms: roomsRes.count ?? 0,
        pendingUsers,
      });

      const sem = semRes.data;
      setActiveSemester(sem);

      // Calculate semester progress
      let semesterProgress: number | null = null;
      if (sem?.start_date && sem?.final_exam_end) {
        const start = new Date(sem.start_date);
        const end = new Date(sem.final_exam_end);
        const now = new Date();
        const totalDays = differenceInDays(end, start);
        const elapsed = differenceInDays(now, start);
        if (totalDays > 0) {
          semesterProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
        }
      }

      setSystemStats({
        enrollments: enrollRes.count ?? 0,
        attendanceRecords: attRes.count ?? 0,
        publishedResults: pubRes.count ?? 0,
        draftResults: draftRes.count ?? 0,
        semesterProgress,
      });

      setBatches((batchRes.data ?? []).map((b: any) => ({
        batch_name: b.batch_name,
        semester: b.semester,
        student_count: b.student_count ?? 0,
        department_code: b.departments?.code ?? '—',
      })));

      setRecentNotices(noticesRes.data ?? []);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const quickActions = [
    { label: 'Manage Departments', href: '/admin/departments' },
    { label: 'Manage Courses', href: '/admin/courses' },
    { label: 'Manage Rooms', href: '/admin/rooms' },
    { label: 'Generate Routine', href: '/admin/routine' },
    { label: 'Post a Notice', href: '/admin/notices' },
    { label: 'Schedule an Exam', href: '/admin/exams' },
    { label: 'Publish Results', href: '/admin/results' },
    { label: 'Academic Calendar', href: '/admin/settings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of the university portal</p>
        </div>
        {activeSemester && (
          <Badge variant="outline" className="flex items-center gap-1 text-sm">
            <Calendar className="w-3 h-3" /> {activeSemester.name}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Students" value={stats.students} icon={GraduationCap} color="bg-blue-500" />
        <StatCard title="Teachers" value={stats.teachers} icon={Users} color="bg-indigo-500" />
        <StatCard title="Courses" value={stats.courses} icon={BookOpen} color="bg-emerald-500" />
        <StatCard title="Exams" value={stats.exams} icon={FileText} color="bg-amber-500" />
        <StatCard title="Departments" value={stats.departments} icon={Building2} color="bg-purple-500" />
        <StatCard title="Rooms" value={stats.rooms} icon={DoorOpen} color="bg-rose-500" />
      </div>

      {/* Pending users alert */}
      {stats.pendingUsers > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium">{stats.pendingUsers} user{stats.pendingUsers > 1 ? 's' : ''} without assigned roles</p>
                <p className="text-xs text-muted-foreground">These profiles exist but have no role (student/teacher) assigned.</p>
              </div>
            </div>
            <Link to="/admin/users" className="text-sm font-medium text-primary hover:underline">Manage Users</Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map(action => (
              <Link key={action.label} to={action.href}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium">
                {action.label}
                <span className="text-muted-foreground">→</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" /> Recent Notices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentNotices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notices posted yet.</p>
              ) : recentNotices.map((n: any) => (
                <div key={n.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{n.notice_type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Stats - Dynamic */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemStats.semesterProgress !== null && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Semester Progress</span>
                    <span className="font-medium">{systemStats.semesterProgress}%</span>
                  </div>
                  <Progress value={systemStats.semesterProgress} className="h-2" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Enrollments</p>
                  <p className="text-lg font-bold">{systemStats.enrollments}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Attendance Records</p>
                  <p className="text-lg font-bold">{systemStats.attendanceRecords}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Published Results</p>
                  <p className="text-lg font-bold">{systemStats.publishedResults}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Draft Results</p>
                  <p className="text-lg font-bold">{systemStats.draftResults}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Batch Overview */}
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Active Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {batches.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{b.batch_name}</p>
                    <p className="text-xs text-muted-foreground">{b.department_code} · Sem {b.semester}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{b.student_count} students</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
