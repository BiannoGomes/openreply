import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

// GET — list all API keys for the workspace
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { ownedWorkspaces: true },
  });

  if (!user || !user.ownedWorkspaces[0]) {
        return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const workspace = user.ownedWorkspaces[0];

  const keys = await prisma.apiKey.findMany({
        where: { workspaceId: workspace.id },
        select: { id: true, name: true, key: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

// POST — generate a new API key
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { ownedWorkspaces: true },
  });

  if (!user || !user.ownedWorkspaces[0]) {
        return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const workspace = user.ownedWorkspaces[0];
    const body = await req.json().catch(() => ({}));
    const name = body.name || "Jarvis";

  const apiKey = await prisma.apiKey.create({
        data: {
                name,
                workspaceId: workspace.id,
        },
  });

  return NextResponse.json({ key: apiKey.key, id: apiKey.id, name: apiKey.name });
}

// DELETE — remove an API key by id
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const { id } = await req.json();

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
