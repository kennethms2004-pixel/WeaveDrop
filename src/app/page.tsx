import { auth } from "@clerk/nextjs/server";

import { HomeScreen } from "@/components/brains/home-screen";
import { listBrainsForUser } from "@/lib/actions/brain.actions";
import type { BrainDTO } from "@/lib/actions/dto";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = tab === "personal" ? "personal" : "overview";

  const { userId } = await auth();

  const initialBrains: BrainDTO[] = userId ? await listBrainsForUser() : [];

  return (
    <HomeScreen
      key={initialTab}
      initialBrains={initialBrains}
      initialTab={initialTab}
    />
  );
}
