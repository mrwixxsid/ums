export const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_SCALE: { grade: Grade; min: number; max: number }[] = [
  { grade: 'A+', min: 80, max: 100 },
  { grade: 'A',  min: 75, max: 79 },
  { grade: 'A-', min: 70, max: 74 },
  { grade: 'B+', min: 65, max: 69 },
  { grade: 'B',  min: 60, max: 64 },
  { grade: 'B-', min: 55, max: 59 },
  { grade: 'C+', min: 50, max: 54 },
  { grade: 'C',  min: 45, max: 49 },
  { grade: 'D',  min: 40, max: 44 },
  { grade: 'F',  min: 0,  max: 39 },
];

export const GRADE_COLORS: Record<Grade, string> = {
  'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
  'A':  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'A-': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  'B+': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  'B':  'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  'B-': 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  'C+': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  'C':  'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  'D':  'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  'F':  'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
};

/** Convert percentage (0-100) to grade */
export function gradeFromPercentage(pct: number): Grade {
  for (const entry of GRADE_SCALE) {
    if (pct >= entry.min) return entry.grade;
  }
  return 'F';
}

/** Get midpoint marks for a given grade and total marks */
export function marksFromGrade(grade: string, totalMarks: number): number {
  const entry = GRADE_SCALE.find(e => e.grade === grade);
  if (!entry) return 0;
  const midPct = (entry.min + entry.max) / 2;
  return Math.round((midPct / 100) * totalMarks);
}

/** Grade point values for GPA/CGPA calculation */
export const GRADE_POINTS: Record<Grade, number> = {
  'A+': 4.00,
  'A':  3.75,
  'A-': 3.50,
  'B+': 3.25,
  'B':  3.00,
  'B-': 2.75,
  'C+': 2.50,
  'C':  2.25,
  'D':  2.00,
  'F':  0.00,
};

/** Calculate grade point for a course: grade point value × credits */
export function gradePoint(grade: string, credits: number): number {
  const point = GRADE_POINTS[grade as Grade];
  if (point === undefined) return 0;
  return point * credits;
}

/** Get percentage from marks */
export function percentageFromMarks(marks: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((marks / total) * 100);
}
