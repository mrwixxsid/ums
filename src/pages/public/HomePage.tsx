import { useEffect, useState, useRef } from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Bell, ChevronRight, Users, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { stats, faculties, leaders } from '@/lib/universityData';

interface Notice {
  id: string;
  title: string;
  notice_type: string | null;
  created_at: string;
}

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = Math.max(1, Math.floor(target / 60));
          const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
          }, 20);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref} className="text-3xl font-bold md:text-4xl text-primary-foreground">{count.toLocaleString()}+</div>;
}

const HomePage = () => {
  useDocumentTitle('Home | Gono Bishwabidyalay');
  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ['public-notices-home'],
    queryFn: async () => {
      const { data } = await supabase.from('notices').select('id, title, notice_type, created_at').order('created_at', { ascending: false }).limit(6);
      return data ?? [];
    },
  });

  const noticeBadgeClass = (type: string | null) => {
    if (type === 'urgent') return 'bg-destructive text-destructive-foreground';
    if (type === 'fun') return 'bg-gold text-gold-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary px-4 py-0">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border border-gold/20" />
          <div className="absolute -left-10 bottom-10 h-60 w-60 rounded-full border border-gold/10" />
          <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-gold/5" />
          <div className="absolute left-1/3 bottom-1/4 h-2 w-32 bg-gold/20 rotate-45" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(45_93%_47%/0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(222_60%_22%/0.5),transparent_50%)]" />
        </div>

        <div className="container relative mx-auto flex min-h-[85vh] flex-col items-center justify-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            Established 1998
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
            Gono Bishwabidyalay
          </h1>
          <div className="mx-auto mb-3 h-1 w-24 rounded-full bg-gold" />
          <p className="mb-2 text-lg font-medium text-primary-foreground/90 md:text-xl tracking-wide">
            A University with a Difference
          </p>
          <p className="mb-10 max-w-md text-sm text-primary-foreground/60">
            Nolam, Mirzanagar, Savar, Dhaka-1344, Bangladesh
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="gold-gradient text-gold-foreground border-0 shadow-lg hover:opacity-90 px-8" asChild>
              <Link to="/departments">Explore Departments</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 glass" asChild>
              <Link to="/login">Student Portal <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="mx-auto mb-6 h-px w-16 bg-gold" />
          <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">Welcome to Gono Bishwabidyalay</h2>
          <p className="text-muted-foreground leading-relaxed text-base border-l-2 border-gold/40 pl-6 text-left md:text-center md:border-0 md:pl-0">
            Founded in 1998, Gono Bishwabidyalay is dedicated to providing accessible, high-quality education across science, engineering, health sciences, arts, and social sciences. Our vibrant campus fosters innovation, critical thinking, and community service.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="navy-gradient py-16">
        <div className="container mx-auto grid grid-cols-2 gap-8 px-4 text-center md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="glass rounded-xl p-6 flex flex-col items-center gap-3 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl gold-gradient shadow-md">
                <s.icon className="h-7 w-7 text-gold-foreground" />
              </div>
              <AnimatedCounter target={s.value} />
              <p className="text-sm text-primary-foreground/70">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership Messages */}
      <section className="section-warm py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-3 h-px w-16 bg-gold" />
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Messages from Leadership</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {leaders.map((l, i) => (
              <Card
                key={l.title}
                className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'forwards' }}
              >
                <div className="absolute top-4 right-4 text-gold/10">
                  <Quote className="h-16 w-16" />
                </div>
                <div className="h-1 bg-gold" />
                <CardHeader className="pb-3 text-center relative">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/30 bg-gold/10">
                    <Users className="h-8 w-8 text-gold" />
                  </div>
                  <CardTitle className="text-base">{l.name}</CardTitle>
                  <p className="text-sm font-medium text-gold">{l.title}</p>
                </CardHeader>
                <CardContent className="relative">
                  <Button variant="link" asChild className="p-0 text-gold hover:text-gold/80">
                    <Link to="/leadership">Read Message <ChevronRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Faculties */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-3 h-px w-16 bg-gold" />
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Our Faculties</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {faculties.map((f, i) => (
              <Card
                key={f.name}
                className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-gold/30 group border-0 shadow-sm opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
              >
                <div className="h-1 bg-gold" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base group-hover:text-gold transition-colors">{f.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {f.departments.length > 0 ? (
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {f.departments.map((d) => (
                        <li key={d.code ?? d.name} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                          {d.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Programs offered under this faculty</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10" asChild>
              <Link to="/departments">View All Departments <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Recent Notices */}
      <section className="section-warm py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-3 h-px w-16 bg-gold" />
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Recent Notices</h2>
          </div>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>
              ))}
            </div>
          ) : notices.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gold/20 hidden md:block" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notices.map((n, i) => (
                  <Card
                    key={n.id}
                    className="border-l-4 border-l-gold/60 shadow-sm hover:shadow-md transition-all duration-300 opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold leading-snug">{n.title}</CardTitle>
                        <Badge className={`shrink-0 text-[10px] ${noticeBadgeClass(n.notice_type)}`}>
                          {n.notice_type ?? 'general'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(n.created_at), 'dd MMM yyyy')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Bell className="h-10 w-10" />
              <p className="text-sm">No recent notices available.</p>
            </div>
          )}
          <div className="mt-10 text-center">
            <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10" asChild>
              <Link to="/notices-public">View All Notices <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
