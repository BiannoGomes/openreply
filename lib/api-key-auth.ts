import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function authenticateApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const key = authHeader.replace("Bearer ", "").trim();

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { workspace: true },
  });

  if (!apiKey) return null;

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  return { workspace: apiKey.workspace, apiKeyId: apiKey.id };
}
