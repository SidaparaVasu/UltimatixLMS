import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '@/api/organization-api';
import { skillApi } from '@/api/skill-api';
import { courseApi } from '@/api/course-api';

export const ADMIN_QUERY_KEYS = {
  businessUnits: ['admin', 'business-units'],
  businessUnitOptions: ['admin', 'business-unit-options'],
  departments: ['admin', 'departments'],
  departmentOptions: ['admin', 'department-options'],
  locations: ['admin', 'locations'],
  locationOptions: ['admin', 'location-options'],
  jobRoles: ['admin', 'job-roles'],
  jobRoleOptions: ['admin', 'job-role-options'],
  employees: ['admin', 'employees'],
  employeeManagerOptions: ['admin', 'employee-manager-options'],

  skillCategories: ['admin', 'skill-categories'],
  skills: ['admin', 'skills'],
  skillLevels: ['admin', 'skill-levels'],
  skillMappings: ['admin', 'skill-mappings'],
  jobRoleSkills: ['admin', 'job-role-skills'],
  employeeSkills: ['admin', 'employee-skills'],
  courseCategories: ['admin', 'course-categories'],
  courses: ['admin', 'courses'],
  courseTags: ['admin', 'course-tags'],
};

export const useBusinessUnits = (params?: { page?: number; page_size?: number }) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.businessUnits, params],
    queryFn: () => organizationApi.getBusinessUnits(params),
  });
};

export const useDepartments = (params?: { page?: number; page_size?: number }) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.departments, params],
    queryFn: () => organizationApi.getDepartments(params),
  });
};

export const useLocations = (params?: { page?: number; page_size?: number }) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.locations, params],
    queryFn: () => organizationApi.getLocations(params),
  });
};

export const useJobRoles = (params?: { page?: number; page_size?: number }) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.jobRoles, params],
    queryFn: () => organizationApi.getJobRoles(params),
  });
};

export const useEmployees = (params?: { page?: number; page_size?: number }) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.employees, params],
    queryFn: () => organizationApi.getEmployees(params),
  });
};

export const useEmployeeManagerOptions = (params?: { excludeEmployeeId?: number }) => {
  const queryParams = params?.excludeEmployeeId ? { exclude_employee_id: params.excludeEmployeeId } : undefined;
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.employeeManagerOptions, params],
    queryFn: () => organizationApi.getEmployeeManagerOptions(queryParams),
  });
};

export const useBusinessUnitOptions = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.businessUnitOptions,
    queryFn: organizationApi.getBusinessUnitOptions,
  });
};

export const useDepartmentOptions = (params?: { businessUnitId?: number }) => {
  const queryParams = params?.businessUnitId ? { business_unit_id: params.businessUnitId } : undefined;
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.departmentOptions, params],
    queryFn: () => organizationApi.getDepartmentOptions(queryParams),
  });
};

export const useLocationOptions = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.locationOptions,
    queryFn: organizationApi.getLocationOptions,
  });
};

export const useJobRoleOptions = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.jobRoleOptions,
    queryFn: organizationApi.getJobRoleOptions,
  });
};

// ── Competency hooks ──

export const useSkillCategories = () =>
  useQuery({ 
    queryKey: ADMIN_QUERY_KEYS.skillCategories, 
    queryFn: skillApi.getSkillCategories,
    staleTime: 0,
  });

export const useSkills = () =>
  useQuery({ 
    queryKey: ADMIN_QUERY_KEYS.skills, 
    queryFn: skillApi.getSkills,
    staleTime: 0,
  });

export const useSkillLevels = () =>
  useQuery({ 
    queryKey: ADMIN_QUERY_KEYS.skillLevels, 
    queryFn: skillApi.getSkillLevels,
    staleTime: 0,
  });

export const useSkillMappings = () =>
  useQuery({ 
    queryKey: ADMIN_QUERY_KEYS.skillMappings, 
    queryFn: skillApi.getSkillMappings,
    staleTime: 0,
  });

export const useJobRoleSkills = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.jobRoleSkills, queryFn: skillApi.getRoleRequirements });

export const useEmployeeSkills = (params?: { page?: number; page_size?: number }) =>
  useQuery({ 
    queryKey: [...ADMIN_QUERY_KEYS.employeeSkills, params], 
    queryFn: () => skillApi.getEmployeeSkills(params) 
  });

export const useCourseCategories = (params?: { page?: number; page_size?: number }) =>
  useQuery({ 
    queryKey: [...ADMIN_QUERY_KEYS.courseCategories, params], 
    queryFn: () => courseApi.getCategories(params) 
  });

export const useCourses = (params?: { page?: number; page_size?: number; category?: number; is_active?: boolean }) =>
  useQuery({ 
    queryKey: [...ADMIN_QUERY_KEYS.courses, params], 
    queryFn: () => courseApi.getCourses(params) 
  });

export const useTags = () =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.courseTags,
    queryFn: courseApi.getTags,
    staleTime: 5 * 60 * 1000,
  });

