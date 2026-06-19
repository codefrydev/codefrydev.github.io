(function () {
  'use strict';

  function parseSlides(section) {
    var dataId = section.getAttribute('data-hero-slides-id');
    if (!dataId) return [];
    var dataEl = document.getElementById(dataId);
    if (!dataEl) return [];
    try {
      var slides = JSON.parse(dataEl.textContent);
      return Array.isArray(slides) ? slides : [];
    } catch (e) {
      return [];
    }
  }

  function initHeroCarousel(heroSection) {
    var heroSlides = parseSlides(heroSection);
    if (!heroSlides.length) return;

    var currentSlide = 0;
    var activeLayer = 1;
    var autoplayTimer = null;
    var transitionTimer = null;

    var bgLayer1 = heroSection.querySelector('[data-hero-bg-layer="1"]');
    var bgLayer2 = heroSection.querySelector('[data-hero-bg-layer="2"]');
    var heroContent = heroSection.querySelector('[data-hero-content]');
    var indicatorsContainer = heroSection.querySelector('[data-hero-indicators]');
    var prevBtn = heroSection.querySelector('[data-hero-prev]');
    var nextBtn = heroSection.querySelector('[data-hero-next]');

    function getHeroTitleEl() {
      return heroSection.querySelector('[data-hero-title]');
    }

    function getHeroDescEl() {
      return heroSection.querySelector('[data-hero-desc]');
    }

    if (!bgLayer1 || !bgLayer2 || !heroContent || !getHeroTitleEl() || !getHeroDescEl() || !indicatorsContainer) {
      return;
    }

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var autoplayMs = prefersReducedMotion
      ? 0
      : Number(heroSection.getAttribute('data-hero-autoplay')) || 6000;
    var fadeMs = prefersReducedMotion ? 0 : 500;

    function slideImageAlt(slide) {
      return (slide && (slide.imageAlt || slide.title)) || '';
    }

    function setLayerImage(layerEl, slide) {
      if (!layerEl || !slide || !slide.image) return;
      var img = layerEl.querySelector('img');
      if (img) {
        img.src = slide.image;
        img.alt = slideImageAlt(slide);
        if (slide.imageTitle) {
          img.title = slide.imageTitle;
        } else {
          img.removeAttribute('title');
        }
        return;
      }
      layerEl.style.backgroundImage = "url('" + String(slide.image).replace(/'/g, "\\'") + "')";
    }

    function syncLadybugBackup() {
      var h1 = document.getElementById('ladybug-h1-bite-target');
      if (h1 && h1.getAttribute('data-ladybug-wrapped') === '1') {
        h1.setAttribute('data-ladybug-title-backup', h1.innerHTML);
      }
    }

    heroSlides.forEach(function (slide) {
      if (!slide.image) return;
      var img = new Image();
      img.src = slide.image;
    });

    heroSlides.forEach(function (slide, index) {
      var dot = document.createElement('button');
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
      var heroTitle = getHeroTitleEl();
      if (!heroTitle) return;
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
        var active = i === index;
        dot.classList.toggle('home-hero__dot--active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function applySlideContent(slide) {
      setHeroTitleText(slide.title || '');
      var heroDesc = getHeroDescEl();
      if (heroDesc) {
        heroDesc.textContent = slide.description || '';
      }
    }

    function trackSlide() {
      if (typeof window.cfdTrack === 'function') {
        var slide = heroSlides[currentSlide];
        window.cfdTrack('hero_slide', {
          slide_index: currentSlide,
          slide_title: slide.title || '',
          hero_context: heroSection.getAttribute('data-hero-context') || 'home',
          event_category: 'engagement',
        });
      }
    }

    function goToSlide(index) {
      if (index === currentSlide) return;
      if (index < 0) index = heroSlides.length - 1;
      if (index >= heroSlides.length) index = 0;

      currentSlide = index;
      var slide = heroSlides[currentSlide];

      if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
      }

      var nextLayer = activeLayer === 1 ? bgLayer2 : bgLayer1;
      var currentLayerEl = activeLayer === 1 ? bgLayer1 : bgLayer2;

      setLayerImage(nextLayer, slide);

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

    if (autoplayMs > 0 && heroSlides.length > 1) {
      heroSection.addEventListener('mouseenter', stopAutoplay);
      heroSection.addEventListener('mouseleave', resetAutoplay);
      heroSection.addEventListener('focusin', stopAutoplay);
      heroSection.addEventListener('focusout', function (e) {
        if (!heroSection.contains(e.relatedTarget)) resetAutoplay();
      });
      resetAutoplay();
    }

    document.addEventListener('cfd:hero-title-dom-replaced', function () {
      if (heroSection.contains(getH1BiteTarget())) {
        applySlideContent(heroSlides[currentSlide]);
      }
    });

    function getH1BiteTarget() {
      return document.getElementById('ladybug-h1-bite-target');
    }
  }

  function boot() {
    document.querySelectorAll('[data-hero-carousel]').forEach(initHeroCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
