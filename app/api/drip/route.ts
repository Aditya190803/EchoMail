import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  PlanLimitError,
  assertFeature,
  planLimitResponse,
} from "@/lib/billing";
import {
  createDripCampaign,
  deleteDripCampaign,
  listDripCampaigns,
} from "@/lib/drip-campaigns";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await assertFeature(session.user.email, "drip", "Drip campaigns");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return planLimitResponse(error);
      }
      throw error;
    }

    return NextResponse.json({
      documents: listDripCampaigns(),
    });
  } catch (error) {
    apiLogger.error(
      "Drip list error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to list drips" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await assertFeature(session.user.email, "drip", "Drip campaigns");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return planLimitResponse(error);
      }
      throw error;
    }

    const body = await request.json();
    if (!body?.name || !body?.trigger || !Array.isArray(body?.steps)) {
      return NextResponse.json(
        { error: "name, trigger, and steps required" },
        { status: 400 },
      );
    }

    const campaign = createDripCampaign({
      name: body.name,
      description: body.description,
      trigger: body.trigger,
      steps: body.steps,
      isActive: body.isActive ?? false,
      settings: body.settings || {
        stopOnUnsubscribe: true,
        stopOnBounce: true,
        allowReentry: false,
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return planLimitResponse(error);
    }
    apiLogger.error(
      "Drip create error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create drip" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await assertFeature(session.user.email, "drip", "Drip campaigns");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return planLimitResponse(error);
      }
      throw error;
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const ok = deleteDripCampaign(id);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return planLimitResponse(error);
    }
    return NextResponse.json(
      { error: "Failed to delete drip" },
      { status: 500 },
    );
  }
}
