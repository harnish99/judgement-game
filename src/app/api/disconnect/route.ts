/**
 * POST/GET /api/disconnect?playerId=...&roomId=...
 *
 * Called via navigator.sendBeacon on page unload so the player is marked
 * as disconnected even if the JS fetch can't complete normally.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function handle(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");
  const roomId   = searchParams.get("roomId");

  if (!playerId || !roomId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return NextResponse.json({ ok: true });

  // Untyped client — intentional: this route is a fire-and-forget
  // server action that doesn't benefit from strict DB generics here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient(url, key) as any;

  await db
    .from("players")
    .update({ status: "disconnected", last_seen_at: new Date().toISOString() })
    .eq("id", playerId);

  const { data: leavingPlayer } = await db
    .from("players")
    .select("is_host")
    .eq("id", playerId)
    .single();

  if (leavingPlayer?.is_host) {
    const { data: remaining } = await db
      .from("players")
      .select("id")
      .eq("room_id", roomId)
      .eq("status", "connected")
      .neq("id", playerId)
      .order("player_order")
      .limit(1);

    if (remaining?.length > 0) {
      await db.from("players").update({ is_host: true }).eq("id", remaining[0].id);
      await db.from("rooms").update({ host_player_id: remaining[0].id }).eq("id", roomId);
    } else {
      await db.from("rooms").delete().eq("id", roomId);
    }
  }

  return NextResponse.json({ ok: true });
}

export const GET  = handle;
export const POST = handle;
