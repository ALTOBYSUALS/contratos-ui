// /app/api/contracts/route.ts
import { NextResponse } from 'next/server';
import { listarContratosEnviados } from '@/services/notion'; // Asegúrate que esta función exista en notion.ts
import type { SentContract } from '@/lib/types'; // <-- Importa desde lib/types

export async function GET(_request: Request) {
    console.log('[API /api/contracts] Recibida petición GET para listar contratos'); // Log para confirmar
    try {
        // Llama a l
        
        // a función del servicio que consulta la DB de Contratos-Creados
        const contracts: SentContract[] = await listarContratosEnviados();

        console.log(`[API /api/contracts] Devolviendo ${contracts.length} contratos.`);
        return NextResponse.json(contracts);

    } catch (err: unknown) { // <-- Cambiado a unknown
        console.error('[AI Finalize-Contract] Error:', err); // Loguea el error completo
    
        let errorMessage = "Error al procesar la solicitud con IA"; // Mensaje por defecto
    
        // Verifica si 'err' es un objeto Error para acceder a .message
        if (err instanceof Error) {
            errorMessage = err.message;
        } else if (typeof err === 'string') {
            // Si el error es solo un string
            errorMessage = err;
        }
        // Puedes añadir más 'else if' para otros tipos si es necesario
    
        // Devuelve el mensaje de error seguro
        return NextResponse.json(
          { error: errorMessage }, // Usa la variable procesada
          { status: 500 }
        );
      }
    }

// NOTA: Necesitarás también implementar la función listarContratosEnviados en /services/notion.ts