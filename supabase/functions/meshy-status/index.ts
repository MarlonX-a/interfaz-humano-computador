// Edge Function: Check Meshy.ai task status
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MESHY_API_URL = "https://api.meshy.ai/openapi/v1";

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

    console.log("Checking Meshy task status:", taskId);

    const statusResponse = await fetch(`${MESHY_API_URL}/image-to-3d/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const responseText = await statusResponse.text();
    console.log("Meshy status response:", statusResponse.status);

    if (!statusResponse.ok) {
      console.error("Meshy status error:", responseText);
      return new Response(
        JSON.stringify({ error: `Meshy API error: ${responseText}` }),
        { status: statusResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(responseText);
    console.log("Task status:", data.status, "Progress:", data.progress);

    // Return normalized response
    return new Response(
      JSON.stringify({
        status: data.status, // PENDING, IN_PROGRESS, SUCCEEDED, FAILED
        progress: data.progress || 0,
        modelUrl: data.model_urls?.glb || null,
        thumbnailUrl: data.thumbnail_url || null,
        error: data.task_error?.message || null,
      }),
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
