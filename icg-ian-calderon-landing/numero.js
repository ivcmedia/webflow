// 🎯 POPULATE NUMERO/EMBEDDED FORM FIELDS WITH UTM PARAMETERS
// This script fills Numero form fields with UTM parameters from window.finalUTMs
// Make sure attribution.js loads before this script!

$(document).ready(function () {
  console.log("✅ Numero UTM script loaded");

  let isFilling = false; // Prevent infinite loops
  
  // Minimal working function for Numero forms
  // Requires: native property setter + input event
  function setFieldValue(field, value) {
    if (!field || !value) return;
    
    try {
      // REQUIRED: Use native value setter to bypass React/Vue getter/setter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(field, value);
      
      // REQUIRED: Fire input event so Numero's framework detects the change
      field.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log(`✅ Numero field filled: ${field.id || field.name} = "${value}"`);
    } catch (e) {
      console.warn('Error setting field value:', e);
    }
  }

  // Fill UTM fields in embedded forms (Numero, etc.)
  function fillUTMFields() {
    if (isFilling) return; // Prevent recursive calls
    if (!window.finalUTMs || Object.keys(window.finalUTMs).length === 0) {
      console.log('⚠️ No finalUTMs available to fill (window.finalUTMs not set)');
      return;
    }

    isFilling = true;

    // Look for UTM fields by ID prefix (e.g., utm_source_12345)
    Object.keys(window.finalUTMs).forEach(key => {
      if (!key.startsWith('utm_')) return;
      
      const value = window.finalUTMs[key];
      if (!value) return;

      // Try to find input by ID prefix (e.g., utm_content_35515)
      const input = document.querySelector(`input[id^="${key}"]`);
      if (input) {
        setFieldValue(input, value);
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
    if (utmField && !utmField.value && window.finalUTMs && window.finalUTMs.utm_source) {
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
  
  console.log('🎯 UTM Field Filler Loaded. Will populate fields with:', window.finalUTMs);
});

