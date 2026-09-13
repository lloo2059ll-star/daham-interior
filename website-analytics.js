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
}());
