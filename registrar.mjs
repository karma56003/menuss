// Vercel Function. Las credenciales solo se leen en el servidor.
const PLANES = Object.freeze({ esencial: 29, interactivo: 49, inmersivo: 99 });

function response(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max + 1) : '';
}

function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const phone = value.trim().replace(/[\s().-]/g, '');
  if (/^[67]\d{7}$/.test(phone)) return `+591${phone}`;
  if (/^591[67]\d{7}$/.test(phone)) return `+${phone}`;
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone;
  return null;
}

export function validateLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const nombre = cleanText(input.nombre, 100);
  const negocio = cleanText(input.negocio, 120);
  const email = cleanText(input.email, 180).toLowerCase();
  const ciudad = cleanText(input.ciudad, 80);
  const telefono = normalizePhone(input.telefono);
  const plan = input.plan;

  if (nombre.length < 2 || nombre.length > 100 || negocio.length < 2 || negocio.length > 120 || ciudad.length < 2 || ciudad.length > 80) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) return null;
  if (!telefono || !Object.hasOwn(PLANES, plan) || input.consentimiento !== true) return null;
  if (typeof input.consentimiento_sms !== 'boolean') return null;

  return {
    nombre, negocio, email, telefono, ciudad,
    plan, precio_bs: PLANES[plan],
    consentimiento: true,
    consentimiento_sms: input.consentimiento_sms,
    origen: 'landing',
  };
}

async function sendSms(registro) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = process.env;
  if (!registro.consentimiento_sms || !sid || !token || !from) return false;

  const body = new URLSearchParams({
    To: registro.telefono,
    From: from,
    Body: `PLATIA: recibimos tu inscripción al plan ${registro.plan} (Bs ${registro.precio_bs}/mes propuesto). No hay cobro ni suscripción activa. ¡Gracias!`,
  });

  const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(6500),
  });
  if (!twilioResponse.ok) throw new Error(`Twilio HTTP ${twilioResponse.status}`);
  return true;
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }

    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return response(415, { error: 'El formulario debe enviarse en JSON.' });
    }

    let payload;
    try {
      const raw = await request.text();
      if (raw.length > 7000) return response(413, { error: 'La solicitud supera el tamaño permitido.' });
      payload = JSON.parse(raw);
    } catch {
      return response(400, { error: 'Los datos enviados no son válidos.' });
    }

    // Campo trampa para robots. Se ignora silenciosamente el envío automático.
    if (typeof payload?.empresa_web === 'string' && payload.empresa_web.trim()) {
      return response(201, { ok: true });
    }

    const registro = validateLead(payload);
    if (!registro) {
      return response(400, { error: 'Revisa nombre, negocio, correo, celular, plan y consentimiento.' });
    }

    const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env;
    if (!url || !key) {
      console.error('Falta configuración de Supabase.');
      return response(503, { error: 'El registro aún no está disponible. Intenta más tarde.' });
    }

    try {
      const insertResponse = await fetch(`${url.replace(/\/$/, '')}/rest/v1/inscripciones`, {
        method: 'POST',
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(registro),
        signal: AbortSignal.timeout(8000),
      });

      if (!insertResponse.ok) {
        const databaseError = await insertResponse.json().catch(() => ({}));
        if (databaseError.code === '23505') {
          return response(409, { error: 'Este correo ya está registrado. Si necesitas cambiar de plan, contáctanos cuando te escribamos.' });
        }
        console.error('Falló la inserción en Supabase:', insertResponse.status, databaseError.code || 'sin código');
        return response(502, { error: 'No pudimos guardar tu registro en este momento.' });
      }

      // Una falla de SMS no revierte la inscripción ya guardada.
      if (registro.consentimiento_sms) {
        try {
          await sendSms(registro);
        } catch (error) {
          console.warn('Inscripción guardada, SMS no enviado:', error.message);
        }
      }

      return response(201, { ok: true, mensaje: 'Inscripción recibida.' });
    } catch (error) {
      console.error('Error de red durante el registro:', error.name);
      return response(502, { error: 'No pudimos conectarnos. Intenta otra vez en unos minutos.' });
    }
  },
};
