import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Trash2, Pencil } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

const AdminDepartments = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '' });

  const fetchDepartments = async () => {
    setLoading(true);
    const { data } = await supabase.from('departments').select('*').order('code');
    setDepartments(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    if (editing) {
      const { error } = await supabase.from('departments').update({ name: form.name, code: form.code.toUpperCase() }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Department updated');
    } else {
      const { error } = await supabase.from('departments').insert({ name: form.name, code: form.code.toUpperCase() });
      if (error) { toast.error(error.message); return; }
      toast.success('Department created');
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', code: '' });
    fetchDepartments();
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Department deleted');
    fetchDepartments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground">Manage academic departments</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditing(null); setForm({ name: '', code: '' }); } }}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Department</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Department' : 'Create Department'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Department Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Computer Science & Engineering" /></div>
              <div className="space-y-1"><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CSE" /></div>
              <Button className="w-full" onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : departments.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No departments yet.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map(dept => (
            <Card key={dept.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{dept.code}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(dept)}><Pencil className="w-3 h-3" /></Button>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>}
                      title="Delete Department"
                      description="All related batches, courses, and routines may be affected."
                      onConfirm={() => handleDelete(dept.id)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{dept.name}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDepartments;
