// Stammdaten für die Dropdowns.
// Neue Killer/Survivor einfach unten ergänzen – gespeichert wird die `id`,
// angezeigt das `label`. Die IDs bleiben stabil, damit alte Einträge lesbar bleiben.

export const GAME_MODES = [
  { id: 'public', label: 'Öffentliches Spiel (1v4)' },
  { id: '2v8', label: '2v8' },
  { id: 'chaos_shuffle', label: 'Chaos Shuffle' },
  { id: 'event', label: 'Event-Modus' },
  { id: 'custom', label: 'Privates Spiel (Custom)' },
  { id: 'other', label: 'Sonstiges' },
];

export const KILLERS = [
  { id: 'trapper', label: 'Trapper' },
  { id: 'wraith', label: 'Wraith' },
  { id: 'hillbilly', label: 'Hillbilly' },
  { id: 'nurse', label: 'Nurse' },
  { id: 'shape', label: 'Michael' },
  { id: 'hag', label: 'Hag' },
  { id: 'doctor', label: 'Doc' },
  { id: 'cannibal', label: 'Booba' },
  { id: 'huntress', label: 'Huntress' },
  { id: 'nightmare', label: 'Freddy' },
  { id: 'pig', label: 'Pig' },
  { id: 'clown', label: 'Clown' },
  { id: 'spirit', label: 'Spirit' },
  { id: 'legion', label: 'Legion' },
  { id: 'plague', label: 'Plague' },
  { id: 'ghost_face', label: 'Ghostface' },
  { id: 'demogorgon', label: 'Demogorgon' },
  { id: 'oni', label: 'Oni' },
  { id: 'deathslinger', label: 'Deathslinger' },
  { id: 'executioner', label: 'Pyramidhead' },
  { id: 'blight', label: 'Blight' },
  { id: 'twins', label: 'Twins' },
  { id: 'trickster', label: 'Trickster' },
  { id: 'nemesis', label: 'Nemesis' },
  { id: 'artist', label: 'Artist' },
  { id: 'onryo', label: 'Onryo' },
  { id: 'dredge', label: 'Dredge' },
  { id: 'mastermind', label: 'Wesker' },
  { id: 'knight', label: 'Knight' },
  { id: 'skull_merchant', label: 'Skully' },
  { id: 'singularity', label: 'Singularity' },
  { id: 'xenomorph', label: 'Xenomorph' },
  { id: 'good_guy', label: 'Chucky' },
  { id: 'unknown', label: 'Unknown' },
  { id: 'lich', label: 'Lich' },
  { id: 'dark_lord', label: 'Dracula' },
  { id: 'houndmaster', label: 'Houndmaster' },
  { id: 'ghoul', label: 'Ghoul' },
  { id: 'animatronic', label: 'Springtrap' },
  { id: 'krasue', label: 'Krasue' },
  { id: 'first', label: 'First' },
  { id: 'jason', label: 'Jason' },
  { id: 'other_killer', label: 'Anderer Killer' },
];

export const SURVIVORS = [
  { id: 'dwight_fairfield', label: 'Dwight' },
  { id: 'meg_thomas', label: 'Meg' },
  { id: 'claudette_morel', label: 'Claudette' },
  { id: 'jake_park', label: 'Jake' },
  { id: 'nea_karlsson', label: 'Nea' },
  { id: 'laurie_strode', label: 'Laurie' },
  { id: 'ace_visconti', label: 'Ace' },
  { id: 'bill_overbeck', label: 'Bill' },
  { id: 'feng_min', label: 'Feng' },
  { id: 'david_king', label: 'David (King)' },
  { id: 'quentin_smith', label: 'Quentin' },
  { id: 'david_tapp', label: 'David (Tapp)' },
  { id: 'kate_denson', label: 'Kate' },
  { id: 'adam_francis', label: 'Adam' },
  { id: 'jeff_johansen', label: 'Jeff' },
  { id: 'jane_romero', label: 'Jane' },
  { id: 'ash_williams', label: 'Ash' },
  { id: 'nancy_wheeler', label: 'Nancy' },
  { id: 'steve_harrington', label: 'Steve' },
  { id: 'yui_kimura', label: 'Yui' },
  { id: 'zarina_kassir', label: 'Zarina' },
  { id: 'cheryl_mason', label: 'Cheryl' },
  { id: 'felix_richter', label: 'Felix' },
  { id: 'elodie_rakoto', label: 'Élodie' },
  { id: 'yun_jin_lee', label: 'Yun-Jin' },
  { id: 'jill_valentine', label: 'Jill' },
  { id: 'leon_kennedy', label: 'Leon' },
  { id: 'mikaela_reid', label: 'Mikaela' },
  { id: 'jonah_vasquez', label: 'Jonah' },
  { id: 'yoichi_asakawa', label: 'Yoichi' },
  { id: 'haddie_kaur', label: 'Haddie' },
  { id: 'ada_wong', label: 'Ada' },
  { id: 'rebecca_chambers', label: 'Rebecca' },
  { id: 'vittorio_toscano', label: 'Vittorio' },
  { id: 'thalita_lyra', label: 'Thalita' },
  { id: 'renato_lyra', label: 'Renato' },
  { id: 'gabriel_soma', label: 'Gabriel' },
  { id: 'nicolas_cage', label: 'Nicolas' },
  { id: 'ellen_ripley', label: 'Ellen' },
  { id: 'alan_wake', label: 'Alan' },
  { id: 'sable_ward', label: 'Sable' },
  { id: 'troupe', label: 'Aestri' },
  { id: 'lara_croft', label: 'Lara' },
  { id: 'trevor_belmont', label: 'Trevor' },
  { id: 'taurie_cain', label: 'Taurie' },
  { id: 'rick_grimes', label: 'Rick' },
  { id: 'michonne', label: 'Michonne' },
  { id: 'vee', label: 'Vee' },
  { id: 'dustin', label: 'Dustin' },
  { id: 'eleven', label: 'Eleven' },
  { id: 'kwon', label: 'Kwon' },
  { id: 'shane', label: 'Shane' },
  { id: 'other_survivor', label: 'Anderer Survivor' },
];

const toMap = (list) => Object.fromEntries(list.map((e) => [e.id, e.label]));

export const GAME_MODE_LABELS = toMap(GAME_MODES);
export const KILLER_LABELS = toMap(KILLERS);
export const SURVIVOR_LABELS = toMap(SURVIVORS);

export function labelFor(role, id) {
  if (!id) return '–';
  return (role === 'killer' ? KILLER_LABELS : SURVIVOR_LABELS)[id] ?? id;
}

export function gameModeLabel(id) {
  return toMap(GAME_MODES)[id] ?? id;
}
