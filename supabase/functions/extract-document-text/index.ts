import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { API_KEYS, corsHeaders } from "../_shared/api-clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, fileUrl, fileName } = await req.json();
    if (!documentId || !fileUrl) throw new Error("Missing params");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("company_documents").update({
      extraction_status: "processing",
    }).eq("id", documentId);

    const fcKey = API_KEYS.FIRECRAWL || Deno.env.get("FIRECRAWL_API_KEY");
    let extractedText = "";

    // 1. Try Firecrawl for PDFs/Docs if Key exists
    if (fcKey && fileName.match(/\.(pdf|docx)$/i)) {
      try {
        const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fcKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: fileUrl,
            formats: ["markdown", "rawHtml"],
          }),
        });
        if (fcResp.ok) {
          const data = await fcResp.json();
          extractedText = data.data?.markdown || "";
        }
      } catch (e) {
        console.error("Firecrawl Extract Failed", e);
      }
    }

    // 2. Fallback: Parse Text/MD or generic binary string
    if (!extractedText) {
      const fileResp = await fetch(fileUrl);
      const buff = await fileResp.arrayBuffer();

      if (fileName.toLowerCase().endsWith(".pdf")) {
        // PDF Parse Implementation
        try {
          // @ts-ignore: npm import
          const { Buffer } = await import("node:buffer");
          // @ts-ignore: npm import
          const pdf = (await import("npm:pdf-parse@1.1.1")).default;
          const data = await pdf(Buffer.from(buff));
          extractedText = data.text;
        } catch (e) {
          console.error("PDF Parse Failed", e);
          // Fallback to text decoder if pdf-parse fails (unlikely but safe)
          extractedText = new TextDecoder().decode(buff);
        }
      } else {
        // Text/MD/Other
        extractedText = new TextDecoder().decode(buff);
      }

      // Basic cleanup
      extractedText = extractedText.replace(/\x00/g, "").trim().substring(
        0,
        1000000,
      );
    }

    await supabase.from("company_documents").update({
      extracted_content: extractedText || null,
      extraction_status: extractedText ? "completed" : "failed",
    }).eq("id", documentId);

    return new Response(
      JSON.stringify({
        success: true,
        charCount: extractedText.length,
        extractedText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
