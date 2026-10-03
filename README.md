# Una Manito 🤝

> Te damos una manito, al toque.

App tipo Uber para servicios del hogar en Lima. **Beta: solo limpieza doméstica.** Es una PWA mobile-first en español.

## Cómo correrla

```bash
npm install
npm run dev   # http://localhost:3000
```

La app tiene dos modos:

- **Demostración** (sin configurar nada): los datos se guardan en el navegador y en el inicio hay accesos para entrar como cliente, socia o administrador.
- **Real con Supabase**: copia `.env.example` como `.env.local` (ya trae los datos del proyecto).

## Configurar Supabase

1. Crea un proyecto **nuevo** en [supabase.com](https://supabase.com) (región sugerida: São Paulo, la más cercana a Lima).
2. En **SQL Editor**, ejecuta **en orden** todos los archivos de `supabase/migrations/` (por la fecha del nombre).
   Crea las tablas, las reglas de seguridad, el bucket de fotos y los datos iniciales (servicios, distritos y comisión del 15%).
3. En **Authentication → Emails → Templates**, pega las plantillas en español de `supabase/plantillas/` (instrucciones en `supabase/plantillas/LEEME.md`). Traen el código de 6 dígitos y el logo.
4. Copia `.env.example` como `.env.local` (ya trae la URL y la clave pública del proyecto de Una Manito).
5. Crea tu usuario administrador: entra a la app con tu correo, completa el registro de cliente y luego ejecuta en el SQL Editor:
   ```sql
   update perfiles set rol = 'admin' where email = 'tu-correo@ejemplo.com';
   ```

### Cómo está protegido

- Cada tabla tiene **seguridad por filas (RLS)**: un cliente solo ve sus pedidos; una socia, los suyos y los pedidos pendientes de sus distritos y servicios (solo si está aprobada y disponible); el admin ve todo.
- El **precio y la comisión los calcula la base de datos**, no el celular, así que nadie puede pagar menos.
- Los cambios de estado, la aceptación, los pagos y las calificaciones pasan por funciones del servidor (`aceptar_pedido`, `avanzar_pedido`, `marcar_pagado`, etc.). **El primero que acepta se queda el pedido**, aunque dos socias toquen el botón a la vez.
- El **DNI** de la socia está en una tabla aparte que solo ven ella y el admin.
- Los pedidos se actualizan **en tiempo real** en todas las pantallas.

## Pantallas

| Rol | Ruta | Qué hace |
|---|---|---|
| Todos | `/` | Bienvenida y elección de rol |
| Todos | `/terminos`, `/privacidad` | Términos y condiciones y política de privacidad (Ley 29733) |
| Todos | `/entrar` | Inicio de sesión con código por correo (sin contraseña) |
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
- `src/lib/api.ts`: contrato de la capa de datos (lo que la app puede hacer).
- `src/lib/store.tsx`: modo demostración; `src/lib/store-supabase.tsx`: implementación real con Supabase.
- `supabase/migrations/`: esquema de la base de datos, seguridad y datos iniciales.
- `src/components/`: UI compartida y el mapa (Leaflet + OpenStreetMap).
- `public/manifest.webmanifest` y `public/sw.js`: para que la app se pueda instalar como PWA.

Para agregar un servicio nuevo: se activa desde Admin → Ajustes (ya existen gasfitería, electricidad, lavado de autos y piscinas, desactivados).

## Próximos pasos

- Inicio de sesión por **SMS**: requiere un proveedor (Twilio u otro) en Supabase → Authentication → Phone. Por ahora se usa código por correo, que es gratis.
- **Pasarela de pago** (Culqi o Mercado Pago): las columnas `pago_proveedor` y `pago_referencia` del pedido ya están listas.
- Notificaciones push para avisar a las socias de pedidos nuevos.
