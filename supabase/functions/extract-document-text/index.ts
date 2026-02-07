import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { API_KEYS, corsHeaders } from "../_shared/api-clients.ts";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.mjs/+esm";

// Set worker for PDF.js - CRITICAL for Edge Runtime
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-ignore: pdf.js types
        .map((item) => item.str)
        .join(" ");
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    return fullText;
  } catch (error) {
    console.error("PDF.js Extraction Failed:", error);
    throw new Error("Failed to parse PDF content");
  }
}

Deno.serve(async (req) => {
  // 1. CORS Pre-flight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Input Validation
    const { documentId, fileUrl, fileName, projectId } = await req.json();

    // CRITICAL SECURITY CHECK
    if (
      !documentId || !fileUrl || !projectId || projectId === "undefined" ||
      projectId === "null"
    ) {
      console.error("[EXTRACT] ❌ Missing or Invalid parameters:", {
        documentId,
        fileUrl,
        projectId,
      });
      throw new Error(
        "Missing required parameters: documentId, fileUrl, or projectId (cannot be null/undefined)",
      );
    }

    console.log(
      `[EXTRACT] Processing: ${fileName} (Doc: ${documentId}) for Project: ${projectId}`,
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Update status to processing
    await supabase.from("company_documents").update({
      extraction_status: "processing",
    }).eq("id", documentId);

    const fcKey = API_KEYS.FIRECRAWL || Deno.env.get("FIRECRAWL_API_KEY");
    let extractedText = "";

    // 3. Extraction Strategy
    // Strategy A: Firecrawl (Best for complex PDFs if key exists)
    if (fcKey && fileName.match(/\.(pdf|docx)$/i)) {
      console.log("[EXTRACT] Strategy A: Firecrawl");
      try {
        const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fcKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: fileUrl,
            formats: ["markdown"],
          }),
        });
        if (fcResp.ok) {
          const data = await fcResp.json();
          extractedText = data.data?.markdown || "";
          console.log(
            `[EXTRACT] Firecrawl success: ${extractedText.length} chars`,
          );
        } else {
          console.warn(`[EXTRACT] Firecrawl failed status: ${fcResp.status}`);
        }
      } catch (e) {
        console.error("[EXTRACT] Firecrawl error:", e);
      }
    }

    // Strategy B: PDF.js (Robust local parsing)
    if (!extractedText && fileName.toLowerCase().endsWith(".pdf")) {
      console.log("[EXTRACT] Strategy B: PDF.js");
      try {
        const fileResp = await fetch(fileUrl);
        if (!fileResp.ok) {
          throw new Error("Failed to download file from Storage");
        }

        const buff = await fileResp.arrayBuffer();
        extractedText = await extractTextFromPDF(buff);
        console.log(`[EXTRACT] PDF.js success: ${extractedText.length} chars`);
      } catch (e) {
        console.error("[EXTRACT] PDF.js error:", e);
        // Do NOT fall back to TextDecoder for PDFs - it causes binary garbage (User Issue #1)
      }
    }

    // Strategy C: Text/Markdown (Simple decode)
    if (!extractedText && !fileName.toLowerCase().endsWith(".pdf")) {
      console.log("[EXTRACT] Strategy C: TextDecoder (Non-PDF)");
      const fileResp = await fetch(fileUrl);
      const buff = await fileResp.arrayBuffer();
      extractedText = new TextDecoder().decode(buff);
    }

    // 4. Quality Control (User Issue #3)
    // 4. Quality Control & Cleaning
    // Clean null bytes and trim
    extractedText = extractedText.replace(/\x00/g, "").trim();

    // GEMINI NOTES CLEANING (Citations & Timestamps)
    // Removes: 【13:0†source】 and (00:12:30)
    extractedText = extractedText
      .replace(/【\d+:\d+†source】/g, "") // Remove Gemini citations
      .replace(/\(\d{2}:\d{2}:\d{2}\)/g, ""); // Remove timestamps

    // STRICT CHECK: Fail if text is empty or too short
    if (!extractedText || extractedText.length < 50) {
      console.error(
        "[EXTRACT] 🚨 CRITICAL: Extraction yielded empty or insufficient text.",
      );

      await supabase.from("company_documents").update({
        extraction_status: "failed",
        extraction_error:
          "Extraction yielded empty text (likely scanned PDF or corrupted file)",
        extracted_content: null, // Ensure we don't save garbage
      }).eq("id", documentId);

      throw new Error("Extraction failed: Output text is empty or too short");
    }

    // 5. Save Success
    const { data: updatedDoc, error: updateError } = await supabase.from(
      "company_documents",
    ).update({
      extracted_content: extractedText,
      extraction_status: "completed",
      project_id: projectId, // EXPLICITLY set project_id to ensure it's not NULL
    })
      .eq("id", documentId)
      .select()
      .single();

    if (updateError) {
      console.error("[EXTRACT] DB Update Error:", updateError);
      throw updateError;
    }

    // 6. Vectorization (Optional but recommended)
    // Only proceed if extraction was truly successful
    if (extractedText) {
      try {
        const { GeminiClient } = await import("../_shared/api-clients.ts");
        const gemini = new GeminiClient(API_KEYS.GEMINI);

        console.log("[EXTRACT] Starting Vectorization...");
        // Delete existing chunks
        await supabase.from("company_document_chunks").delete().eq(
          "document_id",
          documentId,
        );

        const chunkSize = 1000;
        const overlap = 100;
        const chunks: string[] = [];

        for (let i = 0; i < extractedText.length; i += chunkSize - overlap) {
          const chunk = extractedText.substring(i, i + chunkSize);
          if (chunk.trim().length > 50) chunks.push(chunk);
        }

        console.log(`[EXTRACT] Embedding ${chunks.length} chunks...`);

        // Serial processing for safety
        for (let i = 0; i < chunks.length; i++) {
          const chunkContent = chunks[i];
          try {
            const embedding = await gemini.embedContent(chunkContent);
            await supabase.from("company_document_chunks").insert({
              document_id: documentId,
              project_id: projectId, // Ensure orphan prevention
              content: chunkContent,
              embedding: embedding,
              chunk_index: i,
            });
          } catch (err) {
            console.warn(`[EXTRACT] Chunk ${i} embedding failed:`, err);
          }
        }
        console.log("[EXTRACT] Vectorization complete.");
      } catch (vecError) {
        console.error("[EXTRACT] Vectorization Setup Error:", vecError);
      }
    }

    // 7. DEEP MEMORY (Trigger Insight Mining)
    if (extractedText) {
      console.log("[EXTRACT] 🧠 Triggering Deep Memory Mining...");
      // Fire and forget - don't block the response
      fetch(
        `${
          Deno.env.get("SUPABASE_URL")
        }/functions/v1/process-document-insights`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
            }`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentId, projectId }),
        },
      ).catch((err) =>
        console.error("[EXTRACT] 🚨 Failed to trigger insights:", err)
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        charCount: extractedText.length,
        document: updatedDoc, // Return full object for frontend verification
        projectId: projectId,
        message: "Extraction and processing complete",
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
