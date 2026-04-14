import { useQuery } from '@tanstack/react-query';
import { adminMockApi } from '@/api/admin-mock-api';
import { organizationApi } from '@/api/organization-api';

export const ADMIN_QUERY_KEYS = {
  businessUnits: ['admin', 'business-units'],
  departments: ['admin', 'departments'],
  locations: ['admin', 'locations'],
  jobRoles: ['admin', 'job-roles'],
  employees: ['admin', 'employees'],

  skillCategories: ['admin', 'skill-categories'],
  skills: ['admin', 'skills'],
  skillLevels: ['admin', 'skill-levels'],
  skillMappings: ['admin', 'skill-mappings'],
  jobRoleSkills: ['admin', 'job-role-skills'],
  employeeSkills: ['admin', 'employee-skills'],
  courseCategories: ['admin', 'course-categories'],
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

export const useEmployees = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.employees,
    queryFn: adminMockApi.getEmployees,
  });
};

// ── Competency hooks ──

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

