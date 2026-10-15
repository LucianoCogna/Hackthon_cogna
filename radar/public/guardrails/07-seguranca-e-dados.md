# 07 · Segurança e dados (LGPD)

> Trabalhamos com dados de **alunos**: nome, CPF, notas, situação financeira. Tudo isso é dado
> pessoal protegido pela LGPD, e parte é sensível. Prompt não é lugar para dado pessoal.

## Nunca cole em um prompt

- ❌ Secrets: tokens, senhas, chaves de API, connection strings, certificados.
- ❌ Dados pessoais reais: CPF, RG, e-mail, telefone, endereço, matrícula vinculada a nome.
- ❌ Dados financeiros de alunos: boletos, dívidas, renegociações.
- ❌ Dumps de banco de produção ou logs sem anonimização.
- ❌ Contratos e documentos jurídicos confidenciais.

## Em vez disso

- ✅ Use **dados sintéticos** (factories, Faker com seed).
- ✅ Anonimize: `CPF 123.***.***-09`, `aluno_8f3a`.
- ✅ Descreva o *formato* do dado, não o dado: "um JSON com `cpf`, `nome` e `status`".
- ✅ Referencie secrets pelo nome: "leia `DB_PASSWORD` do Secrets Manager".

## Dependências sugeridas pela IA

Modelos podem sugerir pacotes que não existem ou que têm nomes parecidos com pacotes legítimos
(*typosquatting*). Antes de aceitar uma dependência nova:

- [ ] O pacote existe no registry oficial e tem mantenedores ativos?
- [ ] O nome está exatamente certo? (`lodash` ≠ `lodahs`)
- [ ] A licença é compatível (MIT, Apache-2.0, BSD)?
- [ ] Passou no `dependency-review` e no scanner de vulnerabilidades do CI?
- [ ] Existe alternativa já aprovada no projeto?

## Código gerado: pontos de atenção

- **Validação de entrada** em toda borda (API, fila, upload).
- **Autorização** verificada no servidor, nunca só no front.
- **Logs** sem PII: mascare antes de logar.
- **SQL** sempre parametrizado; nada de concatenação de strings.
- **Criptografia:** use as bibliotecas da plataforma, nunca uma implementação "criativa" sugerida pela IA.

## Steering de segurança

Inclua no `.kiro/steering/tech.md` (ou em um `security.md` com `inclusion: always`):

```markdown
- Nunca registrar em log CPF, e-mail, telefone ou dados financeiros.
- Toda rota nova exige middleware de autenticação e verificação de perfil.
- Secrets só via AWS Secrets Manager; nunca em código ou .env versionado.
```

## Skill corporativa

A skill **`lgpd-guard`** revisa o diff atrás de PII em logs, secrets em texto plano e campos
pessoais expostos em respostas de API.

## Incidente? Aja rápido

1. Se um secret foi exposto (em prompt, commit ou log): **revogue e rotacione imediatamente**.
2. Avise o canal `#seguranca` e o Tech Lead.
3. Registre o ocorrido. Ninguém é punido por reportar; o problema é esconder.
