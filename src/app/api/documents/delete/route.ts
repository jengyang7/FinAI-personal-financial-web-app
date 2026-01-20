import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
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

        // Get document ID from request
        const { documentId } = await request.json();

        if (!documentId) {
            return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
        }

        // Fetch document to verify ownership and get file path
        const { data: document, error: fetchError } = await supabaseAdmin
            .from('documents')
            .select('id, file_path, user_id')
            .eq('id', documentId)
            .single();

        if (fetchError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        if (document.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Delete from storage
        const { error: storageError } = await supabaseAdmin.storage
            .from('user-documents')
            .remove([document.file_path]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
            // Continue anyway - database is the source of truth
        }

        // Delete document (chunks will be cascade deleted due to FK)
        const { error: deleteError } = await supabaseAdmin
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (deleteError) {
            console.error('Document delete error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
