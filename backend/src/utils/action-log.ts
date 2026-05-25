import { prisma } from "../db";

export async function logAction(
  actorType: string,
  actorId: number | null,
  actionType: string,
  details: Record<string, unknown>
): Promise<void> {
  await prisma.actionLog.create({
    data: {
      actorType,
      actorId,
      actionType,
      details: JSON.stringify(details),
    },
  });
}
