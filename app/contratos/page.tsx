'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

// Importación dinámica para evitar problemas en la carga inicial
const ContractLibrary = dynamic(
  () => import('@/components/contracts/ContractLibrary'),
  { 
    ssr: false,
    loading: () => <div className="text-center p-12">Cargando biblioteca de contratos...</div>
  }
);

export default function ContratosPage() {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showComponent, setShowComponent] = useState(false);

  // Manejar errores globales
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Error global capturado:', event);
      setError(`Error global: ${event.message}`);
      // Prevenir comportamiento por defecto
      event.preventDefault();
    };

    // Registrar manejador de errores
    window.addEventListener('error', handleError);
    
    // Intentar cargar después de un pequeño delay
    const timer = setTimeout(() => {
      try {
        setLoaded(true);
        setShowComponent(true);
      } catch (err) {
        console.error('Error al inicializar:', err);
        setError(`Error de inicialización: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 500);

    // Limpiar
    return () => {
      window.removeEventListener('error', handleError);
      clearTimeout(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded-lg max-w-4xl mx-auto my-8">
        <h1 className="text-2xl font-bold text-red-700 mb-4">Error Detectado</h1>
        <p className="text-red-700 mb-4">{error}</p>
        <div className="flex gap-4">
          <Button 
            onClick={() => window.location.reload()}
            variant="destructive"
          >
            Recargar Página
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Volver a Diagnóstico
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main>
      {showComponent ? (
        <ContractLibrary />
      ) : (
        <div className="text-center p-12">
          <p>Preparando componente...</p>
        </div>
      )}
    </main>
  );
} 