import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, BookOpen, FileBarChart, Lock, Save, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureLock } from '@/hooks/useFeatureLock';
import { GRADES, GRADE_COLORS, gradeFromPercentage, marksFromGrade, type Grade } from '@/lib/gradeScale';

interface CourseWithExams {
  course_id: string;
  course_name: string;
  course_code: string;
  exams: {
    id: string;
    title: string;
    exam_type: string;
    total_marks: number;
    graded_count: number;
    enrolled_count: number;
  }[];
}

interface StudentGrade {
  student_id: string;
  full_name: string;
  student_roll: string | null;
  marks: string;
  grade: string;
  remarks: string;
}

const TeacherResults = () => {
  const { user } = useAuth();
  const { locked } = useFeatureLock('lock_results');
  const [view, setView] = useState<'courses' | 'grading'>('courses');
  const [courses, setCourses] = useState<CourseWithExams[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Grading view state
  const [selectedExam, setSelectedExam] = useState<{ id: string; title: string; total_marks: number; course_name: string } | null>(null);
  const [students, setStudents] = useState<StudentGrade[]>([]);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get teacher's courses (exclude Viva)
    const { data: tc } = await supabase
      .from('teacher_courses')
      .select('course_id, courses(id, name, code, course_type)')
      .eq('teacher_id', user.id);

    const teacherCourses = (tc ?? [])
      .map((t: any) => t.courses)
      .filter((c: any) => c && c.course_type !== 'Viva');

    if (teacherCourses.length === 0) {
      setCourses([]);
      setLoading(false);
      return;
    }

    const courseIds = teacherCourses.map((c: any) => c.id);

    // Fetch exams and enrollment counts and result counts in parallel
    // Fetch exams first, then use their IDs for results
    const [examsRes, enrollRes] = await Promise.all([
      supabase.from('exam_schedules').select('id, title, exam_type, total_marks, course_id').in('course_id', courseIds),
      supabase.from('enrollments').select('course_id, student_id').in('course_id', courseIds),
    ]);
    const examIds = (examsRes.data ?? []).map((e: any) => e.id);
    const resultsRes = examIds.length > 0
      ? await supabase.from('exam_results').select('exam_id').in('exam_id', examIds)
      : { data: [] };

    const exams = examsRes.data ?? [];
    const enrollments = enrollRes.data ?? [];
    const results = resultsRes.data ?? [];

    // Count enrollments per course
    const enrollCountByCourse: Record<string, number> = {};
    enrollments.forEach((e: any) => {
      enrollCountByCourse[e.course_id] = (enrollCountByCourse[e.course_id] || 0) + 1;
    });

    // Count results per exam
    const resultCountByExam: Record<string, number> = {};
    results.forEach((r: any) => {
      resultCountByExam[r.exam_id] = (resultCountByExam[r.exam_id] || 0) + 1;
    });

    // Build course cards
    const courseList: CourseWithExams[] = teacherCourses.map((c: any) => ({
      course_id: c.id,
      course_name: c.name,
      course_code: c.code,
      exams: exams
        .filter((e: any) => e.course_id === c.id)
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          exam_type: e.exam_type,
          total_marks: e.total_marks ?? 100,
          graded_count: resultCountByExam[e.id] || 0,
          enrolled_count: enrollCountByCourse[c.id] || 0,
        })),
    }));

    setCourses(courseList);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const openGradingSheet = async (exam: { id: string; title: string; total_marks: number }, courseName: string) => {
    if (locked) { toast.error('Results entry is currently locked'); return; }
    setSelectedExam({ ...exam, course_name: courseName });
    setView('grading');

    // Get the course_id for this exam
    const { data: examData } = await supabase.from('exam_schedules').select('course_id').eq('id', exam.id).single();
    if (!examData) return;

    // Fetch enrolled students and existing results
    const [enrollRes, resultsRes] = await Promise.all([
      supabase.from('enrollments')
        .select('student_id, profiles:student_id(id, full_name, student_id)')
        .eq('course_id', examData.course_id),
      supabase.from('exam_results')
        .select('student_id, marks_obtained, grade, remarks')
        .eq('exam_id', exam.id),
    ]);

    const enrolled = (enrollRes.data ?? []).map((e: any) => e.profiles).filter(Boolean);
    const existingResults = new Map((resultsRes.data ?? []).map((r: any) => [r.student_id, r]));

    setStudents(enrolled.map((s: any) => {
      const existing = existingResults.get(s.id);
      return {
        student_id: s.id,
        full_name: s.full_name || 'Unknown',
        student_roll: s.student_id,
        marks: existing?.marks_obtained?.toString() ?? '',
        grade: existing?.grade ?? '',
        remarks: existing?.remarks ?? '',
      };
    }).sort((a, b) => (a.student_roll ?? '').localeCompare(b.student_roll ?? '')));
  };

  const updateStudent = (studentId: string, field: keyof StudentGrade, value: string) => {
    setStudents(prev => prev.map(s => {
      if (s.student_id !== studentId) return s;
      const updated = { ...s, [field]: value };

      // Auto-calculate: typing marks → auto-grade
      if (field === 'marks' && selectedExam) {
        const marks = parseFloat(value);
        if (!isNaN(marks) && marks >= 0) {
          const pct = (marks / selectedExam.total_marks) * 100;
          updated.grade = gradeFromPercentage(pct);
        } else {
          updated.grade = '';
        }
      }

      // Auto-calculate: picking grade → auto-marks
      if (field === 'grade' && selectedExam) {
        updated.marks = marksFromGrade(value, selectedExam.total_marks).toString();
      }

      return updated;
    }));
  };

  const setAllGrade = (grade: string) => {
    if (!selectedExam) return;
    setStudents(prev => prev.map(s => ({
      ...s,
      grade,
      marks: marksFromGrade(grade, selectedExam.total_marks).toString(),
    })));
  };

  const clearAll = () => {
    setStudents(prev => prev.map(s => ({ ...s, marks: '', grade: '', remarks: '' })));
  };

  const saveAll = async () => {
    if (!selectedExam || !user) return;
    const entries = students
      .filter(s => s.marks !== '' || s.grade !== '')
      .map(s => ({
        exam_id: selectedExam.id,
        student_id: s.student_id,
        marks_obtained: s.marks ? parseFloat(s.marks) : null,
        grade: s.grade || null,
        remarks: s.remarks || null,
        is_published: false,
        entered_by: user.id,
      }));

    if (entries.length === 0) { toast.error('Enter marks for at least one student'); return; }

    setSaving(true);
    const { error } = await supabase.from('exam_results').upsert(entries, { onConflict: 'exam_id,student_id' });
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    toast.success(`Saved ${entries.length} results (pending admin review)`);
  };

  const goBack = () => {
    setView('courses');
    setSelectedExam(null);
    setStudents([]);
    fetchCourses();
  };

  // ---------- RENDER ----------

  if (view === 'grading' && selectedExam) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          <div>
            <h1 className="text-xl font-bold">{selectedExam.course_name} — {selectedExam.title}</h1>
            <p className="text-sm text-muted-foreground">Total: {selectedExam.total_marks} marks • {students.length} students</p>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Set all:</span>
          {GRADES.slice(0, 5).map(g => (
            <Button key={g} variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setAllGrade(g)}>{g}</Button>
          ))}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearAll}><Trash2 className="w-3 h-3" />Clear All</Button>
        </div>

        {/* Grading table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Roll</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-24">Marks</TableHead>
                  <TableHead className="w-[340px]">Grade</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.student_id}>
                    <TableCell className="font-mono text-xs">{s.student_roll || '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{s.full_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-20 text-sm"
                        placeholder="0"
                        min={0}
                        max={selectedExam.total_marks}
                        value={s.marks}
                        onChange={e => updateStudent(s.student_id, 'marks', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {GRADES.map(g => (
                          <button
                            key={g}
                            onClick={() => updateStudent(s.student_id, 'grade', g)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                              s.grade === g
                                ? GRADE_COLORS[g] + ' ring-2 ring-offset-1 ring-primary/40'
                                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        placeholder="Optional..."
                        value={s.remarks}
                        onChange={e => updateStudent(s.student_id, 'remarks', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No students enrolled in this course.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={saveAll} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save All Results'}
          </Button>
        </div>
      </div>
    );
  }

  // ---------- COURSES VIEW ----------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exam Results</h1>
          <p className="text-muted-foreground">Select a course and exam to grade students</p>
        </div>
        {locked && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Locked
          </Badge>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading courses...</p>
      ) : courses.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileBarChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No courses assigned or no exams scheduled.</p>
        </CardContent></Card>
      ) : (
        courses.map(course => (
          <Card key={course.course_id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">{course.course_name}</CardTitle>
                <Badge variant="outline" className="text-xs">{course.course_code}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {course.exams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exams scheduled for this course.</p>
              ) : (
                <div className="space-y-2">
                  {course.exams.map(exam => (
                    <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{exam.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs capitalize">{exam.exam_type}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {exam.graded_count}/{exam.enrolled_count} graded
                            </span>
                            <span className="text-xs text-muted-foreground">{exam.total_marks} marks</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={locked}
                        onClick={() => openGradingSheet(exam, course.course_name)}
                      >
                        Grade Students
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default TeacherResults;
