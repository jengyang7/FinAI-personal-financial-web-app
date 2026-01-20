import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTextEmbedding } from '@/lib/gemini';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import path from 'path';

// Set worker source for pdfjs-dist in Node.js
// Point to the worker file in node_modules
GlobalWorkerOptions.workerSrc = path.join(
    process.cwd(),
    'node_modules/pdfjs-dist/build/pdf.worker.mjs'
);

// Initialize Supabase with service role key for storage operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Text chunking configuration
const CHUNK_SIZE = 500; // tokens (approximate)
const CHUNK_OVERLAP = 50; // tokens overlap between chunks

// Simple token counter (approximate - 1 token ≈ 4 characters)
function countTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// Split text into overlapping chunks
function splitIntoChunks(text: string, pageNumber: number): Array<{ content: string; pageNumber: number; chunkIndex: number }> {
    const chunks: Array<{ content: string; pageNumber: number; chunkIndex: number }> = [];

    // Clean text - remove excessive whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (!cleanText) return chunks;

    // Split by sentences for better context preservation
    const sentences = cleanText.split(/(?<=[.!?])\s+/);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
        const sentenceTokens = countTokens(sentence);
        const currentTokens = countTokens(currentChunk);

        if (currentTokens + sentenceTokens > CHUNK_SIZE && currentChunk) {
            // Save current chunk
            chunks.push({
                content: currentChunk.trim(),
                pageNumber,
                chunkIndex: chunkIndex++
            });

            // Start new chunk with overlap
            const words = currentChunk.split(' ');
            const overlapWords = words.slice(-Math.ceil(CHUNK_OVERLAP / 2));
            currentChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
        chunks.push({
            content: currentChunk.trim(),
            pageNumber,
            chunkIndex: chunkIndex
        });
    }

    return chunks;
}

// Extract text from PDF using pdfjs-dist
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
    // Load the PDF document
    const loadingTask = getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
        fullText += pageText + '\n\n';
    }

    return { text: fullText.trim(), pageCount };
}

export async function POST(request: NextRequest) {
    try {
        // Get authorization header to verify user
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

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const name = formData.get('name') as string || file.name.replace('.pdf', '');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
        }

        // Check file size (max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
        }

        // Upload to Supabase Storage
        const fileBuffer = await file.arrayBuffer();
        const filePath = `documents/${user.id}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('user-documents')
            .upload(filePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
        }

        // Create document record
        const { data: document, error: insertError } = await supabaseAdmin
            .from('documents')
            .insert({
                user_id: user.id,
                name,
                file_path: filePath,
                file_size: file.size,
                status: 'processing'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Document insert error:', insertError);
            // Clean up uploaded file
            await supabaseAdmin.storage.from('user-documents').remove([filePath]);
            return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
        }

        // Process PDF asynchronously (don't block the response)
        processDocumentAsync(document.id, user.id, fileBuffer);

        return NextResponse.json({
            success: true,
            document: {
                id: document.id,
                name: document.name,
                status: document.status
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

// Process document in background
async function processDocumentAsync(documentId: string, userId: string, pdfBuffer: ArrayBuffer) {
    try {
        console.log(`[Document ${documentId}] Starting processing...`);

        // Parse PDF using pdfjs-dist
        const { text: fullText, pageCount } = await extractTextFromPDF(pdfBuffer);

        console.log(`[Document ${documentId}] Extracted ${pageCount} pages, ${fullText.length} characters`);

        // Split into chunks
        const chunks = splitIntoChunks(fullText, 1); // Simple: treat as single page for now
        console.log(`[Document ${documentId}] Created ${chunks.length} chunks`);

        // Generate embeddings and insert chunks
        const chunkRecords = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                console.log(`[Document ${documentId}] Generating embedding for chunk ${i + 1}/${chunks.length}`);
                const embedding = await getTextEmbedding(chunk.content);

                chunkRecords.push({
                    document_id: documentId,
                    user_id: userId,
                    content: chunk.content,
                    page_number: chunk.pageNumber,
                    chunk_index: chunk.chunkIndex,
                    embedding
                });
            } catch (embeddingError) {
                console.error(`[Document ${documentId}] Failed to generate embedding for chunk ${i}:`, embeddingError);
                // Continue with other chunks
            }
        }

        // Insert all chunks
        if (chunkRecords.length > 0) {
            const { error: chunksError } = await supabaseAdmin
                .from('document_chunks')
                .insert(chunkRecords);

            if (chunksError) {
                throw new Error(`Failed to insert chunks: ${chunksError.message}`);
            }
        }

        // Update document status to ready
        await supabaseAdmin
            .from('documents')
            .update({
                status: 'ready',
                page_count: pageCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId);

        console.log(`[Document ${documentId}] Processing complete!`);
    } catch (error) {
        console.error(`[Document ${documentId}] Processing failed:`, error);

        // Update document status to error
        await supabaseAdmin
            .from('documents')
            .update({
                status: 'error',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId);
    }
}
