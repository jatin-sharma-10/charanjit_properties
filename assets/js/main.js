/* ============================================
   CHARANJIT PROPERTIES — Main JavaScript
   ============================================ */

const CONFIG = {
  whatsappPrimary: '919417248112',
  whatsappSecondary: '917888681054',
  phonePrimary: '+919417248112'
};

document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initNavbar();
  initScrollAnimations();
  initParticles();
  initCursorGlow();
  initCountUp();
  initSmoothScroll();
  initTestimonialsNav();
  initEventListeners();
  loadFeaturedProperties();
});

/* ---------- Preloader ---------- */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader.classList.add('hidden');
      document.body.style.overflow = '';
    }, 2000);
  });
  setTimeout(() => {
    preloader.classList.add('hidden');
    document.body.style.overflow = '';
  }, 3500);
}

/* ---------- Navbar ---------- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const navItems = links.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    updateActiveNav();
  });

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    links.classList.toggle('active');
    document.body.style.overflow = links.classList.contains('active') ? 'hidden' : '';
  });

  navItems.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      links.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 120;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navItems.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }
}

/* ---------- Scroll Animations ---------- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => { entry.target.classList.add('visible'); }, parseInt(delay));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  elements.forEach(el => observer.observe(el));
}

/* ---------- Particles ---------- */
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const count = window.innerWidth < 768 ? 15 : 30;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    particle.style.width = (2 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

/* ---------- Cursor Glow ---------- */
function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow || window.innerWidth < 768) {
    if (glow) glow.style.display = 'none';
    return;
  }
  let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
  document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  function animate() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    requestAnimationFrame(animate);
  }
  animate();
}

/* ---------- Count Up Animation ---------- */
function initCountUp() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        animateCount(el, parseInt(el.dataset.count));
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

function animateCount(el, target) {
  const duration = 2000;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ---------- Smooth Scroll ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ---------- Event Listener Bindings ---------- */
function initEventListeners() {
  document.querySelectorAll('[data-show-form]').forEach(btn => {
    btn.addEventListener('click', () => showForm(btn.dataset.showForm));
  });

  const overlay = document.getElementById('formOverlay');
  if (overlay) overlay.addEventListener('click', closeForm);

  const formModal = document.getElementById('formModal');
  if (formModal) {
    formModal.addEventListener('click', (e) => {
      if (e.target === formModal || e.target === overlay) closeForm();
    });
  }

  const closeBtn = document.getElementById('formCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeForm);

  const leadForm = document.getElementById('leadForm');
  if (leadForm) leadForm.addEventListener('submit', handleFormSubmit);

  document.querySelectorAll('[data-faq-toggle]').forEach(btn => {
    btn.addEventListener('click', () => toggleFaq(btn));
  });

  ['loanAmount', 'interestRate', 'loanTenure'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateEMI);
  });
}

/* ---------- Form Modal ---------- */
function showForm(intent) {
  const modal = document.getElementById('formModal');
  const formIcon = document.getElementById('formIcon');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const formIntent = document.getElementById('formIntent');
  const formSubmitBtn = document.getElementById('formSubmitBtn');
  const form = document.getElementById('leadForm');
  const success = document.getElementById('formSuccess');

  form.style.display = '';
  success.style.display = 'none';
  form.reset();
  formIntent.value = intent;

  if (intent === 'buy') {
    formIcon.className = 'form-icon';
    formIcon.innerHTML = '<i class="fas fa-home"></i>';
    formTitle.textContent = 'Find Your Dream Property';
    formSubtitle.textContent = 'Share your requirements and our expert will find the perfect match for you.';
    formSubmitBtn.className = 'form-submit';
    formSubmitBtn.querySelector('span').textContent = 'Submit Your Requirement';
  } else {
    formIcon.className = 'form-icon sell-form';
    formIcon.innerHTML = '<i class="fas fa-tag"></i>';
    formTitle.textContent = 'List Your Property With Us';
    formSubtitle.textContent = "Share your property details and we'll connect you with genuine buyers.";
    formSubmitBtn.className = 'form-submit sell-submit';
    formSubmitBtn.querySelector('span').textContent = 'List My Property';
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeForm() {
  document.getElementById('formModal').classList.remove('active');
  document.body.style.overflow = '';
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('leadForm');
  const success = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('formSubmitBtn');

  submitBtn.innerHTML = '<span>Submitting...</span><i class="fas fa-spinner fa-spin"></i>';
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => { data[key] = value; });

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (!result.success) throw new Error(result.error);
  } catch (err) {
    console.log('API not available, storing locally:', err.message);
    const leads = JSON.parse(localStorage.getItem('charanjitLeads') || '[]');
    data.timestamp = new Date().toISOString();
    leads.push(data);
    localStorage.setItem('charanjitLeads', JSON.stringify(leads));
  }

  form.style.display = 'none';
  success.style.display = '';

  const intentLabel = data.intent === 'buy' ? 'Buy' : 'Sell';
  const whatsappMsg = encodeURIComponent(
    `Hi, I'm ${data.name}.\n` +
    `I want to *${intentLabel}* a property.\n` +
    `Type: ${data.propertyType || 'Not specified'}\n` +
    `Area: ${data.area || 'Not specified'}\n` +
    `Budget: ${data.budget || 'Not specified'}\n` +
    `Details: ${data.message || 'None'}\n` +
    `Phone: ${data.phone}`
  );

  if (!success.querySelector('.whatsapp-send')) {
    const whatsappBtn = document.createElement('a');
    whatsappBtn.href = `https://wa.me/${CONFIG.whatsappPrimary}?text=${whatsappMsg}`;
    whatsappBtn.target = '_blank';
    whatsappBtn.className = 'btn btn-outline whatsapp-send';
    whatsappBtn.style.marginTop = '12px';
    whatsappBtn.innerHTML = '<i class="fab fa-whatsapp"></i><span>Send via WhatsApp</span>';
    const callBtn = success.querySelector('a.btn');
    if (callBtn) callBtn.parentNode.insertBefore(whatsappBtn, callBtn.nextSibling);
  }
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeForm(); });

/* ---------- FAQ Toggle ---------- */
function toggleFaq(btn) {
  const item = btn.parentElement;
  const isActive = item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  if (!isActive) item.classList.add('active');
}

/* ---------- Testimonials Nav (Mobile) ---------- */
function initTestimonialsNav() {
  const track = document.getElementById('testimonialsTrack');
  const cards = track ? track.querySelectorAll('.testimonial-card') : [];
  if (cards.length < 3) return;

  const prevBtn = document.getElementById('testPrev');
  const nextBtn = document.getElementById('testNext');
  const dotsContainer = document.getElementById('testDots');
  let currentPage = 0;
  const totalPages = Math.ceil(cards.length / 2);

  for (let i = 0; i < totalPages; i++) {
    const dot = document.createElement('span');
    dot.classList.add('test-dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToPage(i));
    dotsContainer.appendChild(dot);
  }

  function goToPage(page) {
    currentPage = page;
    cards.forEach((card, i) => {
      if (window.innerWidth <= 768) {
        card.style.display = (i >= page * 2 && i < page * 2 + 2) ? '' : 'none';
      }
    });
    dotsContainer.querySelectorAll('.test-dot').forEach((d, i) => {
      d.classList.toggle('active', i === page);
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goToPage(currentPage > 0 ? currentPage - 1 : totalPages - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToPage(currentPage < totalPages - 1 ? currentPage + 1 : 0));

  function checkMobile() {
    if (window.innerWidth <= 768) goToPage(0);
    else cards.forEach(card => card.style.display = '');
  }
  window.addEventListener('resize', checkMobile);
  checkMobile();
}

/* ---------- Magnetic Card Effect ---------- */
document.querySelectorAll('.intent-card, .service-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = (y - rect.height / 2) / 20;
    const rotateY = (rect.width / 2 - x) / 20;
    const inner = card.querySelector('.intent-card-inner') || card;
    inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave', () => {
    const inner = card.querySelector('.intent-card-inner') || card;
    inner.style.transform = '';
  });
});

/* ---------- EMI Calculator ---------- */
function calculateEMI() {
  const P = parseInt(document.getElementById('loanAmount').value);
  const annualRate = parseFloat(document.getElementById('interestRate').value);
  const years = parseInt(document.getElementById('loanTenure').value);
  const r = annualRate / 12 / 100;
  const n = years * 12;

  const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - P;

  document.getElementById('loanAmountVal').textContent = formatINR(P);
  document.getElementById('interestRateVal').textContent = annualRate + '%';
  document.getElementById('loanTenureVal').textContent = years + (years === 1 ? ' Year' : ' Years');
  document.getElementById('emiAmount').textContent = formatINR(Math.round(emi));
  document.getElementById('totalInterest').textContent = formatINR(Math.round(totalInterest));
  document.getElementById('totalPayment').textContent = formatINR(Math.round(totalPayment));
}

function formatINR(num) {
  const str = num.toString();
  let result = '';
  const len = str.length;
  if (len <= 3) return '₹' + str;
  result = str.substring(len - 3);
  let remaining = str.substring(0, len - 3);
  while (remaining.length > 2) {
    result = remaining.substring(remaining.length - 2) + ',' + result;
    remaining = remaining.substring(0, remaining.length - 2);
  }
  if (remaining.length > 0) result = remaining + ',' + result;
  return '₹' + result;
}

/* ---------- Activity Ticker ---------- */
(function initActivityTicker() {
  const ticker = document.getElementById('activityTicker');
  const tickerText = document.getElementById('tickerText');
  if (!ticker || !tickerText) return;

  const activities = [
    { text: 'Someone enquired about a property in Mohali', time: 'Recently' },
    { text: 'A buyer enquired about plots in Chandigarh', time: 'A while ago' },
    { text: 'Someone enquired about a flat in Mohali', time: 'Recently' },
    { text: 'A buyer showed interest in a kothi in Panchkula', time: 'A while ago' },
  ];

  let index = 0;
  function showTicker() {
    if (Math.random() > 0.5) return;
    const activity = activities[index % activities.length];
    tickerText.textContent = activity.text;
    ticker.querySelector('.ticker-time').textContent = activity.time;
    ticker.classList.add('visible');
    setTimeout(() => {
      ticker.classList.remove('visible');
      index++;
    }, 4000);
  }

  setTimeout(() => {
    showTicker();
    setInterval(showTicker, 45000);
  }, 30000);
})();

/* ---------- Parallax on Scroll ---------- */
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const hero = document.querySelector('.hero-content');
  if (hero && scrollY < window.innerHeight) {
    hero.style.transform = `translateY(${scrollY * 0.3}px)`;
    hero.style.opacity = 1 - (scrollY / (window.innerHeight * 0.8));
  }
});

/* ---------- Dynamic Property Listings ---------- */
async function loadFeaturedProperties() {
  const grid = document.getElementById('propertiesGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/properties?status=available&limit=6');
    const data = await res.json();

    if (!data.properties || data.properties.length === 0) {
      grid.innerHTML = `
        <div class="property-card animate-on-scroll" style="text-align:center;padding:40px;grid-column:1/-1;">
          <i class="fas fa-home" style="font-size:48px;opacity:0.2;margin-bottom:16px;display:block;"></i>
          <p style="color:var(--text-dim);">New listings coming soon! Contact us for available properties.</p>
        </div>`;
      return;
    }

    const typeIcons = { flat: 'fa-building', kothi: 'fa-home', plot: 'fa-map', villa: 'fa-hotel',
                        shop: 'fa-store', office: 'fa-briefcase', commercial: 'fa-city', other: 'fa-home' };

    grid.innerHTML = data.properties.map((p, i) => {
      const imgs = Array.isArray(p.images) ? p.images : [];
      const hasImage = imgs.length > 0;
      const imageHTML = hasImage
        ? `<img src="${imgs[0]}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div class="property-img-placeholder"><i class="fas ${typeIcons[p.type] || 'fa-home'}"></i></div>`;

      const tagClass = (p.tag || '').toLowerCase().includes('hot') ? ' hot' : '';
      const tagHTML = p.tag ? `<span class="property-tag${tagClass}">${p.tag}</span>` : '';
      const typeLabel = p.type.charAt(0).toUpperCase() + p.type.slice(1);
      const typeTag = p.bedrooms ? `${p.bedrooms} BHK ${typeLabel}` : typeLabel;

      let features = '';
      if (p.size) features += `<span><i class="fas fa-expand-arrows-alt"></i> ${p.size} ${p.size_unit || 'sq.ft'}</span>`;
      if (p.bedrooms) features += `<span><i class="fas fa-bed"></i> ${p.bedrooms} Bed</span>`;
      if (p.bathrooms) features += `<span><i class="fas fa-bath"></i> ${p.bathrooms} Bath</span>`;
      if (p.facing) features += `<span><i class="fas fa-compass"></i> ${p.facing}</span>`;
      if (p.floor) features += `<span><i class="fas fa-layer-group"></i> ${p.floor}</span>`;

      const priceText = p.price_display || '₹' + (p.price || 0).toLocaleString('en-IN');

      return `
        <div class="property-card animate-on-scroll" data-delay="${i * 100}">
          <div class="property-image">${imageHTML}${tagHTML}<span class="property-type-tag">${typeTag}</span></div>
          <div class="property-info">
            <h3>${p.title}</h3>
            <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${p.location}</p>
            <div class="property-features">${features}</div>
            <div class="property-bottom">
              <span class="property-price">${priceText}</span>
              <button class="property-enquire" data-show-form="buy">Enquire <i class="fas fa-arrow-right"></i></button>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-show-form]').forEach(btn => {
      btn.addEventListener('click', () => showForm(btn.dataset.showForm));
    });

    initScrollAnimations();
  } catch (err) {
    console.log('Properties API not available, showing placeholder');
    grid.innerHTML = `
      <div class="property-card animate-on-scroll" style="text-align:center;padding:40px;grid-column:1/-1;">
        <i class="fas fa-home" style="font-size:48px;opacity:0.2;margin-bottom:16px;display:block;"></i>
        <p style="color:var(--text-dim);">Contact us for the latest available properties.</p>
      </div>`;
  }
}
