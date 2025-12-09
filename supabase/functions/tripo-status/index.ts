// Edge Function: Check Tripo3D task status
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TRIPO_API_URL = "https://api.tripo3d.ai/v2/openapi";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { taskId, apiKey } = await req.json();

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "taskId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "apiKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusResponse = await fetch(`${TRIPO_API_URL}/task/${taskId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const responseText = await statusResponse.text();

    if (!statusResponse.ok) {
      console.error("Tripo3D status error:", responseText);
      return new Response(
        JSON.stringify({ error: `Tripo3D error: ${responseText}` }),
        { status: statusResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(responseText);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
