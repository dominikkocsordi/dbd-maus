// Panels zuklappen. Auf der Statistik stehen sechs lange Tabellen untereinander –
// wer nur eine davon liest, scrollt sonst an allen anderen vorbei. Auf der
// Übersicht nimmt das Eintragsformular viel Platz, obwohl die meisten Matches
// über den Import kommen.
//
// Die Überschrift wird dafür zum Knopf: Das Markup bleibt eine gewöhnliche
// Überschrift, sie wandert hier nur in einen Button. Was zugeklappt ist, merkt
// sich der Browser, sonst stünde nach jedem Laden wieder alles offen.
//
//   data-collapse           – offen, bis man zuklappt
//   data-collapse="closed"  – zu, bis man aufklappt

const KEY = 'dbd-collapsed';

/**
 * Gemerkter Zustand je Panel: `true` = zugeklappt. Was hier fehlt, richtet sich
 * nach dem Vorgabewert im Markup – nur so lässt sich "noch nie angefasst" von
 * "bewusst aufgeklappt" unterscheiden.
 */
function stored() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    // Früher stand hier eine Liste der zugeklappten Panels.
    if (Array.isArray(raw)) return Object.fromEntries(raw.map((key) => [key, true]));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};                                // kaputter Eintrag: dann eben Vorgabe
  }
}

function persist(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Privater Modus – dann hält der Zustand eben nur bis zum Neuladen. */
  }
}

/** Panels, die schon eingerichtet sind – für `expandPanel`. */
const panels = new Map();

/**
 * Rüstet jedes `[data-collapse]`-Panel mit einem Auf-/Zuklappen aus. Erwartet
 * darin eine `.panel__head` mit `<h2>` und daneben einen `.panel__body`.
 */
export function initCollapse(root = document) {
  const state = stored();

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

    apply(state[key] ?? panel.dataset.collapse === 'closed');
    panels.set(key, apply);

    button.addEventListener('click', () => {
      const collapse = !panel.classList.contains('is-collapsed');
      apply(collapse);
      state[key] = collapse;
      persist(state);
    });
  });
}

/**
 * Ein Panel von außen aufklappen – etwa wenn ein Match zum Bearbeiten geöffnet
 * wird und das Formular gerade zugeklappt ist. Bewusst ohne Merken: Es ist eine
 * Ausnahme für diesen einen Vorgang, kein Wunsch des Benutzers.
 */
export function expandPanel(id) {
  panels.get(id)?.(false);
}
