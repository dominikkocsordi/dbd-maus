// Panels zuklappen. Auf der Statistik stehen sechs lange Tabellen untereinander –
// wer nur eine davon liest, scrollt sonst an allen anderen vorbei.
//
// Die Überschrift wird dafür zum Knopf: Das Markup bleibt eine gewöhnliche
// Überschrift, sie wandert hier nur in einen Button. Was zugeklappt ist, merkt
// sich der Browser, sonst stünde nach jedem Laden wieder alles offen.

const KEY = 'dbd-collapsed';

function stored() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();                       // kaputter Eintrag: dann eben offen
  }
}

function persist(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* Privater Modus – dann hält der Zustand eben nur bis zum Neuladen. */
  }
}

/**
 * Rüstet jedes `[data-collapse]`-Panel mit einem Auf-/Zuklappen aus. Erwartet
 * darin eine `.panel__head` mit `<h2>` und daneben einen `.panel__body`.
 */
export function initCollapse(root = document) {
  const closed = stored();

  root.querySelectorAll('[data-collapse]').forEach((panel, index) => {
    const head = panel.querySelector('.panel__head');
    const body = panel.querySelector('.panel__body');
    const title = head?.querySelector('h2');
    if (!head || !body || !title) return;

    const key = panel.id || `panel-${index}`;
    body.id = body.id || `${key}-body-wrap`;

    // Die Zeile trägt jetzt Knopf und Zusatzangabe nebeneinander.
    head.classList.add('panel__head--row');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel__toggle';
    button.setAttribute('aria-controls', body.id);
    title.replaceWith(button);
    button.append(title);
    button.insertAdjacentHTML('afterbegin', '<span class="panel__chevron" aria-hidden="true">&#9662;</span>');

    const apply = (collapse) => {
      panel.classList.toggle('is-collapsed', collapse);
      body.hidden = collapse;
      button.setAttribute('aria-expanded', String(!collapse));
    };

    apply(closed.has(key));

    button.addEventListener('click', () => {
      const collapse = !panel.classList.contains('is-collapsed');
      apply(collapse);

      if (collapse) closed.add(key);
      else closed.delete(key);
      persist(closed);
    });
  });
}
