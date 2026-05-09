import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface ClassSession {
  id: string; title: string; scheduled_at: string; duration_minutes: number; room: string | null; notes: string | null; is_cancelled: boolean; course_id: string;
  courses?: { name: string; code: string };
}
interface Course { id: string; name: string; code: string; }
interface Teacher { id: string; full_name: string; }

const PER_PAGE = 15;

const AdminSchedule = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [form, setForm] = useState({ title: '', course_id: '', teacher_id: '', scheduled_at: '', duration_minutes: '60', room: '', notes: '' });

  const [courseFilter, setCourseFilter] = useState('all');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [classesRes, coursesRes, teachersRes] = await Promise.all([
      supabase.from('classes').select('*, courses(name, code)').order('scheduled_at', { ascending: true }),
      supabase.from('courses').select('id, name, code').eq('is_active', true),
      supabase.from('profiles').select('id, full_name').in('id',
        (await supabase.from('user_roles').select('user_id').eq('role', 'teacher')).data?.map(r => r.user_id) ?? []
      ),
    ]);
    setClasses(classesRes.data ?? []);
    setCourses(coursesRes.data ?? []);
    setTeachers(teachersRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPage(1); }, [courseFilter, upcomingOnly]);

  const handleSave = async () => {
    if (!form.title || !form.course_id || !form.scheduled_at || !form.teacher_id) { toast.error('Title, course, teacher, and date are required'); return; }
    const payload = {
      title: form.title, course_id: form.course_id, teacher_id: form.teacher_id,
      scheduled_at: new Date(form.scheduled_at).toISOString(), duration_minutes: parseInt(form.duration_minutes) || 60,
      room: form.room || null, notes: form.notes || null,
    };
    if (editing) {
      const { error } = await supabase.from('classes').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update class'); return; }
      toast.success('Class updated');
    } else {
      const { error } = await supabase.from('classes').insert(payload);
      if (error) { toast.error('Failed to create class'); return; }
      toast.success('Class scheduled');
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', course_id: '', teacher_id: '', scheduled_at: '', duration_minutes: '60', room: '', notes: '' });
    fetchData();
  };

  const openEdit = (cls: ClassSession) => {
    setEditing(cls);
    const dt = new Date(cls.scheduled_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      title: cls.title, course_id: cls.course_id, teacher_id: (cls as any).teacher_id || '', scheduled_at: local,
      duration_minutes: String(cls.duration_minutes), room: cls.room || '', notes: cls.notes || '',
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', course_id: '', teacher_id: '', scheduled_at: '', duration_minutes: '60', room: '', notes: '' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('classes').delete().eq('id', id);
    toast.success('Class removed');
    fetchData();
  };

  const now = new Date().toISOString();
  const filtered = classes.filter(cls => {
    if (courseFilter !== 'all' && cls.course_id !== courseFilter) return false;
    if (upcomingOnly && cls.scheduled_at < now) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Schedule</h1>
          <p className="text-muted-foreground">Manage class sessions and academic calendar</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Class</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit Class' : 'Schedule a Class'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Class Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Introduction to Arrays" />
              </div>
              <div className="space-y-1">
                <Label>Course</Label>
                <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Teacher</Label>
                <Select value={form.teacher_id} onValueChange={v => setForm(f => ({ ...f, teacher_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select teacher..." /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <div className="space-y-1">
                <Label>Room</Label>
                <Input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="Room 101" />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any additional notes..." />
              </div>
              <Button className="w-full" onClick={handleSave}>{editing ? 'Update Class' : 'Schedule Class'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="sm:max-w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={upcomingOnly} onCheckedChange={setUpcomingOnly} />
          <Label className="text-sm text-muted-foreground">Upcoming only</Label>
        </div>
        {filtered.length > 0 && <p className="text-xs text-muted-foreground">{filtered.length} class(es)</p>}
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : paginated.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No classes found.</p>
          </CardContent></Card>
        ) : paginated.map(cls => (
          <Card key={cls.id} className={cls.is_cancelled ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{cls.title}</span>
                    {cls.is_cancelled && <span className="text-xs text-destructive font-medium">(Cancelled)</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{(cls.courses as any)?.code} – {(cls.courses as any)?.name}</p>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>📅 {format(new Date(cls.scheduled_at), 'MMM d, yyyy • h:mm a')}</span>
                    <span>⏱ {cls.duration_minutes} min</span>
                    {cls.room && <span>🚪 {cls.room}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cls)}><Pencil className="w-3 h-3" /></Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>}
                    title="Delete Class"
                    description="This class session will be permanently removed."
                    onConfirm={() => handleDelete(cls.id)}
                  />
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

export default AdminSchedule;
