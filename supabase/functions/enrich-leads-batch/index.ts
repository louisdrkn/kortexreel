import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { serveFunction } from "../_shared/server-utils.ts";
import { createClient } from "../_shared/supabase-client.ts";

async function determineJobTitles(gemini: GeminiClient, context: any) {
  const systemPrompt = `You are a B2B Strategy Expert.
    Identify the 5 best LinkedIn Job Titles to target for this offer.
    Start with the highest relevant Decision Maker (CEO, VP, Director).
    
    OUTPUT JSON ONLY:
    {
      "job_titles": ["Title 1", "Title 2"],
      "reasoning": "Why?"
    }`;

  try {
    const data = await gemini.generateJSON(
      `OFFER: ${context.pitch}\nTarget: ${context.targetDescription}\nFunctions: ${
        context.functions?.join(", ")
      }`,
      GEMINI_MODELS.ULTRA,
      systemPrompt,
    );
    return data.job_titles || ["CEO", "Directeur Général"];
  } catch (e) {
    console.error("Gemini Job Title Error", e);
    return ["CEO", "Directeur Général", "Founder"];
  }
}

async function findDecisionMaker(
  companyName: string,
  domain: string,
  jobTitles: string[],
  magileadsKey: string,
) {
  try {
    const resp = await fetch(
      "https://api.magileads.com/api/v1/contacts/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${magileadsKey}`,
        },
        body: JSON.stringify({
          company_name: domain || companyName,
          job_title: jobTitles,
        }),
      },
    );

    if (!resp.ok) {
      // Log but don't crash
      console.warn(`[MAGILEADS] Failed for ${companyName}: ${resp.status}`);
      return { success: false, error: `API Error ${resp.status}` };
    }

    const data = await resp.json();
    const contacts = data.data || data.contacts || [];
    if (contacts.length === 0) return { success: false };

    const best = contacts[0];
    return {
      success: true,
      decisionMaker: {
        firstName: best.first_name,
        lastName: best.last_name,
        fullName: best.full_name || `${best.first_name} ${best.last_name}`,
        email: best.email,
        linkedinUrl: best.linkedin_url,
        jobTitle: best.job_title,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

serveFunction(async (req) => {
  const { projectId, companyIds, limit = 10 } = await req.json();
  const magileadsKey = Deno.env.get("MAGILEADS_API_KEY");
  if (!magileadsKey) throw new Error("Missing Magileads Key");

  const supabase = createClient(req);
  const gemini = new GeminiClient(API_KEYS.GEMINI);

  // Get Context
  const { data: pData } = await supabase.from("project_data").select(
    "data_type, data",
  ).eq("project_id", projectId);
  const agency_dna = pData?.find((d: any) =>
    d.data_type === "agency_dna"
  )?.data || {};
  const target_criteria =
    pData?.find((d: any) => d.data_type === "target_criteria")?.data || {};

  // 1. Get Job Titles (Gemini)
  const jobTitles = await determineJobTitles(gemini, {
    pitch: agency_dna.pitch,
    targetDescription: target_criteria.targetDescription,
    functions: target_criteria.functions,
  });

  // 2. Fetch Companies
  let q = supabase.from("company_analyses").select("*").eq(
    "project_id",
    projectId,
  ).is("custom_hook", null).limit(limit);
  if (companyIds) q = q.in("id", companyIds);
  const { data: companies } = await q;

  if (!companies?.length) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "No companies found to enrich",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 3. Batch Process with Limit
  // Process in chunks of 5 to avoid API rate limits and memory spikes, but better than sequential
  const chunkSize = 5;
  const results = [];

  for (let i = 0; i < companies.length; i += chunkSize) {
    const chunk = companies.slice(i, i + chunkSize);
    const promises = chunk.map(async (comp: any) => {
      let domain = comp.company_url?.replace(/^(https?:\/\/)?(www\.)?/, "")
        .split("/")[0];
      const dmResult = await findDecisionMaker(
        comp.company_name,
        domain,
        jobTitles,
        magileadsKey,
      );

      if (dmResult.success && dmResult.decisionMaker) {
        await supabase.from("company_analyses").update({
          custom_hook: JSON.stringify({
            decisionMaker: dmResult.decisionMaker,
          }),
          analysis_status: "enriched",
        }).eq("id", comp.id);
        return { name: comp.company_name, dm: dmResult.decisionMaker.fullName };
      } else {
        return { name: comp.company_name, status: "No DM found" };
      }
    });

    const chunkResults = await Promise.allSettled(promises);
    results.push(...chunkResults.map((r) =>
      r.status === "fulfilled" ? r.value : { error: r.reason }
    ));
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
