import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
SQL for Supabase (run in SQL editor):
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  message_content TEXT,
  rating TEXT CHECK (rating IN ('positive', 'negative')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_user_id ON chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_message_id ON chat_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_created_at ON chat_feedback(created_at);
*/

interface FeedbackRequest {
  messageId: string;
  rating: 'positive' | 'negative';
  messageContent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();
    const { messageId, rating, messageContent } = body;

    // Validate input
    if (!messageId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId and rating' },
        { status: 400 }
      );
    }

    if (!['positive', 'negative'].includes(rating)) {
      return NextResponse.json(
        { error: 'Rating must be either "positive" or "negative"' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user (optional - feedback can be anonymous)
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Insert feedback into database
    const { error, data } = await supabase
      .from('chat_feedback')
      .insert({
        user_id: userId,
        message_id: messageId,
        message_content: messageContent || null,
        rating,
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Feedback recorded successfully',
        feedbackId: data?.[0]?.id 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
