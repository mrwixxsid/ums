import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, BookOpen, CheckCircle2, Users, Download, ChevronDown, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { GRADE_COLORS, type Grade } from '@/lib/gradeScale';
import { exportToCSV } from '@/lib/exportCSV';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ExamGroup {
  exam_id: string; exam_title: string; exam_type: string; total_marks: number; results: any[];
  allPublished: boolean; draftCount: number; enrolled_count: number;
}

interface CourseGroup {
  course_id: string; course_name: string; course_code: string; exams: ExamGroup[];
}

const PER_PAGE = 10;

const AdminResults = () => {
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [resultsRes, enrollRes] = await Promise.all([
      supabase.from('exam_results').select('*, exam_schedules(id, title, total_marks, exam_type, course_id, courses(id, name, code)), profiles:student_id(full_name, email)').order('entered_at', { ascending: false }),
      supabase.from('enrollments').select('course_id, student_id'),
    ]);
    const results = resultsRes.data ?? [];
    const enrollments = enrollRes.data ?? [];
    const enrollByCourse: Record<string, number> = {};
    enrollments.forEach((e: any) => { enrollByCourse[e.course_id] = (enrollByCourse[e.course_id] || 0) + 1; });

    const courseMap = new Map<string, CourseGroup>();
    for (const r of results) {
      const exam = r.exam_schedules as any;
      if (!exam?.courses) continue;
      const courseId = exam.courses.id;
      const examId = r.exam_id;
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, { course_id: courseId, course_name: exam.courses.name, course_code: exam.courses.code, exams: [] });
      }
      const course = courseMap.get(courseId)!;
      let examGroup = course.exams.find(e => e.exam_id === examId);
      if (!examGroup) {
        examGroup = { exam_id: examId, exam_title: exam.title, exam_type: exam.exam_type, total_marks: exam.total_marks ?? 100, results: [], allPublished: true, draftCount: 0, enrolled_count: enrollByCourse[courseId] || 0 };
        course.exams.push(examGroup);
      }
      examGroup.results.push(r);
      if (!r.is_published) { examGroup.allPublished = false; examGroup.draftCount++; }
    }
    setCourseGroups(Array.from(courseMap.values()));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPage(1); }, [courseFilter, statusFilter]);

  const publishExam = async (examId: string) => {
    const { error } = await supabase.from('exam_results').update({ is_published: true }).eq('exam_id', examId).eq('is_published', false);
    if (error) { toast.error(error.message); return; }
    toast.success('Results published');
    fetchData();
  };

  const publishCourse = async (courseGroup: CourseGroup) => {
    const examIds = courseGroup.exams.map(e => e.exam_id);
    const { error } = await supabase.from('exam_results').update({ is_published: true }).in('exam_id', examIds).eq('is_published', false);
    if (error) { toast.error(error.message); return; }
    toast.success(`All results published for ${courseGroup.course_name}`);
    fetchData();
  };

  const deleteResult = async (resultId: string) => {
    const { error } = await supabase.from('exam_results').delete().eq('id', resultId);
    if (error) { toast.error(error.message); return; }
    toast.success('Result deleted');
    fetchData();
  };

  const deleteExamResults = async (examId: string) => {
    const { error } = await supabase.from('exam_results').delete().eq('exam_id', examId);
    if (error) { toast.error(error.message); return; }
    toast.success('All results for this exam deleted');
    fetchData();
  };

  const toggleExam = (examId: string) => {
    setExpandedExams(prev => {
      const next = new Set(prev);
      next.has(examId) ? next.delete(examId) : next.add(examId);
      return next;
    });
  };

  const getGradeDistribution = (results: any[]) => {
    const dist: Record<string, number> = {};
    results.forEach(r => { if (r.grade) dist[r.grade] = (dist[r.grade] || 0) + 1; });
    return dist;
  };

  const filtered = courseGroups.filter(cg => {
    if (courseFilter !== 'all' && cg.course_id !== courseFilter) return false;
    if (statusFilter === 'published' && !cg.exams.every(e => e.allPublished)) return false;
    if (statusFilter === 'pending' && cg.exams.every(e => e.allPublished)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-muted-foreground">Review and publish exam results by course</p>
        </div>
        {courseGroups.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => {
            const rows: any[] = [];
            courseGroups.forEach(cg => { cg.exams.forEach(ex => { ex.results.forEach((r: any) => { rows.push({ course: cg.course_code, exam: ex.exam_title, type: ex.exam_type, student: (r.profiles as any)?.full_name || '', marks: r.marks_obtained ?? '', total: ex.total_marks, grade: r.grade || '', published: r.is_published ? 'Yes' : 'No' }); }); }); });
            exportToCSV(rows, 'results', [{ key: 'course', label: 'Course' }, { key: 'exam', label: 'Exam' }, { key: 'type', label: 'Type' }, { key: 'student', label: 'Student' }, { key: 'marks', label: 'Marks' }, { key: 'total', label: 'Total' }, { key: 'grade', label: 'Grade' }, { key: 'published', label: 'Published' }]);
            toast.success('Results exported');
          }}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="sm:max-w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courseGroups.map(cg => <SelectItem key={cg.course_id} value={cg.course_id}>{cg.course_code} – {cg.course_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : paginated.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No results found.</p>
        </CardContent></Card>
      ) : (
        <>
          {paginated.map(course => {
            const allCoursePublished = course.exams.every(e => e.allPublished);
            const totalDrafts = course.exams.reduce((sum, e) => sum + e.draftCount, 0);
            return (
              <Card key={course.course_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-base">{course.course_name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{course.course_code}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {allCoursePublished ? (
                        <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />All Published</Badge>
                      ) : (
                        <>
                          <Badge variant="secondary">{totalDrafts} pending</Badge>
                          <Button size="sm" variant="outline" onClick={() => publishCourse(course)}>Publish All</Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.exams.map(exam => {
                    const dist = getGradeDistribution(exam.results);
                    const isExpanded = expandedExams.has(exam.exam_id);
                    return (
                      <div key={exam.exam_id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExam(exam.exam_id)}>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{exam.exam_title}</p>
                                <Badge variant="secondary" className="text-xs capitalize">{exam.exam_type}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Users className="w-3 h-3" />
                                {exam.results.length}/{exam.enrolled_count} graded • {exam.total_marks} marks
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {exam.allPublished ? (
                              <Badge variant="default" className="gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Published</Badge>
                            ) : (
                              <>
                                <Badge variant="secondary" className="text-xs">{exam.draftCount} draft</Badge>
                                <Button size="sm" onClick={() => publishExam(exam.exam_id)}>Publish</Button>
                              </>
                            )}
                            <ConfirmDialog
                              trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>}
                              title="Delete All Results"
                              description={`This will permanently delete all ${exam.results.length} result(s) for "${exam.exam_title}".`}
                              confirmLabel="Delete All"
                              onConfirm={() => deleteExamResults(exam.exam_id)}
                            />
                          </div>
                        </div>

                        {Object.keys(dist).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(dist).sort().map(([grade, count]) => (
                              <span key={grade} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${GRADE_COLORS[grade as Grade] || 'bg-muted text-muted-foreground'}`}>
                                {grade}: {count}
                              </span>
                            ))}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="divide-y">
                            {exam.results.map((r: any) => (
                              <div key={r.id} className="flex items-center justify-between py-2">
                                <div>
                                  <p className="text-sm font-medium">{(r.profiles as any)?.full_name || (r.profiles as any)?.email}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Marks: {r.marks_obtained ?? '–'}/{exam.total_marks}
                                    {r.marks_obtained != null && ` (${Math.round((r.marks_obtained / exam.total_marks) * 100)}%)`}
                                    {r.grade && ` • ${r.grade}`}
                                    {r.remarks && ` • ${r.remarks}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={r.is_published ? 'default' : 'secondary'} className="text-xs">
                                    {r.is_published ? 'Published' : 'Draft'}
                                  </Badge>
                                  <ConfirmDialog
                                    trigger={<Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>}
                                    title="Delete Result"
                                    description={`Delete result for ${(r.profiles as any)?.full_name || 'this student'}?`}
                                    onConfirm={() => deleteResult(r.id)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} courses</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminResults;
