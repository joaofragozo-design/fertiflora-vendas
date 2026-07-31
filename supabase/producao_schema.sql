-- Módulo Fábrica — Santa Tereza (granuladora)
-- Rode este arquivo inteiro, de uma vez, no SQL Editor do Supabase.
-- Seguro rodar mais de uma vez (usa "if not exists" / "drop policy if exists").

create table if not exists public.producao_linhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  capacidade_nominal_ton_hora numeric,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.producao_linhas (nome)
values ('G1'), ('G2')
on conflict (nome) do nothing;

create table if not exists public.producao_turnos (
  id uuid primary key default gen_random_uuid(),
  linha_id uuid not null references public.producao_linhas(id),
  data_producao date not null,
  responsavel_nome text,
  horimetro_inicio numeric,
  horimetro_final numeric,
  hora_inicio time,
  hora_final time,
  toneladas_total numeric,
  caixas_agua_total numeric,
  pre_gel_total numeric,
  toneladas_reciclo numeric,
  disponibilidade numeric,
  performance numeric,
  qualidade numeric,
  aproveitamento numeric,
  formula text,
  sacos_total numeric,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.producao_turnos add column if not exists formula text;
alter table public.producao_turnos add column if not exists sacos_total numeric;

create index if not exists producao_turnos_linha_data_idx
  on public.producao_turnos (linha_id, data_producao);

create table if not exists public.producao_checagens (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.producao_turnos(id) on delete cascade,
  sequencia int not null,
  toneladas numeric,
  caixas_agua numeric,
  pre_gel numeric,
  registrado_em timestamptz not null default now()
);

create index if not exists producao_checagens_turno_idx
  on public.producao_checagens (turno_id);

create table if not exists public.producao_leituras (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.producao_turnos(id) on delete cascade,
  horario time,
  tempo_min numeric,
  peso_kg numeric,
  created_at timestamptz not null default now()
);

create index if not exists producao_leituras_turno_idx
  on public.producao_leituras (turno_id);

create table if not exists public.producao_paradas (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.producao_turnos(id) on delete cascade,
  categoria text not null check (
    categoria in (
      'mecanica_eletrica',
      'processo_ajuste',
      'suprimento_insumo',
      'qualidade',
      'programada',
      'outros'
    )
  ),
  submotivo text,
  inicio timestamptz not null,
  fim timestamptz,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists producao_paradas_turno_idx
  on public.producao_paradas (turno_id);

alter table public.producao_linhas enable row level security;
alter table public.producao_turnos enable row level security;
alter table public.producao_checagens enable row level security;
alter table public.producao_leituras enable row level security;
alter table public.producao_paradas enable row level security;

drop policy if exists "fabrica_leitura" on public.producao_linhas;
create policy "fabrica_leitura" on public.producao_linhas
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_leitura" on public.producao_turnos;
create policy "fabrica_leitura" on public.producao_turnos
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_escrita" on public.producao_turnos;
create policy "fabrica_escrita" on public.producao_turnos
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_leitura" on public.producao_checagens;
create policy "fabrica_leitura" on public.producao_checagens
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_escrita" on public.producao_checagens;
create policy "fabrica_escrita" on public.producao_checagens
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_leitura" on public.producao_leituras;
create policy "fabrica_leitura" on public.producao_leituras
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_escrita" on public.producao_leituras;
create policy "fabrica_escrita" on public.producao_leituras
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_leitura" on public.producao_paradas;
create policy "fabrica_leitura" on public.producao_paradas
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_escrita" on public.producao_paradas;
create policy "fabrica_escrita" on public.producao_paradas
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Auto-calibração de capacidade por fórmula: cada turno com fórmula preenchida que bate
-- a melhor taxa (ton/h) já vista pra essa fórmula+linha vira a nova referência de Performance.
create table if not exists public.producao_referencias_formula (
  id uuid primary key default gen_random_uuid(),
  linha_id uuid not null references public.producao_linhas(id),
  formula text not null,
  melhor_taxa_ton_hora numeric not null,
  turno_referencia_id uuid references public.producao_turnos(id),
  atualizado_em timestamptz not null default now(),
  unique (linha_id, formula)
);

alter table public.producao_referencias_formula enable row level security;

drop policy if exists "fabrica_leitura" on public.producao_referencias_formula;
create policy "fabrica_leitura" on public.producao_referencias_formula
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "fabrica_escrita" on public.producao_referencias_formula;
create policy "fabrica_escrita" on public.producao_referencias_formula
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
