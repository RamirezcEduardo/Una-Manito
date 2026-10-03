# Correos del código de ingreso

Supabase → **Authentication → Emails → Templates**. Copia cada plantilla en su sección:

| Sección de Supabase | Asunto | Contenido (Source) |
|---|---|---|
| **Confirm signup** (usuarios nuevos) | `Tu código de Una Manito` | `confirmar-registro.html` |
| **Magic Link** (usuarios que ya tienen cuenta) | `Tu código de Una Manito` | `magic-link.html` |

Las dos usan `{{ .Token }}`, que Supabase reemplaza por el código de 6 dígitos.
El logo se carga desde `https://unamanito.vercel.app/icono-192.png`; si cambias de dominio, actualiza esa dirección.
