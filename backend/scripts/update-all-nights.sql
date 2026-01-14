-- Script generado para actualizar noches desde CSV


-- Verificar resultados
SELECT COUNT(*) as total_clientes_con_noches FROM clients WHERE total_nights > 0;
SELECT SUM(total_nights) as total_noches_sistema FROM clients WHERE total_nights > 0;
