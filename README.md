<div align="center">
<img width="1200" height="475" alt="PingGT Banner" src="https://via.placeholder.com/1200x475?text=PingGT" />
</div>

# PingGT - Mensajería Optimizada para Guatemala

Una aplicación web de mensajería ultra ligera diseñada para regiones con conexiones lentas o inestables.

## Características

- ✉️ Mensajería en tiempo real con consumo mínimo de datos
- 📊 Diagnóstico de latencia y monitoreo de ancho de banda
- 📴 Cola de mensajes offline - envía mensajes sin conexión
- 🇬🇹 Optimizado para usuarios de Guatemala
- 🔋 Ultra ligero - solo ~180 bytes por mensaje
- 🎯 Sin tracking, sin telemetría pesada

## Instalación Rápida

**Prerequisitos:** Node.js 16+

```bash
# Clonar repositorio
git clone https://github.com/Jose22r-maker/PingGT.git
cd PingGT

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Comandos Disponibles

```bash
npm run dev      # Ejecutar en modo desarrollo con recarga en caliente
npm run build    # Compilar para producción
npm run start    # Iniciar servidor de producción
npm run lint     # Verificar tipos de TypeScript
npm run clean    # Limpiar archivos generados
```

## Estructura del Proyecto

```
├── src/
│   ├── components/     # Componentes React
│   ├── lib/           # Utilidades (generador IDs, cálculo bytes)
│   ├── App.tsx        # Componente principal
│   ├── types.ts       # Definiciones de tipos
│   └── main.tsx       # Punto de entrada
├── server.ts          # Servidor Express
├── package.json       # Dependencias
└── vite.config.ts     # Configuración Vite
```

## Stack Tecnológico

- **Frontend:** React 19 + Vite + TailwindCSS
- **Backend:** Express.js (Node.js)
- **Lenguaje:** TypeScript
- **UI:** Lucide React (iconos), Motion (animaciones)
- **QR:** jsqr + qrcode

## Cómo Funciona

1. **Generación de ID:** Cada usuario recibe un ID único (ej: `8F3K-22A1`)
2. **Mensajería Ligera:** Los mensajes se envían en payloads minimalistas (~180 bytes)
3. **Sincronización:** La app sincroniza cada 4.5 segundos para obtener nuevos mensajes
4. **Modo Offline:** Los mensajes se guardan localmente y se envían cuando hay conexión
5. **Diagnóstico de Red:** Monitorea latencia y consume total de datos

## Ahorro de Ancho de Banda

PingGT usa aproximadamente **99% menos datos** que aplicaciones de mensajería estándar:

- PingGT: ~180 bytes por mensaje
- Aplicaciones estándar: ~15 KB por mensaje
- Ideal para planes de datos limitados

## Licencia

Apache 2.0
