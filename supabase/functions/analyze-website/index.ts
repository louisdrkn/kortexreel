import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebsiteAnalysis {
  summary: string;
  value_proposition: string;
  target_audience: string;
  tech_stack_detected: string[];
  quality_score: "High" | "Medium" | "Low/Beta";
  extraction_method: "text" | "vision" | "hybrid";
  raw_content?: string;
}

function formatUrl(url: string): string {
  let formattedUrl = url.trim();
  if (
    !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")
  ) {
    formattedUrl = `https://${formattedUrl}`;
  }
  return formattedUrl;
}

async function scrapeWithFirecrawl(
  url: string,
  apiKey: string,
): Promise<{ text: string; screenshot?: string; success: boolean }> {
  if (!apiKey) return { text: "", success: false };

  try {
    console.log("[analyze-website] Scrape:", url);
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "screenshot"],
        onlyMainContent: true,
        timeout: 30000,
      }),
    });

    if (!response.ok) return { text: "", success: false };

    const data = await response.json();
    return {
      text: data.data?.markdown || "",
      screenshot: data.data?.screenshot,
      success: !!data.data?.markdown,
    };
  } catch (error) {
    console.error("[analyze-website] Scrape Error:", error);
    return { text: "", success: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, projectId } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!projectId) {
      console.warn(
        "[analyze-website] Warning: No projectId provided. Results will not be saved to persistent memory.",
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const firecrawlKey = API_KEYS.FIRECRAWL ||
      Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      throw new Error("Firecrawl API Key missing");
    }

    const formattedUrl = formatUrl(url);
    console.log(`[analyze-website] Target: ${formattedUrl}`);

    // Scrape
    const scrapeResult = await scrapeWithFirecrawl(formattedUrl, firecrawlKey);

    // 1. SAVE TO FIRECRAWL LOGS (Raw Memory)
    if (projectId && scrapeResult.success) {
      try {
        await supabase.from("firecrawl_logs").insert({
          project_id: projectId,
          url: formattedUrl,
          operation_type: "scrape",
          markdown: scrapeResult.text,
          screenshot_url: scrapeResult.screenshot,
          metadata: {
            source: "analyze-website",
            timestamp: new Date().toISOString(),
          },
        });
        console.log("[analyze-website] ✅ Logged raw crawl to firecrawl_logs");
      } catch (logErr) {
        console.error(
          "[analyze-website] ❌ Failed to log to firecrawl_logs:",
          logErr,
        );
      }
    }

    let analysis: WebsiteAnalysis | null = null;
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    if (scrapeResult.success && scrapeResult.text.length > 200) {
      console.log("[analyze-website] Analyzing with Gemini 3.0 Pro...");
      try {
        const systemPrompt = `You are Kortex. Analyze this website content.
         OUTPUT JSON ONLY:
         {
           "summary": "Concise description (1-2 sentences)",
           "value_proposition": "Main value prop",
           "target_audience": "Ideally who they sell to",
           "tech_stack_detected": ["Tech 1", "Tech 2"],
           "quality_score": "High" (or Medium/Low)
         }`;

        const aiData = await gemini.generateJSON<WebsiteAnalysis>(
          `URL: ${formattedUrl}\nCONTENT:\n${
            scrapeResult.text.slice(0, 30000)
          }`,
          GEMINI_MODELS.ULTRA,
          systemPrompt,
        );

        analysis = {
          ...aiData,
          extraction_method: "text",
          raw_content: scrapeResult.text.slice(0, 5000),
        };
      } catch (e) {
        console.error("[analyze-website] AI Failure:", e);
      }
    }

    // 2. SAVE TO WEBSITE PAGES (Structured Memory with Vector)
    if (projectId && analysis && scrapeResult.success) {
      try {
        console.log(
          "[analyze-website] 🧠 Generating embedding for website content...",
        );
        // Embed the first 5000 chars of content + summary to represent the page
        const textToEmbed = `Title: ${analysis.summary}\nContent: ${
          scrapeResult.text.slice(0, 8000)
        }`;
        const embedding = await gemini.embedContent(textToEmbed);

        await supabase.from("website_pages").upsert({
          project_id: projectId,
          url: formattedUrl,
          title: analysis.summary.slice(0, 200), // Approximate title from summary
          content: scrapeResult.text, // Store full markdown
          embedding: embedding,
          last_crawled_at: new Date().toISOString(),
        }, { onConflict: "project_id, url" });

        console.log(
          "[analyze-website] ✅ Saved vectorized page to website_pages",
        );
      } catch (dbError) {
        console.error(
          "[analyze-website] ❌ Failed to save to website_pages:",
          dbError,
        );
      }
    }

    // Fallback
    if (!analysis) {
      analysis = {
        summary: `Site: ${formattedUrl}`,
        value_proposition: "Analysis unavailable",
        target_audience: "Unknown",
        tech_stack_detected: [],
        quality_score: "Low/Beta",
        extraction_method: "text",
        raw_content: scrapeResult.text.slice(0, 1000),
      };
    }

    return new Response(
      JSON.stringify({ success: true, url: formattedUrl, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[analyze-website] Fatal:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
