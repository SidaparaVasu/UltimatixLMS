import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useMyEnrollments } from '@/queries/learner/useLearnerQueries';
import { CourseCard } from './CourseCard';
import { Link } from 'react-router-dom';

// Map category names to icon-like thumb classes for visual variety
const THUMB_CLASSES = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4'];

export const CourseStrip: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: enrollmentsData, isLoading } = useMyEnrollments({ status: 'IN_PROGRESS' });
  const courses = enrollmentsData?.results || [];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth / 2
          : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="anim delay-2">
        <div className="section-header">
          <span className="section-title">Continue Learning</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="pulse"
              style={{
                width: 260,
                height: 220,
                background: 'var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="anim delay-2">
        <div className="section-header">
          <span className="section-title">Continue Learning</span>
          <Link to="/courses" className="section-link">Browse courses</Link>
        </div>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <BookOpen size={32} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            No courses in progress. Start learning today.
          </span>
          <Link to="/courses" className="btn" style={{ height: 34, fontSize: 'var(--text-sm)' }}>
            Explore Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="anim delay-2">
      <div className="section-header">
        <span className="section-title">Continue Learning</span>
        <Link to="/my-learning" className="section-link">See all courses</Link>
      </div>

      <div className="course-scroll-container">
        <button className="scroll-nav-btn left" onClick={() => scroll('left')}>
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>

        <div className="course-scroll-wrap" ref={scrollRef}>
          <div className="course-strip">
            {courses.map((enrollment, i) => (
              <CourseCard
                key={enrollment.id}
                enrollmentId={enrollment.id}
                title={enrollment.course_title}
                category={enrollment.category_name}
                progress={Math.round(parseFloat(enrollment.progress_percentage))}
                thumbClass={THUMB_CLASSES[i % THUMB_CLASSES.length]}
                accentColor="var(--primary)"
              />
            ))}
          </div>
        </div>

        <button className="scroll-nav-btn right" onClick={() => scroll('right')}>
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
