# Una Manito 🤝

> Te damos una manito en tu hogar, al toque.

App tipo Uber para servicios del hogar en Lima. **Beta: solo limpieza doméstica.** Es una PWA mobile-first en español.

## Estado actual: bosquejo del frontend

Todas las pantallas funcionan con **datos simulados** guardados en el navegador (`src/lib/store.tsx`).
El backend con Supabase es el siguiente paso: solo hay que reemplazar las funciones de ese archivo.

```bash
npm install
npm run dev   # http://localhost:3000
```

En la pantalla de inicio hay accesos de demostración para entrar como cliente, socia o administrador.

## Pantallas

| Rol | Ruta | Qué hace |
|---|---|---|
| Todos | `/` | Bienvenida y elección de rol |
| Cliente | `/cliente/registro` | Registro (nombre, celular, correo) |
| Cliente | `/cliente` | Inicio y servicios (los que no están activos aparecen como “Muy pronto”) |
| Cliente | `/cliente/nuevo` | Pedido: mapa, dirección, fecha o “lo antes posible”, horas, materiales, notas, precio estimado y confirmación |
| Cliente | `/cliente/pedido/[id]` | Seguimiento del estado, datos de la socia, pago (Yape/Plin/efectivo), calificación |
| Cliente | `/cliente/historial` | Historial de pedidos |
| Socia | `/socia/registro` | DNI, foto, distritos y servicios → queda pendiente de aprobación |
| Socia | `/socia` | Disponible / No disponible, ganancias, pedidos cercanos (el primero que acepta se lo queda) |
| Socia | `/socia/pedido/[id]` | Cambiar estado, ver lo que gana, confirmar el pago, calificar al cliente |
| Admin | `/admin` | Resumen, aprobación de socias, pedidos, ajustes (comisión, precios, distritos) |

## Estructura

- `src/lib/tipos.ts`: modelo de datos (Servicio, Pedido, Socia, Cliente, Config), listo para mapearlo a tablas.
- `src/lib/config.ts`: servicios, distritos, comisión por defecto (15%), cálculo de precio y eslóganes.
- `src/lib/store.tsx`: “backend” simulado, el único punto que cambia al integrar Supabase.
- `src/components/`: UI compartida y el mapa (Leaflet + OpenStreetMap).
- `public/manifest.webmanifest` y `public/sw.js`: para que la app se pueda instalar como PWA.

Para agregar un servicio nuevo: se activa desde Admin → Ajustes (ya existen gasfitería, electricidad, lavado de autos y piscinas, desactivados).

## Pendiente (backend)

- Supabase: tablas, RLS, autenticación por teléfono (OTP) o email, fotos en Storage, Realtime para los estados.
- Aceptación atómica del pedido (`UPDATE … WHERE estado = 'buscando'`).
- Pasarela de pago (Culqi o Mercado Pago). El campo `pago` del pedido ya está preparado.
