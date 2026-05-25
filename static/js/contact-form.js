(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var rules = {
    name: {
      min: parseInt(form.getAttribute('data-name-min'), 10) || 2,
      max: parseInt(form.getAttribute('data-name-max'), 10) || 80,
    },
    email: {
      max: parseInt(form.getAttribute('data-email-max'), 10) || 254,
    },
    message: {
      min: parseInt(form.getAttribute('data-message-min'), 10) || 10,
      max: parseInt(form.getAttribute('data-message-max'), 10) || 5000,
    },
  };

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  var fields = {
    name: {
      input: document.getElementById('name'),
      error: document.getElementById('name-error'),
    },
    email: {
      input: document.getElementById('email'),
      error: document.getElementById('email-error'),
    },
    message: {
      input: document.getElementById('message'),
      error: document.getElementById('message-error'),
      counter: document.getElementById('message-count'),
    },
  };

  var summary = document.getElementById('contact-form-summary');
  var submitBtn = form.querySelector('.contact-submit');
  var submitLabel = submitBtn ? submitBtn.innerHTML : '';
  var touched = { name: false, email: false, message: false };

  function trim(value) {
    return (value || '').trim();
  }

  function validateName(value) {
    var text = trim(value);
    if (!text) return 'Please enter your name.';
    if (text.length < rules.name.min) {
      return 'Name must be at least ' + rules.name.min + ' characters.';
    }
    if (text.length > rules.name.max) {
      return 'Name must be ' + rules.name.max + ' characters or fewer.';
    }
    return '';
  }

  function validateEmail(value) {
    var text = trim(value);
    if (!text) return 'Please enter your email address.';
    if (text.length > rules.email.max) {
      return 'Email must be ' + rules.email.max + ' characters or fewer.';
    }
    if (!emailPattern.test(text)) return 'Please enter a valid email address.';
    return '';
  }

  function validateMessage(value) {
    var text = trim(value);
    if (!text) return 'Please enter a message.';
    if (text.length < rules.message.min) {
      return 'Message must be at least ' + rules.message.min + ' characters.';
    }
    if (text.length > rules.message.max) {
      return 'Message must be ' + rules.message.max + ' characters or fewer.';
    }
    return '';
  }

  var validators = {
    name: validateName,
    email: validateEmail,
    message: validateMessage,
  };

  function setFieldState(key, message, showError) {
    var field = fields[key];
    if (!field || !field.input) return message;

    var invalid = Boolean(message);
    var fieldWrap = field.input.closest('.contact-field');

    field.input.setAttribute('aria-invalid', invalid ? 'true' : 'false');

    if (field.error) {
      field.error.textContent = showError && message ? message : '';
      field.error.hidden = !(showError && message);
    }

    if (fieldWrap) {
      fieldWrap.classList.toggle('contact-field--invalid', showError && invalid);
      fieldWrap.classList.toggle('contact-field--valid', showError && !invalid && trim(field.input.value));
    }

    return message;
  }

  function validateField(key, showError) {
    var field = fields[key];
    if (!field || !field.input) return '';
    return setFieldState(key, validators[key](field.input.value), showError);
  }

  function validateAll(showErrors) {
    var firstErrorKey = '';
    var errorCount = 0;

    Object.keys(validators).forEach(function (key) {
      var message = validateField(key, showErrors || touched[key]);
      if (message) {
        errorCount += 1;
        if (!firstErrorKey) firstErrorKey = key;
      }
    });

    if (summary) {
      if (showErrors && errorCount > 0) {
        summary.hidden = false;
        summary.textContent =
          errorCount === 1
            ? 'There is 1 error below. Please fix it and try again.'
            : 'There are ' + errorCount + ' errors below. Please fix them and try again.';
      } else {
        summary.hidden = true;
        summary.textContent = '';
      }
    }

    return { valid: errorCount === 0, firstErrorKey: firstErrorKey, errorCount: errorCount };
  }

  function updateMessageCounter() {
    var field = fields.message;
    if (!field || !field.input || !field.counter) return;

    var length = field.input.value.length;
    var max = rules.message.max;
    field.counter.textContent = length + ' / ' + max;

    field.counter.classList.toggle('contact-field__count--warn', length > max * 0.9);
    field.counter.classList.toggle('contact-field__count--over', length > max);
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.classList.toggle('contact-submit--loading', isSubmitting);
    if (isSubmitting) {
      submitBtn.innerHTML =
        '<span class="contact-submit__spinner" aria-hidden="true"></span> Sending…';
    } else {
      submitBtn.innerHTML = submitLabel;
    }
  }

  Object.keys(fields).forEach(function (key) {
    var field = fields[key];
    if (!field || !field.input) return;

    field.input.addEventListener('blur', function () {
      touched[key] = true;
      validateField(key, true);
      validateAll(false);
    });

    field.input.addEventListener('input', function () {
      if (key === 'message') updateMessageCounter();
      if (touched[key]) {
        validateField(key, true);
        validateAll(false);
      }
    });
  });

  form.addEventListener(
    'submit',
    function (event) {
      touched.name = true;
      touched.email = true;
      touched.message = true;

      var result = validateAll(true);
      if (!result.valid) {
        event.preventDefault();
        event.stopImmediatePropagation();

        var firstField = fields[result.firstErrorKey];
        if (firstField && firstField.input) {
          firstField.input.focus();
        }
        return;
      }

      setSubmitting(true);
    },
    true
  );

  form.addEventListener('smart-form-sent', function () {
    setSubmitting(false);
    form.reset();
    touched = { name: false, email: false, message: false };
    validateAll(false);
    updateMessageCounter();
  });

  form.addEventListener('smart-form-error', function () {
    setSubmitting(false);
  });

  form.addEventListener('smart-form-closed', function () {
    setSubmitting(false);
  });

  updateMessageCounter();
  validateAll(false);
})();
