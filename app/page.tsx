// app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      // Intentar detectar variables de entorno y configuración
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'No configurado';
      console.log('NEXT_PUBLIC_APP_URL:', appUrl);
      
      // Marcar como cargado
      setLoaded(true);
    } catch (err) {
      console.error('Error en inicialización:', err);
      setError(`Error de inicialización: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded-lg max-w-4xl mx-auto my-8">
        <h1 className="text-2xl font-bold text-red-700 mb-4">Error Detectado</h1>
        <p className="text-red-700 mb-4">{error}</p>
        <Button 
          onClick={() => window.location.reload()}
          variant="destructive"
        >
          Recargar Página
        </Button>
      </div>
    );
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sistema de Contratos - Versión Diagnóstico</h1>
      
      <div className="p-4 bg-green-50 rounded mb-8">
        <p className="text-green-700">
          {loaded 
            ? '✅ Aplicación cargada correctamente'
            : '⏳ Cargando aplicación...'}
        </p>
      </div>
      
      <div className="grid gap-4">
        <Button
          onClick={() => {
            try {
              window.location.href = '/contratos';
            } catch (err) {
              setError(`Error de navegación: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
        >
          Ir a página normal (con riesgo de error)
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            try {
              localStorage.setItem('test', 'ok');
              alert('LocalStorage funciona correctamente');
            } catch (err) {
              setError(`Error con localStorage: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
        >
          Probar LocalStorage
        </Button>
      </div>
    </main>
  );
}