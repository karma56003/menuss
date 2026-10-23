import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, OPTIONS, POST, validateLead } from './api/registrar.mjs';

const valid = {
  nombre: 'María Castro', negocio: 'Café La Plaza', email: 'MAria@ejemplo.com',
  telefono: '71234567', ciudad: 'Tarija', plan: 'interactivo',
  consentimiento: true, consentimiento_sms: false,
};

function request(payload, method = 'POST') {
  return new Request('https://platia.vercel.app/api/registrar', {
    method,
    ...(method !== 'POST' ? {} : {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  });
}

async function withFakeServices(callback) {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
  };
  try {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('valida el plan y normaliza el celular boliviano', () => {
  const registro = validateLead(valid);
  assert.equal(registro.precio_bs, 49);
  assert.equal(registro.email, 'maria@ejemplo.com');
  assert.equal(registro.telefono, '+59171234567');
  assert.equal(validateLead({ ...valid, plan: 'inventado' }), null);
  assert.equal(validateLead({ ...valid, consentimiento: false }), null);
});

test('declara POST y rechaza GET con un mensaje útil', async () => {
  const result = GET(request(undefined, 'GET'));
  assert.equal(result.status, 405);
  assert.match((await result.json()).error, /recibió GET/);
});

test('responde a preflight solo para el mismo origen', () => {
  const sameOrigin = OPTIONS(new Request('https://platia.vercel.app/api/registrar', {
    method: 'OPTIONS',
    headers: { Origin: 'https://platia.vercel.app' },
  }));
  const otherOrigin = OPTIONS(new Request('https://platia.vercel.app/api/registrar', {
    method: 'OPTIONS',
    headers: { Origin: 'https://otro.example' },
  }));
  assert.equal(sameOrigin.status, 204);
  assert.equal(sameOrigin.headers.get('Access-Control-Allow-Origin'), 'https://platia.vercel.app');
  assert.equal(otherOrigin.headers.has('Access-Control-Allow-Origin'), false);
});

test('rechaza email inválido', async () => {
  const result = await POST(request({ ...valid, email: 'invalido' }));
  assert.equal(result.status, 400);
  assert.match((await result.json()).error, /correo no parece válido/);
});

test('indica qué campos corregir en un registro incompleto', async () => {
  const result = await POST(request({ ...valid, telefono: '123', consentimiento: false }));
  assert.equal(result.status, 400);
  const data = await result.json();
  assert.match(data.error, /celular debe tener 8 dígitos bolivianos/);
  assert.match(data.error, /acepta el consentimiento/);
});

test('guarda la inscripción en Supabase', async () => withFakeServices(async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 201 });
  };
  const result = await POST(request(valid));
  assert.equal(result.status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/inscripciones');
  assert.equal(calls[0].options.headers.apikey, 'sb_secret_test');
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${calls[0].options.headers.apikey}`);
  const saved = JSON.parse(calls[0].options.body);
  assert.equal(saved.plan, 'interactivo');
  assert.equal(saved.precio_bs, 49);
  assert.equal(saved.telefono, '+59171234567');
}));

test('rechaza una clave publishable como credencial del servidor', async () => withFakeServices(async () => {
  process.env.SUPABASE_SECRET_KEY = 'sb_publishable_test';
  globalThis.fetch = async () => {
    throw new Error('No debe llamar a Supabase con una clave publishable.');
  };
  const result = await POST(request(valid));
  assert.equal(result.status, 503);
}));

test('correo duplicado responde 409', async () => withFakeServices(async () => {
  globalThis.fetch = async () => Response.json({ code: '23505' }, { status: 409 });
  const result = await POST(request(valid));
  assert.equal(result.status, 409);
  assert.match((await result.json()).error, /ya está registrado/);
}));

test('SMS solo con consentimiento y configuración', async () => withFakeServices(async () => {
  const calls = [];
  process.env.TWILIO_ACCOUNT_SID = 'AC_test';
  process.env.TWILIO_AUTH_TOKEN = 'auth_test';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return String(url).includes('twilio')
      ? Response.json({ sid: 'SM_test' }, { status: 201 })
      : new Response(null, { status: 201 });
  };
  const result = await POST(request({ ...valid, consentimiento_sms: true }));
  assert.equal(result.status, 201);
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /api\.twilio\.com/);
  assert.match(calls[1].options.body, /To=%2B59171234567/);
}));

test('un error de Twilio no borra el registro', async () => withFakeServices(async () => {
  process.env.TWILIO_ACCOUNT_SID = 'AC_test';
  process.env.TWILIO_AUTH_TOKEN = 'auth_test';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  globalThis.fetch = async (url) => String(url).includes('twilio')
    ? Response.json({ message: 'no disponible' }, { status: 400 })
    : new Response(null, { status: 201 });
  const result = await POST(request({ ...valid, consentimiento_sms: true }));
  assert.equal(result.status, 201);
}));
