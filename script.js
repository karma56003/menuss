const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
const form = document.querySelector('#lead-form');
const feedback = document.querySelector('#form-feedback');
const submitButton = form.querySelector('button[type="submit"]');

// El selector conserva los renders de referencia aun cuando WebGL no esté disponible.
const modelReferences = {
  burger: { image: '/assets/platia-burger-3d.png', title: 'La Suprema · Hamburguesa', alt: 'hamburguesa' },
  pizza: { image: '/assets/platia-pizza-3d.png', title: 'La Artesanal · Pizza', alt: 'pizza artesanal' },
};
document.querySelectorAll('[data-model]').forEach((button) => {
  button.addEventListener('click', () => {
    const model = button.dataset.model;
    if (!(model in modelReferences)) return;
    document.querySelectorAll('[data-model]').forEach((other) => {
      const active = other === button;
      other.classList.toggle('active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    const ref = modelReferences[model];
    const referenceImage = document.querySelector('#reference-image');
    referenceImage.src = ref.image;
    referenceImage.alt = `Render original de ${ref.alt} usado como referencia del modelo 3D`;
    document.querySelector('#reference-title').textContent = ref.title;
    document.querySelector('#placeholder-image').src = ref.image;
    document.querySelector('#placeholder-image').alt = `Referencia gastronómica de ${ref.alt}`;
    document.querySelector('#stage-counter').textContent = model === 'burger' ? '01 / 02' : '02 / 02';
    document.querySelector('#platia-3d').setAttribute('aria-label', `Modelo tridimensional de ${ref.alt}. Puedes girarlo y hacer zoom.`);
    window.dispatchEvent(new CustomEvent('platia:model-change', { detail: { model } }));
  });
});

// Respaldo accesible para navegadores con WebGL bloqueado: ligera inclinación
// de la fotografía de referencia, sin presentarla como geometría 3D real.
const modelStage = document.querySelector('#model-stage');
const placeholderImage = document.querySelector('#placeholder-image');
modelStage.addEventListener('pointermove', (event) => {
  if (window.__platia3DReady || event.pointerType === 'touch') return;
  const rect = modelStage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
  const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
  placeholderImage.style.transform = `perspective(700px) rotateY(${(x * 9).toFixed(1)}deg) rotateX(${(-y * 7).toFixed(1)}deg) scale(1.035)`;
});
modelStage.addEventListener('pointerleave', () => {
  placeholderImage.style.transform = '';
});

window.setTimeout(() => {
  if (window.__platia3DReady) return;
  const placeholder = document.querySelector('#model-placeholder');
  if (placeholder && !placeholder.hidden) {
    document.querySelector('#model-status').textContent = 'Tu navegador no pudo abrir el visor 3D. Puedes ver los renders de referencia.';
    document.querySelector('.stage-chip').lastChild.textContent = ' VISTA DE REFERENCIA';
  }
}, 10000);

document.querySelector('#year').textContent = new Date().getFullYear();

menuToggle.addEventListener('click', () => {
  const willOpen = mobileMenu.hidden;
  mobileMenu.hidden = !willOpen;
  menuToggle.setAttribute('aria-expanded', String(willOpen));
  menuToggle.setAttribute('aria-label', willOpen ? 'Cerrar menú' : 'Abrir menú');
});

mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
  });
});

document.querySelectorAll('[data-plan]').forEach((link) => {
  link.addEventListener('click', () => {
    const plan = form.querySelector(`input[name="plan"][value="${link.dataset.plan}"]`);
    if (plan) plan.checked = true;
    clearFeedback();
  });
});

function clearFeedback() {
  feedback.textContent = '';
  feedback.className = 'form-feedback';
}

form.addEventListener('input', clearFeedback);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFeedback();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const fields = new FormData(form);
  const payload = {
    nombre: String(fields.get('nombre') || '').trim(),
    negocio: String(fields.get('negocio') || '').trim(),
    email: String(fields.get('email') || '').trim(),
    telefono: String(fields.get('telefono') || '').trim(),
    ciudad: String(fields.get('ciudad') || '').trim(),
    plan: String(fields.get('plan') || ''),
    consentimiento: fields.get('consentimiento') === 'on',
    consentimiento_sms: fields.get('consentimiento_sms') === 'on',
    empresa_web: String(fields.get('empresa_web') || ''),
  };

  submitButton.disabled = true;
  submitButton.querySelector('.submit-text').textContent = 'Guardando inscripción…';

  try {
    const response = await fetch('/api/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || 'No pudimos guardar tu registro. Intenta nuevamente.');
    }

    feedback.textContent = '¡Inscripción recibida! Guardamos tus datos y el plan que elegiste. Te contactaremos cuando haya novedades.';
    feedback.classList.add('success');
    form.reset();
    form.querySelector('input[name="plan"][value="interactivo"]').checked = true;
  } catch (error) {
    feedback.textContent = error.message || 'Ocurrió un error de conexión. Vuelve a intentarlo.';
    feedback.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('.submit-text').textContent = 'Enviar mi inscripción';
  }
});
