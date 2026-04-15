export interface Skill {
  id: number;
  skill_name: string;
  skill_code: string;
  description: string;
  is_active: boolean;
  parent_skill?: number;
}

export interface SkillCategory {
  id: number;
  category_name: string;
  category_code: string;
  description: string;
  is_active: boolean;
}

export interface SkillLevel {
  id: number;
  level_name: string;
  level_rank: number;
  description: string;
}

export interface SkillCategoryMapping {
  id: number;
  category: number;
  skill: number;
  skill_name?: string;
  category_name?: string;
}

export interface JobRoleSkillRequirement {
  id: number;
  job_role: number;
  skill: number;
  required_level: number;
  is_active: boolean;
}

export interface EmployeeSkill {
  id: number;
  employee: number;
  skill: number;
  current_level: number;
  is_active: boolean;
  employee_code?: string;
  skill_name?: string;
  level_name?: string;
}