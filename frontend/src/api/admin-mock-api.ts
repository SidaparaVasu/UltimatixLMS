export interface BusinessUnit { 
  id: string; 
  name: string; 
  code: string; 
  description: string; 
  isActive: boolean; 
}

export interface Department { 
  id: string; 
  name: string; 
  code: string; 
  parentId: string | null; 
  businessUnitId: string; 
  description: string; 
  isActive: boolean; 
}

export interface Location { 
  id: string; 
  name: string; 
  code: string; 
  city: string; 
  country: string; 
  isActive: boolean; 
}

export interface JobRole { 
  id: string; 
  name: string; 
  code: string; 
  isActive: boolean; 
}

export interface Employee { 
  id: string; 
  username: string;
  employeeCode: string; 
  firstName: string; 
  lastName: string; 
  email: string; 
  mobile_no: string;
  profile_image: string;
  date_of_birth: string;
  gender: string;
  businessUnitId: string;
  departmentId: string; 
  roleId: string;
  locationId: string;
  managerId: string | null; 
  isActive: boolean; 
}

// MOCK DATA (Max 3 items enforced)
const MOCK_BUS: BusinessUnit[] = [
  { id: '1', name: 'Software Development', code: 'BU-SD', description: 'Core product engineering', isActive: true },
  { id: '2', name: 'Sales & Marketing', code: 'BU-SM', description: 'Global sales team', isActive: true },
  { id: '3', name: 'Operations', code: 'BU-OPS', description: 'Internal ops and logistics', isActive: false },
];

const MOCK_DEPTS: Department[] = [
  { id: '1', businessUnitId: '1', name: 'Engineering', code: 'DEP-ENG', parentId: null, description: 'Main engineering dept', isActive: true },
  { id: '2', businessUnitId: '1', name: 'Frontend Tech', code: 'DEP-FE', parentId: '1', description: 'React and UI teams', isActive: true },
  { id: '3', businessUnitId: '2', name: 'Digital Marketing', code: 'DEP-MKT', parentId: null, description: 'Online presence', isActive: true },
];

const MOCK_LOCATIONS: Location[] = [
  { id: '1', name: 'New York HQ', code: 'NY-01', city: 'New York', country: 'USA', isActive: true },
  { id: '2', name: 'London Office', code: 'LON-01', city: 'London', country: 'UK', isActive: true },
  { id: '3', name: 'Remote Hub', code: 'REM', city: 'Virtual', country: 'Global', isActive: true },
];

const MOCK_ROLES: JobRole[] = [
  { id: '1', name: 'Software Engineer', code: 'ROLE-SE', isActive: true },
  { id: '2', name: 'Engineering Manager', code: 'ROLE-EM', isActive: true },
  { id: '3', name: 'Marketing Specialist', code: 'ROLE-MS', isActive: true },
];

const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', employeeCode: 'EMP-001', firstName: 'Alice', lastName: 'Admin', email: 'alice@example.com', departmentId: '1', roleId: '2', managerId: null, isActive: true },
  { id: '2', employeeCode: 'EMP-002', firstName: 'Bob', lastName: 'Builder', email: 'bob@example.com', departmentId: '2', roleId: '1', managerId: '1', isActive: true },
  { id: '3', employeeCode: 'EMP-003', firstName: 'Charlie', lastName: 'Sales', email: 'charlie@example.com', departmentId: '3', roleId: '3', managerId: null, isActive: true },
];

// Reusable fixed delay to simulate network latency cleanly
const simulateNetwork = () => new Promise(resolve => setTimeout(resolve, 600));

export const adminMockApi = {
  getBusinessUnits: async () => { await simulateNetwork(); return [...MOCK_BUS]; },
  getDepartments: async () => { await simulateNetwork(); return [...MOCK_DEPTS]; },
  getLocations: async () => { await simulateNetwork(); return [...MOCK_LOCATIONS]; },
  getJobRoles: async () => { await simulateNetwork(); return [...MOCK_ROLES]; },
  getEmployees: async () => { await simulateNetwork(); return [...MOCK_EMPLOYEES]; }
};
