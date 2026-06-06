(function () {
  try {
    var key = 'biz:config:v2:' + window.location.hostname;
    var d = JSON.parse(localStorage.getItem(key));
    var c = d && (
      (d.landing && d.landing.design && d.landing.design.primary) ||
      d.primary_color
    );
    if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) {
      var r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
      var s = document.documentElement.style;
      s.setProperty('--gold',       r+' '+g+' '+b);
      s.setProperty('--gold-light', Math.min(255,r+20)+' '+Math.min(255,g+20)+' '+Math.min(255,b+20));
      s.setProperty('--on-gold',    '255 255 255');
    }
  } catch (e) {}
})();
