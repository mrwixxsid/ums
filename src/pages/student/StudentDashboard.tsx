import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpen, ClipboardCheck, Calendar, BarChart3, TrendingUp,
  GraduationCap, Clock, AlertTriangle, Pin, Bell, FileText,
  Send, ArrowRight, DoorOpen
} from 'lucide-react';
import { DAYS, PERIODS } from '@/lib/routineGenerator';
import { gradeFromPercentage, GRADE_COLORS, type Grade } from '@/lib/gradeScale';
import { format, differenceInDays, isAfter } from 'date-fns';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Profile
  const [profile, setProfile] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);

  // Stats
  const [courses, setCourses] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [examAvg, setExamAvg] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);

  // Cards
  const [coursePerformance, setCoursePerformance] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      // Phase 1: parallel queries
      const [profileRes, enrollRes, attendanceRes, resultsRes, noticesRes, requestsRes] = await Promise.all([
        supabase.from('profiles').select('*, batches(*, departments:department_id(*))').eq('id', user.id).single(),
        supabase.from('enrollments').select('course_id, courses(id, name, code, department)').eq('student_id', user.id),
        supabase.from('attendance').select('status, class_id, classes(course_id)').eq('student_id', user.id),
        supabase.from('exam_results').select('marks_obtained, exam_id, entered_at, grade, exam_schedules(course_id, total_marks, title, exam_type)').eq('student_id', user.id).eq('is_published', true),
        supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('student_id', user.id).eq('status', 'pending'),
      ]);

      // Profile / batch / dept
      const prof = profileRes.data;
      setProfile(prof);
      const batchData = (prof as any)?.batches;
      setBatch(batchData);
      setDepartment(batchData?.departments);

      // Courses
      const enrolledCourses = (enrollRes.data ?? []).map((e: any) => e.courses).filter(Boolean);
      setCourses(enrolledCourses);
      const courseIds = enrolledCourses.map((c: any) => c.id);

      // Pending requests
      setPendingRequests(requestsRes.count ?? 0);

      // Notices
      setNotices(noticesRes.data ?? []);

      // Attendance
      const attRecords = attendanceRes.data ?? [];
      if (attRecords.length > 0) {
        const present = attRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
        setAttendancePct(Math.round((present / attRecords.length) * 100));
      }

      // Exam avg
      const results = resultsRes.data ?? [];
      if (results.length > 0) {
        const pcts = results
          .filter((r: any) => r.marks_obtained != null && r.exam_schedules?.total_marks)
          .map((r: any) => (r.marks_obtained / r.exam_schedules.total_marks) * 100);
        if (pcts.length > 0) {
          setExamAvg(Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length));
        }
      }

      // Recent results (last 3)
      const sortedResults = [...results]
        .filter((r: any) => r.marks_obtained != null && r.exam_schedules?.total_marks)
        .sort((a: any, b: any) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime())
        .slice(0, 3);
      setRecentResults(sortedResults);

      // Per-course performance
      const perfData = courseIds.map((cid: string) => {
        const course = enrolledCourses.find((c: any) => c.id === cid);
        const courseAtt = attRecords.filter((a: any) => a.classes?.course_id === cid);
        const attPct = courseAtt.length > 0
          ? Math.round(courseAtt.filter((a: any) => a.status === 'present' || a.status === 'late').length / courseAtt.length * 100)
          : null;
        const courseResults = results.filter((r: any) => r.exam_schedules?.course_id === cid && r.marks_obtained != null && r.exam_schedules?.total_marks);
        const examPct = courseResults.length > 0
          ? Math.round(courseResults.reduce((sum: number, r: any) => sum + (r.marks_obtained / r.exam_schedules.total_marks) * 100, 0) / courseResults.length)
          : null;
        const grade = examPct != null ? gradeFromPercentage(examPct) : null;
        return { id: cid, code: course?.code, name: course?.name, attPct, examPct, grade, atRisk: attPct !== null && attPct < 75 };
      });
      setCoursePerformance(perfData);

      // Phase 2: batch-dependent queries
      const batchId = prof?.batch_id;
      if (batchId) {
        const today = new Date().getDay();
        const { data: routineData } = await supabase.from('routines')
          .select('*, courses(name, code), rooms(number), profiles:teacher_id(full_name)')
          .eq('batch_id', batchId)
          .eq('day_of_week', today)
          .order('period_number');
        setTodayClasses((routineData ?? []).filter((r: any) => !r.is_lab_continuation));
      }

      // Upcoming exams (only enrolled courses)
      if (courseIds.length > 0) {
        const { data: examsData } = await supabase.from('exam_schedules')
          .select('*, courses(name, code)')
          .in('course_id', courseIds)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at')
          .limit(3);
        setUpcomingExams(examsData ?? []);
      }

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const overallGrade = examAvg != null ? gradeFromPercentage(examAvg) : null;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Current period detection
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const convertTo24h = (t: string) => {
    // PERIODS use 12h strings like "09:40", "01:00", "02:00"
    const [h, m] = t.split(':').map(Number);
    // Periods after 12:10 are PM (period 5,6,7)
    if (h < 9) return `${h + 12}:${String(m).padStart(2, '0')}`;
    return t;
  };
  const getCurrentPeriod = () => {
    for (const p of PERIODS) {
      const start = convertTo24h(p.start);
      const end = convertTo24h(p.end);
      if (currentTimeStr >= start && currentTimeStr < end) return p.number;
    }
    return null;
  };
  const currentPeriod = getCurrentPeriod();

  const periodLabel = (num: number) => {
    const p = PERIODS.find(p => p.number === num);
    return p ? `${p.start} - ${p.end}` : `P${num}`;
  };

  const attendanceColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const typeColors: Record<string, string> = { mid: 'default', lab: 'secondary', final: 'destructive' };
  const noticeTypeColors: Record<string, string> = { urgent: 'destructive', informational: 'default', fun: 'secondary' };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{greeting}, {profile?.full_name || 'Student'}</h1>
        <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        {(profile?.student_id || batch || department) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {profile?.student_id && (
              <Badge variant="outline" className="text-xs">
                <GraduationCap className="w-3 h-3 mr-1" />
                Roll: {profile.student_id}
              </Badge>
            )}
            {batch && (
              <Badge variant="outline" className="text-xs">
                {batch.batch_name} &bull; Semester {batch.semester}
              </Badge>
            )}
            {batch?.admission_session && (
              <Badge variant="secondary" className="text-xs">
                {batch.admission_session === 'January' ? 'Jan' : 'Jul'} Session
              </Badge>
            )}
            {department && (
              <Badge variant="outline" className="text-xs">
                {department.name} ({department.code})
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Enrolled Courses', value: courses.length, icon: BookOpen },
          { label: "Today's Classes", value: todayClasses.length, icon: Calendar },
          { label: 'Attendance', value: attendancePct !== null ? `${attendancePct}%` : '–', icon: ClipboardCheck, colorClass: attendancePct !== null ? attendanceColor(attendancePct) : undefined },
          { label: 'Avg Score', value: examAvg !== null ? `${examAvg}%` : '–', icon: BarChart3 },
          { label: 'Grade', value: overallGrade ?? '–', icon: TrendingUp },
          { label: 'Pending Requests', value: pendingRequests, icon: Send },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <stat.icon className="w-5 h-5 text-primary mb-2" />
              <p className={`text-2xl font-bold ${'colorClass' in stat && stat.colorClass ? stat.colorClass : ''}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Academic Performance */}
      {(examAvg !== null || attendancePct !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Academic Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {overallGrade && (
                <div className={`px-4 py-2 rounded-lg border font-bold text-lg ${GRADE_COLORS[overallGrade]}`}>
                  {overallGrade}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {examAvg !== null && <p>Average exam score: <span className="font-semibold text-foreground">{examAvg}%</span></p>}
                {attendancePct !== null && <p>Overall attendance: <span className={`font-semibold ${attendanceColor(attendancePct)}`}>{attendancePct}%</span></p>}
              </div>
            </div>

            {coursePerformance.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium">Course Breakdown</p>
                {coursePerformance.map((cp: any) => (
                  <div key={cp.id} className="space-y-1">
                    <div className="flex justify-between text-xs items-center">
                      <span className="font-medium flex items-center gap-1">
                        {cp.atRisk && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        {cp.code} — {cp.name}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-2">
                        {cp.attPct != null && (
                          <span className={cp.attPct < 75 ? 'text-amber-500 font-medium' : ''}>
                            Att: {cp.attPct}%
                          </span>
                        )}
                        {cp.examPct != null && <span>Exam: {cp.examPct}%</span>}
                        {cp.grade && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${GRADE_COLORS[cp.grade as Grade] || ''}`}>
                            {cp.grade}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Progress value={cp.attPct ?? 0} className="h-1.5 flex-1" />
                      <Progress value={cp.examPct ?? 0} className="h-1.5 flex-1" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Attendance</span>
                      <span>Exam</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Today's Schedule ({DAYS[new Date().getDay()] ?? 'Weekend'})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No classes today.</p>
            ) : (
              todayClasses.map((r: any) => {
                const isCurrent = currentPeriod === r.period_number;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${isCurrent ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[48px]">
                        <p className="text-xs font-medium text-muted-foreground">P{r.period_number}</p>
                        <p className="text-[10px] text-muted-foreground">{periodLabel(r.period_number)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{r.courses?.code} — {r.courses?.name}</p>
                        <p className="text-xs text-muted-foreground">{r.profiles?.full_name} &bull; {r.rooms?.number}</p>
                      </div>
                    </div>
                    {isCurrent && <Badge className="text-xs">Now</Badge>}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming exams.</p>
            ) : (
              upcomingExams.map((exam: any) => {
                const daysLeft = differenceInDays(new Date(exam.scheduled_at), new Date());
                return (
                  <div key={exam.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{exam.title}</span>
                          <Badge variant={typeColors[exam.exam_type] as any} className="text-xs capitalize">{exam.exam_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{exam.courses?.code} — {exam.courses?.name}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(exam.scheduled_at), 'MMM d, h:mm a')}</span>
                          {exam.room && <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" />{exam.room}</span>}
                          <span>{exam.total_marks} marks</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} days`}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No results published yet.</p>
            ) : (
              recentResults.map((r: any) => {
                const total = r.exam_schedules?.total_marks ?? 100;
                const pct = Math.round((r.marks_obtained / total) * 100);
                const grade = r.grade || gradeFromPercentage(pct);
                return (
                  <div key={r.exam_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{r.exam_schedules?.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.exam_schedules?.exam_type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{r.marks_obtained}/{total} <span className="text-xs text-muted-foreground">({pct}%)</span></span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${GRADE_COLORS[grade as Grade] || ''}`}>
                        {grade}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Notices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" /> Recent Notices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No notices yet.</p>
            ) : (
              notices.map((n: any) => (
                <div key={n.id} className={`p-3 border rounded-lg ${n.is_pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                    <span className="font-medium text-sm">{n.title}</span>
                    <Badge variant={noticeTypeColors[n.notice_type] as any} className="text-xs">{n.notice_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), 'MMM d, yyyy')}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'My Courses', to: '/student/courses', icon: BookOpen },
              { label: 'Attendance', to: '/student/attendance', icon: ClipboardCheck },
              { label: 'Schedule', to: '/student/schedule', icon: Calendar },
              { label: 'Results', to: '/student/results', icon: BarChart3 },
              { label: 'Exams', to: '/student/exams', icon: FileText },
              { label: 'Notices', to: '/student/notices', icon: Bell },
              { label: 'Requests', to: '/student/requests', icon: Send },
            ].map(action => (
              <Button key={action.label} variant="outline" size="sm" asChild>
                <Link to={action.to} className="flex items-center gap-1.5">
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
