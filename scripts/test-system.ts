// /scripts/test-system.ts
import { unifiedNotion } from '../services/notion-unified';

async function testSystem() {
  console.log('🧪 Iniciando pruebas del sistema unificado...\n');

  try {
    // Test 1: Obtener templates
    console.log('1️⃣ Probando obtener templates...');
    const templates = await unifiedNotion.getTemplates();
    console.log(`✅ Templates obtenidos: ${templates.length}`);
    if (templates.length > 0) {
      console.log(`   Primer template: "${templates[0].title}"`);
    }

    // Test 2: Obtener clients
    console.log('\n2️⃣ Probando obtener clients...');
    const clients = await unifiedNotion.getClients();
    console.log(`✅ Clients obtenidos: ${clients.length}`);
    if (clients.length > 0) {
      console.log(`   Primer client: "${clients[0].FullName}" (${clients[0].role})`);
    }

    // Test 3: Crear signer de prueba
    console.log('\n3️⃣ Probando crear signer...');
    const testSignerId = await unifiedNotion.createSigner({
      name: 'Test Signer',
      email: 'test@test.com',
      contractId: 'test-contract-id',
      pageNumber: 1,
      posX: 100,
      posY: 600,
      width: 150,
      height: 50
    });
    
    if (testSignerId) {
      console.log(`✅ Signer creado: ${testSignerId}`);
      
      // Test 4: Actualizar signer como firmado
      console.log('\n4️⃣ Probando marcar signer como firmado...');
      const updated = await unifiedNotion.updateSignerAsSigned(testSignerId);
      console.log(`✅ Signer actualizado: ${updated}`);
      
    } else {
      console.log('❌ No se pudo crear signer de prueba');
    }

    console.log('\n🎉 ¡Todas las pruebas completadas!');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSystem();
}

export { testSystem }; 