import { Link } from 'react-router-dom';
import { GraduationCap, MapPin, Phone, Mail, ArrowUp } from 'lucide-react';

const PublicFooter = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="relative border-t border-border navy-gradient text-primary-foreground">
      <div className="container mx-auto grid gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-3">
        {/* Brand */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-gold" />
            <span className="text-lg font-bold">Gono Bishwabidyalay</span>
          </div>
          <p className="text-sm opacity-70 leading-relaxed">
            A University with a Difference. Established in 1998, committed to quality education and nation building.
          </p>
          <div className="mt-4 h-px w-16 bg-gold/50" />
        </div>

        {/* Quick links */}
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold">Quick Links</h4>
          <ul className="space-y-2.5 text-sm opacity-80">
            {[
              { label: 'Departments', path: '/departments' },
              { label: 'Faculty Directory', path: '/faculty' },
              { label: 'Notices', path: '/notices-public' },
              { label: 'Exam Schedule', path: '/exam-schedule' },
              { label: 'Leadership', path: '/leadership' },
              { label: 'Student Portal', path: '/login' },
            ].map((l) => (
              <li key={l.path}>
                <Link to={l.path} className="transition-colors hover:text-gold">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold">Contact</h4>
          <ul className="space-y-3 text-sm opacity-80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
              Nolam, Mirzanagar, Savar, Dhaka-1344, Bangladesh
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-gold/70" />
              +880-2-7745600
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-gold/70" />
              info@gonouniversity.edu.bd
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs opacity-50">
        &copy; {new Date().getFullYear()} Gono Bishwabidyalay. All rights reserved.
      </div>

      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className="absolute right-6 top-0 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full gold-gradient text-gold-foreground shadow-lg transition-transform hover:scale-110"
        aria-label="Back to top"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </footer>
  );
};

export default PublicFooter;
