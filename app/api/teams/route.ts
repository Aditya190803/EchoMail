import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/teams - List teams the user is a member of
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!config.teamsCollectionId || !config.teamMembersCollectionId) {
      return NextResponse.json({ 
        total: 0, 
        documents: [],
        message: 'Teams feature not configured'
      })
    }

    // First, get all team memberships for this user
    const memberships = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.equal('status', 'active'),
        Query.limit(100),
      ]
    )

    if (memberships.documents.length === 0) {
      return NextResponse.json({ total: 0, documents: [] })
    }

    // Get all team IDs
    const teamIds = memberships.documents.map((m: any) => m.team_id)

    // Fetch all teams (we need to do this in batches if there are many)
    const teams = await Promise.all(
      teamIds.map(async (teamId: string) => {
        try {
          const team = await databases.getDocument(
            config.databaseId,
            config.teamsCollectionId,
            teamId
          )
          // Add the user's role to the team object
          const membership = memberships.documents.find((m: any) => m.team_id === teamId)
          return {
            ...team,
            user_role: membership?.role || 'member',
          }
        } catch {
          return null
        }
      })
    )

    const validTeams = teams.filter(Boolean)

    return NextResponse.json({ 
      total: validTeams.length, 
      documents: validTeams 
    })
  } catch (error: any) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch teams" },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
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
    const { name, description } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const teamId = ID.unique()

    // Create the team
    const team = await databases.createDocument(
      config.databaseId,
      config.teamsCollectionId,
      teamId,
      {
        name: name.trim(),
        description: description?.trim() || null,
        owner_email: session.user.email,
        created_at: now,
        updated_at: now,
        settings: JSON.stringify({
          allow_member_invite: false,
          require_approval: true,
          shared_templates: true,
          shared_contacts: false,
        }),
      }
    )

    // Add the creator as owner member
    await databases.createDocument(
      config.databaseId,
      config.teamMembersCollectionId,
      ID.unique(),
      {
        team_id: teamId,
        user_email: session.user.email,
        role: 'owner',
        permissions: JSON.stringify(['*']),
        invited_by: session.user.email,
        joined_at: now,
        status: 'active',
      }
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
            action: 'team.create',
            resource_type: 'team',
            resource_id: teamId,
            details: JSON.stringify({ name }),
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
            created_at: now,
          }
        )
      } catch (e) {
        console.warn('Failed to log team creation:', e)
      }
    }

    return NextResponse.json({
      ...team,
      user_role: 'owner',
    })
  } catch (error: any) {
    console.error("Error creating team:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create team" },
      { status: 500 }
    )
  }
}

// PUT /api/teams - Update a team
export async function PUT(request: NextRequest) {
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
    const { id, name, description, settings } = body

    if (!id) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      )
    }

    // Check if user is owner or admin of the team
    const membership = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [
        Query.equal('team_id', id),
        Query.equal('user_email', session.user.email),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    )

    if (membership.documents.length === 0 || 
        !['owner', 'admin'].includes((membership.documents[0] as any).role)) {
      return NextResponse.json(
        { error: "You don't have permission to update this team" },
        { status: 403 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (settings) updateData.settings = JSON.stringify(settings)

    const team = await databases.updateDocument(
      config.databaseId,
      config.teamsCollectionId,
      id,
      updateData
    )

    return NextResponse.json(team)
  } catch (error: any) {
    console.error("Error updating team:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update team" },
      { status: 500 }
    )
  }
}

// DELETE /api/teams - Delete a team
export async function DELETE(request: NextRequest) {
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
    const teamId = searchParams.get('id')

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      )
    }

    // Check if user is owner of the team
    const team = await databases.getDocument(
      config.databaseId,
      config.teamsCollectionId,
      teamId
    )

    if ((team as any).owner_email !== session.user.email) {
      return NextResponse.json(
        { error: "Only the team owner can delete the team" },
        { status: 403 }
      )
    }

    // Delete all team members first
    const members = await databases.listDocuments(
      config.databaseId,
      config.teamMembersCollectionId,
      [Query.equal('team_id', teamId), Query.limit(1000)]
    )

    for (const member of members.documents) {
      await databases.deleteDocument(
        config.databaseId,
        config.teamMembersCollectionId,
        member.$id
      )
    }

    // Delete the team
    await databases.deleteDocument(
      config.databaseId,
      config.teamsCollectionId,
      teamId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting team:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete team" },
      { status: 500 }
    )
  }
}
