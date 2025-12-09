// Edge Function: Upload image to Tripo3D and get image token
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
    const { imageBase64, apiKey } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "apiKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing image for Tripo3D upload...");

    // Parse base64 data URL to get raw binary
    const base64Match = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(
        JSON.stringify({ error: "Invalid base64 data URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine file extension from mime type
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[mimeType] || 'png';
    const filename = `upload.${ext}`;

    console.log(`Image type: ${mimeType}, size: ${bytes.length} bytes`);
    console.log(`API Key format check: starts with 'tsk_' = ${apiKey.startsWith('tsk_')}, length = ${apiKey.length}`);

    // Create FormData with the file
    const formData = new FormData();
    const blob = new Blob([bytes], { type: mimeType });
    formData.append('file', blob, filename);

    console.log("Uploading to Tripo3D...");

    const uploadResponse = await fetch(`${TRIPO_API_URL}/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const responseText = await uploadResponse.text();
    console.log("Tripo3D upload response status:", uploadResponse.status);
    console.log("Tripo3D full response:", responseText);

    if (!uploadResponse.ok) {
      console.error("Tripo3D upload error:", responseText);
      // Return the actual error from Tripo3D so the user can see it
      return new Response(
        JSON.stringify({ 
          error: `Tripo3D API error (${uploadResponse.status}): ${responseText}`,
          details: responseText,
          hint: uploadResponse.status === 401 ? "Verifica que tu API Key de Tripo3D sea válida. Debe empezar con 'tsk_'" : undefined
        }),
        { status: uploadResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = JSON.parse(responseText);
    console.log("Upload successful, image_token:", data.data?.image_token ? "obtained" : "missing");

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
