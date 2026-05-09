import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, RefreshCw, Save, AlertTriangle, Lock, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import { generateRoutine, RoutineEntry, DAYS, PERIODS, CourseInput, BatchInput, RoomInput } from '@/lib/routineGenerator';
import { useFeatureLock } from '@/hooks/useFeatureLock';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface CoverageItem {
  code: string;
  name: string;
  expected: number;
  placed: number;
  batchName: string;
}

const AdminRoutine = () => {
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [semesters, setSemesters] = useState<{ id: string; name: string }[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [allEntries, setAllEntries] = useState<RoutineEntry[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [isSaved, setIsSaved] = useState(false);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const { locked } = useFeatureLock('lock_routine');

  useEffect(() => {
    const init = async () => {
      const [dRes, sRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('academic_semesters').select('id, name').order('created_at', { ascending: false }),
      ]);
      setDepartments(dRes.data ?? []);
      setSemesters(sRes.data ?? []);
    };
    init();
  }, []);

  // Load saved routine when department changes
  useEffect(() => {
    if (!selectedDept) { setAllEntries([]); setIsSaved(false); setCoverage([]); return; }
    loadSavedRoutine();
  }, [selectedDept]);

  const loadSavedRoutine = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('routines')
      .select('*, courses(code, name, contact_hours, course_type, credits), profiles:teacher_id(full_name), rooms(number), batches(batch_name, semester)')
      .eq('department_id', selectedDept);

    if (error || !data?.length) {
      setAllEntries([]);
      setIsSaved(false);
      setLoading(false);
      return;
    }

    const entries: RoutineEntry[] = data.map((r: any) => ({
      course_id: r.course_id,
      course_code: r.courses?.code ?? '?',
      course_name: r.courses?.name ?? '?',
      teacher_id: r.teacher_id,
      teacher_name: r.profiles?.full_name ?? 'Unknown',
      room_id: r.room_id,
      room_number: r.rooms?.number ?? '?',
      batch_id: r.batch_id,
      batch_name: r.batches?.batch_name ?? '?',
      day_of_week: r.day_of_week,
      period_number: r.period_number,
      is_lab_continuation: r.is_lab_continuation,
      lab_group: r.lab_group,
      semester_number: r.batches?.semester ?? undefined,
    }));

    setAllEntries(entries);
    setIsSaved(true);
    setWarnings([]);
    setCoverage([]);
    setLoading(false);
    setActiveTab('all');
    setSelectedBatch('all');
  };

  const semesterNums = useMemo(() => {
    const nums = new Set(allEntries.map(e => e.semester_number).filter(Boolean));
    return Array.from(nums).sort((a, b) => (a ?? 0) - (b ?? 0));
  }, [allEntries]);

  const batches = useMemo(() => {
    const map = new Map<string, string>();
    allEntries.forEach(e => map.set(e.batch_id, e.batch_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allEntries]);

  const displayEntries = useMemo(() => {
    let filtered = allEntries;
    if (activeTab !== 'all') {
      const semNum = parseInt(activeTab);
      filtered = filtered.filter(e => e.semester_number === semNum);
    }
    if (selectedBatch !== 'all') {
      filtered = filtered.filter(e => e.batch_id === selectedBatch);
    }
    return filtered;
  }, [allEntries, activeTab, selectedBatch]);

  const handleGenerateAll = async () => {
    if (!selectedDept) { toast.error('Select a department'); return; }

    // If there's a saved routine, ask for confirmation
    if (isSaved) {
      setConfirmOverwrite(true);
      return;
    }

    doGenerate();
  };

  const doGenerate = async () => {
    setConfirmOverwrite(false);
    setLoading(true);

    const deptCode = departments.find(d => d.id === selectedDept)?.code;
    let accumulated: RoutineEntry[] = [];
    const allWarnings: string[] = [];
    const coverageItems: CoverageItem[] = [];

    const { data: roomsData } = await supabase.from('rooms').select('*');
    const roomInputs: RoomInput[] = (roomsData ?? []).map(r => ({
      id: r.id, number: r.number, type: r.type ?? 'Class', capacity: r.capacity ?? 60,
    }));

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, batch_id');
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.full_name]));

    // Sync actual student counts from profiles
    const actualCounts: Record<string, number> = {};
    (profiles ?? []).forEach(p => {
      if (p.batch_id) actualCounts[p.batch_id] = (actualCounts[p.batch_id] ?? 0) + 1;
    });

    for (let sem = 1; sem <= 8; sem++) {
      const { data: batchData } = await supabase.from('batches').select('*')
        .eq('department_id', selectedDept).eq('semester', sem);
      if (!batchData?.length) continue;

      const { data: allCourses } = await supabase.from('courses').select('*')
        .eq('semester_number', sem).eq('is_active', true);
      const deptCourses = (allCourses ?? []).filter(c =>
        c.department_id === selectedDept || c.department === deptCode
      );
      if (!deptCourses.length) continue;

      const courseIds = deptCourses.map(c => c.id);
      const { data: tcData } = await supabase.from('teacher_courses').select('course_id, teacher_id')
        .in('course_id', courseIds.length ? courseIds : ['']);
      const tcMap = Object.fromEntries((tcData ?? []).map(tc => [tc.course_id, tc.teacher_id]));

      const courseInputs: CourseInput[] = deptCourses.map(c => ({
        id: c.id, code: c.code, name: c.name,
        credits: c.credits ?? 2,
        course_type: c.course_type,
        contact_hours: c.contact_hours,
        teacher_id: tcMap[c.id] ?? null,
        teacher_name: tcMap[c.id] ? profileMap[tcMap[c.id]] : undefined,
      }));

      const batchInputs: BatchInput[] = batchData.map(b => ({
        id: b.id, batch_name: b.batch_name, student_count: actualCounts[b.id] ?? b.student_count ?? 0, semester: b.semester,
      }));

      const result = generateRoutine(courseInputs, batchInputs, roomInputs, accumulated);
      const tagged = result.entries.map(e => ({ ...e, semester_number: sem }));
      accumulated = [...accumulated, ...tagged];
      allWarnings.push(...result.warnings);

      // Build coverage report
      for (const course of courseInputs) {
        if (course.course_type === 'Viva' || !course.teacher_id) continue;
        if (/thesis|project/i.test(course.name)) continue;
        for (const batch of batchInputs) {
          const isLab = course.course_type === 'Lab';
          const contactHours = course.contact_hours ?? ((course.credits ?? 2) * 18);
          let expected = isLab ? 1 : Math.max(1, Math.round(contactHours / 25));
          expected = Math.min(expected, course.credits ?? 2);
          const placed = tagged.filter(e =>
            e.course_id === course.id && e.batch_id === batch.id && !e.is_lab_continuation
          ).length;
          coverageItems.push({ code: course.code, name: course.name, expected, placed, batchName: batch.batch_name });
        }
      }
    }

    setAllEntries(accumulated);
    setWarnings(allWarnings);
    setCoverage(coverageItems);
    setIsSaved(false);
    setLoading(false);
    setActiveTab('all');
    setSelectedBatch('all');

    if (allWarnings.length) {
      toast.warning(`Generated with ${allWarnings.length} warning(s)`);
    } else {
      toast.success(`Generated ${accumulated.length} slots across all semesters`);
    }
  };

  const handleSave = async () => {
    if (!allEntries.length) return;
    setSaving(true);

    await supabase.from('routines').delete().eq('department_id', selectedDept);

    const rows = allEntries.map(e => ({
      department_id: selectedDept,
      batch_id: e.batch_id,
      course_id: e.course_id,
      teacher_id: e.teacher_id,
      room_id: e.room_id,
      day_of_week: e.day_of_week,
      period_number: e.period_number,
      is_lab_continuation: e.is_lab_continuation,
      lab_group: e.lab_group,
      semester_id: selectedSemester === 'none' ? null : selectedSemester || null,
    }));

    const { error } = await supabase.from('routines').insert(rows);
    if (error) { toast.error('Failed to save: ' + error.message); }
    else { toast.success('Routine saved!'); setIsSaved(true); }
    setSaving(false);
  };

  const getCell = (day: number, period: number) =>
    displayEntries.filter(e => e.day_of_week === day && e.period_number === period);

  const stats = useMemo(() => {
    if (!displayEntries.length) return null;
    const batchDays: Record<string, Record<number, number>> = {};
    displayEntries.forEach(e => {
      if (e.is_lab_continuation) return;
      if (!batchDays[e.batch_name]) batchDays[e.batch_name] = {};
      batchDays[e.batch_name][e.day_of_week] = (batchDays[e.batch_name][e.day_of_week] ?? 0) + 1;
    });
    const summaries = Object.entries(batchDays).map(([name, days]) => {
      const vals = Object.values(days);
      const avg = vals.reduce((a, b) => a + b, 0) / 5;
      const max = Math.max(...vals);
      return { name, avg: avg.toFixed(1), max };
    });
    return summaries;
  }, [displayEntries]);

  const zeroCoursesExist = coverage.some(c => c.placed === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Routine Generation</h1>
          <p className="text-muted-foreground">Generate conflict-free class schedules across all semesters</p>
        </div>
        {locked && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Locked by Admin
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Department</span>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select dept" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Academic Semester</span>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {semesters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateAll} disabled={loading || locked}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : isSaved ? 'Regenerate (Overwrite)' : 'Generate All Semesters'}
            </Button>
            {allEntries.length > 0 && !isSaved && (
              <Button variant="outline" onClick={handleSave} disabled={saving || locked}>
                <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Routine'}
              </Button>
            )}
            {isSaved && (
              <Badge variant="outline" className="flex items-center gap-1 text-emerald-600 border-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overwrite confirmation */}
      <Dialog open={confirmOverwrite} onOpenChange={setConfirmOverwrite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite Saved Routine?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A saved routine already exists for this department. Generating a new one will replace it when saved. Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOverwrite(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doGenerate}>Yes, Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {warnings.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                {warnings.map((w, i) => <p key={i} className="text-sm text-amber-700">{w}</p>)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Report */}
      {coverage.length > 0 && (
        <Collapsible open={coverageOpen} onOpenChange={setCoverageOpen}>
          <Card className={zeroCoursesExist ? 'border-red-500/50' : 'border-emerald-500/50'}>
            <CollapsibleTrigger asChild>
              <CardContent className="p-4 cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {zeroCoursesExist ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  <span className="font-medium text-sm">
                    Course Coverage Report — {coverage.filter(c => c.placed === 0).length} courses with 0 classes
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${coverageOpen ? 'rotate-180' : ''}`} />
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1">Course</th>
                        <th className="text-left p-1">Batch</th>
                        <th className="text-center p-1">Expected</th>
                        <th className="text-center p-1">Placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverage.map((c, i) => (
                        <tr key={i} className={c.placed === 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : c.placed < c.expected ? 'bg-amber-50 dark:bg-amber-900/20' : ''}>
                          <td className="p-1 font-medium">{c.code}</td>
                          <td className="p-1">{c.batchName}</td>
                          <td className="text-center p-1">{c.expected}</td>
                          <td className="text-center p-1">{c.placed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {allEntries.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Filter by Batch</span>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {stats && (
              <div className="flex flex-wrap gap-2 items-center ml-4">
                {stats.map(s => (
                  <Badge key={s.name} variant="outline" className="text-xs">
                    {s.name}: ~{s.avg}/day (max {s.max})
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({allEntries.length})</TabsTrigger>
              {semesterNums.map(s => {
                const count = allEntries.filter(e => e.semester_number === s).length;
                return <TabsTrigger key={s} value={String(s)}>Sem {s} ({count})</TabsTrigger>;
              })}
            </TabsList>

            <TabsContent value={activeTab}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Weekly Timetable ({displayEntries.length} slots)
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-muted text-left">Period</th>
                        {DAYS.map(d => <th key={d} className="border p-2 bg-muted text-center min-w-[140px]">{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIODS.map(p => (
                        <tr key={p.number}>
                          <td className="border p-2 bg-muted/50 whitespace-nowrap font-medium">
                            P{p.number}<br /><span className="text-muted-foreground">{p.start}-{p.end}</span>
                          </td>
                          {DAYS.map((_, dayIdx) => {
                            const cells = getCell(dayIdx, p.number);
                            return (
                              <td key={dayIdx} className="border p-1 align-top">
                                {cells.length === 0 ? (
                                  <span className="text-muted-foreground/30">—</span>
                                ) : cells.map((c, i) => {
                                  const isLab = c.lab_group !== null || c.is_lab_continuation;
                                  return (
                                    <div key={i} className={`rounded p-1.5 mb-1 ${isLab ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700' : 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'}`}>
                                      <div className="font-semibold">{c.course_code}</div>
                                      <div className="text-muted-foreground">{c.teacher_name}</div>
                                      <div className="flex gap-1 mt-0.5 flex-wrap">
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">{c.room_number}</Badge>
                                        {c.lab_group && <Badge variant="secondary" className="text-[10px] px-1 py-0">G{c.lab_group}</Badge>}
                                        {c.is_lab_continuation && <Badge className="text-[10px] px-1 py-0 bg-emerald-500">Lab P2</Badge>}
                                        {isLab && !c.is_lab_continuation && <Badge className="text-[10px] px-1 py-0 bg-emerald-500">Lab P1</Badge>}
                                        {c.batch_name && activeTab === 'all' && <Badge variant="secondary" className="text-[10px] px-1 py-0">{c.batch_name}</Badge>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default AdminRoutine;
