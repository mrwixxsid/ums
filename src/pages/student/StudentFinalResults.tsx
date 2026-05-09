import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Award, TrendingUp, BookOpen } from 'lucide-react';
import { GRADE_POINTS, GRADE_COLORS, gradePoint } from '@/lib/gradeScale';
import type { Grade } from '@/lib/gradeScale';

interface ResultRow {
  course_code: string;
  course_name: string;
  credits: number;
  grade: string;
  grade_point: number;
  semester_number: number;
}

export default function StudentFinalResults() {
  useDocumentTitle('Final Results');
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  const { data: rawResults = [], isLoading } = useQuery({
    queryKey: ['student-final-results', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          grade,
          is_published,
          exam_id,
          exam_schedules!inner (
            exam_type,
            course_id,
            courses!inner (
              code,
              name,
              credits,
              semester_number
            )
          )
        `)
        .eq('student_id', user.id)
        .eq('is_published', true)
        .eq('exam_schedules.exam_type', 'final');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const results: ResultRow[] = useMemo(() => {
    return rawResults.map((r: any) => {
      const course = r.exam_schedules?.courses;
      const credits = course?.credits ?? 0;
      const grade = r.grade ?? 'F';
      return {
        course_code: course?.code ?? '',
        course_name: course?.name ?? '',
        credits,
        grade,
        grade_point: gradePoint(grade, credits),
        semester_number: course?.semester_number ?? 0,
      };
    });
  }, [rawResults]);

  const availableSemesters = useMemo(() => {
    const sems = new Set(results.map((r) => r.semester_number).filter((s) => s > 0));
    return Array.from(sems).sort((a, b) => a - b);
  }, [results]);

  // Auto-select first available semester
  const activeSemesterNumber = useMemo(() => {
    if (selectedYear && selectedSemester) {
      return (parseInt(selectedYear) - 1) * 2 + parseInt(selectedSemester);
    }
    return availableSemesters[0] ?? 0;
  }, [selectedYear, selectedSemester, availableSemesters]);

  const semesterResults = useMemo(
    () => results.filter((r) => r.semester_number === activeSemesterNumber),
    [results, activeSemesterNumber]
  );

  const semesterStats = useMemo(() => {
    const totalCredits = semesterResults.reduce((s, r) => s + r.credits, 0);
    const earnedCredits = semesterResults.filter((r) => r.grade !== 'F').reduce((s, r) => s + r.credits, 0);
    const totalGradePoints = semesterResults.reduce((s, r) => s + r.grade_point, 0);
    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
    return { totalCredits, earnedCredits, totalGradePoints, gpa };
  }, [semesterResults]);

  // Per-semester GPA for CGPA calculation
  const semesterGPAs = useMemo(() => {
    const map: Record<number, { totalCredits: number; totalGP: number }> = {};
    results.forEach((r) => {
      if (!map[r.semester_number]) map[r.semester_number] = { totalCredits: 0, totalGP: 0 };
      map[r.semester_number].totalCredits += r.credits;
      map[r.semester_number].totalGP += r.grade_point;
    });
    return Object.entries(map)
      .map(([sem, v]) => ({
        semester: parseInt(sem),
        gpa: v.totalCredits > 0 ? v.totalGP / v.totalCredits : 0,
        totalCredits: v.totalCredits,
        totalGP: v.totalGP,
      }))
      .sort((a, b) => a.semester - b.semester);
  }, [results]);

  const cgpa = useMemo(() => {
    const totalCredits = semesterGPAs.reduce((s, g) => s + g.totalCredits, 0);
    const totalGP = semesterGPAs.reduce((s, g) => s + g.totalGP, 0);
    return totalCredits > 0 ? totalGP / totalCredits : 0;
  }, [semesterGPAs]);

  const getCgpaGradeColor = (gpa: number): string => {
    if (gpa >= 3.75) return GRADE_COLORS['A+'];
    if (gpa >= 3.50) return GRADE_COLORS['A'];
    if (gpa >= 3.25) return GRADE_COLORS['A-'];
    if (gpa >= 3.00) return GRADE_COLORS['B+'];
    if (gpa >= 2.75) return GRADE_COLORS['B'];
    if (gpa >= 2.50) return GRADE_COLORS['B-'];
    if (gpa >= 2.25) return GRADE_COLORS['C+'];
    if (gpa >= 2.00) return GRADE_COLORS['C'];
    if (gpa >= 1.00) return GRADE_COLORS['D'];
    return GRADE_COLORS['F'];
  };

  const semLabel = (sem: number) => {
    const y = Math.ceil(sem / 2);
    const s = sem % 2 === 0 ? 2 : 1;
    return `Y${y}-S${s}`;
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Final Results
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Semester-wise results with GPA & CGPA</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Semester Selector */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); if (!selectedSemester) setSelectedSemester('1'); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((y) => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Semester</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeSemesterNumber > 0 && (
              <Badge variant="secondary" className="h-8 px-3 text-xs">
                Semester {activeSemesterNumber}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result Table */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {activeSemesterNumber > 0
              ? `Semester ${activeSemesterNumber} Results`
              : 'Select a Semester'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading results…</p>
          ) : semesterResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No final results published for this semester.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Course Code</TableHead>
                    <TableHead className="font-semibold">Course Name</TableHead>
                    <TableHead className="text-center font-semibold">Credit</TableHead>
                    <TableHead className="text-center font-semibold">Grade</TableHead>
                    <TableHead className="text-right font-semibold">Grade Point</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semesterResults.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{r.course_code}</TableCell>
                      <TableCell>{r.course_name}</TableCell>
                      <TableCell className="text-center">{r.credits.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${GRADE_COLORS[r.grade as Grade] || ''}`}>
                          {r.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{(GRADE_POINTS[r.grade as Grade] ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={2} className="text-sm">
                      Total Credit: <span className="font-semibold">{semesterStats.totalCredits.toFixed(2)}</span>
                      <span className="mx-3 text-muted-foreground">|</span>
                      Earned Credit: <span className="font-semibold">{semesterStats.earnedCredits.toFixed(2)}</span>
                    </TableCell>
                    <TableCell colSpan={3} className="text-right text-sm">
                      GPA: <span className="font-bold text-primary text-base">{semesterStats.gpa.toFixed(2)}</span>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CGPA Summary */}
      {semesterGPAs.length > 0 && (
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cumulative GPA (CGPA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall CGPA */}
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-foreground">{cgpa.toFixed(2)}</div>
              <Badge className={`text-sm px-3 py-1 ${getCgpaGradeColor(cgpa)}`}>
                CGPA
              </Badge>
            </div>

            {/* Semester-wise breakdown */}
            <div className="flex flex-wrap gap-2">
              {semesterGPAs.map((sg) => (
                <div
                  key={sg.semester}
                  className={`flex flex-col items-center rounded-lg border px-3 py-2 text-xs ${
                    sg.semester === activeSemesterNumber
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <span className="text-muted-foreground font-medium">{semLabel(sg.semester)}</span>
                  <span className="text-sm font-bold text-foreground">{sg.gpa.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
