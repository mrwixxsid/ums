import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Trash2, Upload, FileText, Download, Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import ConfirmDialog from '@/components/ConfirmDialog';

const TeacherNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', course_id: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [notesRes, coursesRes] = await Promise.all([
      supabase.from('notes').select('*, courses(name, code)').eq('teacher_id', user.id).order('created_at', { ascending: false }),
      supabase.from('teacher_courses').select('courses(id, name, code)').eq('teacher_id', user.id),
    ]);
    setNotes(notesRes.data ?? []);
    setCourses((coursesRes.data ?? []).map((tc: any) => tc.courses).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSave = async () => {
    if (!form.title || !form.course_id) { toast.error('Title and course are required'); return; }
    
    setUploading(true);
    let fileUrl: string | null = editing?.file_url || null;

    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('note-files').upload(path, selectedFile);
      if (uploadErr) { toast.error('File upload failed: ' + uploadErr.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from('note-files').getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }

    if (editing) {
      const { error } = await supabase.from('notes').update({
        title: form.title, content: form.content || null, course_id: form.course_id, file_url: fileUrl,
      }).eq('id', editing.id);
      if (error) { toast.error('Failed to update note'); setUploading(false); return; }
      toast.success('Note updated');
    } else {
      const { error } = await supabase.from('notes').insert({
        title: form.title, content: form.content || null, course_id: form.course_id, teacher_id: user?.id, file_url: fileUrl,
      });
      if (error) { toast.error('Failed to post note'); setUploading(false); return; }
      toast.success('Note posted');
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', content: '', course_id: '' });
    setSelectedFile(null);
    setUploading(false);
    fetchData();
  };

  const openEdit = (note: any) => {
    setEditing(note);
    setForm({ title: note.title, content: note.content || '', course_id: note.course_id });
    setSelectedFile(null);
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', course_id: '' });
    setSelectedFile(null);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    toast.success('Note deleted');
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notes & Announcements</h1>
          <p className="text-muted-foreground">Post course notes and upload files for students</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setSelectedFile(null); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Post Note</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit Note' : 'Post New Note'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Course</Label>
                <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Week 5 Notes" />
              </div>
              <div className="space-y-1">
                <Label>Content</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Note content..." />
              </div>
              <div className="space-y-1">
                <Label>Attachment (PDF, DOC, etc.)</Label>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3 h-3 mr-1" /> {editing?.file_url ? 'Replace File' : 'Choose File'}
                  </Button>
                  {selectedFile && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{selectedFile.name}</span>}
                  {!selectedFile && editing?.file_url && <span className="text-xs text-muted-foreground">Current file attached</span>}
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={uploading}>
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : editing ? 'Update Note' : 'Post Note'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : notes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No notes posted yet.</p>
          </CardContent></Card>
        ) : notes.map((note: any) => (
          <Card key={note.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{note.title}</span>
                    <Badge variant="outline" className="text-xs">{note.courses?.code}</Badge>
                    {note.file_url && (
                      <a href={note.file_url} target="_blank" rel="noopener noreferrer">
                        <Badge variant="secondary" className="text-xs cursor-pointer gap-1">
                          <FileText className="w-3 h-3" /> Attachment
                          <Download className="w-3 h-3" />
                        </Badge>
                      </a>
                    )}
                  </div>
                  {note.content && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{note.content}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(note.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(note)}><Pencil className="w-3 h-3" /></Button>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>}
                    title="Delete Note"
                    description="This note and any attached file will be permanently removed."
                    onConfirm={() => handleDelete(note.id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TeacherNotes;
