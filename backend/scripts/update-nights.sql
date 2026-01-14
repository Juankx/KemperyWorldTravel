-- Script para actualizar noches desde el CSV
-- Este script debe ejecutarse manualmente con los datos del CSV

-- Ejemplos de actualizaciones (los primeros 10 contratos del CSV):
UPDATE clients SET total_nights = 5, remaining_nights = 5 WHERE contract_number = 'KMPERY UIO 5013';
UPDATE clients SET total_nights = 10, remaining_nights = 10 WHERE contract_number = 'KMPERY UIO 5014';
UPDATE clients SET total_nights = 7, remaining_nights = 7 WHERE contract_number = 'KMPERY UIO 5015';
UPDATE clients SET total_nights = 3, remaining_nights = 3 WHERE contract_number = 'KMPERY UIO 5016';

-- Verificar algunos resultados
SELECT contract_number, total_nights, remaining_nights 
FROM clients 
WHERE contract_number IN ('KMPERY UIO 5013', 'KMPERY UIO 5014', 'KMPERY UIO 5015', 'KMPERY UIO 5016');

-- Estadísticas
SELECT 
  COUNT(*) as total_clientes_con_noches,
  SUM(total_nights) as total_noches_sistema,
  AVG(total_nights) as promedio_noches
FROM clients 
WHERE total_nights > 0;
