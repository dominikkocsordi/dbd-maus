/*
  Sortierung für Tabellen: verdrahtet die Schaltflächen im Kopf, merkt sich
  Spalte und Richtung und sortiert eine Zeilenliste danach. Jede Tabelle
  bekommt ihren eigenen Sortierer.

  Erwartet im Kopf <button class="th-sort" data-sort="key">, dazu eine Map
  aus demselben Schlüssel auf eine Funktion, die den Wert der Zeile liefert.
*/

/**
 * @param {object} options
 * @param {string} options.table    CSS-Selektor der Tabelle
 * @param {object} options.values   { key: (row) => string|number|null }
 * @param {string} options.initial  Spalte, nach der zuerst sortiert wird
 * @param {'asc'|'desc'} [options.dir]
 * @param {() => void} options.onChange  wird nach jedem Klick gerufen
 */
export function createSorter({ table, values, initial, dir = 'desc', onChange }) {
  let sort = { key: initial, dir };

  const buttons = () => document.querySelectorAll(`${table} .th-sort`);

  function syncHeaders() {
    buttons().forEach((btn) => {
      const active = btn.dataset.sort === sort.key;
      btn.classList.toggle('is-sorted', active);
      btn.classList.toggle('is-asc', active && sort.dir === 'asc');
      btn.closest('th')?.setAttribute('aria-sort', active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });
  }

  buttons().forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      // Dieselbe Spalte erneut dreht die Richtung; bei einer neuen Spalte
      // entscheidet erst apply() anhand der Daten (dir: null).
      sort = sort.key === key
        ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: null };
      onChange();
    });
  });

  return {
    get key() { return sort.key; },
    get dir() { return sort.dir; },

    /** Liefert eine sortierte Kopie; leere Werte landen immer hinten. */
    apply(rows) {
      const read = values[sort.key] ?? (() => 0);

      // Frisch gewählte Spalte: Text von A nach Z, Zahlen größter Wert zuerst.
      if (sort.dir === null) {
        const sample = rows.map(read).find((v) => v !== null && v !== undefined);
        sort = { key: sort.key, dir: typeof sample === 'string' ? 'asc' : 'desc' };
      }
      const factor = sort.dir === 'asc' ? 1 : -1;

      syncHeaders();

      return [...rows].sort((a, b) => {
        const x = read(a);
        const y = read(b);

        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        if (typeof x === 'string' || typeof y === 'string') {
          return String(x).localeCompare(String(y), 'de') * factor;
        }
        return (x - y) * factor;
      });
    },
  };
}

/** Kopfzelle mit Sortier-Schaltfläche, für Tabellen aus dem JavaScript. */
export const sortHead = (key, label, numeric = false) =>
  `<th${numeric ? ' class="num"' : ''}><button type="button" class="th-sort" data-sort="${key}">${label}</button></th>`;
