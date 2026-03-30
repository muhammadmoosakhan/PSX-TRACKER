import { NextRequest, NextResponse } from 'next/server';
import { parseMunirKhananiStatement } from '@/lib/pdf-parser';
import { getDocumentProxy } from 'unpdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Extract text from PDF preserving row layout using position data.
// unpdf's extractText() reads column-by-column which breaks table parsing.
// This reconstructs proper rows by grouping text items by Y-coordinate.
async function extractTextWithLayout(data: ArrayBuffer): Promise<string> {
  const doc = await getDocumentProxy(new Uint8Array(data));
  const lines: string[] = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();

      // Collect text items with positions
      const items: Array<{ x: number; y: number; text: string }> = [];

      for (const item of textContent.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        items.push({
          x: item.transform[4],
          y: Math.round(item.transform[5]),
          text: item.str.trim(),
        });
      }

      // Group items into rows by Y-coordinate (tolerance ±3 units)
      const rows = new Map<number, typeof items>();
      const tolerance = 3;

      for (const item of items) {
        let rowKey = -Infinity;
        for (const key of rows.keys()) {
          if (Math.abs(key - item.y) <= tolerance) {
            rowKey = key;
            break;
          }
        }
        if (rowKey === -Infinity) {
          rowKey = item.y;
          rows.set(rowKey, []);
        }
        rows.get(rowKey)!.push(item);
      }

      // Sort rows top-to-bottom (PDF Y-axis is bottom-up, so descending)
      const sortedYs = [...rows.keys()].sort((a, b) => b - a);

      for (const y of sortedYs) {
        const rowItems = rows.get(y)!;
        // Sort items left-to-right within each row
        rowItems.sort((a, b) => a.x - b.x);
        const rowText = rowItems.map(item => item.text).join(' ');
        if (rowText.trim()) {
          lines.push(rowText.trim());
        }
      }
    }
  } finally {
    await doc.destroy();
  }

  return lines.join('\n');
}

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

    let text: string;

    try {
      text = await extractTextWithLayout(arrayBuffer);

      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Could not extract text from PDF. The file might be scanned or image-based.' },
          { status: 400 }
        );
      }

      console.log('--- PDF Extracted Text (layout-aware) ---');
      console.log(text);
      console.log('--- End PDF Text ---');
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
