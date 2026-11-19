alter table public.perfiles drop constraint perfiles_rol_check;

alter table public.perfiles add constraint perfiles_rol_check
  check (rol in ('cliente', 'admin_sucursal', 'admin_general', 'empleado'));

alter table public.perfiles add constraint perfiles_empleado_sucursal
  check (not (rol = 'empleado' and sucursal_id is null));