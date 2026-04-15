import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import { PaginatedResponse } from "./organization-api";
import {
  Skill,
  SkillCategory,
  SkillLevel,
  SkillCategoryMapping,
  JobRoleSkillRequirement,
} from "@/types/skills.types";

/**
 * Skill API - handles skill management, proficiencies, and job role mapping.
 * Base path: /api/v1/skills/
 */
export const skillApi = {
  // Skill Categories
  getSkillCategories: async () => {
    try {
      const response = await apiClient.get("/skills/skill-categories/");
      return handleApiResponse<PaginatedResponse<SkillCategory>>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  createSkillCategory: async (data: Partial<SkillCategory>) => {
    try {
      const response = await apiClient.post("/skills/skill-categories/", data);
      return handleApiResponse<SkillCategory>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  updateSkillCategory: async (id: number, data: Partial<SkillCategory>) => {
    try {
      const response = await apiClient.patch(`/skills/skill-categories/${id}/`, data);
      return handleApiResponse<SkillCategory>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  deleteSkillCategory: async (id: number, softDelete: boolean = true) => {
    try {
      const response = await apiClient.delete(`/skills/skill-categories/${id}/?soft_delete=${softDelete}`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Skills
  getSkills: async () => {
    try {
      const response = await apiClient.get("/skills/skills/");
      return handleApiResponse<PaginatedResponse<Skill>>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  createSkill: async (data: Partial<Skill>) => {
    try {
      const response = await apiClient.post("/skills/skills/", data);
      return handleApiResponse<Skill>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  updateSkill: async (id: number, data: Partial<Skill>) => {
    try {
      const response = await apiClient.patch(`/skills/skills/${id}/`, data);
      return handleApiResponse<Skill>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  deleteSkill: async (id: number, softDelete: boolean = true) => {
    try {
      const response = await apiClient.delete(`/skills/skills/${id}/?soft_delete=${softDelete}`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Skill Levels
  getSkillLevels: async () => {
    try {
      const response = await apiClient.get("/skills/skill-levels/");
      return handleApiResponse<PaginatedResponse<SkillLevel>>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  createSkillLevel: async (data: Partial<SkillLevel>) => {
    try {
      const response = await apiClient.post("/skills/skill-levels/", data);
      return handleApiResponse<SkillLevel>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Category-Skill Mappings
  getSkillMappings: async () => {
    try {
      const response = await apiClient.get("/skills/skill-mappings/");
      return handleApiResponse<PaginatedResponse<SkillCategoryMapping>>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  createSkillMapping: async (data: { category: number; skill: number }) => {
    try {
      const response = await apiClient.post("/skills/skill-mappings/", data);
      return handleApiResponse<SkillCategoryMapping>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
  deleteSkillMapping: async (id: number) => {
    try {
      const response = await apiClient.delete(`/skills/skill-mappings/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Job Role Requirements
  getRoleRequirements: async () => {
    try {
      const response = await apiClient.get("/skills/role-requirements/");
      return handleApiResponse<PaginatedResponse<JobRoleSkillRequirement>>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Bulk synchronizes requirements for a job role.
   * This action deactivates missing mappings and creates/reactivates provided ones.
   */
  bulkSyncRoleRequirements: async (data: { 
    job_role_id: number; 
    requirements: { skill_id: number; level_id: number }[] 
  }) => {
    try {
      const response = await apiClient.post("/skills/role-requirements/bulk-sync/", data);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  }
};
