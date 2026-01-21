import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

        // Get document ID from request body
        const { documentId } = await request.json();
        if (!documentId) {
            return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
        }

        // Fetch document and verify ownership
        const { data: document, error: docError } = await supabaseAdmin
            .from('documents')
            .select('id, name, file_path, user_id')
            .eq('id', documentId)
            .single();

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        if (document.user_id !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Generate signed URL for download (valid for 60 seconds)
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('user-documents')
            .createSignedUrl(document.file_path, 60, {
                download: `${document.name}.pdf`
            });

        if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error('Signed URL error:', signedUrlError);
            return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
        }

        return NextResponse.json({
            url: signedUrlData.signedUrl,
            filename: `${document.name}.pdf`
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
