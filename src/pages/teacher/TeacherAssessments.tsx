import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PenLine, Plus, Lock, ChevronDown, Trash2, Edit3, Users, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureLock } from '@/hooks/useFeatureLock';
import { format } from 'date-fns';

interface AssessmentGroup {
  title: string;
  assessment_date: string | null;
  total_marks: number;
  entries: any[];
  avg: number;
  highest: number;
  lowest: number;
}

const TeacherAssessments = () => {
  const { user } = useAuth();
  const { locked } = useFeatureLock('lock_assessments');
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch'>('batch');
  const [editingGroup, setEditingGroup] = useState<AssessmentGroup | null>(null);

  // Batch state
  const [batchTitle, setBatchTitle] = useState('');
  const [batchTotalMarks, setBatchTotalMarks] = useState('100');
  const [batchDate, setBatchDate] = useState('');
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [batchMarks, setBatchMarks] = useState<Record<string, string>>({});

  // Single state
  const [singleStudents, setSingleStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', student_id: '', marks_obtained: '', total_marks: '100', assessment_date: '' });

  // Fetch courses on mount
  useEffect(() => {
    if (!user) return;
    supabase.from('teacher_courses').select('courses(id, name, code)').eq('teacher_id', user.id)
      .then(({ data }) => {
        const c = (data ?? []).map((tc: any) => tc.courses).filter(Boolean);
        setCourses(c);
        if (c.length > 0) setSelectedCourseId(c[0].id);
        setLoading(false);
      });
  }, [user]);

  // Fetch assessments when course changes
  useEffect(() => {
    if (!selectedCourseId || !user) return;
    setLoading(true);
    supabase.from('assessments')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('course_id', selectedCourseId)
      .order('assessment_date', { ascending: false })
      .then(async ({ data }) => {
        const entries = (data ?? []) as any[];
        const studentIds = [...new Set(entries.map(e => e.student_id))];
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, student_id').in('id', studentIds);
          const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
          entries.forEach(e => { e.profile = profileMap[e.student_id] || null; });
        }
        setAssessments(entries);
        setLoading(false);
      });
  }, [selectedCourseId, user]);

  // Load enrolled students when dialog opens or course changes
  const loadEnrolledStudents = async (courseId: string) => {
    const { data } = await supabase.from('enrollments')
      .select('student_id, profiles:student_id(id, full_name, email, student_id)')
      .eq('course_id', courseId);
    const students = (data ?? []).map((e: any) => e.profiles).filter(Boolean);
    return students;
  };

  // Group assessments
  const grouped = useMemo(() => {
    const map = new Map<string, AssessmentGroup>();
    assessments.forEach(a => {
      const key = `${a.title}||${a.assessment_date || ''}`;
      if (!map.has(key)) {
        map.set(key, { title: a.title, assessment_date: a.assessment_date, total_marks: a.total_marks ?? 100, entries: [], avg: 0, highest: 0, lowest: Infinity });
      }
      map.get(key)!.entries.push(a);
    });
    const groups = Array.from(map.values());
    groups.forEach(g => {
      const marks = g.entries.map(e => e.marks_obtained).filter((m): m is number => m != null);
      if (marks.length > 0) {
        g.avg = Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 10) / 10;
        g.highest = Math.max(...marks);
        g.lowest = Math.min(...marks);
      } else {
        g.lowest = 0;
      }
    });
    return groups;
  }, [assessments]);

  // Open add dialog
  const handleOpenAdd = async () => {
    setEditingGroup(null);
    setBatchTitle('');
    setBatchTotalMarks('100');
    setBatchDate('');
    setForm({ title: '', student_id: '', marks_obtained: '', total_marks: '100', assessment_date: '' });
    setMode('batch');
    const students = await loadEnrolledStudents(selectedCourseId);
    setBatchStudents(students);
    setSingleStudents(students);
    const marks: Record<string, string> = {};
    students.forEach((s: any) => { marks[s.id] = ''; });
    setBatchMarks(marks);
    setOpen(true);
  };

  // Open edit dialog
  const handleOpenEdit = async (group: AssessmentGroup) => {
    setEditingGroup(group);
    setBatchTitle(group.title);
    setBatchTotalMarks(String(group.total_marks));
    setBatchDate(group.assessment_date || '');
    setMode('batch');
    const students = await loadEnrolledStudents(selectedCourseId);
    setBatchStudents(students);
    setSingleStudents(students);
    const marks: Record<string, string> = {};
    students.forEach((s: any) => { marks[s.id] = ''; });
    group.entries.forEach(e => { marks[e.student_id] = e.marks_obtained != null ? String(e.marks_obtained) : ''; });
    setBatchMarks(marks);
    setOpen(true);
  };

  // Delete group
  const handleDeleteGroup = async (group: AssessmentGroup) => {
    const ids = group.entries.map(e => e.id);
    const { error } = await supabase.from('assessments').delete().in('id', ids);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success(`Deleted ${ids.length} assessment records`);
    setAssessments(prev => prev.filter(a => !ids.includes(a.id)));
  };

  // Batch save (insert or edit via delete+re-insert)
  const handleBatchSave = async () => {
    if (!batchTitle) { toast.error('Title required'); return; }
    const entries = Object.entries(batchMarks)
      .filter(([_, m]) => m !== '')
      .map(([studentId, marks]) => ({
        title: batchTitle,
        course_id: selectedCourseId,
        student_id: studentId,
        teacher_id: user?.id,
        marks_obtained: parseFloat(marks) || null,
        total_marks: parseFloat(batchTotalMarks) || 100,
        assessment_date: batchDate || null,
      }));
    if (entries.length === 0) { toast.error('Enter marks for at least one student'); return; }

    // If editing, delete old entries first
    if (editingGroup) {
      const oldIds = editingGroup.entries.map(e => e.id);
      await supabase.from('assessments').delete().in('id', oldIds);
    }

    const { error } = await supabase.from('assessments').insert(entries);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(`Saved ${entries.length} assessments`);
    setOpen(false);
    // Re-fetch
    const { data } = await supabase.from('assessments').select('*').eq('teacher_id', user!.id).eq('course_id', selectedCourseId).order('assessment_date', { ascending: false });
    const fresh = (data ?? []) as any[];
    const studentIds = [...new Set(fresh.map(e => e.student_id))];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, student_id').in('id', studentIds);
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
      fresh.forEach(e => { e.profile = profileMap[e.student_id] || null; });
    }
    setAssessments(fresh);
  };

  // Single save
  const handleSingleSave = async () => {
    if (!form.title || !form.student_id) { toast.error('Title and student required'); return; }
    const { error } = await supabase.from('assessments').insert({
      title: form.title, course_id: selectedCourseId, student_id: form.student_id,
      teacher_id: user?.id, marks_obtained: parseFloat(form.marks_obtained) || null,
      total_marks: parseFloat(form.total_marks) || 100, assessment_date: form.assessment_date || null,
    });
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Assessment saved');
    setOpen(false);
    setForm({ title: '', student_id: '', marks_obtained: '', total_marks: '100', assessment_date: '' });
    // Re-fetch
    const { data } = await supabase.from('assessments').select('*').eq('teacher_id', user!.id).eq('course_id', selectedCourseId).order('assessment_date', { ascending: false });
    const fresh = (data ?? []) as any[];
    const studentIds = [...new Set(fresh.map(e => e.student_id))];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, student_id').in('id', studentIds);
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
      fresh.forEach(e => { e.profile = profileMap[e.student_id] || null; });
    }
    setAssessments(fresh);
  };

  if (courses.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <PenLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No courses assigned yet.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-muted-foreground text-sm">Record and manage quiz & assignment marks</p>
        </div>
        <div className="flex items-center gap-2">
          {locked && <Badge variant="destructive" className="flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</Badge>}
          <Button disabled={locked || !selectedCourseId} onClick={handleOpenAdd}><Plus className="w-4 h-4 mr-2" />Add Assessment</Button>
        </div>
      </div>

      {/* Course tabs */}
      {courses.length > 0 && (
        <Tabs value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <TabsList className="flex-wrap h-auto gap-1">
            {courses.map(c => (
              <TabsTrigger key={c.id} value={c.id} className="text-xs">{c.code}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Grouped assessment list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <PenLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No assessments for this course yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {grouped.map((g, i) => (
            <Collapsible key={i}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4 px-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{g.title}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{g.total_marks} marks</Badge>
                          <Badge variant="outline" className="text-xs"><Users className="w-3 h-3 mr-1" />{g.entries.length}</Badge>
                        </div>
                        {g.assessment_date && (
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(g.assessment_date), 'MMM d, yyyy')}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Avg: {g.avg}</span>
                          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> {g.highest}</span>
                          <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> {g.lowest}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked}
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(g); }}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={locked}
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-5">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium">Student</th>
                          <th className="text-left px-3 py-2 font-medium">Roll</th>
                          <th className="text-right px-3 py-2 font-medium">Marks</th>
                          <th className="text-right px-3 py-2 font-medium">%</th>
                        </tr></thead>
                        <tbody>
                          {g.entries.map(e => (
                            <tr key={e.id} className="border-t border-border/50">
                              <td className="px-3 py-2">{e.profile?.full_name || '—'}</td>
                              <td className="px-3 py-2 text-muted-foreground">{e.profile?.student_id || '—'}</td>
                              <td className="px-3 py-2 text-right font-medium">{e.marks_obtained ?? '—'} / {e.total_marks}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {e.marks_obtained != null ? `${Math.round((e.marks_obtained / (e.total_marks || 1)) * 100)}%` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Assessment' : 'Record Assessment'}</DialogTitle>
          </DialogHeader>
          <Tabs value={mode} onValueChange={v => setMode(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="batch" className="flex-1">Batch Entry</TabsTrigger>
              <TabsTrigger value="single" className="flex-1" disabled={!!editingGroup}>Single Student</TabsTrigger>
            </TabsList>

            <TabsContent value="batch" className="space-y-3 mt-3">
              <div className="space-y-1"><Label>Title</Label>
                <Input value={batchTitle} onChange={e => setBatchTitle(e.target.value)} placeholder="Quiz 1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Total Marks</Label>
                  <Input type="number" value={batchTotalMarks} onChange={e => setBatchTotalMarks(e.target.value)} />
                </div>
                <div className="space-y-1"><Label>Date</Label>
                  <Input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} />
                </div>
              </div>
              {batchStudents.length > 0 ? (
                <div className="border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground">{batchStudents.length} students enrolled</p>
                  {batchStudents.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{s.full_name || s.email}</span>
                        {s.student_id && <span className="text-xs text-muted-foreground">{s.student_id}</span>}
                      </div>
                      <Input type="number" className="w-20 h-8 text-sm" placeholder="—"
                        value={batchMarks[s.id] ?? ''}
                        onChange={e => setBatchMarks(m => ({ ...m, [s.id]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No students enrolled in this course</p>
              )}
              <Button className="w-full" onClick={handleBatchSave}>{editingGroup ? 'Update All' : 'Save All'}</Button>
            </TabsContent>

            <TabsContent value="single" className="space-y-3 mt-3">
              <div className="space-y-1"><Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Quiz 1" />
              </div>
              <div className="space-y-1"><Label>Student</Label>
                <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                  <SelectContent>
                    {singleStudents.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name || s.email} {s.student_id ? `(${s.student_id})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Marks Obtained</Label>
                  <Input type="number" value={form.marks_obtained} onChange={e => setForm(f => ({ ...f, marks_obtained: e.target.value }))} />
                </div>
                <div className="space-y-1"><Label>Total Marks</Label>
                  <Input type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1"><Label>Date</Label>
                <Input type="date" value={form.assessment_date} onChange={e => setForm(f => ({ ...f, assessment_date: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleSingleSave}>Save Assessment</Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAssessments;
