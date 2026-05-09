import { GraduationCap, Users, BookOpen, Building2 } from 'lucide-react';

export const stats = [
  { icon: GraduationCap, label: 'Undergraduate Students', value: 4200 },
  { icon: Users, label: 'Graduate Students', value: 500 },
  { icon: BookOpen, label: 'Faculty Members', value: 180 },
  { icon: Building2, label: 'Office Staff', value: 120 },
];

export const faculties = [
  {
    name: 'Faculty of Science and Engineering',
    color: 'hsl(221 83% 28%)',
    departments: [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Electrical & Electronic Engineering', code: 'EEE' },
      { name: 'Chemistry', code: 'CHEM' },
      { name: 'Physics', code: 'PHY' },
      { name: 'Applied Mathematics', code: 'MATH' },
      { name: 'Medical Physics & Biomedical Engineering', code: 'MPBME' },
    ],
  },
  {
    name: 'Faculty of Health Sciences',
    color: 'hsl(142 72% 29%)',
    departments: [
      { name: 'Pharmacy', code: 'PHAR' },
      { name: 'Microbiology', code: 'MICRO' },
      { name: 'Biochemistry & Molecular Biology', code: 'BMB' },
    ],
  },
  {
    name: 'Faculty of Arts and Social Sciences',
    color: 'hsl(38 92% 50%)',
    departments: [
      { name: 'Bangla', code: 'BNG' },
      { name: 'English', code: 'ENG' },
      { name: 'Politics & Governance', code: 'POL' },
      { name: 'Sociology & Social Work', code: 'SOC' },
      { name: 'Law', code: 'LAW' },
      { name: 'Business Administration', code: 'BBA' },
    ],
  },
  {
    name: 'Faculty of Veterinary and Animal Sciences',
    color: 'hsl(199 89% 48%)',
    departments: [{ name: 'Veterinary and Animal Sciences', code: 'VAS' }],
  },
  {
    name: 'Faculty of Agriculture',
    color: 'hsl(142 50% 40%)',
    departments: [{ name: 'Agriculture', code: 'AGR' }],
  },
];

export const leaders = [
  {
    title: 'Vice Chancellor',
    name: 'Professor Dr. Md. Abul Hossain',
    color: 'hsl(221 83% 28%)',
    message:
      'Gono Bishwabidyalay was established with the vision of providing quality education to all segments of society. As Vice Chancellor, I am committed to nurturing an academic environment that fosters innovation, critical thinking, and social responsibility. Our university continues to grow as a center of excellence in higher education, research, and community service. I invite students, faculty, and stakeholders to join us in building a brighter future for our nation.',
  },
  {
    title: 'Treasurer',
    name: 'Prof. Md. Serajul Islam',
    color: 'hsl(142 72% 29%)',
    message:
      'As Treasurer, I oversee the financial health and sustainability of Gono Bishwabidyalay. We are dedicated to ensuring that resources are allocated efficiently to support academic programs, infrastructure development, and student welfare. Transparency and accountability remain at the core of our financial governance, enabling the university to fulfill its mission of accessible quality education.',
  },
  {
    title: 'Registrar',
    name: 'Engr. Md. Ohiduzzaman',
    color: 'hsl(38 92% 50%)',
    message:
      'The Office of the Registrar is the administrative backbone of Gono Bishwabidyalay. We manage academic records, admissions, examinations, and student services with precision and care. Our goal is to provide seamless administrative support to students and faculty, ensuring that every academic journey at Gono Bishwabidyalay is smooth and well-documented.',
  },
];
