const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyUrl, companyName } = await req.json();
    
    if (!companyUrl && !companyName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company URL or name required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!apiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'RapidAPI key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching company data:', companyUrl || companyName);

    const response = await fetch('https://linkedin-data-api.p.rapidapi.com/get-company-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      body: JSON.stringify({
        link: companyUrl,
        username: companyName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RapidAPI error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `LinkedIn API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Company data:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching company:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
