import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, Calendar, BarChart3, History } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StudentAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('attendance')
      .select('*, classes(title, scheduled_at, courses(id, name, code))')
      .eq('student_id', user.id)
      .order('marked_at', { ascending: false })
      .then(({ data }) => setRecords(data ?? []));
  }, [user]);

  const coursesInRecords = useMemo(() => Array.from(
    new Map(
      records
        .map((r) => [r.classes?.courses?.id, r.classes?.courses] as [string, any])
        .filter(([id]) => !!id)
    ).values()
  ), [records]);

  const courseSummary = useMemo(() => coursesInRecords.map((c: any) => {
    const courseRecords = records.filter((r) => r.classes?.courses?.id === c.id);
    const p = courseRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
    const l = courseRecords.filter((r) => r.status === 'late').length;
    const a = courseRecords.filter((r) => r.status === 'absent').length;
    const pct = courseRecords.length > 0 ? Math.round((p / courseRecords.length) * 100) : 0;
    return { ...c, total: courseRecords.length, present: p, late: l, absent: a, pct };
  }), [coursesInRecords, records]);

  const filtered = useMemo(() => {
    let f = courseFilter === 'all' ? records : records.filter((r) => r.classes?.courses?.id === courseFilter);
    if (statusFilter !== 'all') f = f.filter(r => r.status === statusFilter);
    return f;
  }, [records, courseFilter, statusFilter]);

  const overallPresent = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const overallLate = records.filter((r) => r.status === 'late').length;
  const overallAbsent = records.filter((r) => r.status === 'absent').length;
  const overallPct = records.length > 0 ? Math.round((overallPresent / records.length) * 100) : null;

  const warningCourses = courseSummary.filter(c => c.pct < 75 && c.total > 0);

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    return { days, startPad };
  }, [calendarMonth]);

  const dayStatusMap = useMemo(() => {
    const map = new Map<string, { statuses: string[], records: any[] }>();
    const source = courseFilter === 'all' ? records : records.filter(r => r.classes?.courses?.id === courseFilter);
    source.forEach(r => {
      const d = format(new Date(r.classes?.scheduled_at || r.marked_at), 'yyyy-MM-dd');
      if (!map.has(d)) map.set(d, { statuses: [], records: [] });
      map.get(d)!.statuses.push(r.status);
      map.get(d)!.records.push(r);
    });
    return map;
  }, [records, courseFilter]);

  // Group records by month for history tab
  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, any[]>();
    filtered.forEach(r => {
      const key = format(new Date(r.marked_at), 'yyyy-MM');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const getDayDotColor = (dateStr: string) => {
    const entry = dayStatusMap.get(dateStr);
    if (!entry) return null;
    const hasAbsent = entry.statuses.includes('absent');
    const hasLate = entry.statuses.some(s => s === 'late');
    const allPresent = entry.statuses.every(s => s === 'present');
    if (hasAbsent) return 'bg-red-500';
    if (hasLate) return 'bg-amber-500';
    if (allPresent) return 'bg-emerald-500';
    return 'bg-emerald-500';
  };

  const selectedDayRecords = selectedDay ? (dayStatusMap.get(format(selectedDay, 'yyyy-MM-dd'))?.records ?? []) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground text-sm">Track your attendance across all courses</p>
      </div>

      {/* Warning banner */}
      {warningCourses.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300 text-sm">Attendance Warning</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              {warningCourses.map(c => `${c.code} (${c.pct}%)`).join(', ')} — below 75% threshold
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="w-3.5 h-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-3.5 h-3.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-4">
          {/* Overall stats */}
          {overallPct !== null && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card className="col-span-2 sm:col-span-1 row-span-2 sm:row-span-1">
                <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                  <div className={`w-20 h-20 rounded-full border-[5px] flex items-center justify-center font-bold text-xl ${
                    overallPct >= 75 ? 'border-emerald-500 text-emerald-600' : overallPct >= 60 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'
                  }`}>
                    {overallPct}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Overall</p>
                </CardContent>
              </Card>
              {[
                { label: 'Total', value: records.length, color: 'text-foreground' },
                { label: 'Present', value: overallPresent - overallLate, color: 'text-emerald-600' },
                { label: 'Late', value: overallLate, color: 'text-amber-600' },
                { label: 'Absent', value: overallAbsent, color: 'text-red-600' },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Course cards */}
          {courseSummary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courseSummary.map((c: any) => (
                <Card key={c.id} className={`transition-colors ${c.pct < 75 && c.total > 0 ? 'border-red-300 dark:border-red-800' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{c.code}</span>
                      <div className="flex items-center gap-1.5">
                        {c.pct < 75 && c.total > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        <span className={`text-sm font-bold ${c.pct >= 75 ? 'text-emerald-600' : c.pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{c.pct}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 truncate">{c.name}</p>
                    <Progress value={c.pct} className="h-1.5 mb-2" />
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>P: {c.present - c.late}</span>
                      <span>L: {c.late}</span>
                      <span>A: {c.absent}</span>
                      <span>Total: {c.total}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {records.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No attendance records yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── CALENDAR TAB ─── */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Select value={courseFilter} onValueChange={v => { setCourseFilter(v); setSelectedDay(null); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {coursesInRecords.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{format(calendarMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(m => subMonths(m, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCalendarMonth(new Date())}>Today</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(m => addMonths(m, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="flex gap-3 mb-3 text-xs flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Present</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Late</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Absent</span>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: calendarDays.startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {calendarDays.days.map(day => {
                  const ds = format(day, 'yyyy-MM-dd');
                  const dotColor = getDayDotColor(ds);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                    >
                      <span className="leading-none">{day.getDate()}</span>
                      {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`} />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day detail */}
          {selectedDay && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No classes on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayRecords.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{r.classes?.courses?.code}</p>
                          <p className="text-xs text-muted-foreground">{r.classes?.title}</p>
                        </div>
                        <Badge variant={r.status === 'present' ? 'default' : r.status === 'late' ? 'secondary' : 'destructive'} className="text-xs capitalize">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── HISTORY TAB ─── */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {coursesInRecords.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {groupedByMonth.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No attendance records found.</p>
              </CardContent>
            </Card>
          ) : (
            groupedByMonth.map(([monthKey, monthRecords]) => {
              const monthPresent = monthRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
              const monthPct = monthRecords.length > 0 ? Math.round((monthPresent / monthRecords.length) * 100) : 0;
              const monthLabel = format(new Date(monthKey + '-01'), 'MMMM yyyy');

              return (
                <Collapsible key={monthKey} defaultOpen={groupedByMonth[0][0] === monthKey}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between h-auto py-3 px-4 border rounded-lg hover:bg-muted/50">
                      <span className="font-semibold text-sm">{monthLabel}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {monthPresent}/{monthRecords.length} attended ({monthPct}%)
                        </span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {monthRecords.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{r.classes?.title}</p>
                          <p className="text-xs text-muted-foreground">{r.classes?.courses?.code} • {format(new Date(r.marked_at), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge variant={r.status === 'present' ? 'default' : r.status === 'late' ? 'secondary' : 'destructive'} className="text-xs capitalize">{r.status}</Badge>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentAttendance;
