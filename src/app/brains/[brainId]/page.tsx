import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { HomeScreen } from "@/components/brains/home-screen";
import {
  getBrainById,
  listBrainsForUser,
  touchBrainLastOpened,
} from "@/lib/actions/brain.actions";
import { listEdgesForBrain } from "@/lib/actions/edge.actions";
import { listNodesForBrain } from "@/lib/actions/node.actions";
import type { BrainDTO, EdgeDTO, NodeDTO } from "@/lib/actions/dto";

type BrainCanvasPageProps = {
  params: Promise<{
    brainId: string;
  }>;
};

export default async function BrainCanvasPage({ params }: BrainCanvasPageProps) {
  const { brainId } = await params;

  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const [brain, initialBrains, initialNodes, initialEdges] = await Promise.all([
    getBrainById(brainId),
    listBrainsForUser(),
    listNodesForBrain(brainId),
    listEdgesForBrain(brainId),
  ]);

  if (!brain) {
    redirect("/");
  }

  // Fire-and-forget: don't block the page render on this metadata write.
  void touchBrainLastOpened(brainId).catch(() => {
    /* ignore */
  });

  const selectedBrain: BrainDTO = brain;
  const typedInitialNodes: NodeDTO[] = initialNodes;
  const typedInitialEdges: EdgeDTO[] = initialEdges;

  return (
    <HomeScreen
      key={brainId}
      initialBrains={initialBrains}
      selectedBrain={selectedBrain}
      selectedBrainNodes={typedInitialNodes}
      selectedBrainEdges={typedInitialEdges}
    />
  );
}
