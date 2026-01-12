import { NextResponse } from 'next/server';
import { defaultSystemPrompt } from '@/app/prompt';
import { criteria } from '@/app/criteria';

export async function GET() {
  return NextResponse.json({
    prompt: defaultSystemPrompt,
    criteria: criteria,
  });
}
