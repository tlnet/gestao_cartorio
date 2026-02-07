# Sistema de Convite de Usuários - Checklist de Testes

## ✅ Implementação Concluída

Todas as funcionalidades do sistema de convites foram implementadas com sucesso!

## 📋 Checklist de Validação para o Usuário

### 1. Preparação do Banco de Dados
- [ ] Executar o script SQL: `src/lib/setup-user-invites.sql` no Supabase
- [ ] Verificar que os campos foram criados na tabela `users`
- [ ] Confirmar que os índices foram criados corretamente

### 2. Teste do Fluxo Completo (Happy Path)

#### 2.1 Criação de Convite pelo Administrador
- [ ] Login como administrador
- [ ] Navegar para página "Usuários"
- [ ] Clicar em "Cadastrar Novo Usuário"
- [ ] Preencher: Nome, Email, Telefone, Tipo (Atendente ou Admin)
- [ ] Clicar em "Cadastrar"
- [ ] **Verificar**: Modal de convite é exibido
- [ ] **Verificar**: Link de convite está presente
- [ ] Clicar em botão "Copiar" (ícone de cópia)
- [ ] **Verificar**: Toast "Link copiado" aparece
- [ ] Copiar o link manualmente para testar

#### 2.2 Ativação de Conta pelo Novo Usuário
- [ ] Abrir link de convite em uma aba anônima ou outro navegador
- [ ] **Verificar**: Página de ativação carrega
- [ ] **Verificar**: Dados do usuário estão corretos (nome, email, telefone)
- [ ] Definir senha com os requisitos:
  - [ ] Pelo menos 8 caracteres
  - [ ] Uma letra maiúscula
  - [ ] Uma letra minúscula
  - [ ] Um número
- [ ] Confirmar senha
- [ ] **Verificar**: Indicador de força da senha funciona
- [ ] **Verificar**: Checkmarks verdes aparecem conforme requisitos são atendidos
- [ ] Clicar em "Ativar Conta"
- [ ] **Verificar**: Toast "Conta ativada com sucesso"
- [ ] **Verificar**: Redirecionamento para página de login após 2 segundos

#### 2.3 Login do Novo Usuário
- [ ] Na página de login, inserir email e senha definida
- [ ] Clicar em "Entrar"
- [ ] **Verificar**: Login bem-sucedido
- [ ] **Verificar**: Redirecionamento para dashboard

#### 2.4 Visualização pelo Administrador
- [ ] Voltar como administrador
- [ ] Navegar para página "Usuários"
- [ ] **Verificar**: Usuário aparece como "Ativo" (sem badge "Aguardando Ativação")

### 3. Testes de Validação e Segurança

#### 3.1 Token Inválido
- [ ] Tentar acessar `/ativar-conta?token=tokeninvalido123`
- [ ] **Verificar**: Mensagem "Convite Inválido" é exibida
- [ ] **Verificar**: Instruções claras são fornecidas

#### 3.2 Token Expirado
- [ ] No banco de dados, alterar `invite_expires_at` de um usuário pendente para data passada
- [ ] Acessar link de convite desse usuário
- [ ] **Verificar**: Mensagem "Convite Expirado" é exibida
- [ ] **Verificar**: Orientação para contatar administrador aparece

#### 3.3 Token Já Utilizado
- [ ] Tentar acessar novamente o link de um convite já aceito
- [ ] **Verificar**: Mensagem "Conta Já Ativada" é exibida
- [ ] **Verificar**: Botão "Ir para Login" está presente

#### 3.4 Validação de Senha Fraca
- [ ] Na página de ativação, tentar senha: `123`
- [ ] **Verificar**: Botão "Ativar Conta" está desabilitado
- [ ] **Verificar**: Requisitos não atendidos aparecem em vermelho/cinza
- [ ] Tentar senha: `semMaiuscula1`
- [ ] **Verificar**: Botão continua desabilitado
- [ ] Testar cada requisito individualmente

#### 3.5 Senhas Não Coincidem
- [ ] Definir senha: `SenhaForte123`
- [ ] Confirmar senha: `SenhaForte456`
- [ ] **Verificar**: Requisito "As senhas coincidem" não tem checkmark verde
- [ ] **Verificar**: Botão está desabilitado

### 4. Gerenciamento de Convites pelo Administrador

#### 4.1 Reenviar Convite
- [ ] Criar novo usuário (não ativar)
- [ ] Na listagem, identificar usuário com badge "Aguardando Ativação"
- [ ] Clicar no botão de "Reenviar Convite" (ícone de refresh)
- [ ] **Verificar**: Modal com novo link de convite é aberto
- [ ] **Verificar**: Novo link é diferente do anterior
- [ ] **Verificar**: Toast de sucesso aparece
- [ ] Copiar novo link e testar ativação

#### 4.2 Cancelar Convite
- [ ] Criar novo usuário (não ativar)
- [ ] Na listagem, clicar no botão "Cancelar Convite" (X dentro de círculo)
- [ ] **Verificar**: Dialog de confirmação aparece
- [ ] Clicar em "Cancelar Convite"
- [ ] **Verificar**: Toast "Convite cancelado"
- [ ] **Verificar**: Badge "Aguardando Ativação" desaparece
- [ ] **Verificar**: Usuário aparece como "Inativo"
- [ ] Tentar acessar link de convite cancelado
- [ ] **Verificar**: Token inválido ou já usado

### 5. Testes de UI/UX

#### 5.1 Responsividade
- [ ] Testar página de ativação em mobile (DevTools)
- [ ] Testar modal de convite em mobile
- [ ] **Verificar**: Layouts se adaptam corretamente
- [ ] **Verificar**: Botões e formulários são acessíveis

#### 5.2 Loading States
- [ ] Observar spinner durante validação de token
- [ ] Observar loading no botão durante ativação
- [ ] Observar loading ao reenviar convite
- [ ] **Verificar**: Feedback visual claro em todas as ações

#### 5.3 Mensagens de Erro Amigáveis
- [ ] Verificar todas as mensagens de erro exibidas
- [ ] **Verificar**: Linguagem clara e instruções práticas
- [ ] **Verificar**: Ícones apropriados (erro, aviso, sucesso)

### 6. Testes de Segurança (Opcional para Produção)

#### 6.1 Rate Limiting
- [ ] Tentar ativar conta com token inválido 6+ vezes seguidas
- [ ] **Verificar**: Após 5 tentativas, mensagem de rate limit aparece

#### 6.2 SQL Injection e XSS
- [ ] Tentar injetar SQL no campo de senha
- [ ] Tentar injetar scripts no token da URL
- [ ] **Verificar**: Nenhuma vulnerabilidade é explorada

### 7. Verificações no Banco de Dados

#### 7.1 Após Criação de Convite
- [ ] Verificar registro na tabela `users`
- [ ] **Verificar**: `invite_token` é UUID válido
- [ ] **Verificar**: `invite_created_at` está correto
- [ ] **Verificar**: `invite_expires_at` é 7 dias no futuro
- [ ] **Verificar**: `invite_status` = 'pending'
- [ ] **Verificar**: `account_status` = 'pending_activation'
- [ ] **Verificar**: `ativo` = false

#### 7.2 Após Ativação de Convite
- [ ] **Verificar**: `invite_status` = 'accepted'
- [ ] **Verificar**: `invite_accepted_at` está preenchido
- [ ] **Verificar**: `account_status` = 'active'
- [ ] **Verificar**: `ativo` = true
- [ ] Verificar no Supabase Auth que senha foi definida

## 🎯 Critérios de Sucesso

- ✅ Todas as funcionalidades implementadas funcionam conforme especificado
- ✅ Fluxo completo de criação → convite → ativação → login funciona
- ✅ Validações de segurança estão em vigor
- ✅ UI/UX é intuitiva e responsiva
- ✅ Mensagens de erro são claras e úteis
- ✅ Gerenciamento de convites (reenviar/cancelar) funciona
- ✅ Sem erros no console do navegador ou logs do servidor

## 📝 Notas Importantes

1. **Ambiente de Desenvolvimento**: Certifique-se de que `NEXT_PUBLIC_APP_URL` está configurado corretamente no `.env.local`
2. **Supabase Service Role**: A API de ativação usa `supabase.auth.admin`, certifique-se de que as credenciais corretas estão configuradas
3. **Email/WhatsApp**: O sistema gera o link, mas o envio automático deve ser implementado futuramente
4. **Limpeza**: Execute `SELECT expire_old_invites();` periodicamente para limpar convites expirados

## 🚀 Próximos Passos (Opcional)

- [ ] Integrar com serviço de email (SendGrid, Resend, etc.)
- [ ] Adicionar envio automático de email ao criar convite
- [ ] Implementar job cron para expirar convites automaticamente
- [ ] Adicionar página de estatísticas de convites
- [ ] Permitir administrador customizar prazo de expiração
- [ ] Adicionar histórico de convites enviados

---

**Sistema Implementado por**: Cursor AI Assistant
**Data**: 03/02/2026
**Versão**: 1.0
