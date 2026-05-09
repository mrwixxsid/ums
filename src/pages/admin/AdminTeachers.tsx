import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, UserCog, UserPlus, ArrowUpDown, Trash2, RefreshCw } from 'lucide-react';
import { TEACHER_DESIGNATIONS } from '@/lib/constants';
import { generatePassword } from '@/lib/passwordGenerator';
import ConfirmDialog from '@/components/ConfirmDialog';

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [editDept, setEditDept] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    full_name: '', email: '', department: '', designation: '', phone: '', password: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, deptsRes, tcRes] = await Promise.all([
      supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
      supabase.from('departments').select('*').order('code'),
      supabase.from('teacher_courses').select('teacher_id'),
    ]);

    const teacherIds = (rolesRes.data ?? []).map((r: any) => r.user_id);
    
    let teacherProfiles: any[] = [];
    if (teacherIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, designation, phone')
        .in('id', teacherIds);
      teacherProfiles = data ?? [];
    }

    setTeachers(teacherProfiles);
    setDepartments(deptsRes.data ?? []);

    const counts: Record<string, number> = {};
    for (const tc of (tcRes.data ?? [])) {
      counts[tc.teacher_id] = (counts[tc.teacher_id] || 0) + 1;
    }
    setCourseCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (teacher: any) => {
    setEditTeacher(teacher);
    setEditDept(teacher.department || '');
    setEditDesignation(teacher.designation || '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTeacher) return;
    const { error } = await supabase.from('profiles').update({
      department: editDept || null,
      designation: editDesignation || null,
    }).eq('id', editTeacher.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Teacher updated');
    setEditOpen(false);
    fetchData();
  };

  const handleDeleteTeacher = async (teacher: any) => {
    // Remove teacher role
    const { error: roleErr } = await supabase.from('user_roles').delete().eq('user_id', teacher.id).eq('role', 'teacher');
    if (roleErr) { toast.error(roleErr.message); return; }
    // Remove teacher course assignments
    await supabase.from('teacher_courses').delete().eq('teacher_id', teacher.id);
    // Reset profile fields
    await supabase.from('profiles').update({ department: null, designation: null }).eq('id', teacher.id);
    toast.success('Teacher role removed');
    fetchData();
  };

  const createTeacher = async () => {
    if (!newTeacher.full_name || !newTeacher.email) {
      toast.error('Name and email are required');
      return;
    }
    setCreating(true);
    try {
      const password = newTeacher.password || generatePassword();
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newTeacher.email, password, full_name: newTeacher.full_name,
          role: 'teacher', department: newTeacher.department || null,
          designation: newTeacher.designation || null, phone: newTeacher.phone || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Teacher "${newTeacher.full_name}" created with password "${password}"`);
      setCreateOpen(false);
      setNewTeacher({ full_name: '', email: '', department: '', designation: '', phone: '', password: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create teacher');
    } finally {
      setCreating(false);
    }
  };

  const filtered = teachers
    .filter(t => {
      const matchDept = filterDept === 'all' || t.department === filterDept;
      const matchSearch = !search || t.full_name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase());
      return matchDept && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '');
      if (sortBy === 'designation') return (a.designation || '').localeCompare(b.designation || '');
      if (sortBy === 'courses') return (courseCounts[b.id] || 0) - (courseCounts[a.id] || 0);
      return 0;
    });

  const deptCounts: Record<string, number> = {};
  teachers.forEach(t => {
    const d = t.department || 'Unassigned';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground">
            {teachers.length} teachers
            {Object.entries(deptCounts).map(([dept, count]) => (
              <span key={dept}> · {dept}: {count}</span>
            ))}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />Add Teacher
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.code}>{d.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="w-3 h-3 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="department">Sort by Department</SelectItem>
            <SelectItem value="designation">Sort by Designation</SelectItem>
            <SelectItem value="courses">Sort by Courses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Create Teacher Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Teacher</DialogTitle><DialogDescription>Create a new teacher account with default credentials.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={newTeacher.full_name} onChange={e => setNewTeacher(p => ({ ...p, full_name: e.target.value }))} placeholder="Dr. Jane Doe" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={newTeacher.email} onChange={e => setNewTeacher(p => ({ ...p, email: e.target.value }))} placeholder="jane@university.edu" />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={newTeacher.department} onValueChange={v => setNewTeacher(p => ({ ...p, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.code}>{d.code} - {d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <Select value={newTeacher.designation} onValueChange={v => setNewTeacher(p => ({ ...p, designation: v }))}>
                <SelectTrigger><SelectValue placeholder="Select designation..." /></SelectTrigger>
                <SelectContent>{TEACHER_DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={newTeacher.phone} onChange={e => setNewTeacher(p => ({ ...p, phone: e.target.value }))} placeholder="+880..." />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input value={newTeacher.password} onChange={e => setNewTeacher(p => ({ ...p, password: e.target.value }))} placeholder="Auto-generated if empty" />
                <Button type="button" variant="outline" size="icon" onClick={() => setNewTeacher(p => ({ ...p, password: generatePassword() }))}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave empty to auto-generate. Password shown in confirmation toast.</p>
            <Button className="w-full" onClick={createTeacher} disabled={creating}>
              {creating ? 'Creating...' : 'Create Teacher'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle><DialogDescription>Update department and designation.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">{editTeacher?.full_name}</p>
            <div className="space-y-1"><Label>Department</Label>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger><SelectValue placeholder="Assign department..." /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.code}>{d.code} - {d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Designation</Label>
              <Select value={editDesignation} onValueChange={setEditDesignation}>
                <SelectTrigger><SelectValue placeholder="Select designation..." /></SelectTrigger>
                <SelectContent>{TEACHER_DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No teachers found.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.full_name}</p>
                  <p className="text-xs text-muted-foreground">{t.email}{t.phone && ` · ${t.phone}`}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {t.department && <Badge variant="outline" className="text-xs">{t.department}</Badge>}
                    {t.designation && <Badge variant="secondary" className="text-xs">{t.designation}</Badge>}
                    <Badge variant="default" className="text-xs">{courseCounts[t.id] || 0} courses</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><UserCog className="w-4 h-4 mr-1" />Edit</Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                    title="Remove Teacher"
                    description="This will remove the teacher's role and course assignments. Their profile will remain but they will lose teacher access."
                    confirmLabel="Remove"
                    onConfirm={() => handleDeleteTeacher(t)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTeachers;
