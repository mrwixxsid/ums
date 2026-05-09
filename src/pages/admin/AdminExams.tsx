import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Calendar, Clock, DoorOpen, BarChart3, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface ExamSchedule {
  id: string; title: string; exam_type: string; scheduled_at: string; duration_minutes: number; room: string | null; total_marks: number; course_id: string;
  courses?: { name: string; code: string };
}
interface Course { id: string; name: string; code: string; }

const examTypeColors: Record<string, string> = { mid: 'default', lab: 'secondary', final: 'destructive' };
const PER_PAGE = 15;

const AdminExams = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamSchedule | null>(null);
  const [form, setForm] = useState({ title: '', exam_type: 'mid', course_id: '', scheduled_at: '', duration_minutes: '120', room: '', total_marks: '100' });

  const [typeFilter, setTypeFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [examsRes, coursesRes] = await Promise.all([
      supabase.from('exam_schedules').select('*, courses(name, code)').order('scheduled_at', { ascending: true }),
      supabase.from('courses').select('id, name, code').eq('is_active', true),
    ]);
    setExams(examsRes.data ?? []);
    setCourses(coursesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPage(1); }, [typeFilter, courseFilter]);

  const handleSave = async () => {
    if (!form.title || !form.course_id || !form.scheduled_at) { toast.error('Title, course, and date are required'); return; }
    const payload = {
      title: form.title, exam_type: form.exam_type as any, course_id: form.course_id,
      scheduled_at: new Date(form.scheduled_at).toISOString(), duration_minutes: parseInt(form.duration_minutes) || 120,
      room: form.room || null, total_marks: parseInt(form.total_marks) || 100,
    };
    if (editing) {
      const { error } = await supabase.from('exam_schedules').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update exam'); return; }
      toast.success('Exam updated');
    } else {
      const { error } = await supabase.from('exam_schedules').insert({ ...payload, created_by: user?.id });
      if (error) { toast.error('Failed to create exam'); return; }
      toast.success('Exam scheduled');
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', exam_type: 'mid', course_id: '', scheduled_at: '', duration_minutes: '120', room: '', total_marks: '100' });
    fetchData();
  };

  const openEdit = (exam: ExamSchedule) => {
    setEditing(exam);
    const dt = new Date(exam.scheduled_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      title: exam.title, exam_type: exam.exam_type, course_id: exam.course_id,
      scheduled_at: local, duration_minutes: String(exam.duration_minutes),
      room: exam.room || '', total_marks: String(exam.total_marks),
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', exam_type: 'mid', course_id: '', scheduled_at: '', duration_minutes: '120', room: '', total_marks: '100' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('exam_schedules').delete().eq('id', id);
    toast.success('Exam removed');
    fetchData();
  };

  const filtered = exams.filter(e => {
    if (typeFilter !== 'all' && e.exam_type !== typeFilter) return false;
    if (courseFilter !== 'all' && e.course_id !== courseFilter) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exam Management</h1>
          <p className="text-muted-foreground">Schedule mid-term, lab, and final exams</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Schedule Exam</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit Exam' : 'Schedule New Exam'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Exam Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Mid-Term Exam" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Exam Type</Label>
                  <Select value={form.exam_type} onValueChange={v => setForm(f => ({ ...f, exam_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mid">Mid-Term</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Course</Label>
                  <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Room</Label>
                  <Input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="Room 101" />
                </div>
                <div className="space-y-1">
                  <Label>Total Marks</Label>
                  <Input type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSave}>{editing ? 'Update Exam' : 'Schedule Exam'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:max-w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mid">Mid-Term</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="sm:max-w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {filtered.length > 0 && <p className="text-xs text-muted-foreground self-center">{filtered.length} exam(s)</p>}
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : paginated.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No exams found.</p>
          </CardContent></Card>
        ) : paginated.map(exam => (
          <Card key={exam.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{exam.title}</span>
                    <Badge variant={examTypeColors[exam.exam_type] as any} className="text-xs capitalize">{exam.exam_type}</Badge>
                    <Badge variant="outline" className="text-xs">{(exam.courses as any)?.code}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{(exam.courses as any)?.name}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(exam.scheduled_at), 'MMM d, yyyy • h:mm a')}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes} min</span>
                    {exam.room && <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" /> {exam.room}</span>}
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {exam.total_marks} marks</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exam)}><Pencil className="w-3 h-3" /></Button>
                  <ConfirmDialog trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>} title="Delete Exam" description="This exam schedule and any associated results will be removed." onConfirm={() => handleDelete(exam.id)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExams;
