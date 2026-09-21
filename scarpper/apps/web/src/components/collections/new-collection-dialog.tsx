"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useActiveWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export function NewCollectionDialog({ triggerLabel = "New collection" }: { triggerLabel?: string }) {
  const { workspace } = useActiveWorkspace();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldsText, setFieldsText] = useState("title: string\ndescription: string\nurl: string");

  const create = useMutation({
    mutationFn: () => {
      const fields = fieldsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [rawName, rawType] = line.split(":").map((s) => s.trim());
          return {
            name: rawName.replace(/[^a-zA-Z0-9_]/g, "_"),
            type: (["string", "number", "boolean", "array"].includes(rawType) ? rawType : "string") as string
          };
        });
      return api.post(`/api/workspaces/${workspace.id}/collections`, {
        name,
        description: description || undefined,
        schemaDefinition: { fields }
      });
    },
    onSuccess: () => {
      toast.success("Collection created");
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (err) => toast.error((err as Error).message)
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>Define the target schema. Fields are one per line as name: type.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <Textarea rows={5} value={fieldsText} onChange={(e) => setFieldsText(e.target.value)} className="font-mono text-xs" />
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || !name}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
