// /app/api/contracts/route.ts
import { NextResponse } from 'next/server';
import { listarContratosEnviados } from '@/services/notion'; // Asegúrate que esta función exista y esté exportada en notion.ts
import type { SentContract } from '@/lib/types'; // Importa el tipo desde lib/types

// Handler para solicitudes GET a /api/contracts
export async function GET() { // Eliminado el parámetro _request al no usarse
    console.log('[API /api/contracts] Recibida petición GET para listar contratos');
    try {
        // Llama a la función del servicio que consulta la DB de Contratos-Creados
        const contracts: SentContract[] = await listarContratosEnviados();

        console.log(`[API /api/contracts] Devolviendo ${contracts.length} contratos.`);
        // Devuelve la lista de contratos (o un array vacío si no hay)
        return NextResponse.json(contracts);

    } catch (error: unknown) { // Captura cualquier error como 'unknown'
        console.error("[API /api/contracts] Error listando contratos:", error); // Loguea el error completo

        // Determina un mensaje de error seguro para el cliente
        let errorMessage = "Error desconocido al obtener la lista de contratos.";
        if (error instanceof Error) {
            errorMessage = error.message;
            // Opcional: Podrías intentar parsear 'error.cause' o 'error.body' si esperas errores específicos de Notion
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Devuelve una respuesta de error clara al frontend
        return NextResponse.json(
            { error: `Error al obtener la lista de contratos: ${errorMessage}` },
            { status: 500 } // Error interno del servidor
        );
    }
}

// NOTA: Aquí podrían ir otros métodos como POST para crear un contrato manualmente (si fuera necesario),
// pero la lógica principal de creación/envío está en /api/contracts/send-finalized/route.ts