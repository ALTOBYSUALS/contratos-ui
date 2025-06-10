import { NextResponse } from 'next/server';
import { unifiedNotion } from '@/services/notion-unified';

export async function GET() {
  try {
    console.log('🔍 [DEBUG] Fetching clients...');
    
    const clients = await unifiedNotion.getClients();
    
    console.log('🔍 [DEBUG] Raw clients data:', clients);
    
    return NextResponse.json({
      success: true,
      count: clients.length,
      clients: clients,
      debug: {
        message: "Check server logs for detailed debug information",
        sampleClient: clients[0] || null
      }
    });

  } catch (error) {
    console.error('🔍 [DEBUG] Error fetching clients:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 