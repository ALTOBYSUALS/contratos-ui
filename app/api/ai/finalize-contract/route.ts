// /app/api/ai/finalize-contract/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'          // <-- IMP: el SDK necesita Node
export const dynamic = 'force-dynamic'   // evita cache en Vercel

/* -------------------------------------------------------------
 *  SEGURIDAD: verifica que la API‑key exista **en tiempo de request**
 * ------------------------------------------------------------*/
function getModel() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const genAI = new GoogleGenerativeAI(key)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

/* -------------------------------------------------------------
 *  POST /api/ai/finalize-contract
 *  Espera: { currentHtmlContent: string, contextTitle?: string }
 *  Devuelve: { refinedContent: string }
 * ------------------------------------------------------------*/
export async function POST(req: NextRequest) {
  try {
    const { currentHtmlContent, contextTitle } = await req.json()

    /* ---------- Validación ------------------------------------------------ */
    if (
      typeof currentHtmlContent !== 'string' ||
      !currentHtmlContent.trim()
    ) {
      return NextResponse.json(
        { error: 'Falta el contenido del contrato en la solicitud.' },
        { status: 400 }
      )
    }

    /* ---------- Prompt (AJUSTADO) --------------------------------------- */
    const prompt = `
Revisa y refina el siguiente contrato HTML${contextTitle ? ` titulado "${contextTitle}"` : ''}, que ya incluye los datos específicos de las partes y del acuerdo.

Objetivo: generar un documento legal claro, conciso y profesional en HTML.
Instrucciones:
1.  Asegúrate de que la estructura HTML sea válida y limpia (párrafos <p>, listas <ul>/<ol>, negritas <strong> donde corresponda).
2.  Corrige posibles errores gramaticales o de formato menores.
3.  Mantén el significado legal y los datos ya presentes.
4.  Si aún quedan placeholders evidentes (ej: [OtroDatoPendiente]), déjalos tal cual.
5.  Devuelve **solo** el HTML final refinado, sin explicaciones ni comentarios adicionales.

CONTRATO PRE-RELLENADO A REFINAR:
${currentHtmlContent} // <-- Este ya viene con datos

HTML REFINADO:
    `.trim();

    /* ---------- Llamada a Gemini (sin cambios) ---------------------------- */
    // ... (resto del código del backend sin cambios necesarios para esta lógica) ...
    const model = getModel()
    const result = await model.generateContent(prompt)
    const raw = result.response.text()

    if (!raw?.trim()) {
      throw new Error('La IA no devolvió contenido.')
    }

    /* ---------- Limpieza Markdown/code‑fence ----------------------------- */
    const cleaned = raw
      .replace(/```(?:html)?/gi, '')
      .replace(/```$/gi, '')
      .trim()

    return NextResponse.json({ refinedContent: cleaned })
  } catch (err: any) {
    console.error('[AI Finalize‑Contract] ', err)
    return NextResponse.json(
      { error: err.message ?? 'Error al procesar solicitud IA' },
      { status: 500 }
    )
  }
}
