import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Quote } from 'lucide-react';
import { leaders } from '@/lib/universityData';
import useDocumentTitle from '@/hooks/useDocumentTitle';

const LeadershipPage = () => {
  useDocumentTitle('Leadership | Gono Bishwabidyalay');
  return (
  <div>
    {/* Banner */}
    <section className="navy-gradient py-16 text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto mb-3 h-px w-16 bg-gold" />
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">University Leadership</h1>
        <p className="text-primary-foreground/70">Meet the leaders guiding Gono Bishwabidyalay towards academic excellence.</p>
      </div>
    </section>

    <div className="container mx-auto px-4 py-14">
      <div className="space-y-8">
        {leaders.map((l, i) => (
          <Card
            key={l.title}
            className="relative overflow-hidden border-0 shadow-md opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'forwards' }}
          >
            {/* Gold top bar */}
            <div className="h-1 bg-gold" />

            {/* Decorative quote watermark */}
            <div className="absolute top-6 right-6 text-gold/5">
              <Quote className="h-32 w-32" />
            </div>

            <CardHeader className="flex flex-col items-center gap-4 pb-4 sm:flex-row sm:items-start relative">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-gold/30 bg-gold/10">
                <Users className="h-10 w-10 text-gold" />
              </div>
              <div className="text-center sm:text-left">
                <CardTitle className="text-lg">{l.name}</CardTitle>
                <p className="text-sm font-medium text-gold">{l.title}</p>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="border-l-2 border-gold/30 pl-5">
                <p className="leading-relaxed text-muted-foreground">{l.message}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
  );
};

export default LeadershipPage;
