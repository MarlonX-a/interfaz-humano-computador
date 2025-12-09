// Edge Function: Create Tripo3D task for image-to-model generation
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
    const { imageToken, apiKey } = await req.json();

    if (!imageToken) {
      return new Response(
        JSON.stringify({ error: "imageToken is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "apiKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating Tripo3D task...");

    const taskResponse = await fetch(`${TRIPO_API_URL}/task`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image_to_model",
        file: {
          type: "image",
          file_token: imageToken,
        },
      }),
    });

    const responseText = await taskResponse.text();
    console.log("Tripo3D task response status:", taskResponse.status);

    if (!taskResponse.ok) {
      console.error("Tripo3D task error:", responseText);
      return new Response(
        JSON.stringify({ error: `Tripo3D error: ${responseText}` }),
        { status: taskResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(responseText);
    console.log("Task created, task_id:", data.data?.task_id ? "obtained" : "missing");

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
