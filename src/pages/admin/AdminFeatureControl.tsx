import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const sections = [
  {
    title: 'Student Dashboard',
    description: 'Control which features students can see',
    items: [
      { key: 'vis_student_courses', label: 'My Courses' },
      { key: 'vis_student_attendance', label: 'Attendance' },
      { key: 'vis_student_schedule', label: 'Schedule' },
      { key: 'vis_student_exams', label: 'Exams' },
      { key: 'vis_student_results', label: 'Results' },
      { key: 'vis_student_assessments', label: 'Assessments' },
      { key: 'vis_student_notices', label: 'Notices' },
      { key: 'vis_student_requests', label: 'Requests' },
      { key: 'vis_student_final_results', label: 'Final Results' },
    ],
  },
  {
    title: 'Teacher Dashboard',
    description: 'Control which features teachers can see',
    items: [
      { key: 'vis_teacher_courses', label: 'My Courses' },
      { key: 'vis_teacher_attendance', label: 'Attendance' },
      { key: 'vis_teacher_schedule', label: 'Schedule' },
      { key: 'vis_teacher_assessments', label: 'Assessments' },
      { key: 'vis_teacher_notes', label: 'Notes' },
      { key: 'vis_teacher_requests', label: 'Requests' },
      { key: 'vis_teacher_results', label: 'Exam Results' },
    ],
  },
  {
    title: 'Admin Dashboard',
    description: 'Control which admin sections are visible',
    items: [
      { key: 'vis_admin_departments', label: 'Departments' },
      { key: 'vis_admin_teachers', label: 'Teachers' },
      { key: 'vis_admin_students', label: 'Students' },
      { key: 'vis_admin_batches', label: 'Batches' },
      { key: 'vis_admin_courses', label: 'Courses' },
      { key: 'vis_admin_rooms', label: 'Rooms' },
      { key: 'vis_admin_routine', label: 'Routine' },
      { key: 'vis_admin_notices', label: 'Notices' },
      { key: 'vis_admin_schedule', label: 'Schedule' },
      { key: 'vis_admin_exams', label: 'Exams' },
      { key: 'vis_admin_results', label: 'Results' },
      { key: 'vis_admin_settings', label: 'Settings' },
    ],
  },
];

const AdminFeatureControl = () => {
  const { role } = useAuth();
  useDocumentTitle('Feature Control');
  const { visibility, toggle, loading } = useFeatureVisibility();

  if (role !== 'manager' && role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feature Control</h1>
        <p className="text-muted-foreground">Enable or disable features across all dashboards for your demo presentation.</p>
      </div>

      {sections.map((section, idx) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.items.map((item, i) => (
              <div key={item.key}>
                <div className="flex items-center justify-between">
                  <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                    {item.label}
                  </Label>
                  <Switch
                    id={item.key}
                    checked={visibility[item.key] !== false}
                    onCheckedChange={(checked) => toggle(item.key, checked)}
                  />
                </div>
                {i < section.items.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminFeatureControl;
