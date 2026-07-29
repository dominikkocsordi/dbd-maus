// Stammdaten für die Dropdowns.
// Neue Killer/Survivor einfach unten ergänzen – der gespeicherte Wert ist `id`.

export const GAME_MODES = [
  { id: 'public', label: 'Öffentliches Spiel (1v4)' },
  { id: '2v8', label: '2v8' },
  { id: 'chaos_shuffle', label: 'Chaos Shuffle' },
  { id: 'event', label: 'Event-Modus' },
  { id: 'custom', label: 'Privates Spiel (Custom)' },
  { id: 'other', label: 'Sonstiges' },
];

export const KILLERS = [
  { id: 'trapper', label: 'The Trapper (Evan MacMillan)' },
  { id: 'wraith', label: 'The Wraith (Philip Ojomo)' },
  { id: 'hillbilly', label: 'The Hillbilly (Max Thompson Jr.)' },
  { id: 'nurse', label: 'The Nurse (Sally Smithson)' },
  { id: 'shape', label: 'The Shape (Michael Myers)' },
  { id: 'hag', label: 'The Hag (Lisa Sherwood)' },
  { id: 'doctor', label: 'The Doctor (Herman Carter)' },
  { id: 'huntress', label: 'The Huntress (Anna)' },
  { id: 'cannibal', label: 'The Cannibal (Bubba Sawyer)' },
  { id: 'nightmare', label: 'The Nightmare (Freddy Krueger)' },
  { id: 'pig', label: 'The Pig (Amanda Young)' },
  { id: 'clown', label: 'The Clown (Kenneth Chase)' },
  { id: 'spirit', label: 'The Spirit (Rin Yamaoka)' },
  { id: 'legion', label: 'The Legion' },
  { id: 'plague', label: 'The Plague (Adiris)' },
  { id: 'ghost_face', label: 'The Ghost Face (Danny Johnson)' },
  { id: 'demogorgon', label: 'The Demogorgon' },
  { id: 'oni', label: 'The Oni (Kazan Yamaoka)' },
  { id: 'deathslinger', label: 'The Deathslinger (Caleb Quinn)' },
  { id: 'executioner', label: 'The Executioner (Pyramid Head)' },
  { id: 'blight', label: 'The Blight (Talbot Grimes)' },
  { id: 'twins', label: 'The Twins (Charlotte & Victor)' },
  { id: 'trickster', label: 'The Trickster (Ji-Woon Hak)' },
  { id: 'nemesis', label: 'The Nemesis (Nemesis T-Type)' },
  { id: 'cenobite', label: 'The Cenobite (Pinhead)' },
  { id: 'artist', label: 'The Artist (Carmina Mora)' },
  { id: 'onryo', label: 'The Onryō (Sadako Yamamura)' },
  { id: 'dredge', label: 'The Dredge' },
  { id: 'mastermind', label: 'The Mastermind (Albert Wesker)' },
  { id: 'knight', label: 'The Knight (Tarhos Kovács)' },
  { id: 'skull_merchant', label: 'The Skull Merchant (Adriana Imai)' },
  { id: 'singularity', label: 'The Singularity (HUX-A7-13)' },
  { id: 'xenomorph', label: 'The Xenomorph' },
  { id: 'good_guy', label: 'The Good Guy (Chucky)' },
  { id: 'unknown', label: 'The Unknown' },
  { id: 'lich', label: 'The Lich (Vecna)' },
  { id: 'dark_lord', label: 'The Dark Lord (Dracula)' },
  { id: 'houndmaster', label: 'The Houndmaster (Madeleine Hawkins)' },
  { id: 'ghoul', label: 'The Ghoul (Ken Kaneki)' },
  { id: 'animatronic', label: 'The Animatronic (Springtrap)' },
  { id: 'other_killer', label: 'Anderer Killer' },
];

export const SURVIVORS = [
  { id: 'dwight_fairfield', label: 'Dwight Fairfield' },
  { id: 'meg_thomas', label: 'Meg Thomas' },
  { id: 'claudette_morel', label: 'Claudette Morel' },
  { id: 'jake_park', label: 'Jake Park' },
  { id: 'nea_karlsson', label: 'Nea Karlsson' },
  { id: 'laurie_strode', label: 'Laurie Strode' },
  { id: 'ace_visconti', label: 'Ace Visconti' },
  { id: 'bill_overbeck', label: 'William "Bill" Overbeck' },
  { id: 'feng_min', label: 'Feng Min' },
  { id: 'david_king', label: 'David King' },
  { id: 'quentin_smith', label: 'Quentin Smith' },
  { id: 'david_tapp', label: 'David Tapp' },
  { id: 'kate_denson', label: 'Kate Denson' },
  { id: 'adam_francis', label: 'Adam Francis' },
  { id: 'jeff_johansen', label: 'Jeff Johansen' },
  { id: 'jane_romero', label: 'Jane Romero' },
  { id: 'ash_williams', label: 'Ash Williams' },
  { id: 'nancy_wheeler', label: 'Nancy Wheeler' },
  { id: 'steve_harrington', label: 'Steve Harrington' },
  { id: 'yui_kimura', label: 'Yui Kimura' },
  { id: 'zarina_kassir', label: 'Zarina Kassir' },
  { id: 'cheryl_mason', label: 'Cheryl Mason' },
  { id: 'felix_richter', label: 'Felix Richter' },
  { id: 'elodie_rakoto', label: 'Élodie Rakoto' },
  { id: 'yun_jin_lee', label: 'Yun-Jin Lee' },
  { id: 'jill_valentine', label: 'Jill Valentine' },
  { id: 'leon_kennedy', label: 'Leon S. Kennedy' },
  { id: 'mikaela_reid', label: 'Mikaela Reid' },
  { id: 'jonah_vasquez', label: 'Jonah Vasquez' },
  { id: 'yoichi_asakawa', label: 'Yoichi Asakawa' },
  { id: 'haddie_kaur', label: 'Haddie Kaur' },
  { id: 'ada_wong', label: 'Ada Wong' },
  { id: 'rebecca_chambers', label: 'Rebecca Chambers' },
  { id: 'vittorio_toscano', label: 'Vittorio Toscano' },
  { id: 'thalita_lyra', label: 'Thalita Lyra' },
  { id: 'renato_lyra', label: 'Renato Lyra' },
  { id: 'gabriel_soma', label: 'Gabriel Soma' },
  { id: 'nicolas_cage', label: 'Nicolas Cage' },
  { id: 'ellen_ripley', label: 'Ellen Ripley' },
  { id: 'alan_wake', label: 'Alan Wake' },
  { id: 'sable_ward', label: 'Sable Ward' },
  { id: 'troupe', label: 'Aestri Yazar & Baermar Uraz' },
  { id: 'lara_croft', label: 'Lara Croft' },
  { id: 'trevor_belmont', label: 'Trevor Belmont' },
  { id: 'taurie_cain', label: 'Taurie Cain' },
  { id: 'rick_grimes', label: 'Rick Grimes' },
  { id: 'michonne', label: 'Michonne' },
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
  return GAME_MODE_LABELS[id] ?? id;
}
