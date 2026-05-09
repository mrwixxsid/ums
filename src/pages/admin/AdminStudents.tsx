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
import { Users, UserCog, UserPlus, ArrowUpDown, BookOpen, Download, Trash2, RefreshCw } from 'lucide-react';
import { exportToCSV } from '@/lib/exportCSV';
import { generatePassword } from '@/lib/passwordGenerator';
import ConfirmDialog from '@/components/ConfirmDialog';

const AdminStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [editBatchId, setEditBatchId] = useState('');
  const [search, setSearch] = useState('');
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: '', email: '', batch_id: '', student_id: '', password: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, deptsRes, batchesRes] = await Promise.all([
      supabase.from('user_roles').select('user_id').eq('role', 'student'),
      supabase.from('departments').select('*').order('code'),
      supabase.from('batches').select('*, departments(code)').order('semester'),
    ]);

    const studentIds = (rolesRes.data ?? []).map((r: any) => r.user_id);
    let studentProfiles: any[] = [];
    if (studentIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, student_id, batch_id')
        .in('id', studentIds);
      studentProfiles = data ?? [];

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .in('student_id', studentIds);

      const counts: Record<string, number> = {};
      (enrollments ?? []).forEach((e: any) => {
        counts[e.student_id] = (counts[e.student_id] || 0) + 1;
      });
      setEnrollmentCounts(counts);
    }

    setStudents(studentProfiles);
    setDepartments(deptsRes.data ?? []);
    setBatches(batchesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (student: any) => {
    setEditStudent(student);
    setEditBatchId(student.batch_id || '');
    setEditOpen(true);
  };

  const autoEnrollStudent = async (studentId: string, batchId: string, oldBatchId?: string) => {
    try {
      if (oldBatchId && oldBatchId !== batchId) {
        const { data: oldBatch } = await supabase.from('batches').select('semester, department_id').eq('id', oldBatchId).single();
        if (oldBatch) {
          const { data: oldCourses } = await supabase.from('courses').select('id').eq('semester_number', oldBatch.semester).eq('is_active', true).or(`department_id.eq.${oldBatch.department_id},is_non_departmental.eq.true`);
          if (oldCourses && oldCourses.length > 0) {
            await supabase.from('enrollments').delete().eq('student_id', studentId).in('course_id', oldCourses.map((c: any) => c.id));
          }
        }
      }
      const { data: newBatch } = await supabase.from('batches').select('semester, department_id').eq('id', batchId).single();
      if (!newBatch) return 0;
      const { data: courses } = await supabase.from('courses').select('id').eq('semester_number', newBatch.semester).eq('is_active', true).or(`department_id.eq.${newBatch.department_id},is_non_departmental.eq.true`);
      if (!courses || courses.length === 0) return 0;
      const enrollments = courses.map((c: any) => ({ student_id: studentId, course_id: c.id }));
      await supabase.from('enrollments').upsert(enrollments, { onConflict: 'student_id,course_id', ignoreDuplicates: true });
      return courses.length;
    } catch (err) { console.error('Auto-enroll error:', err); return 0; }
  };

  const saveEdit = async () => {
    if (!editStudent) return;
    const oldBatchId = editStudent.batch_id;
    const batch = batches.find((b: any) => b.id === editBatchId);
    const dept = batch ? (batch.departments as any)?.code : null;
    const { error } = await supabase.from('profiles').update({ batch_id: editBatchId || null, department: dept }).eq('id', editStudent.id);
    if (error) { toast.error(error.message); return; }
    if (editBatchId && editBatchId !== oldBatchId) {
      const count = await autoEnrollStudent(editStudent.id, editBatchId, oldBatchId);
      toast.success(count > 0 ? `Batch updated — enrolled in ${count} courses for Semester ${batch?.semester}` : 'Batch updated');
    } else { toast.success('Student updated'); }
    setEditOpen(false);
    fetchData();
  };

  const handleDeleteStudent = async (student: any) => {
    const { error: roleErr } = await supabase.from('user_roles').delete().eq('user_id', student.id).eq('role', 'student');
    if (roleErr) { toast.error(roleErr.message); return; }
    await supabase.from('enrollments').delete().eq('student_id', student.id);
    await supabase.from('profiles').update({ batch_id: null, department: null, student_id: null }).eq('id', student.id);
    toast.success('Student role removed');
    fetchData();
  };

  const createStudent = async () => {
    if (!newStudent.full_name || !newStudent.email) { toast.error('Name and email are required'); return; }
    setCreating(true);
    try {
      const batch = batches.find((b: any) => b.id === newStudent.batch_id);
      const dept = batch ? (batch.departments as any)?.code : null;
      const password = newStudent.password || generatePassword();
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: newStudent.email, password, full_name: newStudent.full_name, role: 'student', department: dept, batch_id: newStudent.batch_id || null, student_id: newStudent.student_id || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const enrollMsg = data?.enrollment_count > 0 ? ` — auto-enrolled in ${data.enrollment_count} courses` : '';
      toast.success(`Student "${newStudent.full_name}" created with password "${password}"${enrollMsg}`);
      setCreateOpen(false);
      setNewStudent({ full_name: '', email: '', batch_id: '', student_id: '', password: '' });
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to create student'); } finally { setCreating(false); }
  };

  const filteredBatches = filterDept === 'all' ? batches : batches.filter((b: any) => (b.departments as any)?.code === filterDept);

  const filtered = students
    .filter(s => {
      const matchDept = filterDept === 'all' || s.department === filterDept;
      const matchBatch = filterBatch === 'all' || s.batch_id === filterBatch;
      const matchSearch = !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()) || s.student_id?.toLowerCase().includes(search.toLowerCase());
      return matchDept && matchBatch && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'roll') return (a.student_id || '').localeCompare(b.student_id || '');
      if (sortBy === 'batch') return (a.batch_id || '').localeCompare(b.batch_id || '');
      return 0;
    });

  const getBatchLabel = (batchId: string) => {
    const b = batches.find((batch: any) => batch.id === batchId);
    if (!b) return 'Unassigned';
    return `${(b.departments as any)?.code || '?'}-${b.semester}`;
  };

  const deptCounts: Record<string, number> = {};
  students.forEach(s => { const d = s.department || 'Unassigned'; deptCounts[d] = (deptCounts[d] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">
            {students.length} students
            {Object.entries(deptCounts).map(([dept, count]) => (<span key={dept}> · {dept}: {count}</span>))}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            exportToCSV(filtered.map(s => ({ roll: s.student_id || '', name: s.full_name || '', email: s.email || '', department: s.department || '', batch: getBatchLabel(s.batch_id), courses: enrollmentCounts[s.id] || 0 })), 'students', [
              { key: 'roll', label: 'Roll' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'department', label: 'Department' }, { key: 'batch', label: 'Batch' }, { key: 'courses', label: 'Courses' },
            ]);
            toast.success('Student list exported');
          }}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}><UserPlus className="w-4 h-4 mr-2" />Add Student</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search name, email, roll..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterDept} onValueChange={v => { setFilterDept(v); setFilterBatch('all'); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.code}>{d.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBatch} onValueChange={setFilterBatch}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {filteredBatches.map((b: any) => {
              const deptCode = (b.departments as any)?.code || '?';
              return <SelectItem key={b.id} value={b.id}>{deptCode}-{b.semester}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48"><ArrowUpDown className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="roll">Sort by Roll</SelectItem>
            <SelectItem value="batch">Sort by Batch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Create Student Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Student</DialogTitle><DialogDescription>Create a new student account with default credentials.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Full Name *</Label><Input value={newStudent.full_name} onChange={e => setNewStudent(p => ({ ...p, full_name: e.target.value }))} placeholder="John Doe" /></div>
            <div className="space-y-1"><Label>Email *</Label><Input type="email" value={newStudent.email} onChange={e => setNewStudent(p => ({ ...p, email: e.target.value }))} placeholder="john@university.edu" /></div>
            <div className="space-y-1">
              <Label>Batch</Label>
              <Select value={newStudent.batch_id} onValueChange={v => {
                const batch = batches.find((b: any) => b.id === v);
                if (batch) {
                  const existingInBatch = students.filter(s => s.batch_id === v).length;
                  setNewStudent(p => ({ ...p, batch_id: v, student_id: String(batch.starting_roll + existingInBatch) }));
                } else { setNewStudent(p => ({ ...p, batch_id: v })); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select batch..." /></SelectTrigger>
                <SelectContent>{batches.filter((b: any) => !b.is_graduated).map((b: any) => {
                  const deptCode = (b.departments as any)?.code || '?';
                  return <SelectItem key={b.id} value={b.id}>{deptCode}-{b.semester} ({b.batch_name})</SelectItem>;
                })}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Roll Number</Label><Input value={newStudent.student_id} onChange={e => setNewStudent(p => ({ ...p, student_id: e.target.value }))} placeholder="Auto-suggested from batch" /></div>
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input value={newStudent.password} onChange={e => setNewStudent(p => ({ ...p, password: e.target.value }))} placeholder="Auto-generated if empty" />
                <Button type="button" variant="outline" size="icon" onClick={() => setNewStudent(p => ({ ...p, password: generatePassword() }))}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave empty to auto-generate · Students will be auto-enrolled in semester courses</p>
            <Button className="w-full" onClick={createStudent} disabled={creating}>{creating ? 'Creating...' : 'Create Student'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Batch</DialogTitle><DialogDescription>Change this student's batch and auto-enroll in courses.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">{editStudent?.full_name}</p>
            <div className="space-y-1"><Label>Batch</Label>
              <Select value={editBatchId} onValueChange={setEditBatchId}>
                <SelectTrigger><SelectValue placeholder="Select batch..." /></SelectTrigger>
                <SelectContent>{batches.filter((b: any) => !b.is_graduated).map((b: any) => {
                  const deptCode = (b.departments as any)?.code || '?';
                  return <SelectItem key={b.id} value={b.id}>{deptCode}-{b.semester} ({b.batch_name})</SelectItem>;
                })}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Changing batch will auto-enroll the student in the new semester's courses and remove old enrollments.</p>
            <Button className="w-full" onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No students found.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {s.student_id && <span className="font-mono text-sm font-bold text-primary">{s.student_id}</span>}
                    <p className="font-medium text-sm">{s.full_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {s.department && <Badge variant="outline" className="text-xs">{s.department}</Badge>}
                    {s.batch_id && <Badge variant="secondary" className="text-xs">{getBatchLabel(s.batch_id)}</Badge>}
                    {enrollmentCounts[s.id] > 0 && (
                      <Badge variant="default" className="text-xs flex items-center gap-1"><BookOpen className="w-3 h-3" />{enrollmentCounts[s.id]} courses</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><UserCog className="w-4 h-4 mr-1" />Assign</Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                    title="Remove Student"
                    description="This will remove the student's role, enrollments, and batch assignment. Their profile will remain but they will lose student access."
                    confirmLabel="Remove"
                    onConfirm={() => handleDeleteStudent(s)}
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

export default AdminStudents;
