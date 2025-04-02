// app/page.tsx

// 1. Importa tu componente ContractLibrary
// Asegúrate que la ruta sea correcta según dónde esté tu archivo ContractLibrary.tsx
import ContractLibrary from '@/components/contracts/ContractLibrary';

// 2. La función principal de la página ahora solo renderiza tu componente
export default function Home() {
  return (
    // Puedes dejar un <main> o un <div> simple como contenedor.
    // Tu componente ContractLibrary ya tiene estilos como min-h-screen, etc.
    <main>
      <ContractLibrary />
    </main>
  );
}