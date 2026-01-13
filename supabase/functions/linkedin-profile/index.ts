const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileUrl, username } = await req.json();
    
    if (!profileUrl && !username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile URL or username required' }),
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

    console.log('Fetching profile:', profileUrl || username);

    const response = await fetch('https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      body: JSON.stringify({
        link: profileUrl,
        username: username,
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
    console.log('Profile data:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
