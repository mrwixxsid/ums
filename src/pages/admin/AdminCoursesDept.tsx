import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Course {
  id: string; name: string; code: string; description: string | null;
  credits: number; course_type: string | null; contact_hours: number | null;
  semester_number: number | null; is_active: boolean; is_non_departmental: boolean;
  department_id: string | null;
}

interface TeacherAssignment { course_id: string; teacher_id: string; }
interface Profile { id: string; full_name: string; }

const AdminCoursesDept = () => {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dept, setDept] = useState<{ id: string; name: string; code: string } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', description: '', credits: '3', course_type: 'Theory',
    contact_hours: '3', semester_number: '1', is_non_departmental: false, teacher_id: '',
  });

  const fetchAll = async () => {
    if (!deptId) return;
    setLoading(true);
    const [deptRes, coursesRes, tcRes, teachersRes] = await Promise.all([
      supabase.from('departments').select('*').eq('id', deptId).single(),
      supabase.from('courses').select('*').or(`department_id.eq.${deptId}`).eq('is_active', true).order('semester_number').order('code'),
      supabase.from('teacher_courses').select('course_id, teacher_id'),
      supabase.from('profiles').select('id, full_name').not('designation', 'is', null),
    ]);
    setDept(deptRes.data);
    setCourses(coursesRes.data ?? []);
    setAssignments(tcRes.data ?? []);
    setTeachers(teachersRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [deptId]);

  const resetForm = () => {
    setForm({ name: '', code: '', description: '', credits: '3', course_type: 'Theory', contact_hours: '3', semester_number: '1', is_non_departmental: false, teacher_id: '' });
    setEditing(null);
  };

  const openEdit = (c: Course) => {
    const tc = assignments.find(a => a.course_id === c.id);
    setEditing(c);
    setForm({
      name: c.name, code: c.code, description: c.description ?? '',
      credits: String(c.credits), course_type: c.course_type ?? 'Theory',
      contact_hours: String(c.contact_hours ?? 0), semester_number: String(c.semester_number ?? 1),
      is_non_departmental: c.is_non_departmental ?? false, teacher_id: tc?.teacher_id ?? '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and code required'); return; }
    const contactH = form.course_type === 'Viva' ? 0 : parseInt(form.contact_hours) || 0;
    const payload: any = {
      name: form.name, code: form.code, description: form.description || null,
      credits: parseInt(form.credits) || 3, course_type: form.course_type,
      contact_hours: contactH, semester_number: parseInt(form.semester_number) || 1,
      is_non_departmental: form.is_non_departmental, department_id: deptId,
      created_by: user?.id,
    };

    let courseId = editing?.id;
    if (editing) {
      const { error } = await supabase.from('courses').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
    } else {
      const { data, error } = await supabase.from('courses').insert(payload).select('id').single();
      if (error) { toast.error(error.message); return; }
      courseId = data.id;
    }

    // Handle teacher assignment
    if (courseId && form.teacher_id) {
      await supabase.from('teacher_courses').delete().eq('course_id', courseId);
      await supabase.from('teacher_courses').insert({ course_id: courseId, teacher_id: form.teacher_id });
    }

    toast.success(editing ? 'Course updated' : 'Course created');
    setOpen(false); resetForm(); fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('teacher_courses').delete().eq('course_id', id);
    await supabase.from('courses').delete().eq('id', id);
    toast.success('Course deleted'); fetchAll();
  };

  const getTeacher = (courseId: string) => {
    const tc = assignments.find(a => a.course_id === courseId);
    if (!tc) return null;
    return teachers.find(t => t.id === tc.teacher_id);
  };

  const grouped = courses.reduce<Record<number, Course[]>>((acc, c) => {
    const sem = c.semester_number ?? 0;
    (acc[sem] = acc[sem] || []).push(c);
    return acc;
  }, {});

  if (loading) return <p className="text-muted-foreground p-6">Loading...</p>;
  if (!dept) return <p className="text-muted-foreground p-6">Department not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/courses')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{dept.name}</h1>
            <p className="text-muted-foreground">Manage courses for {dept.code}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Course</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit Course' : 'New Course'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.course_type} onValueChange={v => setForm(f => ({ ...f, course_type: v, contact_hours: v === 'Viva' ? '0' : f.contact_hours }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Theory">Theory</SelectItem>
                      <SelectItem value="Lab">Lab</SelectItem>
                      <SelectItem value="Viva">Viva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Credits</Label><Input type="number" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Semester</Label>
                  <Select value={form.semester_number} onValueChange={v => setForm(f => ({ ...f, semester_number: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>Sem {n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Contact Hours</Label><Input type="number" value={form.contact_hours} onChange={e => setForm(f => ({ ...f, contact_hours: e.target.value }))} disabled={form.course_type === 'Viva'} /></div>
                <div className="space-y-1">
                  <Label>Assigned Teacher</Label>
                  <Select value={form.teacher_id || 'none'} onValueChange={v => setForm(f => ({ ...f, teacher_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_non_departmental} onCheckedChange={v => setForm(f => ({ ...f, is_non_departmental: v }))} />
                <Label>Non-departmental (cross-department course)</Label>
              </div>
              <Button className="w-full" onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(sem => (
        <div key={sem}>
          <h2 className="text-lg font-semibold mb-3">Semester {sem}</h2>
          <div className="grid gap-2">
            {grouped[Number(sem)].map(c => {
              const teacher = getTeacher(c.id);
              return (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-mono">{c.code}</Badge>
                          <span className="font-medium text-sm">{c.name}</span>
                          <Badge variant={c.course_type === 'Lab' ? 'default' : c.course_type === 'Viva' ? 'secondary' : 'outline'} className="text-xs">{c.course_type}</Badge>
                          <span className="text-xs text-muted-foreground">{c.credits}cr</span>
                          {c.is_non_departmental && <Badge variant="secondary" className="text-[10px]">Non-dept</Badge>}
                        </div>
                        {teacher && <p className="text-xs text-muted-foreground mt-1">Teacher: {teacher.full_name}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminCoursesDept;
