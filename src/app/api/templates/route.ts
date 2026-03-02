import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/templates?contactId=xxx — load template for a contact
export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json(
      { error: "contactId is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("contact_templates")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

// POST /api/templates — create or update a template (upsert by contact_id + name)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const {
    contact_id,
    name = "Default",
    visible_fields = {},
    default_values = {},
    custom_field_defs = [],
    pricing_defaults = {},
  } = body;

  if (!contact_id) {
    return NextResponse.json(
      { error: "contact_id is required" },
      { status: 400 }
    );
  }

  // Upsert: if template with same contact_id + name exists, update it
  const { data: existing } = await supabase
    .from("contact_templates")
    .select("id")
    .eq("contact_id", contact_id)
    .eq("user_id", user.id)
    .eq("name", name)
    .maybeSingle();

  let result;

  if (existing) {
    result = await supabase
      .from("contact_templates")
      .update({
        visible_fields,
        default_values,
        custom_field_defs,
        pricing_defaults,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("contact_templates")
      .insert({
        user_id: user.id,
        contact_id,
        name,
        visible_fields,
        default_values,
        custom_field_defs,
        pricing_defaults,
      })
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ template: result.data });
}
