insert into core.organizations (id, name, slug) values ('00000000-0000-0000-0000-000000000001', 'AprendePadel Academy', 'aprendepadel-academy') on conflict (id) do nothing;
insert into core.clubs (organization_id, name, slug, municipality) values
('00000000-0000-0000-0000-000000000001','Club de Ambite','ambite','Ambite'),
('00000000-0000-0000-0000-000000000001','Club de Pioz','pioz','Pioz'),
('00000000-0000-0000-0000-000000000001','Club de Pozuelo del Rey','pozuelo-del-rey','Pozuelo del Rey') on conflict do nothing;
insert into core.module_activations (organization_id, module_id, enabled) values ('00000000-0000-0000-0000-000000000001','classes',true), ('00000000-0000-0000-0000-000000000001','courts',false), ('00000000-0000-0000-0000-000000000001','payments',false), ('00000000-0000-0000-0000-000000000001','inventory',false) on conflict do nothing;
