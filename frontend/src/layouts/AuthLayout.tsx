import { Outlet } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Brand Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-8 bg-slate-900 px-12 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
            <BookOpen className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Ultimatix LMS</h1>
          <p className="max-w-sm text-slate-400 text-base leading-relaxed">
            Your centralised platform for learning, skill development, and career growth.
          </p>
        </div>

        {/* Feature highlights */}
        <ul className="space-y-3 text-sm text-slate-400">
          {[
            'Role-based access control',
            'Skill gap analysis & competency tracking',
            'Course management & certifications',
            'Compliance reporting & audit trails',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Right Content Panel — renders each auth page via Outlet */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Ultimatix LMS</span>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
