import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pin } = await req.json();

    // Validate PIN format
    if (!pin || !/^\d{5}$/.test(pin)) {
      console.log("Invalid PIN format received");
      return new Response(
        JSON.stringify({ error: "Invalid PIN format. Must be 5 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Validate PIN and get user info using our secure function
    const { data: userData, error: validateError } = await supabaseAdmin
      .rpc("validate_staff_pin", { p_pin: pin });

    if (validateError) {
      console.error("PIN validation error:", validateError);
      return new Response(
        JSON.stringify({ error: "Failed to validate PIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userData || userData.length === 0) {
      console.log("Invalid PIN - no user found");
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData[0];
    console.log("PIN validated for user:", user.email);

    // Generate a magic link token for the user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
    });

    if (linkError || !linkData) {
      console.error("Failed to generate auth link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the token from the link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    if (!token) {
      console.error("No token in magic link");
      return new Response(
        JSON.stringify({ error: "Failed to generate authentication token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully generated auth token for PIN login");

    return new Response(
      JSON.stringify({ 
        token,
        type,
        email: user.email,
        user_id: user.user_id,
        full_name: user.full_name
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("PIN login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
