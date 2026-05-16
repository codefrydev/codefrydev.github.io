(function () {
  'use strict';

  const heroSlides = window.heroSlides;
  if (!Array.isArray(heroSlides) || !heroSlides.length) return;

  let currentSlide = 0;
  let activeLayer = 1;

  const bgLayer1 = document.getElementById('bg-layer-1');
  const bgLayer2 = document.getElementById('bg-layer-2');
  const heroContent = document.getElementById('hero-content');
  const heroTitle = document.getElementById('hero-title');
  const heroDesc = document.getElementById('hero-desc');
  const indicatorsContainer = document.getElementById('carousel-indicators');

  if (!bgLayer1 || !bgLayer2 || !heroContent || !heroTitle || !heroDesc || !indicatorsContainer) {
    return;
  }

  heroSlides.forEach(function (slide) {
    if (!slide.image) return;
    const img = new Image();
    img.src = slide.image;
  });

  heroSlides.forEach(function (_, index) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className =
      index === 0
        ? 'w-2 h-2 rounded-full transition-all duration-300 bg-slate-800'
        : 'w-2 h-2 rounded-full transition-all duration-300 bg-slate-300 hover:bg-slate-400';
    dot.setAttribute('aria-label', 'Go to slide ' + (index + 1));
    dot.addEventListener('click', function () {
      goToSlide(index);
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
  }

  function updateIndicators(index) {
    Array.from(indicatorsContainer.children).forEach(function (dot, i) {
      if (i === index) {
        dot.className = 'w-2 h-2 rounded-full transition-all duration-300 bg-slate-800';
      } else {
        dot.className = 'w-2 h-2 rounded-full transition-all duration-300 bg-slate-300 hover:bg-slate-400';
      }
    });
  }

  function goToSlide(index) {
    if (index === currentSlide) return;
    currentSlide = index;
    const slide = heroSlides[currentSlide];

    heroContent.classList.remove('opacity-100');
    heroContent.classList.add('opacity-0');

    const nextLayer = activeLayer === 1 ? bgLayer2 : bgLayer1;
    const currentLayerEl = activeLayer === 1 ? bgLayer1 : bgLayer2;

    nextLayer.style.backgroundImage = "url('" + slide.image + "')";

    setTimeout(function () {
      setHeroTitleText(slide.title);
      heroDesc.textContent = slide.description;

      heroContent.classList.remove('opacity-0');
      heroContent.classList.add('opacity-100');

      nextLayer.classList.remove('opacity-0');
      nextLayer.classList.add('opacity-100');
      currentLayerEl.classList.remove('opacity-100');
      currentLayerEl.classList.add('opacity-0');

      activeLayer = activeLayer === 1 ? 2 : 1;
      updateIndicators(currentSlide);

      if (typeof window.cfdTrack === 'function') {
        window.cfdTrack('hero_slide', {
          slide_index: currentSlide,
          slide_title: slide.title || '',
          event_category: 'engagement',
        });
      }
    }, 500);
  }

  const interval = Number(window.heroAutoplayMs) || 6000;
  if (heroSlides.length > 1) {
    setInterval(function () {
      const nextIndex = (currentSlide + 1) % heroSlides.length;
      goToSlide(nextIndex);
    }, interval);
  }
})();
