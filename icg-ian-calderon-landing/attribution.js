$(document).ready(function () {
  console.log("✅ DOM Ready");

  // --- Safe FB tracker (no-op if fbq is missing)
  function trackFacebook(event, params) {
    if (typeof fbq === 'function') {
      fbq('track', event, params);
    } else {
      console.warn('fbq not found; skipped', event, params || {});
    }
  }

  // 🔁 FIRE PIXELS ON INTERACTION
  $('[data-utm]').on('click', function () {
    console.log("📦 Clicked UTM-tracked element:", this);
    trackFacebook('Lead');
  });

  // ✅ Monitor Webflow form submissions
  $('form[facebook_pixel="true"]').each(function () {
    const $form = $(this);
    console.log("📝 Watching form for Facebook pixel:", $form);
    $form.on('submit', function () {
      const checkSuccess = setInterval(() => {
        if ($form.siblings('.w-form-done').is(':visible')) {
          console.log("🎯 Form submitted successfully");
          trackFacebook('Lead');
          clearInterval(checkSuccess);
        }
      }, 100);
    });
  });

  // 🎯 UTM PARAMETER LOGIC
  function setCookie(name, value, seconds) {
    const maxAge = seconds ? `; max-age=${seconds}` : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/${maxAge}; SameSite=Lax`;
  }

  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    const utms = {};
    for (const [key, value] of params.entries()) {
      if (key.startsWith('utm_')) {
        utms[key] = value;
        setCookie(key, value, 60 * 60 * 24 * 7); // 7 days
      }
    }
    console.log("🔍 UTMs from URL:", utms);
    return utms;
  }

  function getUTMsFromCookies() {
    const utms = {};
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    cookies.forEach(cookie => {
      const eqIdx = cookie.indexOf('=');
      if (eqIdx === -1) return;
      const key = cookie.substring(0, eqIdx);
      const value = decodeURIComponent(cookie.substring(eqIdx + 1));
      if (key && key.startsWith('utm_')) {
        utms[key] = value;
      }
    });
    console.log("🍪 UTMs from cookies:", utms);
    return utms;
  }

  const urlUTMs = getUTMParams();
  const cookieUTMs = getUTMsFromCookies();
  const finalUTMs = { ...cookieUTMs, ...urlUTMs };
  const utmString = new URLSearchParams(finalUTMs).toString();

  console.log("🧠 Final merged UTMs:", finalUTMs);
  console.log("🔗 Final UTM query string:", utmString);

  // 🔗 UPDATE BUTTON LINKS WITH UTM TRACKING
  if (Object.keys(finalUTMs).length > 0) {
    $('[data-utm]').each(function () {
      const originalHref = $(this).attr('href');
      console.log("🔗 Processing element:", this.tagName, originalHref);

      if (!originalHref || originalHref.startsWith('#')) return;
      if (originalHref.startsWith('mailto:') || originalHref.startsWith('tel:')) return;

      try {
        const url = new URL(originalHref, window.location.origin);
        const params = new URLSearchParams(url.search);

        // Remove existing UTM params
        for (const key of [...params.keys()]) {
          if (key.startsWith('utm_')) params.delete(key);
        }

        // Add merged UTMs
        for (const key in finalUTMs) {
          params.set(key, finalUTMs[key]);
        }

        url.search = params.toString();
        $(this).attr('href', url.toString());

        console.log("✅ Updated href with UTMs:", url.toString());
      } catch (e) {
        console.warn('⚠️ Invalid link skipped for UTM update:', originalHref);
      }
    });
  }

// --- Fire Meta "Lead" when a Webflow form submits successfully
(function attachWebflowLeadTracking(){
  const WRAPPER_SEL = '[data-webflow-form-decorate="true"], [data-webflow-form-decorate=true]';

  function trackLead($form){
    if (typeof fbq === 'function') {
      // Send Lead + some useful context (optional)
      const params = Object.assign(
        {
          form_name: $form.attr('name') || $form.attr('id') || '',
          content_name: 'Webflow Form Lead'
        },
        // pass UTMs along as custom params if you like
        (window.finalUTMs || {})
      );
      fbq('track', 'Lead', params);
      console.log('📣 Meta Lead fired with params:', params);
    } else {
      console.warn('fbq not found; Lead not sent');
    }
  }

  // Use MutationObserver to detect when .w-form-done becomes visible
  document.querySelectorAll(WRAPPER_SEL).forEach(wrapper => {
    const doneEl = wrapper.querySelector('.w-form-done');
    const formEl = wrapper.querySelector('form');
    if (!doneEl || !formEl) return;

    // avoid double-firing per form
    let fired = false;

    // If it might already be visible (e.g., after AJAX), check once
    const isVisible = () => !!(doneEl.offsetParent || doneEl.getClientRects().length);
    if (isVisible()) {
      fired = true;
      trackLead($(formEl));
    }

    const obs = new MutationObserver(() => {
      if (!fired && isVisible()) {
        fired = true;
        trackLead($(formEl));
      }
    });
    obs.observe(doneEl, { attributes: true, attributeFilter: ['style', 'class'] });

    // Safety: also watch the wrapper in case Webflow toggles classes higher up
    const obs2 = new MutationObserver(() => {
      if (!fired && isVisible()) {
        fired = true;
        trackLead($(formEl));
      }
    });
    obs2.observe(wrapper, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });

    // Extra safety: re-check right before submit (covers super-fast success toggles)
    $(formEl).on('submit', () => {
      setTimeout(() => {
        if (!fired && isVisible()) {
          fired = true;
          trackLead($(formEl));
        }
      }, 300);
    });
  });
})();

//Add hidden UTM and other fields to the webflow form for attribution tracking
function decorateWebflowFormsWithUTMs(finalUTMs) {
  const $wrappers = $('[data-webflow-form-decorate="true"], [data-webflow-form-decorate=true]');
  console.log(`🔍 Found ${$wrappers.length} Webflow form wrapper(s) to decorate`);

  if ($wrappers.length === 0) return;

  //Force a SLUG variable into the finalUTMs object so that we can leverage the existing logic
  //to add it into the URL params
  const slug = location.pathname.split('/').filter(Boolean).pop() || '';
  finalUTMs = { ...finalUTMs, utm_slug: slug };  

  $wrappers.each(function (wIdx) {
    const $wrapper = $(this);
    // find the first form inside the wrapper (Webflow structure)
    const $form = $wrapper.is('form') ? $wrapper : $wrapper.find('form').first();

    if ($form.length === 0) {
      console.warn(`⚠️ Wrapper #${wIdx + 1} has no <form> child`, $wrapper.get(0));
      return;
    }

    console.log(`📝 Decorating form in wrapper #${wIdx + 1}`, $form.get(0));

    Object.keys(finalUTMs).forEach((key) => {
      if (!key.startsWith('utm_')) return;
      const value = finalUTMs[key];
      console.log(`➡️ UTM "${key}" = "${value}"`);

      let $input = $form.find(`input[name="${key}"]`);
      if ($input.length === 0) {
        console.log(`➕ Adding hidden input for ${key}`);
        $input = $('<input>', { type: 'hidden', name: key, value });
        $form.append($input);        // bottom of form
        // $form.prepend($input);    // top of form (use this if you prefer)
      } else {
        console.log(`♻️ Updating existing hidden input for ${key}`);
        $input.val(value);
      }
    });
  });
}

// run once on DOM ready (after finalUTMs is computed)
decorateWebflowFormsWithUTMs(finalUTMs);
addPetitionLanguageToWebflow();

// safety: ensure fields still exist right before submit
$('[data-webflow-form-decorate="true"], [data-webflow-form-decorate=true]').on('submit', 'form', function () {
  decorateWebflowFormsWithUTMs(finalUTMs);
  addPetitionLanguageToWebflow();
});

// Also ensure fields exist right before submit (in case DOM mutates)
$('form[data-webflow-form-decorate="true"], form[data-webflow-form-decorate=true]').on('submit', function () {
  decorateWebflowFormsWithUTMs(finalUTMs);
  addPetitionLanguageToWebflow();
});

//Locate the Petition DIV via data attribute then take its contents, create a text areaa, and force that html into the form
function addPetitionLanguageToWebflow() {
  const $source = $('[data-petition-language="true"]');
  if ($source.length === 0) {
    console.warn('⚠️ No element with data-petition-language="true" found.');
    return;
  }

  const $first = $source.first();
  // more direct reads; trim zero-width spaces just in case
  const petitionText = ($first.prop('textContent') || '').replace(/\u200B/g, '').trim();
  const petitionHTML = ($first.prop('innerHTML')   || '').replace(/\u200B/g, '').trim();

  console.log(`📜 Petition language: ${petitionText.length} chars (text), ${petitionHTML.length} chars (html)`);

  const $wrappers = $('[data-webflow-form-decorate="true"], [data-webflow-form-decorate=true]');
  $wrappers.each(function (wIdx) {
    const $wrapper = $(this);
    const $form = $wrapper.is('form') ? $wrapper : $wrapper.find('form').first();
    if ($form.length === 0) {
      console.warn(`⚠️ Wrapper #${wIdx + 1} has no <form> child`, $wrapper.get(0));
      return;
    }

    const upsertTextarea = (name, value) => {
      let $field = $form.find(`textarea[name="${name}"]`);
      if ($field.length === 0) {
        console.log(`➕ Adding hidden textarea "${name}" to form #${wIdx + 1}`);
        $field = $('<textarea>', { name, hidden: true });
        $form.append($field);
      } else {
        console.log(`♻️ Updating hidden textarea "${name}" in form #${wIdx + 1}`);
      }
      // Set both the value property and the serialized text so DevTools shows it
      $field.val(value);
      $field.text(value);
    };

    if (petitionText) upsertTextarea('Petition-Language', petitionText);
    if (petitionHTML) upsertTextarea('Petition-Language-HTML', petitionHTML);
  });
}
  
  // 🧠 INJECT UTM PARAMS INTO JOTFORM IFRAME
  if (utmString) {
    $("iframe[src^='https://form.jotform.com/']").each(function () {
      const $iframe = $(this);
      const originalSrc = $iframe.attr("src");
      const url = new URL(originalSrc, window.location.origin);
      const params = new URLSearchParams(url.search);

      // Remove existing UTM params
      for (const key of [...params.keys()]) {
        if (key.startsWith('utm_')) params.delete(key);
      }

      // Add merged UTMs
      for (const key in finalUTMs) {
        params.set(key, finalUTMs[key]);
      }

      url.search = params.toString();
      $iframe.attr("src", url.toString());

      console.log("✅ Updated JotForm iframe src:", url.toString());
    });
  }

  // 🎯 POPULATE NUMERO/EMBEDDED FORM FIELDS WITH UTM PARAMETERS
  (function() {
    let isFilling = false; // Prevent infinite loops
    
    // Enhanced function to set field values that React/Vue/Numero will recognize
    function setFieldValue(field, value) {
      if (!field || !value) return;
      
      // Get native value setter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      
      // Set value using native setter
      nativeInputValueSetter.call(field, value);
      
      // Also set directly
      field.value = value;
      
      // Fire input event
      field.dispatchEvent(new InputEvent('input', { 
        bubbles: true, 
        cancelable: true,
        inputType: 'insertText',
        data: value
      }));
      
      // Fire change event
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fill UTM fields in embedded forms (Numero, etc.)
    function fillUTMFields() {
      if (isFilling) return; // Prevent recursive calls
      if (!finalUTMs || Object.keys(finalUTMs).length === 0) {
        console.log('⚠️ No finalUTMs available to fill');
        return;
      }

      isFilling = true;

      // Look for UTM fields by ID prefix (e.g., utm_source_12345)
      Object.keys(finalUTMs).forEach(key => {
        if (!key.startsWith('utm_')) return;
        
        const value = finalUTMs[key];
        if (!value) return;

        // Try to find input by ID prefix (e.g., utm_content_35515)
        const input = document.querySelector(`input[id^="${key}"]`);
        if (input) {
          setFieldValue(input, value);
          console.log(`✅ Numero field filled: ${key} = "${value}" (element: ${input.id})`);
        }
      });

      setTimeout(() => { isFilling = false; }, 100);
    }

    // Debug what's being submitted
    document.addEventListener('submit', function(e) {
      console.log('=== FORM SUBMISSION DETECTED ===');
      const formData = new FormData(e.target);
      console.log('Form data being submitted:');
      for (let [key, value] of formData.entries()) {
        if (key.includes('utm')) {
          console.log(`  ${key}: ${value || 'EMPTY'}`);
        }
      }
      
      // Try to fill fields one more time before submission
      fillUTMFields();
    }, true);

    // Initial fill attempts at different timings
    fillUTMFields();
    setTimeout(fillUTMFields, 500);
    setTimeout(fillUTMFields, 1000);
    setTimeout(fillUTMFields, 2000);

    // Watch for Numero form loading
    const observer = new MutationObserver(function(mutations) {
      const utmField = document.querySelector('input[id^="utm_source"], input.NumeroInput[id*="utm"]');
      if (utmField && !utmField.value && finalUTMs.utm_source) {
        console.log('📋 Numero form detected via MutationObserver, filling fields');
        fillUTMFields();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Stop observing after 10 seconds
    setTimeout(() => observer.disconnect(), 10000);
    
    console.log('🎯 UTM Field Filler Loaded. Will populate fields with:', finalUTMs);
  })();
});
