// Supabase Edge Function to exchange Plaid public token for access token (Bank)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')!;
const PLAID_SECRET = Deno.env.get('PLAID_SECRET')!;
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the public token from the request body
    const { public_token } = await req.json();

    if (!public_token) {
      throw new Error('No public token provided');
    }

    // Exchange public token for access token
    const plaidResponse = await fetch(`https://${PLAID_ENV}.plaid.com/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({
        public_token,
      }),
    });

    if (!plaidResponse.ok) {
      const errorData = await plaidResponse.text();
      console.error('Plaid token exchange error:', errorData);
      throw new Error(`Plaid token exchange error: ${errorData}`);
    }

    const plaidData = await plaidResponse.json();

    // Store the access token in the database
    // You might want to create a table to store Plaid tokens associated with users
    const { error: dbError } = await supabaseClient
      .from('seller_plaid_tokens')
      .upsert({
        user_id: user.id,
        plaid_access_token: plaidData.access_token,
        plaid_item_id: plaidData.item_id,
        token_type: 'bank',
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      // Continue even if database storage fails - the token exchange was successful
    }

    return new Response(
      JSON.stringify({
        access_token: plaidData.access_token,
        item_id: plaidData.item_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error exchanging Plaid bank token:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to exchange Plaid bank token',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
