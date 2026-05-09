import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify the caller via JWT claims (no server session needed)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Check caller is super_admin
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { email, password, full_name, role, department, designation, phone, batch_id, student_id } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, full_name, role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['teacher', 'student'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Role must be teacher or student' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = newUser.user.id;

    // Update profile (created by trigger)
    const profileUpdate: Record<string, unknown> = {
      full_name,
      department: department || null,
    };
    if (designation) profileUpdate.designation = designation;
    if (phone) profileUpdate.phone = phone;
    if (batch_id) profileUpdate.batch_id = batch_id;
    if (student_id) profileUpdate.student_id = student_id;

    await adminClient.from('profiles').update(profileUpdate).eq('id', userId);

    // Insert role
    const { error: roleErr } = await adminClient.from('user_roles').insert({
      user_id: userId,
      role,
    });

    if (roleErr) {
      return new Response(JSON.stringify({ error: `User created but role assignment failed: ${roleErr.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-enroll student in semester courses if batch_id is provided
    let enrollmentCount = 0;
    if (role === 'student' && batch_id) {
      try {
        const { data: batch } = await adminClient
          .from('batches')
          .select('semester, department_id')
          .eq('id', batch_id)
          .single();

        if (batch) {
          const { data: courses } = await adminClient
            .from('courses')
            .select('id')
            .eq('semester_number', batch.semester)
            .eq('is_active', true)
            .or(`department_id.eq.${batch.department_id},is_non_departmental.eq.true`);

          if (courses && courses.length > 0) {
            const enrollments = courses.map((c: any) => ({
              student_id: userId,
              course_id: c.id,
            }));

            const { data: inserted } = await adminClient
              .from('enrollments')
              .upsert(enrollments, { onConflict: 'student_id,course_id', ignoreDuplicates: true })
              .select('id');

            enrollmentCount = inserted?.length ?? courses.length;
          }
        }
      } catch (enrollErr) {
        console.error('Auto-enrollment error:', enrollErr);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId, enrollment_count: enrollmentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
