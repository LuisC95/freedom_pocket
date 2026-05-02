-- Eliminar liquidity_movements de pagos de tarjeta de crédito que no tengan
-- transacción asociada (related_transaction_id es null) y que no hayan sido
-- creados por el nuevo flujo de brújula (que ahora sí crea la transacción).
-- Estos movimientos quedaron huérfanos porque antes payOffCreditCard no creaba
-- una transacción en el dashboard, solo descontaba liquidez.

delete from public.liquidity_movements
where movement_type = 'credit_card_payment'
  and related_transaction_id is null;
