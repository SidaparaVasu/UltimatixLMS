import React from 'react';
import { CourseCard } from './CourseCard';
import { Code, Users, Shield, Globe } from 'lucide-react';

export const CourseStrip: React.FC = () => {
  const courses = [
    {
      title: "Advanced Data Analytics with Python",
      category: "Data Science",
      progress: 67,
      thumbClass: "thumb-1",
      accentColor: "var(--color-accent)",
      icon: Code
    },
    {
      title: "People Management & Team Dynamics",
      category: "Leadership",
      progress: 35,
      thumbClass: "thumb-2",
      accentColor: "var(--color-success)",
      icon: Users
    },
    {
      title: "Information Security Awareness 2026",
      category: "Compliance",
      progress: 88,
      thumbClass: "thumb-3",
      accentColor: "var(--color-danger)",
      icon: Shield
    },
    {
      title: "AWS Solutions Architect Fundamentals",
      category: "Cloud",
      progress: 12,
      thumbClass: "thumb-4",
      accentColor: "var(--color-info)",
      icon: Globe
    }
  ];

  return (
    <div className="anim delay-2">
      <div className="section-header">
        <span className="section-title">Continue Learning</span>
        <a href="#" className="section-link">See all courses</a>
      </div>
      <div className="course-scroll-wrap">
        <div className="course-strip">
          {courses.map((course) => (
            <CourseCard key={course.title} {...course} />
          ))}
        </div>
      </div>
    </div>
  );
};
