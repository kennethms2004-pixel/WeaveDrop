import { auth } from "@clerk/nextjs/server";

import { connectToDatabase } from "@/database/mongoose";

export async function requireUserAndDb(): Promise<{ userId: string }> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  await connectToDatabase();

  return { userId };
}
