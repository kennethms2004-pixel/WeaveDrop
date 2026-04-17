import { HomeScreen } from "@/components/brains/home-screen";

type BrainCanvasPageProps = {
  params: Promise<{
    brainId: string;
  }>;
};

export default async function BrainCanvasPage({ params }: BrainCanvasPageProps) {
  const { brainId } = await params;

  return <HomeScreen key={brainId} selectedBrainId={brainId} />;
}
