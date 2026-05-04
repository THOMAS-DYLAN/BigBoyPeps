-- ═══════════════════════════════════════════════════════════════
-- BigBoyPeps — Replace all products with real product catalog
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add image column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS image text default null;

-- 2. Clear existing products
DELETE FROM products;

-- 3. Insert all 14 real products
INSERT INTO products (name, category, price, heat_level, description, badge, thumb_color, shape_key, image, active) VALUES

-- GLP-3 / Retatrutide products
('GLP3-Reta 30mg',  'GLP Peptides',  189.99, 5, 'Retatrutide 30mg research vial. Triple-receptor agonist targeting GLP-1, GIP, and glucagon receptors. For research use only.', '🔥 Top Seller', '#1a1a1a', 'tall', 'glp3-reta-30mg.jpg',  true),
('GLP3-Reta 15mg',  'GLP Peptides',  129.99, 5, 'Retatrutide 15mg research vial. Triple-receptor agonist targeting GLP-1, GIP, and glucagon receptors. For research use only.', '🔥 Top Seller', '#1a1a1a', 'tall', 'glp3-reta-15mg.png',  true),

-- Tirzepatide
('GLP2-Tirz 30mg',  'GLP Peptides',  169.99, 4, 'Tirzepatide 30mg research vial. Dual GIP and GLP-1 receptor agonist. For research use only.', null, '#1a1a1a', 'tall', 'glp2-tirz-30mg.jpg',  true),

-- KPV
('KPV 30mg',        'Peptides',       89.99, 2, 'KPV 30mg research vial. Anti-inflammatory tripeptide derived from alpha-MSH. For research use only.', null, '#1a1a1a', 'round', 'kpv-30mg.jpg',       true),
('KPV 10mg',        'Peptides',       49.99, 2, 'KPV 10mg research vial. Anti-inflammatory tripeptide derived from alpha-MSH. For research use only.', null, '#1a1a1a', 'round', 'kpv-10mg.jpg',       true),

-- TB-500
('TB-500 10mg',     'Peptides',       79.99, 3, 'TB-500 10mg research vial. Synthetic version of Thymosin Beta-4. Studied for tissue repair and recovery. For research use only.', null, '#1a1a1a', 'tall', 'tb500-10mg.jpg',      true),

-- KLOW
('KLOW 80mg',       'Peptides',       99.99, 3, 'KLOW 80mg research vial. For research use only.', null, '#1e1a2e', 'round', 'klow-80mg.png',       true),

-- Tesamorelin
('TESA 10mg',       'GH Peptides',    94.99, 3, 'Tesamorelin 10mg research vial. GHRH analogue studied for growth hormone release. For research use only.', null, '#1a1a1a', 'tall', 'tesa-10mg.jpg',       true),

-- Sermorelin
('SERMO 10mg',      'GH Peptides',    69.99, 2, 'Sermorelin 10mg research vial. Growth hormone releasing hormone analogue. For research use only.', null, '#1a1a1a', 'tall', 'sermo-10mg.png',      true),

-- Ipamorelin
('IPA 10mg',        'GH Peptides',    74.99, 2, 'Ipamorelin 10mg research vial. Selective growth hormone secretagogue. For research use only.', null, '#1a1a1a', 'tall', 'ipa-10mg.png',        true),

-- BPC-157
('BPC-157 10mg',    'Peptides',       64.99, 3, 'BPC-157 10mg research vial. Pentadecapeptide studied for tissue and gut healing properties. For research use only.', null, '#1a1a1a', 'tall', 'bpc157-10mg-a.jpg',   true),
('BPC-157 10mg',    'Peptides',       64.99, 3, 'BPC-157 10mg research vial. Pentadecapeptide studied for tissue and gut healing properties. For research use only.', null, '#1a1a1a', 'tall', 'bpc157-10mg-b.png',   true),

-- GHK-CU
('GHKCU 50mg',      'Peptides',      124.99, 2, 'GHK-Cu 50mg research vial. Copper peptide studied for skin regeneration and wound healing. For research use only.', null, '#1e1a2e', 'round', 'ghkcu-50mg.jpg',      true),
('GHKCU 100mg',     'Peptides',      194.99, 2, 'GHK-Cu 100mg research vial. Copper peptide studied for skin regeneration and wound healing. For research use only.', null, '#1e1a2e', 'round', 'ghkcu-100mg.png',     true);

-- Verify
SELECT id, name, price, image FROM products ORDER BY id;
