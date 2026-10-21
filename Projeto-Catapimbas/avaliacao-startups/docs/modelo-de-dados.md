# Modelo de dados (DER) — PostgreSQL (Supabase)

```mermaid
erDiagram
  INSTITUICOES ||--o{ VINCULOS : possui
  USUARIOS ||--o{ VINCULOS : tem
  INSTITUICOES ||--o{ PROJETOS : possui
  PROJETOS ||--o{ MEMBROS : tem
  USUARIOS ||--o{ MEMBROS : integra
  INSTITUICOES ||--o{ BANCAS : realiza
  BANCAS ||--o{ CRITERIOS : define
  BANCAS ||--o{ BANCA_PROJETOS : inclui
  PROJETOS ||--o{ BANCA_PROJETOS : participa
  BANCAS ||--o{ BANCA_AVALIADORES : designa
  USUARIOS ||--o{ BANCA_AVALIADORES : avalia
  AVALIACOES }o--|| BANCAS : em
  AVALIACOES }o--|| PROJETOS : sobre
  AVALIACOES }o--|| CRITERIOS : por
  AVALIACOES }o--|| USUARIOS : feita_por
```
Restrições: `UNIQUE(usuario, instituicao, papel)` em vínculos; `UNIQUE(banca, projeto, avaliador, criterio)` em avaliações (impede nota duplicada);
`CHECK(nota BETWEEN 1 AND 5)`; `CHECK(peso > 0)`. Índices em `projetos(instituicao_id, ano, semestre)` e `avaliacoes(banca_id, projeto_id)`.
O identificador da instituição está em vínculos, projetos e bancas; os demais dados herdam o escopo por essas tabelas.
