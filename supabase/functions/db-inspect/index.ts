import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EXTERNAL_DB_URL = Deno.env.get("EXTERNAL_DB_URL");
    if (!EXTERNAL_DB_URL) {
      return new Response(JSON.stringify({ error: "EXTERNAL_DB_URL not configured" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(EXTERNAL_DB_URL);
    await client.connect();

    // List all tables
    const tablesResult = await client.queryObject(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 30
    `);

    // Get columns for each table
    const columnsResult = await client.queryObject(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
      LIMIT 200
    `);

    await client.end();

    return new Response(
      JSON.stringify({ tables: tablesResult.rows, columns: columnsResult.rows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
