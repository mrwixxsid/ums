import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, UserCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEACHER_DESIGNATIONS } from '@/lib/constants';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  student_id: string | null;
  batch_id: string | null;
  role?: string;
}

const roleBadgeVariant = (role?: string) => {
  if (role === 'super_admin') return 'destructive' as const;
  if (role === 'teacher') return 'default' as const;
  if (role === 'student') return 'secondary' as const;
  return 'outline' as const;
};

const PER_PAGE = 15;

const PaginationControls = ({ page, totalPages, total, onPrev, onNext }: { page: number; totalPages: number; total: number; onPrev: () => void; onNext: () => void }) => {
  if (totalPages <= 1) return null;
  const start = (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, total);
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-muted-foreground">Showing {start}–{end} of {total}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [departments, setDepartments] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // Filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDept, setTeacherDept] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDept, setStudentDept] = useState('all');
  const [studentBatch, setStudentBatch] = useState('all');

  // Pagination
  const [teacherPage, setTeacherPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, deptsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, department, designation, student_id, batch_id'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('departments').select('id, code, name').order('code'),
    ]);
    const roleMap = Object.fromEntries((rolesRes.data ?? []).map(r => [r.user_id, r.role]));
    setUsers((profilesRes.data ?? []).map(p => ({ ...p, role: roleMap[p.id] })));
    setDepartments(deptsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAssignRole = async () => {
    if (!assigningUserId || !selectedRole) return;
    // Delete any existing role first
    await supabase.from('user_roles').delete().eq('user_id', assigningUserId);
    const { error } = await supabase.from('user_roles').insert({ user_id: assigningUserId, role: selectedRole as any });
    if (error) { toast.error('Failed to assign role: ' + error.message); return; }

    // If teacher, update designation and department on profile
    if (selectedRole === 'teacher') {
      const profileUpdates: Record<string, string | null> = {};
      if (selectedDesignation) profileUpdates.designation = selectedDesignation;
      if (selectedDepartment) profileUpdates.department = selectedDepartment;
      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from('profiles').update(profileUpdates).eq('id', assigningUserId);
      }
    }

    toast.success('Role assigned successfully');
    setOpen(false);
    setAssigningUserId('');
    setSelectedRole('');
    setSelectedDesignation('');
    setSelectedDepartment('');
    fetchUsers();
  };

  const handleRemoveRole = async (userId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (error) { toast.error('Failed to remove role: ' + error.message); return; }
    toast.success('Role removed');
    fetchUsers();
  };

  // Only users without a role can be assigned
  const unassignedUsers = users.filter(u => !u.role);
  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');
  const admins = users.filter(u => u.role === 'super_admin');

  const allDepartments = [...new Set(users.map(u => u.department).filter(Boolean))] as string[];
  const batchIds = [...new Set(students.map(u => u.batch_id).filter(Boolean))] as string[];
  const [batchNames, setBatchNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (batchIds.length === 0) return;
    supabase.from('batches').select('id, batch_name').in('id', batchIds).then(({ data }) => {
      const map: Record<string, string> = {};
      (data ?? []).forEach(b => { map[b.id] = b.batch_name; });
      setBatchNames(map);
    });
  }, [students]);

  // Filter teachers
  const filteredTeachers = teachers.filter(u => {
    if (teacherDept !== 'all' && u.department !== teacherDept) return false;
    if (teacherSearch && !u.full_name.toLowerCase().includes(teacherSearch.toLowerCase()) && !u.email.toLowerCase().includes(teacherSearch.toLowerCase())) return false;
    return true;
  });
  const teacherTotalPages = Math.ceil(filteredTeachers.length / PER_PAGE);
  const paginatedTeachers = filteredTeachers.slice((teacherPage - 1) * PER_PAGE, teacherPage * PER_PAGE);

  // Filter students
  const filteredStudents = students.filter(u => {
    if (studentDept !== 'all' && u.department !== studentDept) return false;
    if (studentBatch !== 'all' && u.batch_id !== studentBatch) return false;
    if (studentSearch && !u.full_name.toLowerCase().includes(studentSearch.toLowerCase()) && !u.email.toLowerCase().includes(studentSearch.toLowerCase())) return false;
    return true;
  });
  const studentTotalPages = Math.ceil(filteredStudents.length / PER_PAGE);
  const paginatedStudents = filteredStudents.slice((studentPage - 1) * PER_PAGE, studentPage * PER_PAGE);

  // Reset pages on filter change
  useEffect(() => { setTeacherPage(1); }, [teacherSearch, teacherDept]);
  useEffect(() => { setStudentPage(1); }, [studentSearch, studentDept, studentBatch]);

  const UserRow = ({ user, showRemove = true }: { user: UserProfile; showRemove?: boolean }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {user.department && <span className="text-xs text-muted-foreground">{user.department}</span>}
          {user.designation && <Badge variant="secondary" className="text-xs">{user.designation}</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={roleBadgeVariant(user.role)}>
          {user.role ? user.role.replace('_', ' ') : 'No role'}
        </Badge>
        {showRemove && user.role && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveRole(user.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage staff roles (teachers & admins). Students are managed in the Students page.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAssigningUserId(''); setSelectedRole(''); setSelectedDesignation(''); setSelectedDepartment(''); } }}>
          <DialogTrigger asChild>
            <Button disabled={unassignedUsers.length === 0}><UserCheck className="w-4 h-4 mr-2" />Assign Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Role to User</DialogTitle><DialogDescription>Select an unassigned user and assign their role.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={assigningUserId} onValueChange={setAssigningUserId}>
                  <SelectTrigger><SelectValue placeholder="Choose unassigned user..." /></SelectTrigger>
                  <SelectContent>
                    {unassignedUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {unassignedUsers.length === 0 && <p className="text-xs text-muted-foreground">All users already have roles assigned.</p>}
              </div>
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setSelectedDesignation(''); setSelectedDepartment(''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose role..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedRole === 'teacher' && (
                <>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                      <SelectTrigger><SelectValue placeholder="Select designation..." /></SelectTrigger>
                      <SelectContent>
                        {TEACHER_DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.code}>{d.code} - {d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <Button className="w-full" onClick={handleAssignRole} disabled={!assigningUserId || !selectedRole}>Assign Role</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <Tabs defaultValue="teachers">
          <TabsList>
            <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
            {unassignedUsers.length > 0 && <TabsTrigger value="unassigned">Unassigned ({unassignedUsers.length})</TabsTrigger>}
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input placeholder="Search teachers..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="sm:max-w-xs" />
                  <Select value={teacherDept} onValueChange={setTeacherDept}>
                    <SelectTrigger className="sm:max-w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {allDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {paginatedTeachers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No teachers found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {paginatedTeachers.map(u => <UserRow key={u.id} user={u} />)}
                  </div>
                )}
                <PaginationControls page={teacherPage} totalPages={teacherTotalPages} total={filteredTeachers.length} onPrev={() => setTeacherPage(p => p - 1)} onNext={() => setTeacherPage(p => p + 1)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="sm:max-w-xs" />
                  <Select value={studentDept} onValueChange={setStudentDept}>
                    <SelectTrigger className="sm:max-w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {allDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={studentBatch} onValueChange={setStudentBatch}>
                    <SelectTrigger className="sm:max-w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {batchIds.map(b => <SelectItem key={b} value={b}>{batchNames[b] || b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {paginatedStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No students found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {paginatedStudents.map(u => <UserRow key={u.id} user={u} showRemove={false} />)}
                  </div>
                )}
                <PaginationControls page={studentPage} totalPages={studentTotalPages} total={filteredStudents.length} onPrev={() => setStudentPage(p => p - 1)} onNext={() => setStudentPage(p => p + 1)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins">
            <Card>
              <CardContent className="pt-6">
                {admins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No admins found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {admins.map(u => <UserRow key={u.id} user={u} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unassigned Tab */}
          {unassignedUsers.length > 0 && (
            <TabsContent value="unassigned">
              <Card>
                <CardContent className="pt-6">
                  <div className="divide-y">
                    {unassignedUsers.map(u => <UserRow key={u.id} user={u} showRemove={false} />)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default AdminUsers;
