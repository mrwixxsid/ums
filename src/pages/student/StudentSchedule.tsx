import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';
import { DAYS, PERIODS } from '@/lib/routineGenerator';

const StudentSchedule = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSchedule = async () => {
      const { data: profile } = await supabase.from('profiles').select('batch_id').eq('id', user.id).single();
      if (!profile?.batch_id) { setLoading(false); return; }

      const { data } = await supabase
        .from('routines')
        .select('*, courses(name, code), profiles:teacher_id(full_name), rooms(number), batches(batch_name)')
        .eq('batch_id', profile.batch_id);
      setEntries(data ?? []);
      setLoading(false);
    };
    fetchSchedule();
  }, [user]);

  const getCell = (day: number, period: number) =>
    entries.filter((e) => e.day_of_week === day && e.period_number === period);

  if (loading) return <p className="text-sm text-muted-foreground p-6">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Class Schedule</h1>
        <p className="text-muted-foreground">Your weekly timetable</p>
      </div>
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No schedule found. Contact admin.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Weekly Timetable
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-left">Period</th>
                  {DAYS.map((d) => (
                    <th key={d} className="border p-2 bg-muted text-center min-w-[120px]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p.number}>
                    <td className="border p-2 bg-muted/50 whitespace-nowrap font-medium">
                      P{p.number}<br />
                      <span className="text-muted-foreground">{p.start}-{p.end}</span>
                    </td>
                    {DAYS.map((_, dayIdx) => {
                      const cells = getCell(dayIdx, p.number);
                      return (
                        <td key={dayIdx} className="border p-1 align-top">
                          {cells.length === 0 ? (
                            <span className="text-muted-foreground/30">—</span>
                          ) : (
                            cells.map((c: any, i: number) => {
                              const isLab = c.lab_group !== null || c.is_lab_continuation;
                              return (
                                <div key={i} className={`rounded p-1.5 mb-1 ${isLab ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700' : 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'}`}>
                                  <div className="font-semibold">{c.courses?.code}</div>
                                  <div className="text-muted-foreground">{c.profiles?.full_name}</div>
                                  <div className="flex gap-1 mt-0.5 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">{c.rooms?.number}</Badge>
                                    {c.lab_group && <Badge variant="secondary" className="text-[10px] px-1 py-0">G{c.lab_group}</Badge>}
                                    {c.is_lab_continuation && <Badge className="text-[10px] px-1 py-0 bg-emerald-500">Lab P2</Badge>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentSchedule;
