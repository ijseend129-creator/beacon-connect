import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for scheduled messages to send...');

    // Get all pending messages that are due
    const now = new Date().toISOString();
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('Error fetching scheduled messages:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledMessages?.length || 0} messages to send`);

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No scheduled messages to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const scheduled of scheduledMessages) {
      try {
        // Insert the message
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: scheduled.conversation_id,
            sender_id: scheduled.sender_id,
            content: scheduled.content,
            file_url: scheduled.file_url,
            file_name: scheduled.file_name,
            file_type: scheduled.file_type,
            view_once: scheduled.view_once,
          });

        if (insertError) {
          console.error(`Error sending scheduled message ${scheduled.id}:`, insertError);
          errorCount++;
          continue;
        }

        // Update conversation's updated_at
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', scheduled.conversation_id);

        // Mark as sent
        await supabase
          .from('scheduled_messages')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', scheduled.id);

        sentCount++;
        console.log(`Sent scheduled message ${scheduled.id}`);
      } catch (err) {
        console.error(`Failed to process scheduled message ${scheduled.id}:`, err);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${scheduledMessages.length} messages`,
        sent: sentCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-scheduled-messages:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
