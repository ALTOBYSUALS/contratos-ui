// /app/api/contracts/route.ts
import { NextResponse } from 'next/server';
import { listarContratosEnviados } from '@/services/notion'; // Asegúrate que esta función exista en notion.ts
import type { SentContract } from '@/components/contracts/ContractLibrary'; // Importa la interfaz si la necesitas aquí

export async function GET(request: Request) {
    console.log('[API /api/contracts] Recibida petición GET para listar contratos'); // Log para confirmar
    try {
        // Llama a l
        
        // a función del servicio que consulta la DB de Contratos-Creados
        const contracts: SentContract[] = await listarContratosEnviados();

        console.log(`[API /api/contracts] Devolviendo ${contracts.length} contratos.`);
        return NextResponse.json(contracts);

    } catch (error: any) {
        console.error("[API /api/contracts] Error listando contratos:", error);
        // Devuelve un error claro al frontend
        return NextResponse.json(
            { error: 'Error al obtener la lista de contratos', details: error.message },
            { status: 500 }
        );
    }
}

// NOTA: Necesitarás también implementar la función listarContratosEnviados en /services/notion.ts