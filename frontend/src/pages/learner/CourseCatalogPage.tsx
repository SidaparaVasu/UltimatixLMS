import { useState, useMemo, useEffect } from "react";
import { useCourseCatalog, useMyEnrollments, useCourseCategories, useEnrollInCourse } from "@/queries/learner/useLearnerQueries";
import { CourseCard } from "@/components/learner/CourseCard";
import { Search, BookOpen } from "lucide-react";

export default function CourseCatalogPage() {
  const [filters, setFilters] = useState({
    category: 0,
    difficulty_level: '',
    search: '',
    page: 1,
    page_size: 12
  });

  // Separate state for the search input (what user types)
  const [searchInput, setSearchInput] = useState('');
  
  // The actual search term used for API calls (only updated on Enter or explicit search)
  const [activeSearchTerm, setActiveSearchTerm] = useState('');

  // Create the actual query filters with active search term
  const queryFilters = useMemo(() => ({
    ...filters,
    category: filters.category || undefined, // Don't send 0 as category
    search: activeSearchTerm
  }), [filters.category, filters.difficulty_level, activeSearchTerm, filters.page, filters.page_size]);

  const { data: catalogData, isLoading: catalogLoading } = useCourseCatalog(queryFilters);
  const { data: enrollmentsData } = useMyEnrollments();
  const { data: categoriesData } = useCourseCategories();
  const enrollMutation = useEnrollInCourse();

  // Create enrollment lookup map for quick access
  const enrollmentMap = useMemo(() => {
    if (!enrollmentsData?.results) return new Map();
    const map = new Map();
    enrollmentsData.results.forEach(enrollment => {
      map.set(enrollment.course, enrollment);
    });
    return map;
  }, [enrollmentsData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: key === 'category' ? (value ? parseInt(value, 10) : 0) : value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
    setFilters(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e as any);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearchTerm('');
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleEnroll = (courseId: number) => {
    enrollMutation.mutate({ course_id: courseId });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const courses = catalogData?.results || [];
  const totalCount = catalogData?.count || 0;
  const categories = categoriesData?.results || [];

  // Check if there's a pending search (user typed but hasn't pressed Enter)
  const hasUnsubmittedSearch = searchInput !== activeSearchTerm;

  // Loading skeleton
  if (catalogLoading && filters.page === 1) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Explore Courses</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 bg-gray-200 rounded w-16" />
                  <div className="h-5 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="mt-5">
        <div className="2-full flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Explore Courses</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-600">
              {totalCount} course{totalCount !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {activeSearchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-xs text-gray-500 hover:text-gray-600 px-1"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={0}>All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.category_name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={filters.difficulty_level}
            onChange={(e) => handleFilterChange('difficulty_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-600">
            {activeSearchTerm || filters.category || filters.difficulty_level
              ? "Try adjusting your filters to see more courses."
              : "No published courses are available at the moment."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              enrollment={enrollmentMap.get(course.id) || null}
              onEnroll={handleEnroll}
              isEnrolling={enrollMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > filters.page_size && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-700">
            Page {filters.page} of {Math.ceil(totalCount / filters.page_size)}
          </span>
          
          <button
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page >= Math.ceil(totalCount / filters.page_size)}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}