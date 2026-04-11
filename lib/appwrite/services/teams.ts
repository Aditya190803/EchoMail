import { apiRequest } from "../api-request";

// ============================================
// Teams Service (via API)
// ============================================

export const teamsService = {
  // List teams
  async list(): Promise<{ total: number; documents: any[] }> {
    return apiRequest("/api/teams");
  },

  // Create team
  async create(name: string, description?: string): Promise<any> {
    return apiRequest("/api/teams", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  },

  // Update team
  async update(
    teamId: string,
    data: { name?: string; description?: string; settings?: any },
  ): Promise<any> {
    return apiRequest("/api/teams", {
      method: "PUT",
      body: JSON.stringify({ id: teamId, ...data }),
    });
  },

  // Delete team
  async delete(teamId: string): Promise<void> {
    await apiRequest(`/api/teams?id=${encodeURIComponent(teamId)}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// Team Members Service (via API)
// ============================================

export const teamMembersService = {
  // List members
  async list(
    teamId: string,
  ): Promise<{ total: number; documents: any[]; current_user_role?: string }> {
    return apiRequest(
      `/api/teams/members?team_id=${encodeURIComponent(teamId)}`,
    );
  },

  // Invite member
  async invite(
    teamId: string,
    email: string,
    role: "admin" | "member" | "viewer",
  ): Promise<any> {
    return apiRequest("/api/teams/members", {
      method: "POST",
      body: JSON.stringify({ team_id: teamId, email, role }),
    });
  },

  // Update member role
  async updateRole(
    memberId: string,
    role: "admin" | "member" | "viewer",
  ): Promise<any> {
    return apiRequest("/api/teams/members", {
      method: "PUT",
      body: JSON.stringify({ member_id: memberId, role }),
    });
  },

  // Remove member
  async remove(memberId: string): Promise<void> {
    await apiRequest(`/api/teams/members?id=${encodeURIComponent(memberId)}`, {
      method: "DELETE",
    });
  },
};
