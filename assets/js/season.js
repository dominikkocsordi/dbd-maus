// Saisonales Design. Kein Modul und im <head> geladen, damit die Klasse schon
// sitzt, bevor die Seite zum ersten Mal gezeichnet wird – sonst blitzt kurz
// das normale Design auf.
//
// Von selbst läuft Halloween vom 1. Oktober bis 10. November (Haunted by
// Daylight). In den Einstellungen lässt es sich fest ein- oder ausschalten;
// die Wahl liegt nur im Browser.
(function () {
  var KEY = 'dbd-theme';

  function stored() {
    try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; }
  }

  function inSeason(now) {
    var month = now.getMonth();
    return month === 9 || (month === 10 && now.getDate() <= 10);
  }

  function apply(choice) {
    var on = choice === 'halloween' || (choice === 'auto' && inSeason(new Date()));
    document.documentElement.classList.toggle('halloween', on);

    var icon = document.querySelector('link[rel="icon"]');
    if (icon) {
      var glyph = on ? '&#127875;' : '&#128128;';   // Kürbis bzw. Totenkopf
      icon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
        + "<text y='.9em' font-size='90'>" + glyph + '</text></svg>';
    }
  }

  window.dbdTheme = {
    get: stored,
    set: function (choice) {
      try { localStorage.setItem(KEY, choice); } catch (e) { /* privater Modus */ }
      apply(choice);
    },
  };

  apply(stored());
  // Das Favicon steht im HTML erst nach diesem Skript – einmal nachziehen.
  document.addEventListener('DOMContentLoaded', function () { apply(stored()); });
})();
