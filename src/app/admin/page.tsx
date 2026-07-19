import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Vue d'ensemble" };

// Dynamically imported so Recharts (pulled in by OverviewView) ships as its
// own async chunk instead of inflating /admin's initial route JS.
const OverviewView = dynamic(
  () => import("@/components/admin/overview-view").then((m) => m.OverviewView),
  { loading: () => <Skeleton className="mt-6 h-[600px] w-full rounded-2xl" /> },
);

export default function AdminOverviewPage() {
  return <OverviewView />;
}
