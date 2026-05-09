import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TEACHER_DESIGNATIONS } from '@/lib/constants';
import { ENABLE_MANAGER_ROLE } from '@/lib/featureFlags';

const ProfilePage = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', designation: '' });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, batches(batch_name, semester, departments:department_id(name, code))')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        setBatch((data as any).batches);
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          designation: data.designation || '',
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
    };
    if (role === 'teacher' || role === 'super_admin') {
      updates.designation = form.designation.trim() || null;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', user!.id);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      setProfile((p: any) => ({ ...p, ...updates }));
    }
    setSaving(false);
  };

  const initials = profile?.full_name?.slice(0, 2).toUpperCase() || 'U';
  const roleBadge = role === 'super_admin' ? 'Super Admin' : role === 'teacher' ? 'Teacher' : (ENABLE_MANAGER_ROLE && role === 'manager') ? 'Manager' : 'Student';

  if (loading) return <div className="p-6 text-muted-foreground">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Update your personal information</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{profile?.full_name || 'User'}</CardTitle>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex gap-2 mt-1">
                <Badge>{roleBadge}</Badge>
                {profile?.department && <Badge variant="outline">{profile.department}</Badge>}
                {profile?.student_id && <Badge variant="secondary">Roll: {profile.student_id}</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Info Card (read-only) */}
      {(batch || profile?.student_id) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {batch && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch</span>
                  <span className="font-medium">{batch.batch_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semester</span>
                  <span className="font-medium">{batch.semester}</span>
                </div>
                {batch.departments && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{batch.departments.name} ({batch.departments.code})</span>
                  </div>
                )}
              </>
            )}
            {profile?.student_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Roll Number</span>
                <span className="font-medium">{profile.student_id}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Edit Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+880-1XX-XXXXXXX"
            />
          </div>
          {(role === 'teacher' || role === 'super_admin') && (
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Select value={form.designation} onValueChange={v => setForm(f => ({ ...f, designation: v }))}>
                <SelectTrigger><SelectValue placeholder="Select designation..." /></SelectTrigger>
                <SelectContent>
                  {TEACHER_DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
