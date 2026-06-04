// ═══════════════════════════════════════════════════════
// BigBoyPeps — Supabase Clients
//
// Two separate projects:
//   supabase         → auth, orders, addresses, reviews, waitlist
//   supabaseProducts → products table only (read-only)
// ═══════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Auth + user data (new project)
export const supabase = createClient(
  'https://azgqvcnkhifmqdbssalt.supabase.co',
  'sb_publishable_9AerEHFbpO3JTQKbMQOUtg_oN2NHgm0'
);

// Products only (original BBP project)
export const supabaseProducts = createClient(
  'https://utqviljholfvpfztfuvx.supabase.co',
  'sb_publishable_QMnUkvFkxKjGY2G6qeL_GA_Kel0HQae'
);
