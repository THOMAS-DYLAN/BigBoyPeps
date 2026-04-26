// ═══════════════════════════════════════════════════════
// BigBoyPeps — Supabase Client
//
// SETUP: Replace YOUR_ANON_KEY_HERE with your anon/public
// key from: Supabase → Project Settings → API → anon key
// Never commit the real key to a public repo.
// ═══════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
  'https://utqviljholfvpfztfuvx.supabase.co',
  'sk_test_51TQH7bK6Egh6nYfi2Pqeb6ikAFWHCqAnZBnGh0jswwuKM8QKqiO9Oo4sMjB9qzpfK1sbXnLDm79DrwfF2hOEUFrK00IZ8Dsql6'
);
