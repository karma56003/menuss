# PLATIA — Landing de acceso anticipado

Landing page para el SaaS gastronómico **PLATIA**, basada en la propuesta académica de validación. Incluye tres **planes propuestos** de Bs 29, Bs 49 y Bs 99 por mes, registro de interesados en Supabase y SMS opcional por Twilio. **El formulario no procesa pagos ni crea cuentas o suscripciones.** El diseño usa una gama neutral de marfil, piedra, grafito y topo cálido, dos imágenes gastronómicas y **dos modelos 3D interactivos recreados a partir de esas referencias**.

## Estructura y tecnologías

```text
platia-landing/
├── index.html              Página pública HTML
├── styles.css              Diseño responsive y animaciones CSS
├── assets/                 Renderizados gastronómicos 3D en PNG
├── script.js               Navegación, selección de plan y formulario JS
├── viewer-3d.js             Modelos 3D giratorios de hamburguesa y pizza en JavaScript
├── vendor/                  Three.js 0.178.0, controles y licencia MIT (copia local)
├── api/registrar.mjs       Función JavaScript en Vercel
├── supabase.sql            Tabla, restricciones y seguridad
├── .env.example            Variables de configuración de ejemplo
├── .gitignore              Impide subir archivos .env
├── vercel.json             Cabeceras y despliegue
├── package.json            Node 20+ y pruebas
└── registrar.test.mjs      Pruebas automáticas con servicios simulados
```

## 1. Crear la tabla de interesados en Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard) si aún no tienes uno.
2. Abre **SQL Editor**, copia el contenido del archivo `supabase.sql` y ejecútalo.
3. Comprueba en **Table Editor** que existe `public.inscripciones`, con los campos de contacto, el plan y el precio elegidos.
4. En **Settings > API Keys**, ubica la clave **Secret** (`sb_secret_...`) y la URL del proyecto (también está en **Connect**). Nunca coloques esa clave en archivos públicos.

El SQL activa Row Level Security (RLS) y quita los permisos públicos de la tabla. La escritura se realiza exclusivamente desde la función del servidor en Vercel.

## 2. Subir el proyecto a GitHub

1. En [GitHub](https://github.com/new) crea un repositorio llamado `platia-landing` (sin agregar README automático).
2. Descarga/descomprime esta carpeta en tu computadora y abre una terminal dentro.
3. Ejecuta estos comandos, cambiando `TU_USUARIO` por el nombre de tu cuenta de GitHub:

```bash
git init
git add .
git commit -m "Landing PLATIA con Supabase y Twilio"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/platia-landing.git
git push -u origin main
```

Si ya tienes un repositorio para esta página, no repitas `git init`: incorpora los archivos a ese repositorio.

## 3. Conectar GitHub con Vercel

1. Entra a [Vercel](https://vercel.com/new), elige **Add New > Project** e importa `platia-landing` desde GitHub.
2. Selecciona la raíz del repositorio y **Framework Preset: Other**. No hay compilación: la página usa HTML, CSS y JavaScript con una función JavaScript de Vercel en `/api/registrar`.
3. En **Project > Settings > Environment Variables**, configura:

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
| `SUPABASE_SECRET_KEY` | Clave **Secret** de Supabase, `sb_secret_...` |
| `TWILIO_ACCOUNT_SID` | SID de tu cuenta Twilio (opcional) |
| `TWILIO_AUTH_TOKEN` | Auth Token de Twilio (opcional) |
| `TWILIO_FROM_NUMBER` | Número habilitado para SMS, `+...` (opcional) |

4. Pulsa **Deploy**. Vercel te dará una dirección pública `https://....vercel.app`; los próximos cambios a la rama conectada se desplegarán automáticamente.
5. Después de cambiar variables, ejecuta un nuevo despliegue. Nunca subas tus claves reales a GitHub.

Usa la clave **Secret** (`sb_secret_...`) en `SUPABASE_SECRET_KEY`; la clave **Publishable** (`sb_publishable_...`) es pública y no permite esta escritura. Si ya configuraste una clave publishable, reemplázala por la Secret en Vercel y vuelve a desplegar. En Supabase, ejecuta `supabase.sql` y confirma que `public.inscripciones` está expuesta en **Integrations > Data API**.

## 4. Configurar SMS opcional con Twilio

1. Abre [Twilio Console](https://console.twilio.com/) y obtén un remitente/número apto para SMS al país de tus destinatarios.
2. Revisa las restricciones geográficas y los requisitos del remitente. En cuentas de prueba se suele exigir verificar los números receptores.
3. Configura las tres variables de Twilio en Vercel y vuelve a desplegar.
4. El sistema solo intenta mandar un SMS si la persona marca la casilla opcional. Si Twilio no está configurado o falla, **el registro en Supabase se conserva**.

Twilio no es un elemento visual: la parte vistosa está creada con modelos 3D manipulables, imágenes de referencia, animaciones, tarjetas, un menú de demostración y diseño adaptable a celular.

## Demostración 3D: hamburguesa y pizza

1. Abre la landing desplegada (o mediante un servidor HTTP local) y entra en **Experiencia 3D**.
2. Pulsa **Hamburguesa** o **Pizza artesanal** para cargar el modelo correspondiente.
3. Arrastra el plato con el mouse o con el dedo para girarlo. Usa la rueda del mouse o pellizca con dos dedos para acercar y alejar.
4. Prueba **Pausar giro / Activar giro** y **Reiniciar vista**. Con el visor enfocado, las flechas del teclado también cambian el ángulo.
5. El visor usa **WebGL** con Three.js incluido localmente (no necesita CDN). Requiere un navegador y dispositivo con WebGL disponible. Si está desactivado, se muestra la imagen ilustrativa de referencia con un pequeño efecto de profundidad al mover el cursor.

Los modelos son **reconstrucciones geométricas ilustrativas** hechas en JavaScript a partir de la idea visual de los renders originales. No son una conversión fotogramétrica exacta de la imagen, ni un escaneo real de un plato. La creación de modelos gastronómicos fotorrealistas personalizados y la realidad aumentada forman parte de fases futuras del proyecto.

## 5. Verificar el funcionamiento

Para probar también el formulario **en local**, no uses `npm run serve:static`: ese comando sirve archivos estáticos y no ejecuta `api/registrar.mjs`. Usa Vercel CLI, que levanta la página y la función:

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.local
npm run dev
```

En `vercel env pull`, selecciona el entorno **Development**. `npm run dev` debe mostrar una URL local; envía el formulario desde esa URL, no desde el puerto del servidor estático. Asegúrate de que las variables de Supabase estén configuradas para Development en Vercel y que `SUPABASE_SECRET_KEY` sea la clave Secret del servidor. `.env.local` está excluido de Git.

1. Abre la URL desplegada en celular y computadora.
2. Verifica que los dos platos del visor 3D puedan girarse, ampliarse y alternarse si el dispositivo tiene WebGL habilitado.
3. Haz clic en cada plan. Debe seleccionarse el mismo en el formulario.
4. Registra un correo de prueba válido y comprueba que aparece el mensaje verde de confirmación.
5. En Supabase, ejecuta:

```sql
select negocio, nombre, email, plan, precio_bs, ciudad, creado_en
from public.inscripciones
order by creado_en desc
limit 20;
```

6. Confirma los pares `esencial=29`, `interactivo=49` e `inmersivo=99`.
7. Si habilitaste Twilio, prueba desde un número admitido y con consentimiento expreso.
8. Ejecuta `npm test` localmente con Node.js 20 o superior para probar el registro sin enviar información real.

**Nota:** si abres `index.html` con doble clic o usas `npm run serve:static`, la página se verá, pero el formulario no tendrá una función API que procese el registro. Usa `npm run dev` para ejecutar la función localmente.

**Si no ves la navegación:** en pantallas anchas aparece la barra de enlaces; en pantallas de hasta 900 px aparece el botón de menú ☰, que despliega los enlaces al tocarlo. El formulario requiere el endpoint `/api/registrar` y las variables de Supabase configuradas en el entorno de Vercel que estás visitando; revisa los registros de la función en Vercel si el envío sigue fallando.

## Alcance y seguridad

- Etapa de **validación**: precios propuestos, funciones sujetas a disponibilidad. No se reciben pagos ni se activan suscripciones.
- La landing **sí incluye dos modelos geométricos 3D giratorios reales de demostración**. Se han recreado manualmente en código a partir de renders, por lo que no coinciden exactamente con las fotos. La oferta comercial de modelos personalizados y realidad aumentada sigue en validación y se cotizaría aparte.
- Validación en cliente y servidor, campo antirrobots, permisos de base de datos restringidos y consentimiento explícito. Para campañas de alto tráfico, añade CAPTCHA/Turnstile, limitación de solicitudes y una política completa de privacidad antes del lanzamiento.
- Los registros contienen datos personales. Limita el acceso al panel de Supabase y atiende las solicitudes de eliminación.
- El email se considera único. Un interesado que ya existe necesitará contacto manual para cambiar de plan durante el piloto.

## Documentación de referencia

- [Vercel: funciones JavaScript en `/api`](https://vercel.com/docs/functions/runtimes/node-js)
- [Supabase: claves Secret y Publishable](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: API REST de tablas](https://supabase.com/docs/guides/api/creating-routes)
- [Twilio: envío de SMS con Node.js](https://www.twilio.com/docs/messaging/quickstart)
