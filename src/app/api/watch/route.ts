import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId, movieId, watchTime, completed } = await req.json();

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("user_watch_history").insert({
      user_id: userId,
      movie_id: movieId,
      watch_time: watchTime,
      completed,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save watch history" });
  }
}