import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, TrendingUp, Calendar, Bell, GraduationCap, MessageSquare, ArrowRight } from 'lucide-react';
import { DAYS, PERIODS } from '@/lib/routineGenerator';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [semester, setSemester] = useState<string>('');
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [weekRoutine, setWeekRoutine] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [courseStats, setCourseStats] = useState<Record<string, { students: number; assessments: number; notes: number; attPct: number | null; examAvg: number | null; atRisk: number }>>({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dayIndex = today.getDay(); // 0=Sun

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      // 1. Profile & semester
      const [profileRes, semRes] = await Promise.all([
        supabase.from('profiles').select('full_name, department, designation').eq('id', user.id).single(),
        supabase.from('academic_semesters').select('name').eq('is_active', true).limit(1),
      ]);
      setProfile(profileRes.data);
      setSemester(semRes.data?.[0]?.name ?? '');

      // 2. Teacher courses
      const { data: tcData } = await supabase
        .from('teacher_courses')
        .select('courses(id, code, name, department, semester, credits, course_type, semester_number, year)')
        .eq('teacher_id', user.id);
      const courses = (tcData ?? []).map((tc: any) => tc.courses).filter(Boolean).filter((c: any) => c.course_type !== 'Viva');
      setMyCourses(courses);

      if (courses.length === 0) { setLoading(false); return; }
      const courseIds = courses.map((c: any) => c.id);

      // 3. Parallel fetches
      const [enrollRes, reqCountRes, todayRes, weekRes, noticesRes, examsRes, reqListRes, assessRes, notesRes] = await Promise.all([
        supabase.from('enrollments').select('course_id').in('course_id', courseIds),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').in('course_id', courseIds),
        supabase.from('routines')
          .select('*, courses(name, code), rooms(number), batches(batch_name)')
          .eq('teacher_id', user.id).eq('day_of_week', dayIndex).order('period_number'),
        supabase.from('routines')
          .select('day_of_week, period_number, courses(code), rooms(number), is_lab_continuation')
          .eq('teacher_id', user.id),
        supabase.from('notices').select('id, title, notice_type, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('exam_schedules')
          .select('id, title, scheduled_at, room, courses(code, name)')
          .in('course_id', courseIds).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5),
        supabase.from('requests')
          .select('id, title, request_type, created_at, student_id, courses(code)')
          .eq('status', 'pending').in('course_id', courseIds).order('created_at', { ascending: false }).limit(3),
        supabase.from('assessments').select('course_id').eq('teacher_id', user.id),
        supabase.from('notes').select('course_id').eq('teacher_id', user.id),
      ]);

      // Student count
      const enrollCount = (enrollRes.data ?? []).length;
      setTotalStudents(enrollCount);
      setPendingRequests(reqCountRes.count ?? 0);
      setTodayClasses((todayRes.data ?? []).filter((r: any) => !r.is_lab_continuation));
      setWeekRoutine(weekRes.data ?? []);
      setNotices(noticesRes.data ?? []);
      setUpcomingExams(examsRes.data ?? []);
      setRecentRequests(reqListRes.data ?? []);

      // Course stats
      const countBy = (arr: any[]) => {
        const m: Record<string, number> = {};
        (arr ?? []).forEach(r => { m[r.course_id] = (m[r.course_id] || 0) + 1; });
        return m;
      };
      const ec = countBy(enrollRes.data ?? []);
      const ac = countBy(assessRes.data ?? []);
      const nc = countBy(notesRes.data ?? []);

      // Pre-fetch IDs for attendance + exam data
      const [classIdsRes, examIdsRes] = await Promise.all([
        supabase.from('classes').select('id').in('course_id', courseIds).eq('teacher_id', user.id),
        supabase.from('exam_schedules').select('id').in('course_id', courseIds),
      ]);
      const classIds = (classIdsRes.data ?? []).map((c: any) => c.id);
      const examIds = (examIdsRes.data ?? []).map((e: any) => e.id);

      const [attRes, examResultsRes] = await Promise.all([
        classIds.length > 0 ? supabase.from('attendance').select('student_id, status, class_id, classes(course_id)').in('class_id', classIds) : { data: [] },
        examIds.length > 0 ? supabase.from('exam_results').select('student_id, marks_obtained, exam_id, exam_schedules(course_id, total_marks)').in('exam_id', examIds) : { data: [] },
      ]);

      const attData = attRes.data ?? [];
      const examData = examResultsRes.data ?? [];

      const stats: Record<string, any> = {};
      courseIds.forEach(id => {
        // Attendance per course
        const courseAtt = attData.filter((a: any) => a.classes?.course_id === id);
        const presentCount = courseAtt.filter((a: any) => a.status === 'present' || a.status === 'late').length;
        const attPct = courseAtt.length > 0 ? Math.round((presentCount / courseAtt.length) * 100) : null;

        // Per-student attendance for at-risk detection
        const studentAttMap: Record<string, { total: number; present: number }> = {};
        courseAtt.forEach((a: any) => {
          if (!studentAttMap[a.student_id]) studentAttMap[a.student_id] = { total: 0, present: 0 };
          studentAttMap[a.student_id].total++;
          if (a.status === 'present' || a.status === 'late') studentAttMap[a.student_id].present++;
        });
        const atRisk = Object.values(studentAttMap).filter(s => (s.present / s.total) * 100 < 75).length;

        // Exam avg per course
        const courseExams = examData.filter((r: any) => r.exam_schedules?.course_id === id && r.marks_obtained != null && r.exam_schedules?.total_marks);
        const examAvg = courseExams.length > 0
          ? Math.round(courseExams.reduce((sum: number, r: any) => sum + (r.marks_obtained / r.exam_schedules.total_marks) * 100, 0) / courseExams.length)
          : null;

        stats[id] = { students: ec[id] || 0, assessments: ac[id] || 0, notes: nc[id] || 0, attPct, examAvg, atRisk };
      });
      setCourseStats(stats);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const periodLabel = (num: number) => {
    const p = PERIODS.find(p => p.number === num);
    return p ? `${p.start}–${p.end}` : `P${num}`;
  };

  const noticeTypeBadge = (type: string | null) => {
    if (type === 'urgent') return <Badge variant="destructive" className="text-[10px]">Urgent</Badge>;
    if (type === 'fun') return <Badge className="text-[10px] bg-info text-info-foreground">Fun</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Info</Badge>;
  };

  // Mini routine grid
  const routineGrid = () => {
    const grid: Record<string, string> = {};
    weekRoutine.forEach((r: any) => {
      if (r.is_lab_continuation) return;
      grid[`${r.day_of_week}-${r.period_number}`] = r.courses?.code ?? '?';
    });
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="p-1 border text-left text-muted-foreground">Day</th>
              {PERIODS.map(p => (
                <th key={p.number} className="p-1 border text-center text-muted-foreground">P{p.number}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, di) => (
              <tr key={di}>
                <td className="p-1 border font-medium text-muted-foreground">{day.slice(0, 3)}</td>
                {PERIODS.map(p => {
                  const code = grid[`${di}-${p.number}`];
                  return (
                    <td key={p.number} className={`p-1 border text-center ${code ? 'bg-primary/10 font-semibold text-primary' : ''}`}>
                      {code || ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Row 1: Welcome Banner */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || 'Teacher'}!</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {[profile?.department, profile?.designation].filter(Boolean).join(' • ')}
              </p>
            </div>
            <div className="text-right">
              {semester && <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-1">{semester}</Badge>}
              <p className="text-sm text-primary-foreground/70">{format(today, 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'My Courses', value: myCourses.length, icon: BookOpen, color: 'bg-primary' },
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-[hsl(var(--success))]' },
          { label: 'Pending Requests', value: pendingRequests, icon: TrendingUp, color: 'bg-[hsl(var(--warning))]' },
          { label: "Today's Classes", value: todayClasses.length, icon: Calendar, color: 'bg-[hsl(var(--info))]' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 3: Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: 3/5 */}
        <div className="lg:col-span-3 space-y-4">
          {/* Today's Schedule */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Today's Schedule ({DAYS[dayIndex] ?? 'Weekend'})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No classes scheduled today. Enjoy your day!</p>
              ) : todayClasses.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{r.courses?.code} — {r.courses?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {periodLabel(r.period_number)} • {r.rooms?.number} • {r.batches?.batch_name}
                      {r.lab_group ? ` • G${r.lab_group}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">P{r.period_number}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mini Weekly Routine */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Weekly Routine</CardTitle>
                <Button variant="link" size="sm" className="text-xs" asChild>
                  <Link to="/teacher/schedule">View Full Schedule <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>{routineGrid()}</CardContent>
          </Card>
        </div>

        {/* Right: 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Notices */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" /> Recent Notices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notices yet.</p>
              ) : notices.map((n: any) => (
                <div key={n.id} className="flex items-start justify-between gap-2 p-2 border rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  {noticeTypeBadge(n.notice_type)}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Exams */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Upcoming Exams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming exams.</p>
              ) : upcomingExams.map((e: any) => (
                <div key={e.id} className="p-2 border rounded-lg">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {e.courses?.code} • {format(new Date(e.scheduled_at), 'MMM d, h:mm a')} {e.room ? `• ${e.room}` : ''}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pending Requests */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Pending Requests
                </CardTitle>
                <Button variant="link" size="sm" className="text-xs" asChild>
                  <Link to="/teacher/requests">View All <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : recentRequests.map((r: any) => (
                <div key={r.id} className="p-2 border rounded-lg">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.courses?.code} • {r.request_type?.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 4: Course Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Course Overview</CardTitle>
            <Button variant="link" size="sm" className="text-xs" asChild>
              <Link to="/teacher/courses">View Details <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Avg Att.</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead className="text-center">At Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myCourses.map((c: any) => {
                const s = courseStats[c.id] || { students: 0, assessments: 0, notes: 0, attPct: null, examAvg: null, atRisk: 0 };
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-center">{s.students}</TableCell>
                    <TableCell className="text-center">
                      {s.attPct != null ? (
                        <Badge variant={s.attPct >= 75 ? 'default' : 'destructive'} className="text-xs">{s.attPct}%</Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.examAvg != null ? (
                        <span className="text-sm font-medium">{s.examAvg}%</span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.atRisk > 0 ? (
                        <Badge variant="destructive" className="text-xs">{s.atRisk}</Badge>
                      ) : <span className="text-muted-foreground text-xs">0</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
