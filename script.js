(() => {
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const topButton = document.querySelector('.back-to-top');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header state and the secondary back-to-top control.
  const updateScrollState = () => {
    const scrolled = window.scrollY > 40;
    header.classList.toggle('scrolled', scrolled);
    topButton.classList.toggle('is-visible', window.scrollY > 650);
  };
  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  // The mobile menu closes on navigation, Escape, or an outside click.
  const setMenuOpen = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };
  menuButton.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenuOpen(false); });

  // Fade sections into view as they enter the viewport.
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else revealItems.forEach((item) => item.classList.add('is-visible'));

  // Placeholder counters animate once when their row appears.
  const counters = document.querySelectorAll('[data-count]');
  const countUp = (element) => {
    const target = Number(element.dataset.count);
    if (reduceMotion) { element.textContent = target; return; }
    const start = performance.now();
    const duration = 1350;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const stats = document.querySelector('.stats');
  if ('IntersectionObserver' in window && stats) {
    const statsObserver = new IntersectionObserver((entries, observer) => {
      if (entries[0].isIntersecting) {
        counters.forEach(countUp);
        observer.disconnect();
      }
    }, { threshold: 0.45 });
    statsObserver.observe(stats);
  } else counters.forEach(countUp);

  // Portfolio filters operate on the small, editable set of gallery elements.
  const filters = document.querySelectorAll('.filter');
  const galleryItems = [...document.querySelectorAll('.gallery-item')];
  filters.forEach((filter) => filter.addEventListener('click', () => {
    filters.forEach((button) => {
      const active = button === filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const category = filter.dataset.filter;
    galleryItems.forEach((item) => {
      const show = category === 'all' || item.dataset.category === category;
      item.classList.toggle('is-hidden', !show);
      item.setAttribute('aria-hidden', String(!show));
      item.tabIndex = show ? 0 : -1;
    });
  }));

  // Accessible portfolio lightbox with keyboard, arrows, and touch swipes.
  const lightbox = document.querySelector('.lightbox');
  const lightboxImage = lightbox.querySelector('img');
  const lightboxCaption = lightbox.querySelector('figcaption');
  const lightboxCounter = lightbox.querySelector('.lightbox-counter');
  const visibleItems = () => galleryItems.filter((item) => !item.classList.contains('is-hidden'));
  let currentIndex = 0;
  let lastFocused = null;
  let touchStartX = null;
  const renderLightbox = () => {
    const items = visibleItems();
    if (!items.length) return;
    const item = items[currentIndex];
    lightboxImage.src = item.dataset.image;
    lightboxImage.alt = item.querySelector('img').alt;
    lightboxCaption.textContent = `${item.dataset.title} — ${item.dataset.kind}`;
    lightboxCounter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  };
  const openLightbox = (item) => {
    const items = visibleItems();
    currentIndex = items.indexOf(item);
    lastFocused = document.activeElement;
    renderLightbox();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    lightbox.querySelector('.lightbox-close').focus();
  };
  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    lightboxImage.removeAttribute('src');
    if (lastFocused) lastFocused.focus();
  };
  const moveLightbox = (direction) => {
    const items = visibleItems();
    currentIndex = (currentIndex + direction + items.length) % items.length;
    renderLightbox();
  };
  galleryItems.forEach((item) => item.addEventListener('click', () => openLightbox(item)));
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => moveLightbox(-1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => moveLightbox(1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  lightbox.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 45) moveLightbox(delta < 0 ? 1 : -1);
    touchStartX = null;
  }, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowRight') moveLightbox(1);
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'Tab') {
      const focusable = [...lightbox.querySelectorAll('button')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // Placeholder testimonial slider. Replace all sample quotes before launch.
  const testimonials = [...document.querySelectorAll('.testimonial')];
  const testimonialCount = document.querySelector('.testimonial-count');
  let testimonialIndex = 0;
  const showTestimonial = (index) => {
    testimonialIndex = (index + testimonials.length) % testimonials.length;
    testimonials.forEach((testimonial, position) => testimonial.classList.toggle('is-current', position === testimonialIndex));
    testimonialCount.innerHTML = `${String(testimonialIndex + 1).padStart(2, '0')} <i>/</i> ${String(testimonials.length).padStart(2, '0')}`;
  };
  document.querySelector('.testimonial-prev').addEventListener('click', () => showTestimonial(testimonialIndex - 1));
  document.querySelector('.testimonial-next').addEventListener('click', () => showTestimonial(testimonialIndex + 1));

  // The demo form composes a WhatsApp enquiry. Connect a form backend for direct submissions.
  const form = document.querySelector('#inquiry-form');
  const formStatus = document.querySelector('#form-status');
  const validateField = (field) => {
    const label = field.closest('.field');
    const error = label.querySelector('.field-error');
    let message = '';
    if (field.required && !field.value.trim()) message = 'Please complete this field.';
    else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) message = 'Enter a valid email address.';
    label.classList.toggle('has-error', Boolean(message));
    if (error) error.textContent = message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  };
  form.querySelectorAll('input,textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.closest('.field').classList.contains('has-error')) validateField(field);
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    formStatus.textContent = '';
    const requiredFields = [...form.querySelectorAll('[required]')];
    const isValid = requiredFields.map(validateField).every(Boolean);
    if (!isValid) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      formStatus.textContent = 'Please check the highlighted fields and try again.';
      return;
    }
    const data = new FormData(form);
    const lines = [
      'Hello 28 Square Events, I would love to discuss an event.',
      '',
      `Name: ${data.get('name')}`,
      `Email: ${data.get('email')}`,
      `Phone: ${data.get('phone')}`,
      `Event type: ${data.get('eventType') || 'Not specified'}`,
      `Event date: ${data.get('date') || 'Not specified'}`,
      `Estimated budget: ${data.get('budget') || 'Not specified'}`,
      `Message: ${data.get('message')}`
    ];
    const whatsAppUrl = `https://wa.me/2348105463952?text=${encodeURIComponent(lines.join('\n'))}`;
    formStatus.textContent = 'Your message is ready. WhatsApp will open so you can send it.';
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
  });
})();
