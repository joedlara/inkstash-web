// Save current user's seller onboarding progress
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
    // Create Supabase client with auth context
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

    // Parse request body
    const body = await req.json();
    const { currentStep, agreedToTerms, bankConnected, identityVerified } = body;

    // Prepare update data
    const updateData: any = {
      user_id: user.id,
      current_step: currentStep,
      status: 'in_progress',
    };

    if (agreedToTerms !== undefined) {
      updateData.agreed_to_terms = agreedToTerms;
      if (agreedToTerms) {
        updateData.terms_agreed_at = new Date().toISOString();
      }
    }

    if (bankConnected !== undefined) {
      updateData.bank_connected = bankConnected;
      if (bankConnected) {
        updateData.bank_verified_at = new Date().toISOString();
      }
    }

    if (identityVerified !== undefined) {
      updateData.identity_verified = identityVerified;
      if (identityVerified) {
        updateData.identity_verified_at = new Date().toISOString();
      }
    }

    // Upsert the record (insert if doesn't exist, update if it does)
    const { error } = await supabaseClient
      .from('seller_onboarding')
      .upsert(updateData, {
        onConflict: 'user_id',
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
