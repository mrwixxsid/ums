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
import { DoorOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Room {
  id: string;
  number: string;
  type: string;
  capacity: number;
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

const AdminRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState({ number: '', type: 'Class', capacity: '60', department_id: '' });
  const [filterDept, setFilterDept] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const fetch = async () => {
    setLoading(true);
    const [roomsRes, deptsRes] = await Promise.all([
      supabase.from('rooms').select('*').order('number'),
      supabase.from('departments').select('*').order('name'),
    ]);
    setRooms(roomsRes.data ?? []);
    setDepartments(deptsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => { setForm({ number: '', type: 'Class', capacity: '60', department_id: '' }); setEditing(null); };

  const openEdit = (r: Room) => {
    setEditing(r);
    setForm({ number: r.number, type: r.type, capacity: String(r.capacity), department_id: r.department_id ?? '' });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.number) { toast.error('Room number is required'); return; }
    const payload = {
      number: form.number,
      type: form.type,
      capacity: parseInt(form.capacity) || 60,
      department_id: form.department_id || null,
    };
    if (editing) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Room updated');
    } else {
      const { error } = await supabase.from('rooms').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Room created');
    }
    setOpen(false); resetForm(); fetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('rooms').delete().eq('id', id);
    toast.success('Room deleted'); fetch();
  };

  const deptMap = Object.fromEntries(departments.map(d => [d.id, d]));
  const filtered = rooms.filter(r => {
    if (filterDept !== 'all' && r.department_id !== filterDept) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Room Management</h1>
          <p className="text-muted-foreground">Manage classrooms and labs</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Room</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Room' : 'New Room'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Room Number *</Label>
                  <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="C101" />
                </div>
                <div className="space-y-1">
                  <Label>Capacity</Label>
                  <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Class">Classroom</SelectItem>
                      <SelectItem value="Lab">Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select value={form.department_id || 'none'} onValueChange={v => setForm(f => ({ ...f, department_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Shared</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter dept" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Class">Classroom</SelectItem>
            <SelectItem value="Lab">Lab</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <p className="text-muted-foreground text-sm col-span-full">Loading...</p> :
          filtered.length === 0 ? (
            <Card className="col-span-full"><CardContent className="py-12 text-center">
              <DoorOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No rooms found.</p>
            </CardContent></Card>
          ) : filtered.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{r.number}</span>
                      <Badge variant={r.type === 'Lab' ? 'default' : 'outline'} className="text-xs">{r.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Capacity: {r.capacity}</p>
                    {r.department_id && deptMap[r.department_id] && (
                      <p className="text-xs text-muted-foreground">{deptMap[r.department_id].name}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3 h-3" /></Button>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>}
                      title="Delete Room"
                      description="This room will be permanently removed."
                      onConfirm={() => handleDelete(r.id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
};

export default AdminRooms;
