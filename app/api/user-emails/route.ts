import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  const { userIds } = await req.json().catch(() => ({ userIds: [] }));
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  // Verify requester identity
  const requesterClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await requesterClient.auth.getUser();
  const requesterEmail = userData?.user?.email;
  if (!requesterEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check manager membership
  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: managerRow, error: managerError } = await serviceClient
    .from("managers")
    .select("email")
    .eq("email", requesterEmail)
    .maybeSingle();
  if (managerError || !managerRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve emails for provided user IDs
  const idToEmail: Record<string, string> = {};
  for (const id of userIds) {
    try {
      const { data } = await serviceClient.auth.admin.getUserById(id);
      const email = data?.user?.email;
      if (email) idToEmail[id] = email;
    } catch {
      // ignore missing or errors
    }
  }

  return NextResponse.json({ idToEmail });
}


