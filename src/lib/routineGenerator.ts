// Routine Generator - Load-balanced, gap-optimized timetable scheduling

export interface CourseInput {
  id: string;
  code: string;
  name: string;
  credits: number;
  course_type: string | null;
  contact_hours: number | null;
  teacher_id: string | null;
  teacher_name?: string;
}

export interface BatchInput {
  id: string;
  batch_name: string;
  student_count: number;
  semester: number;
}

export interface RoomInput {
  id: string;
  number: string;
  type: string;
  capacity: number;
}

export interface RoutineEntry {
  course_id: string;
  course_code: string;
  course_name: string;
  teacher_id: string;
  teacher_name: string;
  room_id: string;
  room_number: string;
  batch_id: string;
  batch_name: string;
  day_of_week: number;
  period_number: number;
  is_lab_continuation: boolean;
  lab_group: number | null;
  semester_number?: number;
}

export interface GeneratorResult {
  entries: RoutineEntry[];
  warnings: string[];
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
export const DAY_COUNT = 5;

export const PERIODS = [
  { number: 1, start: '09:40', end: '10:30' },
  { number: 2, start: '10:30', end: '11:20' },
  { number: 3, start: '11:20', end: '12:10' },
  { number: 4, start: '12:10', end: '01:00' },
  { number: 5, start: '02:00', end: '02:50' },
  { number: 6, start: '02:50', end: '03:40' },
  { number: 7, start: '03:40', end: '04:15' },
];

const MAX_CLASSES_PER_DAY = 3;

const VALID_LAB_PAIRS: [number, number][] = [
  [1, 2], [2, 3], [3, 4], [5, 6],
];

export function getLabGroupCount(studentCount: number): number {
  if (studentCount <= 40) return 1;
  return 2; // max 2 groups
}

// Occupancy tracker for hard conflicts
class OccupancyGrid {
  private occupied = new Set<string>();

  private key(type: string, id: string, day: number, period: number) {
    return `${type}:${id}:${day}:${period}`;
  }

  isOccupied(type: string, id: string, day: number, period: number): boolean {
    return this.occupied.has(this.key(type, id, day, period));
  }

  mark(type: string, id: string, day: number, period: number) {
    this.occupied.add(this.key(type, id, day, period));
  }

  getOccupiedPeriods(type: string, id: string, day: number): number[] {
    const result: number[] = [];
    for (let p = 1; p <= 7; p++) {
      if (this.isOccupied(type, id, day, p)) result.push(p);
    }
    return result;
  }
}

// Track how many classes each batch has per day
class DayLoadTracker {
  private load: Record<string, number[]> = {};

  private ensure(batchId: string) {
    if (!this.load[batchId]) this.load[batchId] = new Array(DAY_COUNT).fill(0);
  }

  get(batchId: string, day: number): number {
    this.ensure(batchId);
    return this.load[batchId][day];
  }

  increment(batchId: string, day: number, count = 1) {
    this.ensure(batchId);
    this.load[batchId][day] += count;
  }
}

interface CandidateSlot {
  day: number;
  period: number;
  roomId: string;
  roomNumber: string;
  score: number;
}

interface LabCandidateSlot {
  day: number;
  p1: number;
  p2: number;
  roomId: string;
  roomNumber: string;
  score: number;
}

function scoreTheorySlot(
  day: number,
  period: number,
  batchId: string,
  grid: OccupancyGrid,
  dayLoad: DayLoadTracker,
  usedDaysForCourse: Set<number>
): number {
  const load = dayLoad.get(batchId, day);
  let score = -load * 10; // strongly prefer less-loaded days

  // Clustering bonus: prefer days that already have classes (avoid single-class days)
  if (load === 0) {
    score -= 3; // penalize empty days to cluster classes together
  } else {
    score += 4; // bonus for days with existing classes
  }

  // Adjacency bonus: prefer slots next to existing classes (contiguous blocks)
  const occupiedPeriods = grid.getOccupiedPeriods('batch', batchId, day);
  const hasAdjacentBefore = occupiedPeriods.includes(period - 1);
  const hasAdjacentAfter = occupiedPeriods.includes(period + 1);

  if (occupiedPeriods.length > 0) {
    if (hasAdjacentBefore || hasAdjacentAfter) {
      score += 8; // adjacent to existing class - pack tightly
    } else {
      score -= 2; // gap between classes - penalize
    }
  }

  // Contiguous block extension bonus
  // If this period extends an existing consecutive run, give extra bonus
  if (occupiedPeriods.length > 0) {
    const sorted = [...occupiedPeriods].sort((a, b) => a - b);
    const minP = sorted[0];
    const maxP = sorted[sorted.length - 1];
    if (period === minP - 1 || period === maxP + 1) {
      score += 6; // extends the block
    }
  }

  // Spread bonus: prefer days this course isn't already on
  if (!usedDaysForCourse.has(day)) {
    score += 3;
  }

  // Soft cap penalty
  if (load >= MAX_CLASSES_PER_DAY) {
    score -= 20;
  }

  // Early-period preference: fill mornings first
  if (period <= 4) score += 3;       // morning slots
  else if (period === 7) score -= 2; // late afternoon penalty

  // Small random tiebreaker to avoid deterministic packing
  score += Math.random() * 0.5;

  return score;
}

function scoreLabSlot(
  day: number,
  p1: number,
  batchKey: string,
  batchId: string,
  grid: OccupancyGrid,
  dayLoad: DayLoadTracker
): number {
  const load = dayLoad.get(batchId, day);
  let score = -load * 10;

  // Clustering bonus: prefer days that already have classes
  if (load === 0) {
    score -= 3;
  } else {
    score += 4;
  }

  if (load >= MAX_CLASSES_PER_DAY - 1) {
    score -= 20; // labs take 2 slots, so penalize earlier
  }

  // Early-period bonus for labs
  if (p1 <= 2) score += 4;          // early morning lab start
  // no bonus for p1 === 5 (afternoon)

  // Adjacency bonus: prefer lab blocks next to existing classes
  const occupiedPeriods = grid.getOccupiedPeriods('batch', batchKey, day);
  const hasAdjacentBefore = occupiedPeriods.includes(p1 - 1);
  const p2 = p1 + 1;
  const hasAdjacentAfter = occupiedPeriods.includes(p2 + 1);
  if (hasAdjacentBefore || hasAdjacentAfter) score += 6;

  score += Math.random() * 0.5;
  return score;
}

export function generateRoutine(
  courses: CourseInput[],
  batches: BatchInput[],
  rooms: RoomInput[],
  existingEntries: RoutineEntry[] = []
): GeneratorResult {
  const entries: RoutineEntry[] = [];
  const warnings: string[] = [];
  const grid = new OccupancyGrid();
  const dayLoad = new DayLoadTracker();

  // Pre-populate from existing entries
  for (const e of existingEntries) {
    grid.mark('teacher', e.teacher_id, e.day_of_week, e.period_number);
    grid.mark('room', e.room_id, e.day_of_week, e.period_number);
    const batchKey = e.lab_group ? `${e.batch_id}_g${e.lab_group}` : e.batch_id;
    grid.mark('batch', batchKey, e.day_of_week, e.period_number);
    if (!e.is_lab_continuation) {
      dayLoad.increment(e.batch_id, e.day_of_week);
    }
  }

  const classRooms = rooms.filter(r => r.type === 'Class');
  const labRooms = rooms.filter(r => r.type === 'Lab');

  const schedulable = courses.filter(c =>
    c.course_type !== 'Viva' &&
    !/thesis|project/i.test(c.name) &&
    (c.contact_hours ?? 0) > 0 && c.teacher_id
  );

  // Sort: Labs first (harder to place), then by credits desc
  const sorted = [...schedulable].sort((a, b) => {
    const aIsLab = a.course_type === 'Lab' ? 0 : 1;
    const bIsLab = b.course_type === 'Lab' ? 0 : 1;
    if (aIsLab !== bIsLab) return aIsLab - bIsLab;
    return (b.credits ?? 0) - (a.credits ?? 0);
  });

  for (const course of sorted) {
    const isLab = course.course_type === 'Lab';
    const teacherId = course.teacher_id!;
    const teacherName = course.teacher_name ?? 'Unknown';

    for (const batch of batches) {
      if (isLab) {
        const groupCount = getLabGroupCount(batch.student_count);

        for (let g = 1; g <= groupCount; g++) {
          const batchKey = `${batch.id}_g${g}`;

          // Collect all candidate lab slots and score them
          const candidates: LabCandidateSlot[] = [];

          for (const [p1, p2] of VALID_LAB_PAIRS) {
            for (let day = 0; day < DAY_COUNT; day++) {
              if (grid.isOccupied('teacher', teacherId, day, p1) ||
                  grid.isOccupied('teacher', teacherId, day, p2)) continue;
              if (grid.isOccupied('batch', batchKey, day, p1) ||
                  grid.isOccupied('batch', batchKey, day, p2)) continue;
              if (grid.isOccupied('batch', batch.id, day, p1) ||
                  grid.isOccupied('batch', batch.id, day, p2)) continue;

              const room = labRooms.find(r =>
                !grid.isOccupied('room', r.id, day, p1) &&
                !grid.isOccupied('room', r.id, day, p2)
              );
              if (!room) continue;

              const score = scoreLabSlot(day, p1, batchKey, batch.id, grid, dayLoad);
              candidates.push({ day, p1, p2, roomId: room.id, roomNumber: room.number, score });
            }
          }

          // Pick best candidate
          candidates.sort((a, b) => b.score - a.score);
          const best = candidates[0];

          if (best) {
            for (const p of [best.p1, best.p2]) {
              grid.mark('teacher', teacherId, best.day, p);
              grid.mark('room', best.roomId, best.day, p);
              grid.mark('batch', batchKey, best.day, p);
              grid.mark('batch', batch.id, best.day, p);

              entries.push({
                course_id: course.id,
                course_code: course.code,
                course_name: course.name,
                teacher_id: teacherId,
                teacher_name: teacherName,
                room_id: best.roomId,
                room_number: best.roomNumber,
                batch_id: batch.id,
                batch_name: batch.batch_name,
                day_of_week: best.day,
                period_number: p,
                is_lab_continuation: p === best.p2,
                lab_group: g,
              });
            }
            dayLoad.increment(batch.id, best.day, 2);
          } else {
            warnings.push(`Could not place Lab "${course.code}" Group ${g} for ${batch.batch_name}`);
          }
        }
      } else {
        // Theory: credits = classes per week
        const contactHours = course.contact_hours ?? ((course.credits ?? 2) * 18);
        let classesNeeded = Math.max(1, Math.round(contactHours / 25));
        classesNeeded = Math.min(classesNeeded, course.credits ?? 2);
        let placedCount = 0;
        const usedDays = new Set<number>();

        for (let attempt = 0; attempt < classesNeeded; attempt++) {
          // Collect all candidate slots
          let candidates: CandidateSlot[] = [];

          for (let day = 0; day < DAY_COUNT; day++) {
            if (usedDays.has(day)) continue; // max 1 class per day per course

            for (let period = 1; period <= 7; period++) {
              if (grid.isOccupied('teacher', teacherId, day, period)) continue;
              if (grid.isOccupied('batch', batch.id, day, period)) continue;
              const _gc = getLabGroupCount(batch.student_count);
              let groupConflict = false;
              for (let _g = 1; _g <= _gc; _g++) {
                if (grid.isOccupied('batch', `${batch.id}_g${_g}`, day, period)) { groupConflict = true; break; }
              }
              if (groupConflict) continue;

              const room = classRooms.find(r =>
                !grid.isOccupied('room', r.id, day, period)
              );
              if (!room) continue;

              const score = scoreTheorySlot(day, period, batch.id, grid, dayLoad, usedDays);
              candidates.push({ day, period, roomId: room.id, roomNumber: room.number, score });
            }
          }

          // Fallback: if no candidates, retry without usedDays constraint
          if (candidates.length === 0) {
            for (let day = 0; day < DAY_COUNT; day++) {
              for (let period = 1; period <= 7; period++) {
                if (grid.isOccupied('teacher', teacherId, day, period)) continue;
                if (grid.isOccupied('batch', batch.id, day, period)) continue;
                const _gc2 = getLabGroupCount(batch.student_count);
                let groupConflict2 = false;
                for (let _g2 = 1; _g2 <= _gc2; _g2++) {
                  if (grid.isOccupied('batch', `${batch.id}_g${_g2}`, day, period)) { groupConflict2 = true; break; }
                }
                if (groupConflict2) continue;

                const room = classRooms.find(r =>
                  !grid.isOccupied('room', r.id, day, period)
                );
                if (!room) continue;

                const score = scoreTheorySlot(day, period, batch.id, grid, dayLoad, usedDays) - 5;
                candidates.push({ day, period, roomId: room.id, roomNumber: room.number, score });
              }
            }
          }

          candidates.sort((a, b) => b.score - a.score);
          const best = candidates[0];

          if (best) {
            grid.mark('teacher', teacherId, best.day, best.period);
            grid.mark('room', best.roomId, best.day, best.period);
            grid.mark('batch', batch.id, best.day, best.period);

            entries.push({
              course_id: course.id,
              course_code: course.code,
              course_name: course.name,
              teacher_id: teacherId,
              teacher_name: teacherName,
              room_id: best.roomId,
              room_number: best.roomNumber,
              batch_id: batch.id,
              batch_name: batch.batch_name,
              day_of_week: best.day,
              period_number: best.period,
              is_lab_continuation: false,
              lab_group: null,
            });

            usedDays.add(best.day);
            dayLoad.increment(batch.id, best.day);
            placedCount++;
          }
        }

        if (placedCount < classesNeeded) {
          warnings.push(`Could only place ${placedCount}/${classesNeeded} classes for "${course.code}" in ${batch.batch_name}`);
        }
      }
    }
  }

  return { entries, warnings };
}
