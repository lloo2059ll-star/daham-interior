// Public website statistics. Reports are available only in the owner's GA4 account.
(function () {
  'use strict';
  if (!['daham-interior.com', 'www.daham-interior.com'].includes(location.hostname)) return;
  var measurementId = 'G-YSS2NZNPCV';
  var page = new URL(location.href);
  // Keep campaign attribution without sending arbitrary query values or fragments.
  var campaign = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content'].forEach(function (key) {
    if (page.searchParams.has(key)) campaign.set(key, page.searchParams.get(key));
  });
  var project = page.searchParams.get('project');
  if (page.pathname === '/portfolio-detail.html' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project || '')) {
    campaign.set('project', project);
  }
  page.search = campaign.toString();
  page.hash = '';
  var referrer = document.referrer ? new URL(document.referrer) : null;
  if (referrer) { referrer.search = ''; referrer.hash = ''; }
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    page_location: page.href,
    page_referrer: referrer ? referrer.href : '',
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);
  var domain=window.DAHAM_CONVERSION_DOMAIN;
  function track(name,input){var conversionEvent=domain&&domain.buildEvent(name,input);if(!conversionEvent)return;window.gtag('event',conversionEvent.name,conversionEvent.params);}
  window.DAHAM_CONVERSION={track:track};
  var inquiryStarted=false;
  document.addEventListener('click',function(event){var target=event.target&&event.target.closest?event.target.closest('a,button'):null;if(!target)return;var locationName=target.getAttribute('data-cta-location')||'';if(target.matches('[data-open-inquiry]')){inquiryStarted=true;track('inquiry_start',{location:locationName||'homepage_modal',pagePath:location.pathname});return;}if(target.matches('[data-conversion="inquiry"]')){track('inquiry_click',{location:locationName||'inquiry_link',pagePath:location.pathname});return;}if(target.matches('a[href^="tel:"]'))track('phone_click',{location:locationName||'phone_link',pagePath:location.pathname});});
  document.addEventListener('focusin',function(event){if(inquiryStarted)return;var form=event.target&&event.target.closest?event.target.closest('#inquiry-form,#inquiry-page-form'):null;if(!form)return;inquiryStarted=true;track('inquiry_start',{location:form.id==='inquiry-page-form'?'inquiry_page':'homepage_modal',pagePath:location.pathname});});
}());
