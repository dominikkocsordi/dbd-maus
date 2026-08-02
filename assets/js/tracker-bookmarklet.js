/*
  Bookmarklet für stats.deadbydaylight.com.

  Läuft im Kontext der eingeloggten Tracker-Seite, holt dort die eigene
  Match-History und legt sie als JSON in die Zwischenablage. Die App liest den
  Text danach im Import-Feld ein – es verlässt also nur der eigene Spielverlauf
  den Browser, keine Zugangsdaten.

  Die Datei wird nirgends importiert: die Einstellungsseite lädt sie als Text
  und baut daraus die javascript:-Adresse für das Lesezeichen. Deshalb steht
  hier bewusst klassisches Skript ohne Module und ohne Optional Chaining, damit
  auch ältere Browser das Lesezeichen ausführen können.
*/
(function () {
  var ENDPOINT = 'https://account-backend.bhvr.com/player-stats/match-history'
    + '/games/dbd/providers/bhvr';
  var LIMITS = [200, 100, 30];

  function box(text, tone) {
    var old = document.getElementById('dbd-stats-export');
    if (old) old.remove();

    var el = document.createElement('div');
    el.id = 'dbd-stats-export';
    el.style.cssText = 'position:fixed;z-index:2147483647;left:50%;top:24px;'
      + 'transform:translateX(-50%);max-width:min(560px,92vw);padding:14px 18px;'
      + 'border-radius:12px;font:14px/1.45 system-ui,sans-serif;color:#fff;'
      + 'box-shadow:0 12px 40px rgba(0,0,0,.45);background:'
      + (tone === 'error' ? '#8d2029' : '#1f6f4d');
    el.textContent = text;

    var close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'margin-left:14px;border:0;background:transparent;'
      + 'color:inherit;font-size:15px;cursor:pointer';
    close.onclick = function () { el.remove(); };
    el.appendChild(close);

    document.body.appendChild(el);
    return el;
  }

  /* Klappt das Kopieren nicht (Bookmarklets haben nicht überall die nötige
     Freigabe), bleibt der Text zum Markieren stehen. */
  function handOver(text, count) {
    function fallback() {
      var el = box(count + ' Matches gefunden. Kopieren mit Strg+C, dann in der App einfügen.');
      var area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'display:block;width:100%;height:90px;margin-top:10px;'
        + 'font:12px/1.3 monospace';
      el.appendChild(area);
      area.focus();
      area.select();
    }

    if (!navigator.clipboard || !navigator.clipboard.writeText) return fallback();
    navigator.clipboard.writeText(text).then(function () {
      box(count + ' Matches in der Zwischenablage. Jetzt in der App einfügen.');
    }, fallback);
  }

  /* Die Seite legt ihre Sitzung im Browser ab; gesucht wird darin nach etwas,
     das wie ein JWT aussieht. So bleibt das Lesezeichen auch dann heil, wenn
     Behaviour den Namen des Speicher-Schlüssels ändert. */
  function tokens() {
    var pattern = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g;
    var found = [];
    var stores = [window.localStorage, window.sessionStorage];

    for (var s = 0; s < stores.length; s++) {
      var store = stores[s];
      if (!store) continue;
      for (var i = 0; i < store.length; i++) {
        var value = '';
        try { value = store.getItem(store.key(i)) || ''; } catch (e) { value = ''; }
        var hits = value.match(pattern) || [];
        for (var h = 0; h < hits.length; h++) {
          if (found.indexOf(hits[h]) === -1) found.push(hits[h]);
        }
      }
    }
    // Der längste Treffer ist erfahrungsgemäß das Access-Token.
    return found.sort(function (a, b) { return b.length - a.length; });
  }

  function pull(list, limit, done, fail) {
    if (!list.length) return fail();

    fetch(ENDPOINT + '?lang=en&limit=' + limit, {
      headers: { authorization: 'Bearer ' + list[0] },
    }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    }).then(function (data) {
      if (!Array.isArray(data) || !data.length) throw new Error('leer');
      done(data);
    }).catch(function () {
      pull(list.slice(1), limit, done, fail);
    });
  }

  function attempt(limits, list) {
    if (!limits.length) {
      return box('Die Match-History ließ sich nicht abrufen. Bist du auf '
        + 'stats.deadbydaylight.com eingeloggt?', 'error');
    }
    pull(list, limits[0], function (data) {
      handOver(JSON.stringify(data), data.length);
    }, function () {
      attempt(limits.slice(1), list);   // vielleicht war nur das Limit zu hoch
    });
  }

  if (location.hostname !== 'stats.deadbydaylight.com') {
    return box('Bitte zuerst stats.deadbydaylight.com öffnen und einloggen.', 'error');
  }

  var list = tokens();
  if (!list.length) {
    return box('Keine Anmeldung gefunden – bitte auf der Seite einloggen und '
      + 'das Lesezeichen erneut anklicken.', 'error');
  }

  attempt(LIMITS, list);
}());
