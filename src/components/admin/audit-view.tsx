"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/types";

type AuditRow = AuditLog & { targetRestaurantName: string | null };

async function fetchAudit(action: string, page: number): Promise<{ entries: AuditRow[]; total: number; limit: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (action) params.set("action", action);
  const res = await fetch(`/api/admin/audit?${params}`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export function AuditView() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isPending } = useQuery({
    queryKey: ["admin-audit", action, page],
    queryFn: () => fetchAudit(action, page),
  });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Journal d&apos;audit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Chaque action administrative — suspension, changement de plan, permissions — laisse une trace.
      </p>

      <div className="mt-4">
        <Input
          placeholder="Filtrer par action (ex : restaurant.suspend)"
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          className="w-72"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        {isPending || !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucune entrée.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Restaurant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.map((e) => (
                <Fragment key={e.id}>
                  <TableRow className="cursor-pointer" onClick={() => toggle(e.id)}>
                    <TableCell>
                      {expanded.has(e.id) ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(e.created_at)}</TableCell>
                    <TableCell className="font-medium">{e.action}</TableCell>
                    <TableCell>{e.targetRestaurantName ?? "—"}</TableCell>
                  </TableRow>
                  {expanded.has(e.id) && (
                    <TableRow>
                      <TableCell colSpan={4} className="whitespace-pre-wrap bg-muted/30 font-mono text-xs">
                        {JSON.stringify(e.metadata, null, 2)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
