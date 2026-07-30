// Profil und Rolle des angemeldeten Benutzers.
import { supabase } from './supabase.js?v=17';

let profile = null;

/**
 * Lädt das Profil und legt es beim ersten Login an, falls der Trigger auf
 * auth.users im Projekt nicht erlaubt war.
 */
export async function loadProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, email, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Profil konnte nicht geladen werden:', error.message);
    profile = { user_id: user.id, email: user.email, role: 'user' };
    return profile;
  }

  if (data) {
    profile = data;
    return profile;
  }

  const { data: created } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, email: user.email, role: 'user' })
    .select('user_id, email, role')
    .maybeSingle();

  profile = created ?? { user_id: user.id, email: user.email, role: 'user' };
  return profile;
}

export const currentProfile = () => profile;
export const isOwner = () => profile?.role === 'owner';
export const roleLabel = () => (isOwner() ? 'Besitzer' : 'Benutzer');
