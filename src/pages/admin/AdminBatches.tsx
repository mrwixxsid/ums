import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers, Plus, ArrowUpRight, Pencil, Trash2, Users, GraduationCap } from 'lucide-react';

const SESSION_ABBR: Record<string, string> = { January: 'Jan', July: 'Jul' };

const AdminBatches = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [filterSession, setFilterSession] = useState('all');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBatch, setNewBatch] = useState({
    department_id: '', year: new Date().getFullYear(), semester: 1, starting_roll: 1, student_count: 50, admission_session: 'January',
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [editFields, setEditFields] = useState({ starting_roll: 0, student_count: 0, admission_session: 'January' });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBatch, setDeleteBatch] = useState<any>(null);

  // Advance dialog
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceBatch, setAdvanceBatch] = useState<any>(null);
  const [reEnrollOnAdvance, setReEnrollOnAdvance] = useState(true);
  const [advanceCourses, setAdvanceCourses] = useState<any[]>([]);
  const [advanceStudentCount, setAdvanceStudentCount] = useState(0);
  const [advancing, setAdvancing] = useState(false);

  // Graduate dialog
  const [graduateOpen, setGraduateOpen] = useState(false);
  const [graduateBatch, setGraduateBatch] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const [batchesRes, deptsRes] = await Promise.all([
      supabase.from('batches').select('*, departments(id, code, name)').order('year', { ascending: false }),
      supabase.from('departments').select('*').order('code'),
    ]);
    setBatches(batchesRes.data ?? []);
    setDepartments(deptsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getDeptCode = (deptId: string) => departments.find(d => d.id === deptId)?.code || '?';

  const getDisplayName = (batch: any) => {
    const deptCode = (batch.departments as any)?.code || '?';
    return `${deptCode}-${batch.semester}`;
  };

  const getAdmissionYear = (batch: any) => {
    const parts = batch.batch_name?.split('-');
    if (parts && parts.length >= 2) {
      const year = parseInt(parts[1]);
      if (!isNaN(year) && year > 2000) return year;
    }
    return null;
  };

  const generateBatchName = (deptId: string, year: number, semester: number, session: string) => {
    const code = getDeptCode(deptId);
    const y = Math.ceil(semester / 2);
    const abbr = SESSION_ABBR[session] || 'Jan';
    return `${code}-${year}-${abbr}-Y${y}S${semester}`;
  };

  const handleCreate = async () => {
    if (!newBatch.department_id) { toast.error('Select a department'); return; }
    setCreating(true);
    const batchName = generateBatchName(newBatch.department_id, newBatch.year, newBatch.semester, newBatch.admission_session);
    const yearLevel = Math.ceil(newBatch.semester / 2);
    const { error } = await supabase.from('batches').insert({
      department_id: newBatch.department_id,
      batch_name: batchName,
      year: yearLevel,
      semester: newBatch.semester,
      starting_roll: newBatch.starting_roll,
      student_count: newBatch.student_count,
      admission_session: newBatch.admission_session,
    });
    if (error) { toast.error(error.message); } else {
      toast.success(`Batch "${batchName}" created`);
      setCreateOpen(false);
      setNewBatch({ department_id: '', year: new Date().getFullYear(), semester: 1, starting_roll: 1, student_count: 50, admission_session: 'January' });
      fetchData();
    }
    setCreating(false);
  };

  const openEdit = (batch: any) => {
    setEditBatch(batch);
    setEditFields({ starting_roll: batch.starting_roll, student_count: batch.student_count ?? 0, admission_session: batch.admission_session || 'January' });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editBatch) return;
    const { error } = await supabase.from('batches').update({
      starting_roll: editFields.starting_roll,
      student_count: editFields.student_count,
      admission_session: editFields.admission_session,
    }).eq('id', editBatch.id);
    if (error) { toast.error(error.message); } else {
      toast.success('Batch updated');
      setEditOpen(false);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteBatch) return;
    const { error } = await supabase.from('batches').delete().eq('id', deleteBatch.id);
    if (error) { toast.error(error.message); } else {
      toast.success('Batch deleted');
      setDeleteOpen(false);
      fetchData();
    }
  };

  const openAdvance = async (batch: any) => {
    setAdvanceBatch(batch);
    setReEnrollOnAdvance(true);
    const nextSemester = batch.semester + 1;

    const { data: courses } = await supabase
      .from('courses')
      .select('id, code, name')
      .eq('semester_number', nextSemester)
      .eq('is_active', true)
      .or(`department_id.eq.${batch.department_id},is_non_departmental.eq.true`);
    setAdvanceCourses(courses ?? []);

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', batch.id);
    setAdvanceStudentCount(count ?? 0);

    setAdvanceOpen(true);
  };

  const handleAdvance = async () => {
    if (!advanceBatch) return;
    setAdvancing(true);
    const newSemester = advanceBatch.semester + 1;
    const newYear = Math.ceil(newSemester / 2);
    const deptCode = (advanceBatch.departments as any)?.code || '?';
    const session = advanceBatch.admission_session || 'January';
    const admissionYear = advanceBatch.batch_name.split('-')[1] || advanceBatch.year;
    const abbr = SESSION_ABBR[session] || 'Jan';
    const newName = `${deptCode}-${admissionYear}-${abbr}-Y${newYear}S${newSemester}`;

    const { error } = await supabase.from('batches').update({
      semester: newSemester,
      year: newYear,
      batch_name: newName,
    }).eq('id', advanceBatch.id);

    if (error) { toast.error(error.message); setAdvancing(false); return; }

    if (reEnrollOnAdvance && advanceCourses.length > 0) {
      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('batch_id', advanceBatch.id);

      if (students && students.length > 0) {
        const enrollments = students.flatMap((s: any) =>
          advanceCourses.map((c: any) => ({ student_id: s.id, course_id: c.id }))
        );

        const { error: enrollErr } = await supabase
          .from('enrollments')
          .upsert(enrollments, { onConflict: 'student_id,course_id', ignoreDuplicates: true });

        if (enrollErr) {
          toast.error(`Advanced but enrollment failed: ${enrollErr.message}`);
        } else {
          toast.success(`Advanced to ${newName} — ${students.length} students enrolled in ${advanceCourses.length} courses`);
        }
      } else {
        toast.success(`Advanced to ${newName}`);
      }
    } else {
      toast.success(`Advanced to ${newName}`);
    }

    setAdvancing(false);
    setAdvanceOpen(false);
    fetchData();
  };

  const handleGraduate = async () => {
    if (!graduateBatch) return;
    const { error } = await supabase.from('batches').update({ is_graduated: true }).eq('id', graduateBatch.id);
    if (error) { toast.error(error.message); } else {
      toast.success(`${getDisplayName(graduateBatch)} has been graduated 🎓`);
      setGraduateOpen(false);
      fetchData();
    }
  };

  const filtered = batches.filter(b => {
    if (filterDept !== 'all' && (b.departments as any)?.code !== filterDept) return false;
    if (filterSession !== 'all' && b.admission_session !== filterSession) return false;
    return true;
  });

  const grouped: Record<string, any[]> = {};
  filtered.forEach(b => {
    const key = (b.departments as any)?.code || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  });

  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      if (a.is_graduated !== b.is_graduated) return a.is_graduated ? 1 : -1;
      return a.semester - b.semester;
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground">{batches.length} batches across {departments.length} departments</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />New Batch
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.code}>{d.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSession} onValueChange={setFilterSession}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="January">January Session</SelectItem>
            <SelectItem value="July">July Session</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Batch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Department *</Label>
              <Select value={newBatch.department_id} onValueChange={v => setNewBatch(p => ({ ...p, department_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Admission Year</Label>
                <Input type="number" value={newBatch.year} onChange={e => setNewBatch(p => ({ ...p, year: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Admission Session</Label>
                <Select value={newBatch.admission_session} onValueChange={v => setNewBatch(p => ({ ...p, admission_session: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="January">January</SelectItem>
                    <SelectItem value="July">July</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Starting Semester</Label>
                <Select value={String(newBatch.semester)} onValueChange={v => setNewBatch(p => ({ ...p, semester: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Starting Roll</Label>
                <Input type="number" value={newBatch.starting_roll} onChange={e => setNewBatch(p => ({ ...p, starting_roll: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Student Count</Label>
              <Input type="number" value={newBatch.student_count} onChange={e => setNewBatch(p => ({ ...p, student_count: Number(e.target.value) }))} />
            </div>
            {newBatch.department_id && (
              <p className="text-sm text-muted-foreground">
                Batch name: <strong>{generateBatchName(newBatch.department_id, newBatch.year, newBatch.semester, newBatch.admission_session)}</strong>
              </p>
            )}
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Batch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editBatch?.batch_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Admission Session</Label>
              <Select value={editFields.admission_session} onValueChange={v => setEditFields(p => ({ ...p, admission_session: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="January">January</SelectItem>
                  <SelectItem value="July">July</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Starting Roll</Label>
              <Input type="number" value={editFields.starting_roll} onChange={e => setEditFields(p => ({ ...p, starting_roll: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Student Count</Label>
              <Input type="number" value={editFields.student_count} onChange={e => setEditFields(p => ({ ...p, student_count: Number(e.target.value) }))} />
            </div>
            <Button className="w-full" onClick={handleEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteBatch?.batch_name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this batch and may affect student assignments.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advance */}
      <AlertDialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance {advanceBatch ? getDisplayName(advanceBatch) : ''}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This will move the batch from <strong>Semester {advanceBatch?.semester}</strong> to <strong>Semester {(advanceBatch?.semester ?? 0) + 1}</strong>.
              </span>
              <span className="block text-sm">
                <strong>{advanceStudentCount}</strong> students will be affected.
              </span>
              {advanceCourses.length > 0 && (
                <span className="block">
                  <span className="text-sm font-medium block mb-1">New semester courses ({advanceCourses.length}):</span>
                  <span className="text-xs text-muted-foreground block">
                    {advanceCourses.map((c: any) => c.code).join(', ')}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="re-enroll"
                  checked={reEnrollOnAdvance}
                  onCheckedChange={(v) => setReEnrollOnAdvance(v === true)}
                />
                <label htmlFor="re-enroll" className="text-sm cursor-pointer">
                  Auto-enroll students in new semester courses
                </label>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance} disabled={advancing}>
              {advancing ? 'Advancing...' : 'Advance'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Graduate */}
      <AlertDialog open={graduateOpen} onOpenChange={setGraduateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Graduate {graduateBatch ? getDisplayName(graduateBatch) : ''}? 🎓</AlertDialogTitle>
            <AlertDialogDescription>
              This batch has completed all 8 semesters. Graduating will mark it as inactive and move it to the bottom of the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGraduate}>Graduate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Layers className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No batches found.</p></CardContent></Card>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dept, deptBatches]) => (
          <Card key={dept}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{dept} Department</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deptBatches.map(batch => {
                const isGraduated = batch.is_graduated;
                const admissionYear = getAdmissionYear(batch);
                const sessionAbbr = SESSION_ABBR[batch.admission_session] || 'Jan';
                return (
                  <div
                    key={batch.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-opacity ${
                      isGraduated
                        ? 'opacity-50 bg-muted/10'
                        : 'bg-muted/30 border-l-4 border-l-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{getDisplayName(batch)}</p>
                          {admissionYear && (
                            <span className="text-xs text-muted-foreground">({admissionYear})</span>
                          )}
                          <Badge variant="outline" className="text-xs">{sessionAbbr}</Badge>
                          {isGraduated && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <GraduationCap className="w-3 h-3" /> Graduated
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">Semester {batch.semester}</Badge>
                          <Badge variant="default" className="text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" />{batch.student_count ?? 0}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Roll: {batch.starting_roll}+</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!isGraduated && batch.semester < 8 && (
                        <Button variant="ghost" size="sm" onClick={() => openAdvance(batch)} title="Advance Semester">
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      )}
                      {!isGraduated && batch.semester === 8 && (
                        <Button variant="ghost" size="sm" onClick={() => { setGraduateBatch(batch); setGraduateOpen(true); }} title="Graduate" className="text-primary">
                          <GraduationCap className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(batch)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteBatch(batch); setDeleteOpen(true); }} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdminBatches;
