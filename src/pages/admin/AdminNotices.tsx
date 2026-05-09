import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Pin, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Notice {
  id: string; title: string; content: string; notice_type: string; is_pinned: boolean; created_at: string;
}

const noticeTypeColors: Record<string, string> = { urgent: 'destructive', informational: 'default', fun: 'secondary' };
const PER_PAGE = 10;

const AdminNotices = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState({ title: '', content: '', notice_type: 'informational', is_pinned: false });

  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    setNotices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchNotices(); }, []);
  useEffect(() => { setPage(1); }, [typeFilter]);

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    if (editing) {
      const { error } = await supabase.from('notices').update({
        title: form.title, content: form.content, notice_type: form.notice_type as any, is_pinned: form.is_pinned,
      }).eq('id', editing.id);
      if (error) { toast.error('Failed to update notice'); return; }
      toast.success('Notice updated');
    } else {
      const { error } = await supabase.from('notices').insert({
        title: form.title, content: form.content, notice_type: form.notice_type as any, is_pinned: form.is_pinned, posted_by: user?.id,
      });
      if (error) { toast.error('Failed to post notice'); return; }
      toast.success('Notice posted');
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', content: '', notice_type: 'informational', is_pinned: false });
    fetchNotices();
  };

  const openEdit = (notice: Notice) => {
    setEditing(notice);
    setForm({ title: notice.title, content: notice.content, notice_type: notice.notice_type, is_pinned: notice.is_pinned });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', notice_type: 'informational', is_pinned: false });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notices').delete().eq('id', id);
    toast.success('Notice deleted');
    fetchNotices();
  };

  const filtered = notices.filter(n => typeFilter === 'all' || n.notice_type === typeFilter);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notice Board</h1>
          <p className="text-muted-foreground">Post announcements to students and teachers</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Post Notice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit Notice' : 'Post New Notice'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notice title..." />
              </div>
              <div className="space-y-1">
                <Label>Content</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write the notice..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.notice_type} onValueChange={v => setForm(f => ({ ...f, notice_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="informational">Informational</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="fun">Fun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Pin to top?</Label>
                  <Button type="button" variant={form.is_pinned ? 'default' : 'outline'} className="w-full" onClick={() => setForm(f => ({ ...f, is_pinned: !f.is_pinned }))}>
                    <Pin className="w-4 h-4 mr-2" />{form.is_pinned ? 'Pinned' : 'Not pinned'}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={handleSave}>{editing ? 'Update Notice' : 'Post Notice'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:max-w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="informational">Informational</SelectItem>
            <SelectItem value="fun">Fun</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && <p className="text-xs text-muted-foreground self-center">{filtered.length} notice(s)</p>}
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : paginated.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Bell className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">No notices found.</p>
          </CardContent></Card>
        ) : paginated.map(notice => (
          <Card key={notice.id} className={notice.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {notice.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                    <span className="font-semibold">{notice.title}</span>
                    <Badge variant={noticeTypeColors[notice.notice_type] as any} className="text-xs">{notice.notice_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{notice.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(notice.created_at), 'MMM d, yyyy • h:mm a')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(notice)}><Pencil className="w-3 h-3" /></Button>
                  <ConfirmDialog trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>} title="Delete Notice" description="This notice will be permanently removed." onConfirm={() => handleDelete(notice.id)} />
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

export default AdminNotices;
