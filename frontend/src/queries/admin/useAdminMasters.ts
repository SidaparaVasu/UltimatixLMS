import { useQuery } from '@tanstack/react-query';
import { adminMockApi } from '@/api/admin-mock-api';

export const ADMIN_QUERY_KEYS = {
  businessUnits: ['admin', 'business-units'],
  departments: ['admin', 'departments'],
  locations: ['admin', 'locations'],
  jobRoles: ['admin', 'job-roles'],
  employees: ['admin', 'employees'],
  // Phase 2: Competency
  skillCategories: ['admin', 'skill-categories'],
  skills: ['admin', 'skills'],
  skillLevels: ['admin', 'skill-levels'],
  skillMappings: ['admin', 'skill-mappings'],
  jobRoleSkills: ['admin', 'job-role-skills'],
  employeeSkills: ['admin', 'employee-skills'],
  courseCategories: ['admin', 'course-categories'],
};

export const useBusinessUnits = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.businessUnits,
    queryFn: adminMockApi.getBusinessUnits,
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.departments,
    queryFn: adminMockApi.getDepartments,
  });
};

export const useLocations = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.locations,
    queryFn: adminMockApi.getLocations,
  });
};

export const useJobRoles = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.jobRoles,
    queryFn: adminMockApi.getJobRoles,
  });
};

export const useEmployees = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.employees,
    queryFn: adminMockApi.getEmployees,
  });
};

// ── Phase 2: Competency hooks ──

export const useSkillCategories = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.skillCategories, queryFn: adminMockApi.getSkillCategories });

export const useSkills = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.skills, queryFn: adminMockApi.getSkills });

export const useSkillLevels = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.skillLevels, queryFn: adminMockApi.getSkillLevels });

export const useSkillMappings = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.skillMappings, queryFn: adminMockApi.getSkillMappings });

export const useJobRoleSkills = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.jobRoleSkills, queryFn: adminMockApi.getJobRoleSkills });

export const useEmployeeSkills = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.employeeSkills, queryFn: adminMockApi.getEmployeeSkills });

export const useCourseCategories = () =>
  useQuery({ queryKey: ADMIN_QUERY_KEYS.courseCategories, queryFn: adminMockApi.getCourseCategories });

