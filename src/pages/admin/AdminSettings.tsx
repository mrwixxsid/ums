import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, CalendarDays, Plus, Pencil, Trash2, CheckCircle, Lock } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Setting { id: string; key: string; value: string | null; }
interface AcademicSemester {
  id: string; name: string; start_date: string;
  mid_exam_start: string | null; mid_exam_end: string | null;
  final_exam_start: string | null; final_exam_end: string | null;
  result_publish_date: string | null; next_semester_start: string | null;
  is_active: boolean;
}

const emptyForm = {
  name: '', start_date: '', mid_exam_start: '', mid_exam_end: '',
  final_exam_start: '', final_exam_end: '', result_publish_date: '', next_semester_start: '',
};

const LOCK_KEYS = [
  { key: 'lock_routine', label: 'Lock Routine', desc: 'Prevent routine generation and changes' },
  { key: 'lock_results', label: 'Lock Results', desc: 'Prevent result entry and publishing' },
  { key: 'lock_attendance', label: 'Lock Attendance', desc: 'Prevent attendance marking' },
  { key: 'lock_assessments', label: 'Lock Assessments', desc: 'Prevent assessment entry' },
];

const AdminSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [semOpen, setSemOpen] = useState(false);
  const [editingSem, setEditingSem] = useState<AcademicSemester | null>(null);
  const [semForm, setSemForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    const [settingsRes, semRes] = await Promise.all([
      supabase.from('settings').select('*').order('key'),
      supabase.from('academic_semesters').select('*').order('start_date', { ascending: false }),
    ]);
    setSettings(settingsRes.data ?? []);
    setValues(Object.fromEntries((settingsRes.data ?? []).map(s => [s.key, s.value ?? ''])));
    setSemesters(semRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    for (const setting of settings) {
      if (!setting.key.startsWith('lock_') && !setting.key.startsWith('vis_')) {
        await supabase.from('settings').update({ value: values[setting.key] }).eq('id', setting.id);
      }
    }
    toast.success('Settings saved');
    setSaving(false);
  };

  const handleToggleLock = async (key: string, checked: boolean) => {
    const newValue = checked ? 'true' : 'false';
    setValues(v => ({ ...v, [key]: newValue }));
    const setting = settings.find(s => s.key === key);
    if (setting) {
      await supabase.from('settings').update({ value: newValue }).eq('id', setting.id);
      toast.success(`${key.replace('lock_', '').replace(/^\w/, c => c.toUpperCase())} ${checked ? 'locked' : 'unlocked'}`);
    }
  };

  const resetSemForm = () => { setSemForm(emptyForm); setEditingSem(null); };

  const openEditSem = (s: AcademicSemester) => {
    setEditingSem(s);
    setSemForm({
      name: s.name, start_date: s.start_date,
      mid_exam_start: s.mid_exam_start ?? '', mid_exam_end: s.mid_exam_end ?? '',
      final_exam_start: s.final_exam_start ?? '', final_exam_end: s.final_exam_end ?? '',
      result_publish_date: s.result_publish_date ?? '', next_semester_start: s.next_semester_start ?? '',
    });
    setSemOpen(true);
  };

  const handleSaveSem = async () => {
    if (!semForm.name || !semForm.start_date) { toast.error('Name and start date required'); return; }
    const payload: any = {
      name: semForm.name, start_date: semForm.start_date,
      mid_exam_start: semForm.mid_exam_start || null, mid_exam_end: semForm.mid_exam_end || null,
      final_exam_start: semForm.final_exam_start || null, final_exam_end: semForm.final_exam_end || null,
      result_publish_date: semForm.result_publish_date || null, next_semester_start: semForm.next_semester_start || null,
    };
    if (editingSem) {
      const { error } = await supabase.from('academic_semesters').update(payload).eq('id', editingSem.id);
      if (error) { toast.error('Failed to update'); return; }
    } else {
      const { error } = await supabase.from('academic_semesters').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingSem ? 'Semester updated' : 'Semester created');
    setSemOpen(false); resetSemForm(); fetchAll();
  };

  const handleDeleteSem = async (id: string) => {
    await supabase.from('academic_semesters').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const handleSetActive = async (id: string) => {
    await supabase.from('academic_semesters').update({ is_active: false }).neq('id', '');
    await supabase.from('academic_semesters').update({ is_active: true }).eq('id', id);
    toast.success('Active semester updated'); fetchAll();
  };

  const labelMap: Record<string, string> = {
    portal_name: 'Portal Name', current_semester: 'Current Semester', academic_year: 'Academic Year',
  };

  const portalSettings = settings.filter(s => !s.key.startsWith('lock_') && !s.key.startsWith('vis_'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global Settings</h1>
        <p className="text-muted-foreground">Configure portal-wide settings, feature locks, and academic calendar</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Portal settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" /> Portal Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : portalSettings.map(setting => (
              <div key={setting.id} className="space-y-1">
                <Label htmlFor={setting.key}>{labelMap[setting.key] ?? setting.key}</Label>
                <Input id={setting.key} value={values[setting.key] ?? ''} onChange={e => setValues(v => ({ ...v, [setting.key]: e.target.value }))} />
              </div>
            ))}
            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Feature Locks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" /> Feature Locks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : LOCK_KEYS.map(lock => (
              <div key={lock.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{lock.label}</p>
                  <p className="text-xs text-muted-foreground">{lock.desc}</p>
                </div>
                <Switch
                  checked={values[lock.key] === 'true'}
                  onCheckedChange={(checked) => handleToggleLock(lock.key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Academic Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Academic Calendar
              </CardTitle>
              <Dialog open={semOpen} onOpenChange={v => { setSemOpen(v); if (!v) resetSemForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Semester</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{editingSem ? 'Edit Semester' : 'New Semester'}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1"><Label>Semester Name *</Label><Input value={semForm.name} onChange={e => setSemForm(f => ({ ...f, name: e.target.value }))} placeholder="Spring 2026" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Start Date *</Label><Input type="date" value={semForm.start_date} onChange={e => setSemForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Mid Exam Start</Label><Input type="date" value={semForm.mid_exam_start} onChange={e => setSemForm(f => ({ ...f, mid_exam_start: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Mid Exam End</Label><Input type="date" value={semForm.mid_exam_end} onChange={e => setSemForm(f => ({ ...f, mid_exam_end: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Final Exam Start</Label><Input type="date" value={semForm.final_exam_start} onChange={e => setSemForm(f => ({ ...f, final_exam_start: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Final Exam End</Label><Input type="date" value={semForm.final_exam_end} onChange={e => setSemForm(f => ({ ...f, final_exam_end: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Result Date</Label><Input type="date" value={semForm.result_publish_date} onChange={e => setSemForm(f => ({ ...f, result_publish_date: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1"><Label>Next Semester Start</Label><Input type="date" value={semForm.next_semester_start} onChange={e => setSemForm(f => ({ ...f, next_semester_start: e.target.value }))} /></div>
                    <Button className="w-full" onClick={handleSaveSem}>{editingSem ? 'Update' : 'Create'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-muted-foreground text-sm">Loading...</p> :
              semesters.length === 0 ? <p className="text-muted-foreground text-sm">No semesters configured.</p> :
              semesters.map(s => (
                <div key={s.id} className={`p-3 rounded-lg border ${s.is_active ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{s.name}</span>
                      {s.is_active && <Badge className="text-[10px]">Active</Badge>}
                    </div>
                    <div className="flex gap-1">
                      {!s.is_active && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSetActive(s.id)} title="Set active">
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSem(s)}><Pencil className="w-3 h-3" /></Button>
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>}
                        title="Delete Semester"
                        description="This academic semester and its calendar will be removed."
                        onConfirm={() => handleDeleteSem(s.id)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
                    <span>Start: {s.start_date}</span>
                    {s.mid_exam_start && <span>Mid: {s.mid_exam_start} – {s.mid_exam_end}</span>}
                    {s.final_exam_start && <span>Final: {s.final_exam_start} – {s.final_exam_end}</span>}
                    {s.result_publish_date && <span>Results: {s.result_publish_date}</span>}
                    {s.next_semester_start && <span>Next: {s.next_semester_start}</span>}
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
