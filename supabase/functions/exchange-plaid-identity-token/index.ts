// Supabase Edge Function to exchange Plaid identity verification token
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

    console.log('Exchanging Plaid identity verification public token');

    // For identity verification, we don't exchange the public token like with bank accounts
    // Instead, we get the verification status from Plaid

    // First, exchange the public token to get the access token
    const exchangeResponse = await fetch(`https://${PLAID_ENV}.plaid.com/item/public_token/exchange`, {
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

    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.text();
      console.error('Plaid token exchange error:', errorData);
      throw new Error(`Plaid token exchange error: ${errorData}`);
    }

    const exchangeData = await exchangeResponse.json();

    // Get the identity verification status
    // Note: You'll need to track the verification ID from when you created the verification
    // For now, we'll just store the access token

    // Store the access token in the database
    const { error: dbError } = await supabaseClient
      .from('seller_plaid_tokens')
      .upsert({
        user_id: user.id,
        plaid_access_token: exchangeData.access_token,
        plaid_item_id: exchangeData.item_id,
        token_type: 'identity',
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Error storing Plaid identity token in database:', dbError);
      // Continue even if database storage fails
    }

    console.log('Plaid identity token exchanged successfully');

    return new Response(
      JSON.stringify({
        access_token: exchangeData.access_token,
        item_id: exchangeData.item_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error exchanging Plaid identity token:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to exchange Plaid identity token',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
