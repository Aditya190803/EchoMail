import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/teams/members - List members of a team
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!config.teamsCollectionId || !config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      )
    }

    // Check if user is a member of this team
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('team_id', teamId),
        Query.equal('user_email', session.user.email),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    )

    if (userMembership.documents.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      )
    }

    // Get all members
    const members = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('team_id', teamId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]
    )

    return NextResponse.json({ 
      total: members.total, 
      documents: members.documents,
      current_user_role: (userMembership.documents[0] as any).role,
    })
  } catch (error: any) {
    console.error("Error fetching team members:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch team members" },
      { status: 500 }
    )
  }
}

// POST /api/teams/members - Invite a new member to the team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!config.teamsCollectionId || !config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { team_id, email, role = 'member' } = body

    if (!team_id || !email) {
      return NextResponse.json(
        { error: "Team ID and email are required" },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'member', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user is owner or admin of the team
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('team_id', team_id),
        Query.equal('user_email', session.user.email),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    )

    if (userMembership.documents.length === 0 || 
        !['owner', 'admin'].includes((userMembership.documents[0] as any).role)) {
      return NextResponse.json(
        { error: "You don't have permission to invite members" },
        { status: 403 }
      )
    }

    // Check if team settings allow member invites (for non-owners)
    if ((userMembership.documents[0] as any).role !== 'owner') {
      const team = await databases.getDocument(
        config.databaseId,
        config.teamsCollectionId,
        team_id
      )
      const settings = JSON.parse((team as any).settings || '{}')
      if (!settings.allow_member_invite) {
        return NextResponse.json(
          { error: "Only the team owner can invite members" },
          { status: 403 }
        )
      }
    }

    // Check if email is already a member
    const existingMember = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('team_id', team_id),
        Query.equal('user_email', email.toLowerCase()),
        Query.limit(1),
      ]
    )

    if (existingMember.documents.length > 0) {
      return NextResponse.json(
        { error: "This user is already a member of the team" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Check team settings for require_approval
    const team = await databases.getDocument(
      config.databaseId,
      config.teamsCollectionId,
      team_id
    )
    const settings = JSON.parse((team as any).settings || '{}')

    // If require_approval is false, add directly as active member
    // Otherwise, create an invite that needs to be accepted
    if (!settings.require_approval) {
      // Add member directly
      const member = await databases.createDocument(
        config.databaseId,
        config.teamMembersCollectionId,
        ID.unique(),
        {
          team_id,
          user_email: email.toLowerCase(),
          role,
          invited_by: session.user.email,
          invited_at: now,
          accepted_at: now,
          status: 'active',
        }
      )

      return NextResponse.json(member)
    }

    // Create invite if team_invites collection exists
    if (config.teamInvitesCollectionId) {
      const token = ID.unique()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

      const invite = await databases.createDocument(
        config.databaseId,
        config.teamInvitesCollectionId,
        ID.unique(),
        {
          team_id,
          email: email.toLowerCase(),
          role,
          invited_by: session.user.email,
          invited_at: now,
          expires_at: expiresAt.toISOString(),
          token,
          status: 'pending',
        }
      )

      return NextResponse.json({
        ...invite,
        message: 'Invitation sent. User needs to accept the invite.',
      })
    }

    // If no invite collection, create pending member
    const member = await databases.createDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      ID.unique(),
      {
        team_id,
        user_email: email.toLowerCase(),
        role,
        invited_by: session.user.email,
        invited_at: now,
        status: 'pending',
      }
    )

    return NextResponse.json(member)
  } catch (error: any) {
    console.error("Error inviting team member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to invite team member" },
      { status: 500 }
    )
  }
}

// PUT /api/teams/members - Update a member's role
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { member_id, role, status } = body

    if (!member_id) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      )
    }

    // Get the member document
    const member = await databases.getDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      member_id
    ) as any

    // Check if user is owner or admin of the team
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('team_id', member.team_id),
        Query.equal('user_email', session.user.email),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    )

    if (userMembership.documents.length === 0 || 
        !['owner', 'admin'].includes((userMembership.documents[0] as any).role)) {
      return NextResponse.json(
        { error: "You don't have permission to update members" },
        { status: 403 }
      )
    }

    // Prevent changing owner role
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 400 }
      )
    }

    // Admins can't change other admins
    if ((userMembership.documents[0] as any).role === 'admin' && member.role === 'admin') {
      return NextResponse.json(
        { error: "Admins cannot modify other admins" },
        { status: 403 }
      )
    }

    const updateData: any = {}
    
    if (role) {
      const validRoles = ['admin', 'member', 'viewer']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.role = role
    }

    if (status) {
      const validStatuses = ['active', 'suspended']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    const updated = await databases.updateDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      member_id,
      updateData
    )

    // Log the action
    if (config.auditLogsCollectionId) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: session.user.email,
            action: 'team.member_role_change',
            resource_type: 'team',
            resource_id: member.team_id,
            details: JSON.stringify({ 
              member_email: member.user_email,
              old_role: member.role,
              new_role: role || member.role,
            }),
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            created_at: new Date().toISOString(),
          }
        )
      } catch (e) {
        console.warn('Failed to log role change:', e)
      }
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Error updating team member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update team member" },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/members - Remove a member from the team
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!config.teamMembersCollectionId) {
      return NextResponse.json(
        { error: "Teams feature not configured" },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      )
    }

    // Get the member document
    const member = await databases.getDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      memberId
    ) as any

    // Check permissions
    const userMembership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('team_id', member.team_id),
        Query.equal('user_email', session.user.email),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    )

    const userRole = userMembership.documents.length > 0 
      ? (userMembership.documents[0] as any).role 
      : null

    // Allow self-removal (leaving the team) or admin/owner removal
    const isSelfRemoval = member.user_email === session.user.email
    const canRemoveOthers = ['owner', 'admin'].includes(userRole)

    if (!isSelfRemoval && !canRemoveOthers) {
      return NextResponse.json(
        { error: "You don't have permission to remove members" },
        { status: 403 }
      )
    }

    // Prevent owner from being removed
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: "The team owner cannot be removed. Transfer ownership first." },
        { status: 400 }
      )
    }

    // Admins can't remove other admins
    if (userRole === 'admin' && member.role === 'admin' && !isSelfRemoval) {
      return NextResponse.json(
        { error: "Admins cannot remove other admins" },
        { status: 403 }
      )
    }

    await databases.deleteDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      memberId
    )

    // Log the action
    if (config.auditLogsCollectionId) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: session.user.email,
            action: 'team.member_remove',
            resource_type: 'team',
            resource_id: member.team_id,
            details: JSON.stringify({ 
              removed_email: member.user_email,
              self_removal: isSelfRemoval,
            }),
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            created_at: new Date().toISOString(),
          }
        )
      } catch (e) {
        console.warn('Failed to log member removal:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing team member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove team member" },
      { status: 500 }
    )
  }
}
