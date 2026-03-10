import { NextResponse } from 'next/server';
import { fetchPSXIndices } from '@/lib/psx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const indices = await fetchPSXIndices();

    return NextResponse.json({
      indices,
      count: indices.length,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching PSX indices:', err);
    return NextResponse.json(
      { error: 'Unable to fetch indices data', indices: [] },
      { status: 500 }
    );
  }
}
