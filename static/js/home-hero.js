(function () {
  'use strict';

  const heroSlides = window.heroSlides;
  if (!Array.isArray(heroSlides) || !heroSlides.length) return;

  let currentSlide = 0;
  let activeLayer = 1;
  let autoplayTimer = null;
  let transitionTimer = null;

  const heroSection = document.getElementById('hero');
  const bgLayer1 = document.getElementById('bg-layer-1');
  const bgLayer2 = document.getElementById('bg-layer-2');
  const heroContent = document.getElementById('hero-content');
  const heroTitle = document.getElementById('hero-title');
  const heroDesc = document.getElementById('hero-desc');
  const indicatorsContainer = document.getElementById('carousel-indicators');
  const prevBtn = document.getElementById('hero-carousel-prev');
  const nextBtn = document.getElementById('hero-carousel-next');

  if (!bgLayer1 || !bgLayer2 || !heroContent || !heroTitle || !heroDesc || !indicatorsContainer) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoplayMs = prefersReducedMotion ? 0 : Number(window.heroAutoplayMs) || 6000;
  const fadeMs = prefersReducedMotion ? 0 : 500;

  function setLayerImage(layerEl, url) {
    if (!layerEl || !url) return;
    var img = layerEl.querySelector('img');
    if (img) {
      img.src = url;
      return;
    }
    layerEl.style.backgroundImage = "url('" + String(url).replace(/'/g, "\\'") + "')";
  }

  function syncLadybugBackup() {
    const h1 = document.getElementById('ladybug-h1-bite-target');
    if (h1 && h1.getAttribute('data-ladybug-wrapped') === '1') {
      h1.setAttribute('data-ladybug-title-backup', h1.innerHTML);
    }
  }

  heroSlides.forEach(function (slide) {
    if (!slide.image) return;
    const img = new Image();
    img.src = slide.image;
  });

  heroSlides.forEach(function (slide, index) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'home-hero__dot' + (index === 0 ? ' home-hero__dot--active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', 'Go to slide ' + (index + 1) + ': ' + (slide.title || ''));
    dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    dot.addEventListener('click', function () {
      goToSlide(index);
      resetAutoplay();
    });
    indicatorsContainer.appendChild(dot);
  });

  function setHeroTitleText(text) {
    if (heroTitle.querySelector('.ladybug-h1-char')) {
      heroTitle.innerHTML = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === ' ') {
          heroTitle.appendChild(document.createTextNode(' '));
          continue;
        }
        var sp = document.createElement('span');
        sp.className = 'ladybug-h1-char';
        sp.textContent = ch;
        heroTitle.appendChild(sp);
      }
    } else {
      heroTitle.textContent = text;
    }
    syncLadybugBackup();
  }

  function updateIndicators(index) {
    Array.from(indicatorsContainer.children).forEach(function (dot, i) {
      const active = i === index;
      dot.classList.toggle('home-hero__dot--active', active);
      dot.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function applySlideContent(slide) {
    setHeroTitleText(slide.title || '');
    heroDesc.textContent = slide.description || '';
  }

  function goToSlide(index) {
    if (index === currentSlide) return;
    if (index < 0) index = heroSlides.length - 1;
    if (index >= heroSlides.length) index = 0;

    currentSlide = index;
    const slide = heroSlides[currentSlide];

    if (transitionTimer) {
      clearTimeout(transitionTimer);
      transitionTimer = null;
    }

    const nextLayer = activeLayer === 1 ? bgLayer2 : bgLayer1;
    const currentLayerEl = activeLayer === 1 ? bgLayer1 : bgLayer2;

    setLayerImage(nextLayer, slide.image);

    if (fadeMs === 0) {
      applySlideContent(slide);
      nextLayer.classList.remove('opacity-0');
      nextLayer.classList.add('opacity-100');
      currentLayerEl.classList.remove('opacity-100');
      currentLayerEl.classList.add('opacity-0');
      activeLayer = activeLayer === 1 ? 2 : 1;
      updateIndicators(currentSlide);
      trackSlide();
      return;
    }

    heroContent.classList.remove('opacity-100');
    heroContent.classList.add('opacity-0');

    transitionTimer = setTimeout(function () {
      transitionTimer = null;
      applySlideContent(slide);

      heroContent.classList.remove('opacity-0');
      heroContent.classList.add('opacity-100');

      nextLayer.classList.remove('opacity-0');
      nextLayer.classList.add('opacity-100');
      currentLayerEl.classList.remove('opacity-100');
      currentLayerEl.classList.add('opacity-0');

      activeLayer = activeLayer === 1 ? 2 : 1;
      updateIndicators(currentSlide);
      trackSlide();
    }, fadeMs);
  }

  function trackSlide() {
    if (typeof window.cfdTrack === 'function') {
      const slide = heroSlides[currentSlide];
      window.cfdTrack('hero_slide', {
        slide_index: currentSlide,
        slide_title: slide.title || '',
        event_category: 'engagement',
      });
    }
  }

  function nextSlide() {
    goToSlide((currentSlide + 1) % heroSlides.length);
  }

  function prevSlide() {
    goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
  }

  function resetAutoplay() {
    if (!autoplayMs || heroSlides.length <= 1) return;
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = setInterval(nextSlide, autoplayMs);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      prevSlide();
      resetAutoplay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      nextSlide();
      resetAutoplay();
    });
  }

  if (heroSection && autoplayMs > 0 && heroSlides.length > 1) {
    heroSection.addEventListener('mouseenter', stopAutoplay);
    heroSection.addEventListener('mouseleave', resetAutoplay);
    heroSection.addEventListener('focusin', stopAutoplay);
    heroSection.addEventListener('focusout', function (e) {
      if (!heroSection.contains(e.relatedTarget)) resetAutoplay();
    });
  }

  if (heroSlides.length > 1 && autoplayMs > 0) {
    resetAutoplay();
  }
})();
