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
  gender: 'male' | 'female' | 'other';
  businessUnitId: string;
  departmentId: string;
  locationId: string;
  roleId: string;
  managerId: string | null;
  isActive: boolean;
}

export interface CourseCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  courseCount: number;
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
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
  { id: '1', username: 'alice.admin',   employeeCode: 'EMP-001', firstName: 'Alice',   lastName: 'Admin',   email: 'alice@example.com',   mobile_no: '9001000001', profile_image: '', date_of_birth: '1990-05-12', gender: 'female', businessUnitId: '1', departmentId: '1', roleId: '2', locationId: '1', managerId: null, isActive: true },
  { id: '2', username: 'bob.builder',   employeeCode: 'EMP-002', firstName: 'Bob',     lastName: 'Builder', email: 'bob@example.com',     mobile_no: '9001000002', profile_image: '', date_of_birth: '1992-08-20', gender: 'male',   businessUnitId: '1', departmentId: '2', roleId: '1', locationId: '1', managerId: '1', isActive: true },
  { id: '3', username: 'charlie.sales', employeeCode: 'EMP-003', firstName: 'Charlie', lastName: 'Sales',   email: 'charlie@example.com', mobile_no: '9001000003', profile_image: '', date_of_birth: '1988-11-03', gender: 'male',   businessUnitId: '2', departmentId: '3', roleId: '3', locationId: '2', managerId: null, isActive: true },
];

// Reusable fixed delay to simulate network latency cleanly
const simulateNetwork = () => new Promise(resolve => setTimeout(resolve, 600));

const MOCK_COURSE_CATEGORIES: CourseCategory[] = [
  { 
    id: '1', 
    name: 'Technical Skills', 
    code: 'CAT-TECH', 
    description: 'Software development, infrastructure, and engineering principles.', 
    isActive: true,
    courseCount: 12
  },
  { 
    id: '2', 
    name: 'Human Resources', 
    code: 'CAT-HR', 
    description: 'Corporate culture, ethics, and leadership training.', 
    isActive: true,
    courseCount: 5
  },
  { 
    id: '3', 
    name: 'Marketing & Sales', 
    code: 'CAT-MKT', 
    description: 'Branding, campaign management, and sales techniques.', 
    isActive: false,
    courseCount: 8
  },
  { 
    id: '4', 
    name: 'Healthcare', 
    code: 'CAT-MED', 
    description: 'Privacy, medical ethics, and patient care fundamentals.', 
    isActive: true,
    courseCount: 3
  },
];

export const adminMockApi = {
  getBusinessUnits: async () => { await simulateNetwork(); return [...MOCK_BUS]; },
  getDepartments: async () => { await simulateNetwork(); return [...MOCK_DEPTS]; },
  getLocations: async () => { await simulateNetwork(); return [...MOCK_LOCATIONS]; },
  getJobRoles: async () => { await simulateNetwork(); return [...MOCK_ROLES]; },
  getEmployees: async () => { await simulateNetwork(); return [...MOCK_EMPLOYEES]; },
  // ── Phase 2: Competency ──
  getSkillCategories: async () => { await simulateNetwork(); return [...MOCK_SKILL_CATEGORIES]; },
  getSkills: async () => { await simulateNetwork(); return [...MOCK_SKILLS]; },
  getSkillLevels: async () => { await simulateNetwork(); return [...MOCK_SKILL_LEVELS]; },
  getSkillMappings: async () => { await simulateNetwork(); return [...MOCK_SKILL_MAPPINGS]; },
  getJobRoleSkills: async () => { await simulateNetwork(); return [...MOCK_JOB_ROLE_SKILLS]; },
  getEmployeeSkills: async () => { await simulateNetwork(); return [...MOCK_EMPLOYEE_SKILLS]; },
  // Course Categories
  getCourseCategories: async () => {
    await simulateNetwork();
    return [...MOCK_COURSE_CATEGORIES];
  },
  saveCourseCategory: async (category: Partial<CourseCategory>) => {
    await simulateNetwork();
    console.log('API: Saving Category:', category);
    return { success: true };
  },
};

/* ═══════════════════════════════════════════════════════════════
   COMPETENCY & SKILL MANAGEMENT
═══════════════════════════════════════════════════════════════ */

// ── Interfaces ──
export interface SkillCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export interface Skill {
  id: string;
  name: string;
  code: string;
  /** Optional parent skill id for hierarchical skills */
  parentId: string | null;
  description: string;
  isActive: boolean;
}

export interface SkillLevel {
  id: string;
  name: string;
  rank: number;
  description: string;
}

/** Maps skills to categories — many-to-many */
export interface SkillCategoryMapping {
  id: string;
  categoryId: string;
  skillId: string;
}

/** Mapping of skills required by a Job Role */
export interface JobRoleSkillRequirement {
  id: string;
  jobRoleId: string;
  skillId: string;
  requiredLevelId: string;
}

/** Mapping of skills possessed/assessed for an Employee */
export interface EmployeeSkillAssessment {
  id: string;
  employeeId: string;
  skillId: string;
  assessedLevelId: string;
  status: 'SELF_ASSESSED' | 'VERIFIED' | 'PENDING';
  updatedAt: string;
}

// ── Mock Data ──
const MOCK_SKILL_CATEGORIES: SkillCategory[] = [
  { id: 'sc-1', name: 'Technical Skills',       code: 'TECH',    description: 'Engineering and technology skills',        isActive: true  },
  { id: 'sc-2', name: 'Soft Skills',            code: 'SOFT',    description: 'Communication and interpersonal skills',   isActive: true  },
  { id: 'sc-3', name: 'Leadership',             code: 'LEAD',    description: 'Team and organizational leadership',       isActive: true  },
  { id: 'sc-4', name: 'Data & Analytics',       code: 'DATA',    description: 'Data analysis and visualization skills',   isActive: true  },
  { id: 'sc-5', name: 'Project Management',     code: 'PM',      description: 'Planning, delivery, and coordination',    isActive: true  },
  { id: 'sc-6', name: 'Compliance & Security',  code: 'COMP',    description: 'Regulatory and information security',     isActive: false },
];

const MOCK_SKILLS: Skill[] = [
  { id: 'sk-1',  name: 'React',            code: 'REACT',   parentId: null,   description: 'React.js library',             isActive: true  },
  { id: 'sk-2',  name: 'TypeScript',       code: 'TS',      parentId: null,   description: 'Typed JavaScript',             isActive: true  },
  { id: 'sk-3',  name: 'Python',           code: 'PY',      parentId: null,   description: 'Python programming language',  isActive: true  },
  { id: 'sk-4',  name: 'Django',           code: 'DJANGO',  parentId: 'sk-3', description: 'Python web framework',         isActive: true  },
  { id: 'sk-5',  name: 'Communication',    code: 'COMM',    parentId: null,   description: 'Verbal and written comms',     isActive: true  },
  { id: 'sk-6',  name: 'Active Listening', code: 'LISTEN',  parentId: 'sk-5', description: 'Interpersonal listening',      isActive: true  },
  { id: 'sk-7',  name: 'People Management', code: 'PEOPLE', parentId: null,   description: 'Managing teams effectively',  isActive: true  },
  { id: 'sk-8',  name: 'Strategic Thinking', code: 'STRAT', parentId: null,   description: 'Long-range planning skills',   isActive: true  },
  { id: 'sk-9',  name: 'SQL',              code: 'SQL',     parentId: null,   description: 'Structured query language',    isActive: true  },
  { id: 'sk-10', name: 'Power BI',         code: 'PBI',     parentId: null,   description: 'Business intelligence tool',  isActive: true  },
  { id: 'sk-11', name: 'Agile / Scrum',    code: 'AGILE',   parentId: null,   description: 'Agile delivery framework',    isActive: true  },
  { id: 'sk-12', name: 'Risk Management',  code: 'RISK',    parentId: null,   description: 'Identifying and managing risk', isActive: true },
];

const MOCK_SKILL_LEVELS: SkillLevel[] = [
  { id: 'sl-1', name: 'Basic',        rank: 1, description: 'Foundational awareness' },
  { id: 'sl-2', name: 'Intermediate', rank: 2, description: 'Can work independently'  },
  { id: 'sl-3', name: 'Advanced',     rank: 3, description: 'Expert-level proficiency' },
];

const MOCK_SKILL_MAPPINGS: SkillCategoryMapping[] = [
  // Technical
  { id: 'map-1',  categoryId: 'sc-1', skillId: 'sk-1'  },
  { id: 'map-2',  categoryId: 'sc-1', skillId: 'sk-2'  },
  { id: 'map-3',  categoryId: 'sc-1', skillId: 'sk-3'  },
  { id: 'map-4',  categoryId: 'sc-1', skillId: 'sk-4'  },
  // Soft Skills
  { id: 'map-5',  categoryId: 'sc-2', skillId: 'sk-5'  },
  { id: 'map-6',  categoryId: 'sc-2', skillId: 'sk-6'  },
  // Leadership
  { id: 'map-7',  categoryId: 'sc-3', skillId: 'sk-7'  },
  { id: 'map-8',  categoryId: 'sc-3', skillId: 'sk-8'  },
  // Data — no mappings yet (to show empty state)
  // Project Management
  { id: 'map-9',  categoryId: 'sc-5', skillId: 'sk-11' },
  { id: 'map-10', categoryId: 'sc-5', skillId: 'sk-12' },
  // SQL also in Data
  { id: 'map-11', categoryId: 'sc-4', skillId: 'sk-9'  },
  { id: 'map-12', categoryId: 'sc-4', skillId: 'sk-10' },
];

const MOCK_JOB_ROLE_SKILLS: JobRoleSkillRequirement[] = [
  // Software Engineer (id: '1')
  { id: 'jrs-1', jobRoleId: '1', skillId: 'sk-1', requiredLevelId: 'sl-2' }, // React - Intermediate
  { id: 'jrs-2', jobRoleId: '1', skillId: 'sk-2', requiredLevelId: 'sl-2' }, // TS - Intermediate
  { id: 'jrs-3', jobRoleId: '1', skillId: 'sk-3', requiredLevelId: 'sl-1' }, // Python - Basic
];


const MOCK_EMPLOYEE_SKILLS: EmployeeSkillAssessment[] = [
  // Alice (id: '1')
  { id: 'esa-1', employeeId: '1', skillId: 'sk-3', assessedLevelId: 'sl-3', status: 'VERIFIED', updatedAt: '2023-11-01' }, // Python - Advanced
  { id: 'esa-2', employeeId: '1', skillId: 'sk-7', assessedLevelId: 'sl-2', status: 'VERIFIED', updatedAt: '2023-12-05' }, // People Mgmt - Intermediate
  // Bob (id: '2')
  { id: 'esa-3', employeeId: '2', skillId: 'sk-1', assessedLevelId: 'sl-2', status: 'VERIFIED', updatedAt: '2024-01-10' }, // React - Intermediate
  { id: 'esa-4', employeeId: '2', skillId: 'sk-2', assessedLevelId: 'sl-1', status: 'PENDING',  updatedAt: '2024-02-15' }, // TS - Basic
];
