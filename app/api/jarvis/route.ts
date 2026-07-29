import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { workspace } = auth;
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource");

  // GET /api/jarvis?resource=campaigns
  if (resource === "campaigns") {
    const campaigns = await prisma.automation.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        name: true,
        keywords: true,
        isActive: true,
        dmMessage: true,
        postUrl: true,
        createdAt: true,
        _count: { select: { dmLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ campaigns });
  }

  // GET /api/jarvis?resource=stats
  if (resource === "stats") {
    const total = await prisma.dmLog.count({ where: { workspaceId: workspace.id } });
    const sent = await prisma.dmLog.count({ where: { workspaceId: workspace.id, status: "SENT" } });
    const failed = await prisma.dmLog.count({ where: { workspaceId: workspace.id, status: "FAILED" } });
    const activeCampaigns = await prisma.automation.count({ where: { workspaceId: workspace.id, isActive: true } });
    return NextResponse.json({ total, sent, failed, activeCampaigns });
  }

  // GET /api/jarvis?resource=logs&limit=20
  if (resource === "logs") {
    const limit = parseInt(searchParams.get("limit") || "20");
    const logs = await prisma.dmLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        commenterName: true,
        commentText: true,
        matchedKeyword: true,
        status: true,
        dmSentAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ logs });
  }

  return NextResponse.json({ 
    workspace: workspace.name,
    endpoints: ["campaigns", "stats", "logs"],
    usage: "Add ?resource=campaigns|stats|logs"
  });
}

// POST /api/jarvis — create or toggle a campaign
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { workspace } = auth;
  const body = await req.json();

  // Toggle campaign active/inactive
  if (body.action === "toggle" && body.campaignId) {
    const campaign = await prisma.automation.findUnique({ where: { id: body.campaignId } });
    if (!campaign || campaign.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const updated = await prisma.automation.update({
      where: { id: body.campaignId },
      data: { isActive: !campaign.isActive },
    });
    return NextResponse.json({ id: updated.id, isActive: updated.isActive });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
