import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
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

        // Fetch documents for this user
        const { data: documents, error } = await supabaseAdmin
            .from('documents')
            .select('id, name, file_path, file_size, page_count, status, error_message, created_at, updated_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
        }

        // Get chunk counts for each document
        const documentsWithChunks = await Promise.all(
            (documents || []).map(async (doc) => {
                const { count } = await supabaseAdmin
                    .from('document_chunks')
                    .select('*', { count: 'exact', head: true })
                    .eq('document_id', doc.id);

                return {
                    ...doc,
                    chunk_count: count || 0
                };
            })
        );

        return NextResponse.json({
            documents: documentsWithChunks
        });
    } catch (error) {
        console.error('List documents error:', error);
        return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 });
    }
}
