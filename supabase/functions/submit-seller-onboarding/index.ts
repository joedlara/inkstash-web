// Submit seller onboarding and mark user as verified seller
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Create Supabase client with user auth context to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service role to bypass RLS for updating users table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    const body = await req.json();
    const { agreedToTerms, plaidBankToken, plaidIdentityToken, status } = body;

    console.log('Processing onboarding submission for user:', user.id);
    console.log('Request data:', { agreedToTerms, hasBankToken: !!plaidBankToken, hasIdentityToken: !!plaidIdentityToken, status });

    // Update seller_onboarding table with final submission (uses user context for RLS)
    const { data: onboardingData, error: onboardingError } = await supabaseClient
      .from('seller_onboarding')
      .upsert({
        user_id: user.id,
        agreed_to_terms: agreedToTerms,
        status: 'verified', // Always set to verified when submitting
        current_step: 3, // Mark as completed final step
        bank_connected: !!plaidBankToken,
        identity_verified: !!plaidIdentityToken,
      }, {
        onConflict: 'user_id',
      })
      .select();

    if (onboardingError) {
      console.error('Error updating seller_onboarding:', onboardingError);
      throw onboardingError;
    }
    console.log('✓ seller_onboarding updated successfully:', onboardingData);

    // Update users table to mark as verified seller (uses admin/service role to bypass RLS)
    console.log('Updating users table for user:', user.id);
    const { data: userData, error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        seller_verified: true,
        seller_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, seller_verified, seller_verified_at');

    if (userUpdateError) {
      console.error('Error updating users table:', userUpdateError);
      throw userUpdateError;
    }
    console.log('✓ users table updated successfully:', userData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Seller onboarding completed successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error submitting seller onboarding:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
