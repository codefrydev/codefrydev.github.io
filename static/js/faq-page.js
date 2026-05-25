(function () {
  var searchInput = document.getElementById('faq-search-input');
  var groups = document.getElementById('faq-groups');
  var noResults = document.getElementById('faq-no-results');
  var filters = document.querySelectorAll('[data-faq-filter]');

  if (!groups) return;

  var activeFilter = 'all';

  function normalize(text) {
    return (text || '').toLowerCase().trim();
  }

  function itemMatches(item, query) {
    if (!query) return true;
    var question = item.querySelector('.faq-item__question');
    var answer = item.querySelector('.faq-item__answer');
    var haystack =
      normalize(question && question.textContent) + ' ' + normalize(answer && answer.textContent);
    return haystack.indexOf(query) !== -1;
  }

  function applyFilters() {
    var query = normalize(searchInput ? searchInput.value : '');
    var groupEls = groups.querySelectorAll('.faq-group');
    var visibleCount = 0;

    groupEls.forEach(function (group) {
      var category = group.getAttribute('data-faq-category');
      var categoryMatch = activeFilter === 'all' || category === activeFilter;
      var groupVisible = false;

      if (!categoryMatch) {
        group.hidden = true;
        return;
      }

      group.querySelectorAll('.faq-item').forEach(function (item) {
        var match = itemMatches(item, query);
        item.hidden = !match;
        if (match) groupVisible = true;
      });

      group.hidden = !groupVisible;
      if (groupVisible) visibleCount += 1;
    });

    if (noResults) {
      noResults.hidden = visibleCount > 0;
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeFilter = btn.getAttribute('data-faq-filter') || 'all';

      filters.forEach(function (other) {
        var isActive = other === btn;
        other.classList.toggle('is-active', isActive);
        other.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      applyFilters();
    });
  });

  applyFilters();
})();
