import { NextRequest, NextResponse } from 'next/server';
import { getCourses } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({ courses: getCourses() });
}
