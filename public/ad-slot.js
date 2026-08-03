// ============================================================
// ad-slot.js — Google AdSense loader, dormant by default.
//
// Ad slots live ONLY on pages/sections with substantial written
// content (homepage content section, guides, about) — never on
// or around the bare tool inputs. Slots are <div class="ad-slot"
// data-ad-slot="..."> elements. Nothing renders until BOTH:
//
//   1. window.ADSENSE_CLIENT is set to your publisher ID
//      (e.g. 'ca-pub-1234567890123456') in a <script> tag that
//      loads BEFORE this file, and
//   2. each slot has a real AdSense ad-unit slot id in its
//      data-ad-slot attribute.
//
// Until then this file is a no-op: no network calls, no ad markup.
// When enabled, the loader adds `ads-on` to <html> so CSS shows
// the slots, injects the adsbygoogle tag, and fills each slot.
// ============================================================
(function () {
  var client = window.ADSENSE_CLIENT || '';
  var slots = document.querySelectorAll('.ad-slot[data-ad-slot]');
  if (!client || !slots.length) return;

  document.documentElement.classList.add('ads-on');

  var script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
    encodeURIComponent(client);
  document.head.appendChild(script);

  slots.forEach(function (el) {
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', el.getAttribute('data-ad-slot'));
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    el.appendChild(ins);
  });

  window.addEventListener('load', function () {
    slots.forEach(function () {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        /* ignore — ad serving is best-effort and must never break the page */
      }
    });
  });
})();
