import type { Metadata } from "next";
import { RestaurantsView } from "@/components/admin/restaurants-view";

export const metadata: Metadata = { title: "Restaurants" };

export default function AdminRestaurantsPage() {
  return <RestaurantsView />;
}
