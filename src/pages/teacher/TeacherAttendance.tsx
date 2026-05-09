import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClipboardList, Lock, ChevronLeft, ChevronRight, Check, AlertCircle, Search, ChevronDown, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureLock } from '@/hooks/useFeatureLock';
import { PERIODS } from '@/lib/routineGenerator';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, isBefore, getDay } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const rollSortKey = (sid: string | null): number => {
  if (!sid) return Infinity;
  const nums = sid.match(/(\d+)$/);
  return nums ? parseInt(nums[1], 10) : Infinity;
};

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { locked } = useFeatureLock('lock_attendance');

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [classDays, setClassDays] = useState<number[]>([]);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [semesterStart, setSemesterStart] = useState<string | null>(null);

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [courseStats, setCourseStats] = useState<Record<string, { unmarked: number }>>({});
  const [courseHistory, setCourseHistory] = useState<any[]>([]);

  // Fetch teacher's courses + semester start
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('teacher_courses').select('courses(id, code, name)').eq('teacher_id', user.id),
      supabase.from('academic_semesters').select('start_date').eq('is_active', true).maybeSingle(),
    ]).then(([tcRes, semRes]) => {
      const c = (tcRes.data ?? []).map((tc: any) => tc.courses).filter(Boolean);
      setCourses(c);
      setSemesterStart(semRes.data?.start_date ?? null);
      setLoadingCourses(false);
    });
  }, [user]);

  // Compute stats
  useEffect(() => {
    if (!user || courses.length === 0) return;
    const computeStats = async () => {
      const stats: Record<string, { unmarked: number }> = {};
      const today = new Date();
      for (const course of courses) {
        const { data: routines } = await supabase.from('routines')
          .select('day_of_week').eq('teacher_id', user.id).eq('course_id', course.id).eq('is_lab_continuation', false);
        const days = [...new Set((routines ?? []).map((r: any) => r.day_of_week))];
        const startDate = semesterStart || format(startOfMonth(today), 'yyyy-MM-dd');
        const { data: classes } = await supabase.from('classes')
          .select('scheduled_at').eq('course_id', course.id).eq('teacher_id', user.id).gte('scheduled_at', startDate + 'T00:00:00');
        const markedSet = new Set((classes ?? []).map((c: any) => format(new Date(c.scheduled_at), 'yyyy-MM-dd')));
        const start = new Date(startDate + 'T00:00:00');
        const allDates = eachDayOfInterval({ start, end: today });
        const expectedDates = allDates.filter(d => days.includes(d.getDay()));
        const unmarked = expectedDates.filter(d => {
          const ds = format(d, 'yyyy-MM-dd');
          return !markedSet.has(ds) && isBefore(d, today) && !isToday(d);
        }).length;
        stats[course.id] = { unmarked };
      }
      setCourseStats(stats);
    };
    computeStats();
  }, [user, courses, semesterStart]);

  // Select course
  const selectCourse = useCallback(async (courseId: string) => {
    if (!user) return;
    setSelectedCourseId(courseId);
    setSelectedDate(null);
    setEnrollments([]);
    setAttendance({});
    setSearchQuery('');
    setCourseHistory([]);

    const [routineRes, classRes] = await Promise.all([
      supabase.from('routines').select('day_of_week').eq('teacher_id', user.id).eq('course_id', courseId).eq('is_lab_continuation', false),
      supabase.from('classes').select('id, scheduled_at').eq('course_id', courseId).eq('teacher_id', user.id),
    ]);

    const days = [...new Set((routineRes.data ?? []).map((r: any) => r.day_of_week))];
    setClassDays(days);
    const marked = new Set((classRes.data ?? []).map((c: any) => format(new Date(c.scheduled_at), 'yyyy-MM-dd')));
    setMarkedDates(marked);

    // Fetch course history
    const classIds = (classRes.data ?? []).map((c: any) => c.id);
    if (classIds.length > 0) {
      const { data: historyData } = await supabase.from('attendance')
        .select('status, classes(scheduled_at)')
        .in('class_id', classIds);
      
      // Group by date
      const dateMap = new Map<string, { present: number, late: number, absent: number, total: number }>();
      (historyData ?? []).forEach((a: any) => {
        const d = format(new Date(a.classes?.scheduled_at), 'yyyy-MM-dd');
        if (!dateMap.has(d)) dateMap.set(d, { present: 0, late: 0, absent: 0, total: 0 });
        const entry = dateMap.get(d)!;
        entry.total++;
        if (a.status === 'present') entry.present++;
        else if (a.status === 'late') entry.late++;
        else if (a.status === 'absent') entry.absent++;
      });
      const history = Array.from(dateMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setCourseHistory(history);
    }

    const today = new Date();
    if (days.includes(today.getDay())) {
      handleDateSelect(format(today, 'yyyy-MM-dd'), courseId);
    }
  }, [user]);

  // Calendar grid data
  const calendarData = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    const semStart = semesterStart ? new Date(semesterStart + 'T00:00:00') : null;

    return { days, startPad, semStart };
  }, [currentMonth, semesterStart]);

  const getDayStatus = (day: Date) => {
    if (!classDays.includes(day.getDay())) return 'no-class';
    if (calendarData.semStart && day < calendarData.semStart) return 'no-class';
    const ds = format(day, 'yyyy-MM-dd');
    if (markedDates.has(ds)) return 'marked';
    if (isToday(day)) return 'today';
    if (isPast(day) && !isToday(day)) return 'missing';
    return 'future';
  };

  const dotColor = (status: string) => {
    switch (status) {
      case 'marked': return 'bg-emerald-500';
      case 'missing': return 'bg-red-500';
      case 'today': return 'bg-primary';
      case 'future': return 'bg-muted-foreground/30';
      default: return '';
    }
  };

  // Handle date selection
  const handleDateSelect = async (dateStr: string, courseId?: string) => {
    const cId = courseId || selectedCourseId;
    if (!cId || !user) return;
    setSelectedDate(dateStr);
    setLoadingStudents(true);

    const { data: enrData } = await supabase.from('enrollments')
      .select('student_id, profiles:student_id(id, full_name, email, student_id)')
      .eq('course_id', cId);
    const enrs = enrData ?? [];
    setEnrollments(enrs);

    const { data: routineData } = await supabase.from('routines')
      .select('period_number, rooms(number), courses(code)')
      .eq('teacher_id', user.id).eq('course_id', cId).eq('is_lab_continuation', false)
      .limit(1).maybeSingle();

    const { data: existingClass } = await supabase.from('classes')
      .select('id').eq('course_id', cId).eq('teacher_id', user.id)
      .gte('scheduled_at', dateStr + 'T00:00:00').lte('scheduled_at', dateStr + 'T23:59:59')
      .maybeSingle();

    const statusMap: Record<string, string> = {};
    if (existingClass?.id) {
      const { data: existing } = await supabase.from('attendance').select('student_id, status').eq('class_id', existingClass.id);
      (existing ?? []).forEach((a: any) => { statusMap[a.student_id] = a.status; });
    }
    enrs.forEach((e: any) => { if (!statusMap[e.student_id]) statusMap[e.student_id] = 'present'; });
    setAttendance(statusMap);
    setLoadingStudents(false);
  };

  // Sort & filter enrollments
  const sortedEnrollments = useMemo(() => {
    let list = [...enrollments].sort((a, b) => rollSortKey(a.profiles?.student_id) - rollSortKey(b.profiles?.student_id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => 
        e.profiles?.full_name?.toLowerCase().includes(q) ||
        e.profiles?.student_id?.toLowerCase().includes(q) ||
        e.profiles?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrollments, searchQuery]);

  // Save attendance
  const handleSubmit = async () => {
    if (!selectedCourseId || !selectedDate || !user) return;
    setSaving(true);

    const { data: routineData } = await supabase.from('routines')
      .select('period_number, rooms(number), courses(code)')
      .eq('teacher_id', user.id).eq('course_id', selectedCourseId).eq('is_lab_continuation', false)
      .limit(1).maybeSingle();

    const periodNum = routineData?.period_number ?? 1;
    const scheduledAt = `${selectedDate}T${PERIODS.find(p => p.number === periodNum)?.start ?? '09:40'}:00`;
    const classTitle = `${routineData?.courses?.code ?? 'CLASS'} - P${periodNum}`;

    let { data: existingClass } = await supabase.from('classes')
      .select('id').eq('course_id', selectedCourseId).eq('teacher_id', user.id)
      .gte('scheduled_at', selectedDate + 'T00:00:00').lte('scheduled_at', selectedDate + 'T23:59:59')
      .maybeSingle();

    let classId = existingClass?.id;
    if (!classId) {
      const { data: newClass, error } = await supabase.from('classes').insert({
        course_id: selectedCourseId, teacher_id: user.id, title: classTitle,
        scheduled_at: scheduledAt, duration_minutes: 50, room: routineData?.rooms?.number,
      }).select('id').single();
      if (error) { toast.error('Failed to create class record'); setSaving(false); return; }
      classId = newClass.id;
    }

    const rows = Object.entries(attendance).map(([student_id, status]) => ({
      class_id: classId!, student_id, status: status as any,
    }));

    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'class_id,student_id' });
    if (error) { toast.error('Failed to save attendance'); setSaving(false); return; }
    toast.success('Attendance saved!');
    setMarkedDates(prev => new Set([...prev, selectedDate!]));
    setSaving(false);
  };

  const statusBtnClass = (current: string, target: string) => {
    if (current !== target) return 'border bg-background text-muted-foreground hover:bg-muted';
    if (target === 'present') return 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600';
    if (target === 'late') return 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500';
    return 'bg-red-500 text-white hover:bg-red-600 border-red-500';
  };

  const attendanceSummary = useMemo(() => {
    const values = Object.values(attendance);
    return {
      present: values.filter(v => v === 'present').length,
      late: values.filter(v => v === 'late').length,
      absent: values.filter(v => v === 'absent').length,
      total: values.length,
    };
  }, [attendance]);

  // Course stats summary
  const courseStatsSummary = useMemo(() => {
    if (!selectedCourseId || courseHistory.length === 0) return null;
    const totalClasses = courseHistory.length;
    const totalStudentRecords = courseHistory.reduce((s, h) => s + h.total, 0);
    const totalPresent = courseHistory.reduce((s, h) => s + h.present + h.late, 0);
    const avgPct = totalStudentRecords > 0 ? Math.round((totalPresent / totalStudentRecords) * 100) : 0;
    return { totalClasses, avgPct };
  }, [selectedCourseId, courseHistory]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm">Select a course, pick a date, mark attendance</p>
        </div>
        {locked && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Locked
          </Badge>
        )}
      </div>

      {/* Course pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {loadingCourses ? (
          <p className="text-sm text-muted-foreground">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses assigned.</p>
        ) : courses.map((c: any) => {
          const isSelected = selectedCourseId === c.id;
          const stats = courseStats[c.id];
          return (
            <button
              key={c.id}
              onClick={() => selectCourse(c.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-medium ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <span>{c.code}</span>
              {stats && stats.unmarked > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">{stats.unmarked}</Badge>
              )}
              {stats && stats.unmarked === 0 && (
                <Check className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-foreground' : 'text-emerald-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Main content: Calendar + Student list */}
      {selectedCourseId && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Calendar (2/5) */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="flex gap-3 mb-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Marked</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Missing</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Today</span>
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                  {Array.from({ length: calendarData.startPad }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {calendarData.days.map(day => {
                    const status = getDayStatus(day);
                    const ds = format(day, 'yyyy-MM-dd');
                    const isActive = selectedDate === ds;
                    const isClassDay = status !== 'no-class';
                    return (
                      <button
                        key={ds}
                        onClick={() => isClassDay && !locked && handleDateSelect(ds)}
                        disabled={!isClassDay || locked}
                        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                          !isClassDay ? 'text-muted-foreground/30 cursor-default' : 'hover:bg-muted cursor-pointer'
                        } ${isActive ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                      >
                        <span className="leading-none">{day.getDate()}</span>
                        {isClassDay && <span className={`w-1.5 h-1.5 rounded-full ${dotColor(status)} mt-0.5`} />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Course stats */}
            {courseStatsSummary && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total classes marked</span>
                    <span className="font-bold">{courseStatsSummary.totalClasses}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Avg. attendance</span>
                    <span className="font-bold">{courseStatsSummary.avgPct}%</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Student list (3/5) */}
          <div className="lg:col-span-3">
            {!selectedDate ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Select a date from the calendar to mark attendance</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">
                      {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMM d')} — {courses.find(c => c.id === selectedCourseId)?.code}
                    </CardTitle>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium">P: {attendanceSummary.present}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-medium">L: {attendanceSummary.late}</span>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 font-medium">A: {attendanceSummary.absent}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingStudents ? (
                    <p className="text-sm text-muted-foreground">Loading students...</p>
                  ) : sortedEnrollments.length === 0 && !searchQuery ? (
                    <p className="text-sm text-muted-foreground">No students enrolled in this course.</p>
                  ) : (
                    <>
                      {/* Search + bulk actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[150px]">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 h-9"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-9" onClick={() => {
                            const map: Record<string, string> = {};
                            enrollments.forEach((e: any) => { map[e.student_id] = 'present'; });
                            setAttendance(map);
                          }}>All Present</Button>
                          <Button size="sm" variant="outline" className="h-9" onClick={() => {
                            const map: Record<string, string> = {};
                            enrollments.forEach((e: any) => { map[e.student_id] = 'absent'; });
                            setAttendance(map);
                          }}>All Absent</Button>
                        </div>
                      </div>

                      {/* Student rows */}
                      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                        {sortedEnrollments.map((enr: any, idx: number) => (
                          <div key={enr.student_id} className="flex items-center justify-between p-2.5 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                              <div>
                                <p className="text-sm font-medium">{enr.profiles?.full_name || 'Student'}</p>
                                <p className="text-xs text-muted-foreground">{enr.profiles?.student_id || enr.profiles?.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {(['present', 'late', 'absent'] as const).map(s => (
                                <button
                                  key={s}
                                  className={`h-8 px-3.5 text-xs font-medium rounded-md border transition-colors capitalize ${statusBtnClass(attendance[enr.student_id], s)}`}
                                  onClick={() => setAttendance(a => ({ ...a, [enr.student_id]: s }))}
                                >
                                  {s === 'present' ? 'P' : s === 'late' ? 'L' : 'A'}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Sticky save footer */}
                      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-6 px-6 -mb-6 pb-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex gap-3 text-xs font-medium">
                            <span className="text-emerald-600">P: {attendanceSummary.present}</span>
                            <span className="text-amber-600">L: {attendanceSummary.late}</span>
                            <span className="text-red-600">A: {attendanceSummary.absent}</span>
                            <span className="text-muted-foreground">Total: {attendanceSummary.total}</span>
                          </div>
                        </div>
                        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving || locked}>
                          {saving ? 'Saving...' : markedDates.has(selectedDate) ? 'Update Attendance' : 'Save Attendance'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Course History */}
      {selectedCourseId && courseHistory.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-auto py-3 px-4 border rounded-lg hover:bg-muted/50">
              <span className="flex items-center gap-2 font-semibold text-sm">
                <History className="w-4 h-4" /> Course Attendance History
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseHistory.map(h => (
                      <TableRow key={h.date} className={selectedDate === h.date ? 'bg-primary/5' : ''}>
                        <TableCell className="text-sm">{format(new Date(h.date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(h.date + 'T00:00:00'), 'EEEE')}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-medium">{h.present}</TableCell>
                        <TableCell className="text-center text-amber-600 font-medium">{h.late}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{h.absent}</TableCell>
                        <TableCell className="text-center font-medium">{h.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default TeacherAttendance;
