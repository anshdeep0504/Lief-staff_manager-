import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET: Return latest manager settings (perimeter)
export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

    // Verify requester identity
    const requesterClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await requesterClient.auth.getUser();
    const requesterEmail = userData?.user?.email;
    if (!requesterEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check manager membership
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: managerRow } = await serviceClient
      .from("managers")
      .select("email")
      .eq("email", requesterEmail)
      .maybeSingle();
    if (!managerRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await serviceClient
      .from("manager_settings")
      .select("id, perimeter_lat, perimeter_long, radius_km, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ settings: data || null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Upsert manager settings (perimeter)
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { perimeter_lat, perimeter_long, radius_km } = body || {};

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

    // Verify requester identity
    const requesterClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await requesterClient.auth.getUser();
    const requesterEmail = userData?.user?.email;
    if (!requesterEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check manager membership
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: managerRow } = await serviceClient
      .from("managers")
      .select("email")
      .eq("email", requesterEmail)
      .maybeSingle();
    if (!managerRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // If request contains null values, treat as clear action
    const isClear = [perimeter_lat, perimeter_long, radius_km].some((v) => v === null || typeof v === 'undefined');

    // Upsert: update latest if exists, else insert new; if clear, delete latest
    const { data: existing } = await serviceClient
      .from("manager_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isClear) {
      if (existing?.id) {
        const { error } = await serviceClient
          .from("manager_settings")
          .delete()
          .eq("id", existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ settings: null });
    }

    if (typeof perimeter_lat !== "number" || typeof perimeter_long !== "number" || typeof radius_km !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (existing?.id) {
      const { data, error } = await serviceClient
        .from("manager_settings")
        .update({ perimeter_lat, perimeter_long, radius_km })
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ settings: data });
    } else {
      const { data, error } = await serviceClient
        .from("manager_settings")
        .insert([{ perimeter_lat, perimeter_long, radius_km }])
        .select()
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ settings: data });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Clear manager settings
export async function DELETE(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

    const requesterClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await requesterClient.auth.getUser();
    const requesterEmail = userData?.user?.email;
    if (!requesterEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: managerRow } = await serviceClient
      .from("managers")
      .select("email")
      .eq("email", requesterEmail)
      .maybeSingle();
    if (!managerRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: existing } = await serviceClient
      .from("manager_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await serviceClient
        .from("manager_settings")
        .delete()
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ settings: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


