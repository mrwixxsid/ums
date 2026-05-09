import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { faculties } from '@/lib/universityData';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const DepartmentsPage = () => {
  useDocumentTitle('Departments | Gono Bishwabidyalay');
  return (
  <div>
    {/* Banner */}
    <section className="navy-gradient py-16 text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto mb-3 h-px w-16 bg-gold" />
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">Departments</h1>
        <p className="text-primary-foreground/70">Organized by faculty, Gono Bishwabidyalay offers a wide range of academic programs.</p>
      </div>
    </section>

    <div className="container mx-auto px-4 py-14">
      <div className="space-y-12">
        {faculties.map((f, fi) => (
          <section
            key={f.name}
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${fi * 100}ms`, animationFillMode: 'forwards' }}
          >
            <h2 className="mb-5 text-xl font-semibold text-foreground flex items-center gap-3">
              <span className="inline-block h-8 w-1 rounded-full bg-gold" />
              {f.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {f.departments.map((d) => (
                <Card
                  key={d.code}
                  className="transition-all duration-300 hover:shadow-lg hover:border-gold/30 overflow-hidden border-l-[3px] border-l-gold/60 group"
                >
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg gold-gradient shadow-sm">
                      <BookOpen className="h-5 w-5 text-gold-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm group-hover:text-gold transition-colors">{d.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{d.code}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Department of {d.name}, Gono Bishwabidyalay</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {fi < faculties.length - 1 && (
              <div className="mt-10 flex items-center gap-4">
                <div className="h-px flex-1 bg-gold/10" />
                <div className="h-2 w-2 rounded-full bg-gold/30" />
                <div className="h-px flex-1 bg-gold/10" />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  </div>
  );
};

export default DepartmentsPage;
