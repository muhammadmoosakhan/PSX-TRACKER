import { NextRequest, NextResponse } from 'next/server';
import { fetchPSXIndexTimeseries } from '@/lib/psx';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  const { index } = await params;

  try {
    const data = await fetchPSXIndexTimeseries(index);

    return NextResponse.json({
      index,
      data,
      count: data.length,
    });
  } catch (err) {
    console.error(`Error fetching timeseries for index ${index}:`, err);
    return NextResponse.json(
      { error: 'Unable to fetch index timeseries', data: [] },
      { status: 500 }
    );
  }
}
