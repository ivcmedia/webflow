<script>
// 🎯 STANDALONE NUMERO FORM UTM FILLER
// Paste this into your Numero form's custom code box
// It will capture UTMs and fill form fields automatically

(function() {
  console.log("✅ Standalone Numero UTM script loaded");

  // === STEP 1: CAPTURE UTM PARAMETERS ===
  
  // Get UTMs from URL
  function getUTMsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const utms = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
      const value = params.get(key);
      if (value) utms[key] = value;
    });
    return utms;
  }

  // Get UTMs from cookies
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
    return utms;
  }

  // Save UTMs to cookies (7 days)
  function setCookie(name, value, seconds) {
    const maxAge = seconds ? `; max-age=${seconds}` : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/${maxAge}; SameSite=Lax`;
  }

  // Merge URL and cookie UTMs (URL takes precedence)
  const urlUTMs = getUTMsFromURL();
  const cookieUTMs = getUTMsFromCookies();
  const finalUTMs = { ...cookieUTMs, ...urlUTMs };

  // Save new UTMs to cookies
  Object.keys(urlUTMs).forEach(key => {
    setCookie(key, urlUTMs[key], 60 * 60 * 24 * 7); // 7 days
  });

  console.log("🎯 Final UTMs:", finalUTMs);

  // === STEP 2: FILL NUMERO FORM FIELDS ===

  let isFilling = false; // Prevent infinite loops

  // Minimal working function - Version 4 (FINAL)
  // Numero requires: native property setter + input event
  function setFieldValue(field, value) {
    if (!field || !value) return;
    
    try {
      // REQUIRED: Use native value setter to bypass React/Vue getter/setter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(field, value);
      
      // REQUIRED: Fire input event so Numero's framework detects the change
      field.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log(`✅ Set ${field.id || field.name} = "${value}"`);
    } catch (e) {
      console.warn('Error setting field value:', e);
    }
  }

  // Fill all UTM fields
  function fillUTMFields() {
    if (isFilling) return;
    if (Object.keys(finalUTMs).length === 0) {
      console.log('⚠️ No UTMs to fill');
      return;
    }

    isFilling = true;

    // Find and fill UTM fields by ID prefix
    Object.keys(finalUTMs).forEach(key => {
      if (!key.startsWith('utm_')) return;
      
      const value = finalUTMs[key];
      if (!value) return;

      // Look for input with ID starting with utm_source, utm_medium, etc.
      const input = document.querySelector(`input[id^="${key}"]`);
      if (input) {
        setFieldValue(input, value);
      }
    });

    setTimeout(() => { isFilling = false; }, 100);
  }

  // === STEP 3: TRIGGER FILLING AT VARIOUS TIMES ===

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      fillUTMFields();
    });
  } else {
    fillUTMFields();
  }

  // Try multiple times in case form loads slowly
  setTimeout(fillUTMFields, 500);
  setTimeout(fillUTMFields, 1000);
  setTimeout(fillUTMFields, 2000);

  // Watch for form appearing in DOM
  const observer = new MutationObserver(function() {
    const utmField = document.querySelector('input[id^="utm_source"], input.NumeroInput[id*="utm"]');
    if (utmField && !utmField.value && finalUTMs.utm_source) {
      console.log('📋 Numero form detected, filling fields');
      fillUTMFields();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Stop observing after 10 seconds
  setTimeout(() => observer.disconnect(), 10000);

  // Fill one more time before form submission
  document.addEventListener('submit', function(e) {
    console.log('=== FORM SUBMISSION ===');
    fillUTMFields();
    
    // Debug what's being submitted
    setTimeout(() => {
      const formData = new FormData(e.target);
      console.log('UTM values being submitted:');
      for (let [key, value] of formData.entries()) {
        if (key.includes('utm')) {
          console.log(`  ${key}: ${value || 'EMPTY'}`);
        }
      }
    }, 50);
  }, true);

  console.log('🚀 Numero UTM filler ready!');
})();
</script>

