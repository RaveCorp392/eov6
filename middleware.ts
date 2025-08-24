import {NextRequest,NextResponse} from 'next/server';export function middleware(req:NextRequest){const host=req.headers.get('host')||'';const url=req.nextUrl.clone();if(host.startsWith('agent.')&&url.pathname==='/'){url.pathname='/agent';return NextResponse.rewrite(url)}return NextResponse.next()}

