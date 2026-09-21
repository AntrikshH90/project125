"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Database, Layers, Plus, ChevronRight, Hash } from "lucide-react";
import { api } from "@/lib/api";
import { useActiveWorkspace } from "@/lib/workspace-context";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/primitives";
import { NewCollectionDialog } from "@/components/collections/new-collection-dialog";

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  schemaDefinition: { fields?: unknown[]; prompt?: string };
  recordCount: number;
  createdAt: string;
}

export default function CollectionsPage() {
  const { workspace } = useActiveWorkspace();
  const { data, isLoading } = useQuery({
    queryKey: ["collections", workspace.id],
    queryFn: () => api.get<CollectionRow[]>(`/api/workspaces/${workspace.id}/collections`)
  });

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-slate-dim">{data?.length ?? 0} dataset collections</p>
        <NewCollectionDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16">
          <Database className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-slate-dim">No collections yet — create one from the Studio or here.</p>
          <NewCollectionDialog triggerLabel="New collection" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((col) => (
            <Link key={col.id} href={`/collections/${col.id}`}>
              <Card className="group h-full p-5 transition-colors hover:border-amber-accent/40">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-graphite-800">
                    <Database className="h-4 w-4 text-amber-accent" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400" />
                </div>
                <h3 className="mt-3 truncate font-semibold text-slate-text">{col.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-dim">
                  {col.description ?? col.schemaDefinition?.prompt ?? "No description"}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-graphite-700 pt-3">
                  <Badge variant="secondary">
                    <Hash className="mr-1 h-3 w-3" />
                    {col.recordCount} records
                  </Badge>
                  <Badge variant="secondary">
                    <Layers className="mr-1 h-3 w-3" />
                    {(col.schemaDefinition?.fields as unknown[] | undefined)?.length ?? 0} fields
                  </Badge>
                  <span className="ml-auto text-[10px] text-zinc-600">{timeAgo(col.createdAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
