(function () {
  'use strict';

  var heroSection = document.getElementById('hero-section');
  if (!heroSection) return;

  var aura1 = document.getElementById('aura1');
  var aura2 = document.getElementById('aura2');
  var aura3 = document.getElementById('aura3');
  if (!aura1 || !aura2 || !aura3) return;

  heroSection.addEventListener('mousemove', function (e) {
    var rect = heroSection.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var moveX = (x / rect.width) * 2 - 1;
    var moveY = (y / rect.height) * 2 - 1;

    requestAnimationFrame(function () {
      aura1.style.transform = 'translate(calc(-40px + ' + moveX * 20 + 'px), ' + moveY * 10 + 'px)';
      aura2.style.transform = 'translate(' + moveX * -10 + 'px, ' + moveY * -15 + 'px)';
      aura3.style.transform = 'translate(calc(40px + ' + moveX * -20 + 'px), ' + moveY * 20 + 'px)';
    });
  });

  heroSection.addEventListener('mouseleave', function () {
    requestAnimationFrame(function () {
      aura1.style.transform = 'translate(-40px, 0)';
      aura2.style.transform = 'translate(0, 0)';
      aura3.style.transform = 'translate(40px, 0)';
    });
  });
})();
