// Challenge-Katalog. Neue Challenges einfach unten ergänzen.
//
//   generator: 'random_build'  -> die Challenge bekommt den Zufallsgenerator
//   page: { href, label }      -> die Challenge hat eine eigene Seite
//   Ohne beides ist es eine reine Beschreibung.

export const CHALLENGES = [
  {
    id: 'random_build',
    title: 'Alles dem Zufall',
    tagline: 'Charakter und Build werden ausgewürfelt.',
    rules: [
      'Charakter und vier Perks kommen aus dem Generator',
      'nichts tauschen',
      'Annehmen legt den Build zum Eintragen bereit',
    ],
    generator: 'random_build',
  },
  {
    id: 'survivor_gauntlet',
    title: 'The Survivor Gauntlet',
    tagline: 'Alle Survivor am Stück – und am Ende ohne Perks.',
    rules: [
      'mit jedem Survivor einmal entkommen',
      'gezogen wird zufällig aus den offenen',
      'je Checkpoint fällt ein Perk-Platz weg',
      'ein Tod wirft auf den Anfang der Stufe zurück',
    ],
    page: { href: 'gauntlet.html', label: 'Lauf öffnen' },
  },
];

export const challengeById = (id) => CHALLENGES.find((c) => c.id === id) ?? null;
