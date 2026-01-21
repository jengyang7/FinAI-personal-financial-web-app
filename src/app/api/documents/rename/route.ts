import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
    try {
        // Get authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { documentId, name } = await request.json();

        if (!documentId || !name?.trim()) {
            return NextResponse.json({ error: 'Document ID and name are required' }, { status: 400 });
        }

        // Verify the document belongs to the user
        const { data: document, error: fetchError } = await supabaseAdmin
            .from('documents')
            .select('id, user_id')
            .eq('id', documentId)
            .single();

        if (fetchError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        if (document.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Update the document name
        const { error: updateError } = await supabaseAdmin
            .from('documents')
            .update({
                name: name.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId);

        if (updateError) {
            console.error('Rename error:', updateError);
            return NextResponse.json({ error: 'Failed to rename document' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Rename error:', error);
        return NextResponse.json({ error: 'Rename failed' }, { status: 500 });
    }
}
