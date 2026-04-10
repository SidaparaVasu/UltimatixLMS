import { useQuery } from '@tanstack/react-query';
import { adminMockApi } from '@/api/admin-mock-api';

export const ADMIN_QUERY_KEYS = {
  businessUnits: ['admin', 'business-units'],
  departments: ['admin', 'departments'],
  locations: ['admin', 'locations'],
  jobRoles: ['admin', 'job-roles'],
  employees: ['admin', 'employees'],
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
