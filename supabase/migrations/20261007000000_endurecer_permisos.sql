-- Endurecimiento: las acciones solo las llaman usuarios con sesión iniciada.
-- (es_admin, es_ceo, es_contraparte y socia_cubre se mantienen: las usan las políticas RLS.)
alter function public.tocar_actualizado() set search_path = public;

revoke execute on function public.pedidos_antes_insertar() from public, anon, authenticated;
revoke execute on function public.tocar_actualizado() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'aceptar_pedido(uuid)', 'avanzar_pedido(uuid)', 'calificar(uuid,integer,text)',
    'cancelar_pedido(uuid,text)', 'confirmar_pago(uuid)', 'eliminar_invitacion(text)',
    'invitar_usuario(text,text,text)', 'marcar_pagado(uuid,metodo_pago,numeric)',
    'registrar_perfil(text,text,jsonb,jsonb)', 'resumen_admin()', 'set_disponible(boolean)',
    'set_estado_socia(uuid,estado_socia)', 'set_rol_usuario(uuid,text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
