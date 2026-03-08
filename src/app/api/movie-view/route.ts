import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { movieId } = await req.json();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc("increment_movie_views", {
      movie_id_input: movieId,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update views" });
  }
}