import { ListDetailView } from "./ListDetailView";
import { useListDetailController } from "./hooks/useListDetailController";

interface ListDetailPageProps {
  listId: number;
  country?: string | null;
}

export function ListDetailPage({ listId, country }: ListDetailPageProps) {
  const controller = useListDetailController({ listId, country });
  return <ListDetailView controller={controller} />;
}
