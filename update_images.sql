-- Update images column to point to new .png files in pdct img folder
-- Run after deploying the new folder

UPDATE products SET images = 'glp3-reta-30mg.png' WHERE name = 'GLP3-Reta 30mg';
UPDATE products SET images = 'glp3-reta-15mg.png' WHERE name = 'GLP3-Reta 15mg';
UPDATE products SET images = 'glp2-tirz-30mg.png' WHERE name = 'GLP2-Tirz 30mg';
UPDATE products SET images = 'kpv-30mg.png'        WHERE name = 'KPV 30mg';
UPDATE products SET images = 'kpv-10mg.png'        WHERE name = 'KPV 10mg';
UPDATE products SET images = 'tb500-10mg.png'      WHERE name = 'TB-500 10mg';
UPDATE products SET images = 'klow-80mg.png'       WHERE name = 'KLOW 80mg';
UPDATE products SET images = 'tesa-10mg.png'       WHERE name = 'TESA 10mg';
UPDATE products SET images = 'sermo-10mg.png'      WHERE name = 'SERMO 10mg';
UPDATE products SET images = 'ipa-10mg.png'        WHERE name = 'IPA 10mg';
UPDATE products SET images = 'bpc157-10mg-a.png'   WHERE name = 'BPC-157 10mg A';
UPDATE products SET images = 'bpc157-10mg-b.png'   WHERE name = 'BPC-157 10mg B';
UPDATE products SET images = 'ghkcu-50mg.png'      WHERE name = 'GHKCU 50mg';
UPDATE products SET images = 'ghkcu-100mg.png'     WHERE name = 'GHKCU 100mg';

-- Verify
SELECT name, images FROM products WHERE images IS NOT NULL ORDER BY id;
