import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SendHorizontal, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const statusColors: Record<string, string> = { pending: 'secondary', approved: 'default', rejected: 'destructive' };

const StudentRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ request_type: 'class_reschedule', course_id: '', title: '', description: '', custom_reason: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [reqRes, coursesRes] = await Promise.all([
      supabase.from('requests').select('*, courses(name, code)').eq('student_id', user.id).order('created_at', { ascending: false }),
      supabase.from('enrollments').select('courses(id, name, code)').eq('student_id', user.id),
    ]);
    setRequests(reqRes.data ?? []);
    setCourses((coursesRes.data ?? []).map((e: any) => e.courses).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async () => {
    if (!form.course_id || !form.title) { toast.error('Course and title are required'); return; }
    const { error } = await supabase.from('requests').insert({
      student_id: user?.id,
      course_id: form.course_id,
      request_type: form.request_type as any,
      title: form.title,
      description: form.description || null,
      custom_reason: form.custom_reason || null,
    });
    if (error) { toast.error('Failed to submit request'); return; }
    toast.success('Request submitted!');
    setOpen(false);
    setForm({ request_type: 'class_reschedule', course_id: '', title: '', description: '', custom_reason: '' });
    fetchData();
  };

  const pending = requests.filter(r => r.status === 'pending');
  const reviewed = requests.filter(r => r.status !== 'pending');

  const ReqCard = ({ req }: { req: any }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{req.title}</span>
              <Badge variant={statusColors[req.status] as any} className="text-xs">{req.status}</Badge>
              <Badge variant="outline" className="text-xs capitalize">{req.request_type.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{req.courses?.name}</p>
            {req.custom_reason && <p className="text-sm text-muted-foreground mt-1">{req.custom_reason}</p>}
            {req.teacher_comment && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <span className="font-medium">Teacher:</span> {req.teacher_comment}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">{format(new Date(req.created_at), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Request Center</h1>
          <p className="text-muted-foreground">Submit requests to your teachers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><SendHorizontal className="w-4 h-4 mr-2" />New Request</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Submit a Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Request Type</Label>
                  <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class_reschedule">Class Reschedule</SelectItem>
                      <SelectItem value="exam_reschedule">Exam Reschedule</SelectItem>
                      <SelectItem value="extra_class">Extra Class</SelectItem>
                      <SelectItem value="bonus_points">Bonus Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Course</Label>
                  <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Title / Subject</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Request for reschedule of..." />
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Textarea value={form.custom_reason} onChange={e => setForm(f => ({ ...f, custom_reason: e.target.value }))} rows={3} placeholder="Please provide the reason for your request..." />
              </div>
              <div className="space-y-1">
                <Label>Additional Details (optional)</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Any additional information..." />
              </div>
              <Button className="w-full" onClick={handleSubmit}>Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3 mt-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : pending.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No pending requests.</p>
            </CardContent></Card>
          ) : pending.map(req => <ReqCard key={req.id} req={req} />)}
        </TabsContent>
        <TabsContent value="reviewed" className="space-y-3 mt-4">
          {reviewed.length === 0 ? <p className="text-sm text-muted-foreground">No reviewed requests yet.</p> : reviewed.map(req => <ReqCard key={req.id} req={req} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentRequests;
