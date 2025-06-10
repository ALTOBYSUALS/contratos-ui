# 🔧 Configuración de Notion para contratos-ui

## Paso 1: Crear archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto (mismo nivel que package.json) con este contenido:

```bash
# Configuración de Notion
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DATABASE_CLIENTES_ID=176437a305868048b9acffe5e70fb2b0
NOTION_DB_TEMPLATES=id_de_tu_base_de_templates_aqui
NOTION_DB_CONTRACTS=id_de_tu_base_de_contratos_aqui
NOTION_DB_SIGNERS=id_de_tu_base_de_firmantes_aqui

# Configuración de JWT
JWT_SECRET=mi_jwt_secret_super_seguro_123456789

# Configuración de almacenamiento
BLOB_READ_WRITE_TOKEN=vercel_blob_token_aqui

# Configuración de email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# URL de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Modo debug
DEBUG_MODE=true
```

## Paso 2: Obtener tu NOTION_TOKEN

1. Ve a https://www.notion.so/my-integrations
2. Crea una nueva integración o usa una existente
3. Copia el "Internal Integration Token"
4. Reemplaza `secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` con tu token

## Paso 3: Obtener IDs de bases de datos

Para cada base de datos en Notion:

1. Abre la base de datos en el navegador
2. En la URL verás algo como: `notion.so/tu-workspace/nombre-de-base-12345678901234567890123456789012`
3. Los últimos 32 caracteres son el ID (sin guiones)

### Ya identificados:
- ✅ **DATABASE_CLIENTES_ID**: `176437a305868048b9acffe5e70fb2b0` (ya lo tienes)

### Por identificar:
- 🔍 **NOTION_DB_TEMPLATES**: ID de tu base de datos de plantillas
- 🔍 **NOTION_DB_CONTRACTS**: ID de tu base de datos de contratos  
- 🔍 **NOTION_DB_SIGNERS**: ID de tu base de datos de firmantes

## Paso 4: Dar permisos a la integración

Para cada base de datos:
1. Abre la base de datos en Notion
2. Click en "..." (tres puntos) → "Connections" → "Connect to"
3. Selecciona tu integración de Notion

## Paso 5: Reiniciar servidor

Después de crear `.env.local`:

```bash
# Detener servidor actual
pkill -f "next dev"

# Iniciar nuevamente
pnpm dev
```

## ✅ Verificar que funciona

Una vez configurado, deberías ver en los logs del servidor:
- Clientes reales de Notion cargándose
- No solo los clientes de prueba hardcodeados 