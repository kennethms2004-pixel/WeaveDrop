import { HomeScreen } from "@/components/brains/home-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  const initialTab = tab === "personal" ? "personal" : "overview";

  return <HomeScreen key={initialTab} initialTab={initialTab} />;
}
