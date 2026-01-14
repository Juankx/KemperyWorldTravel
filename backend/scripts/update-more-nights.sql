-- Actualizar más contratos con sus noches correspondientes
-- Basado en los primeros registros del CSV

-- Contratos UIO
UPDATE clients SET total_nights = 5, remaining_nights = 5 WHERE contract_number = 'KMPERY UIO 5013';
UPDATE clients SET total_nights = 10, remaining_nights = 10 WHERE contract_number = 'KMPERY UIO 5014';
UPDATE clients SET total_nights = 7, remaining_nights = 7 WHERE contract_number = 'KMPERY UIO 5015';
UPDATE clients SET total_nights = 3, remaining_nights = 3 WHERE contract_number = 'KMPERY UIO 5016';
UPDATE clients SET total_nights = 4, remaining_nights = 4 WHERE contract_number = 'KMPERY UIO 5017';
UPDATE clients SET total_nights = 6, remaining_nights = 6 WHERE contract_number = 'KMPERY UIO 5018';
UPDATE clients SET total_nights = 8, remaining_nights = 8 WHERE contract_number = 'KMPERY UIO 5019';
UPDATE clients SET total_nights = 5, remaining_nights = 5 WHERE contract_number = 'KMPERY UIO 5020';

-- Contratos LTG
UPDATE clients SET total_nights = 7, remaining_nights = 7 WHERE contract_number = 'KMPERY LTG 1499';
UPDATE clients SET total_nights = 5, remaining_nights = 5 WHERE contract_number = 'KMPERY LTG 1500';
UPDATE clients SET total_nights = 10, remaining_nights = 10 WHERE contract_number = 'KMPERY LTG 1501';

-- Contratos RBM
UPDATE clients SET total_nights = 6, remaining_nights = 6 WHERE contract_number = 'KMPERY RBM 1501';
UPDATE clients SET total_nights = 4, remaining_nights = 4 WHERE contract_number = 'KMPERY RBM 1502';
UPDATE clients SET total_nights = 8, remaining_nights = 8 WHERE contract_number = 'KMPERY RBM 1503';

-- Contratos CUE
UPDATE clients SET total_nights = 5, remaining_nights = 5 WHERE contract_number = 'KMPERY CUE 1537';
UPDATE clients SET total_nights = 7, remaining_nights = 7 WHERE contract_number = 'KMPERY CUE 1541';
UPDATE clients SET total_nights = 6, remaining_nights = 6 WHERE contract_number = 'KMPERY CUE 1547';
UPDATE clients SET total_nights = 4, remaining_nights = 4 WHERE contract_number = 'KMPERY CUE 1551';

-- Verificar resultados
SELECT 
  COUNT(*) as total_clientes_con_noches,
  SUM(total_nights) as total_noches_sistema,
  AVG(total_nights) as promedio_noches,
  MAX(total_nights) as max_noches,
  MIN(total_nights) as min_noches
FROM clients 
WHERE total_nights > 0;

-- Mostrar algunos ejemplos
SELECT contract_number, total_nights, remaining_nights 
FROM clients 
WHERE total_nights > 0 
ORDER BY contract_number 
LIMIT 10;
