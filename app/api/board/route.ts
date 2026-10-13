import { readBoard } from '@/lib/board';
import { browserIdentity } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await browserIdentity(true);
    return Response.json(await readBoard(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return Response.json(
      { error: 'The board is temporarily unavailable. Please try again.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
