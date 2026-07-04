import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Kitchen view feed — session-authenticated; RLS scopes rows to the tenant.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
  }
  return NextResponse.json({ orders });
}
