
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
});
