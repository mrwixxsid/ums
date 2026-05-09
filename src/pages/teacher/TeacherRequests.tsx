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
import { CheckCircle, XCircle, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const statusIcons: Record<string, any> = {
  pending: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const statusColors: Record<string, string> = {
  pending: 'secondary', approved: 'default', rejected: 'destructive',
};

const TeacherRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [comment, setComment] = useState('');

  const fetchRequests = async () => {
    setLoading(true);

    const { data: requestRows, error: requestsError } = await supabase
      .from('requests')
      .select('*, courses(name, code)')
      .order('created_at', { ascending: false });

    if (requestsError) {
      toast.error('Failed to load requests');
      setRequests([]);
      setLoading(false);
      return;
    }

    const studentIds = Array.from(
      new Set((requestRows ?? []).map((r: any) => r.student_id).filter(Boolean))
    );

    let profilesById: Record<string, { full_name: string; email: string }> = {};

    if (studentIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (profilesError) {
        toast.error('Failed to load student profiles');
      } else {
        profilesById = (profileRows ?? []).reduce((acc: Record<string, { full_name: string; email: string }>, p: any) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {});
      }
    }

    const merged = (requestRows ?? []).map((r: any) => ({
      ...r,
      profiles: profilesById[r.student_id] ?? null,
    }));

    setRequests(merged);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedReq || !user) return;
    const { error } = await supabase.from('requests').update({
      status,
      teacher_comment: comment,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selectedReq.id);
    if (error) { toast.error('Failed to update request'); return; }
    toast.success(`Request ${status}`);
    setReviewOpen(false);
    setComment('');
    setSelectedReq(null);
    fetchRequests();
  };

  const openReview = (req: any) => {
    setSelectedReq(req);
    setComment('');
    setReviewOpen(true);
  };

  const pending = requests.filter(r => r.status === 'pending');
  const reviewed = requests.filter(r => r.status !== 'pending');

  const RequestCard = ({ req }: { req: any }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{req.title}</span>
              <Badge variant={statusColors[req.status] as any} className="text-xs flex items-center gap-1">
                {statusIcons[req.status]} {req.status}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">{req.request_type.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From: <strong>{req.profiles?.full_name || req.profiles?.email}</strong> • {req.courses?.name}
            </p>
            {req.preset_reason && <p className="text-sm mt-2 italic">"{req.preset_reason}"</p>}
            {req.custom_reason && <p className="text-sm mt-1 text-muted-foreground">{req.custom_reason}</p>}
            
            {req.teacher_comment && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <span className="font-medium">Your comment:</span> {req.teacher_comment}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">{format(new Date(req.created_at), 'MMM d, yyyy')}</p>
          </div>
          {req.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => openReview(req)}>
              <MessageCircle className="w-3 h-3 mr-1" /> Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Requests</h1>
        <p className="text-muted-foreground">Review and respond to student requests</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3 mt-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : pending.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No pending requests. All caught up!</p>
            </CardContent></Card>
          ) : pending.map(req => <RequestCard key={req.id} req={req} />)}
        </TabsContent>
        <TabsContent value="reviewed" className="space-y-3 mt-4">
          {reviewed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviewed requests yet.</p>
          ) : reviewed.map(req => <RequestCard key={req.id} req={req} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Request</DialogTitle></DialogHeader>
          {selectedReq && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{selectedReq.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedReq.profiles?.full_name} • {selectedReq.courses?.name}
                </p>
                {selectedReq.preset_reason && <p className="text-sm mt-2 italic">"{selectedReq.preset_reason}"</p>}
                {selectedReq.custom_reason && <p className="text-sm mt-1">{selectedReq.custom_reason}</p>}
              </div>
              <div className="space-y-1">
                <Label>Your Comment (optional)</Label>
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Leave a comment for the student..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleReview('approved')} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button onClick={() => handleReview('rejected')} variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherRequests;
