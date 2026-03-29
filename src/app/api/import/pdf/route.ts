import { NextRequest, NextResponse } from 'next/server';
import { parseMunirKhananiStatement } from '@/lib/pdf-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file type
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }
    
    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text: string;
    
    // Parse PDF using pdf-parse
    try {
      // Dynamic import for pdf-parse to avoid build issues
      const pdfParseModule = await import('pdf-parse');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = ('default' in pdfParseModule ? pdfParseModule.default : pdfParseModule) as any;
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      return NextResponse.json(
        { success: false, error: 'Failed to read PDF. Make sure it\'s a valid PDF file.' },
        { status: 400 }
      );
    }
    
    // Parse the extracted text
    const result = parseMunirKhananiStatement(text);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to parse statement' },
        { status: 400 }
      );
    }
    
    if (result.trades.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No trades found in the statement. Make sure it\'s a Munir Khanani transaction statement.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      trades: result.trades,
      metadata: {
        client_name: result.client_name,
        cdc_id: result.cdc_id,
        statement_id: result.statement_id,
        trade_count: result.trades.length,
      },
    });
    
  } catch (error) {
    console.error('PDF import error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error processing file' },
      { status: 500 }
    );
  }
}
