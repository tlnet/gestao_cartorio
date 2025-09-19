# 🔔 Sistema de Notificações - IA Cartórios

## 📋 Visão Geral

Sistema completo de notificações para a aplicação IA Cartórios, incluindo alertas de prazo de vencimento, notificações de relatórios de IA, e avisos do sistema.

## 🚀 Funcionalidades

### ✅ Notificações Implementadas

1. **Alertas de Prazo de Vencimento**

   - Notificações automáticas para protocolos próximos do vencimento
   - Alertas urgentes para protocolos que vencem hoje/amanhã
   - Cores e prioridades baseadas na urgência

2. **Relatórios de IA Processados**

   - Notificações quando relatórios de IA são processados
   - Status de processamento (processado, processando, erro)
   - Metadados específicos do relatório

3. **Notificações de Protocolos**

   - Criação de novos protocolos
   - Atualizações em protocolos existentes
   - Histórico de alterações

4. **Notificações do Sistema**
   - Avisos gerais do sistema
   - Manutenções programadas
   - Alertas de configuração

### 🎯 Componentes Principais

#### 1. **Hook `useNotifications`**

```typescript
// src/hooks/use-notifications.ts
const {
  notificacoes,
  loading,
  unreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotificacao,
  createNotificacao,
  checkProtocolosVencendo,
} = useNotifications();
```

#### 2. **Sino de Notificações**

```typescript
// src/components/notifications/notification-bell.tsx
<NotificationBell />
```

#### 3. **Notificações de IA**

```typescript
// src/components/notifications/ia-notifications.tsx
<IANotifications />
```

## 🗄️ Estrutura do Banco de Dados

### Tabela `notificacoes`

```sql
CREATE TABLE public.notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    cartorio_id UUID REFERENCES public.cartorios(id),
    protocolo_id UUID REFERENCES public.protocolos(id),
    tipo VARCHAR(50) NOT NULL, -- 'prazo_vencimento', 'ia_processado', etc.
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    prioridade VARCHAR(20) DEFAULT 'normal', -- 'baixa', 'normal', 'alta', 'urgente'
    data_notificacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_vencimento TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Triggers Automáticos

1. **Trigger de Prazo de Vencimento**

   - Cria notificações automaticamente quando protocolos são criados/atualizados
   - Verifica se o prazo está próximo (7 dias ou menos)

2. **Trigger de Relatórios de IA**
   - Cria notificações quando relatórios são processados
   - Inclui metadados específicos do processamento

## 🎨 Interface do Usuário

### 1. **Sino de Notificações (Header)**

- Badge com contador de notificações não lidas
- Popover com lista de notificações recentes
- Ações: marcar como lida, deletar, ver todas

### 2. **Dashboard - Notificações de IA**

- Card para relatórios de IA processados
- Status visual do processamento
- Links para página de IA

### 3. **Página de Notificações**

- Lista completa de todas as notificações
- Filtros por tipo e prioridade
- Busca por texto
- Ações em lote (marcar todas como lidas)

## 🔧 Configuração

### 1. **Executar Scripts SQL**

```bash
# 1. Criar tabela e triggers
psql -h your-supabase-host -U postgres -d postgres -f create-notifications-table.sql

# 2. Verificar estrutura
psql -h your-supabase-host -U postgres -d postgres -f check-notifications-table.sql
```

### 2. **Configurar Variáveis de Ambiente**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. **Testar Sistema**

```bash
# Executar script de teste
node test-notification-system.js
```

## 📱 Tipos de Notificação

### 1. **Prazo de Vencimento**

```typescript
{
  tipo: 'prazo_vencimento',
  titulo: 'Protocolo vence em 3 dias',
  mensagem: 'O protocolo PROTO-001 vence em 3 dias.',
  prioridade: 'alta',
  data_vencimento: '2024-01-15T00:00:00Z',
  metadata: {
    protocolo: 'PROTO-001',
    solicitante: 'João Silva',
    dias_para_vencer: 3
  }
}
```

### 2. **Relatório de IA**

```typescript
{
  tipo: 'ia_processado',
  titulo: 'Relatório de IA processado',
  mensagem: 'O relatório para o protocolo PROTO-002 foi processado.',
  prioridade: 'normal',
  metadata: {
    protocolo: 'PROTO-002',
    tipo_relatorio: 'IA',
    status: 'processado'
  }
}
```

### 3. **Protocolo Criado**

```typescript
{
  tipo: 'protocolo_criado',
  titulo: 'Novo protocolo criado',
  mensagem: 'Um novo protocolo foi criado no sistema.',
  prioridade: 'normal',
  metadata: {
    protocolo: 'PROTO-003',
    solicitante: 'Maria Santos'
  }
}
```

## 🎯 Prioridades

### **Urgente** (Vermelho)

- Protocolos que vencem hoje
- Erros críticos do sistema
- Falhas de processamento

### **Alta** (Laranja)

- Protocolos que vencem em 1-3 dias
- Avisos importantes
- Atualizações críticas

### **Normal** (Azul)

- Relatórios processados
- Novos protocolos
- Atualizações gerais

### **Baixa** (Cinza)

- Informações gerais
- Avisos de manutenção
- Notificações informativas

## 🔄 Atualizações Automáticas

### **Polling de Notificações**

- Verificação a cada 30 segundos
- Atualização automática do contador
- Sincronização em tempo real

### **Verificação de Prazos**

- Verificação a cada 5 minutos
- Criação automática de alertas
- Notificações proativas

## 📊 Métricas e Estatísticas

### **Dashboard**

- Total de notificações
- Notificações não lidas
- Notificações urgentes
- Distribuição por tipo

### **Página de Notificações**

- Filtros avançados
- Busca por texto
- Ordenação por data/prioridade
- Ações em lote

## 🚨 Alertas Especiais

### **Protocolos Vencendo**

- Alertas automáticos 7 dias antes
- Notificações urgentes para vencimento iminente
- Cores e ícones específicos

### **Relatórios de IA**

- Notificações de processamento concluído
- Alertas de falhas no processamento
- Status visual do progresso

## 🔧 Manutenção

### **Limpeza Automática**

- Notificações lidas: 30 dias
- Notificações não lidas: 90 dias
- Execução automática via trigger

### **Monitoramento**

- Logs de criação de notificações
- Métricas de performance
- Alertas de falhas

## 📱 Responsividade

### **Mobile**

- Popover adaptado para telas pequenas
- Cards otimizados para touch
- Navegação simplificada

### **Desktop**

- Interface completa
- Múltiplas colunas
- Ações avançadas

## 🎨 Personalização

### **Cores por Prioridade**

- Configuráveis via CSS
- Consistência visual
- Acessibilidade

### **Ícones por Tipo**

- Ícones específicos para cada tipo
- Identificação visual rápida
- Consistência com design system

## 🔐 Segurança

### **RLS (Row Level Security)**

- Usuários só veem suas notificações
- Isolamento por cartório
- Políticas de acesso restritivas

### **Validação**

- Validação de dados de entrada
- Sanitização de conteúdo
- Prevenção de XSS

## 📈 Performance

### **Otimizações**

- Índices otimizados
- Paginação de resultados
- Cache de notificações frequentes

### **Escalabilidade**

- Suporte a milhares de notificações
- Processamento assíncrono
- Limpeza automática

## 🧪 Testes

### **Script de Teste**

```bash
node test-notification-system.js
```

### **Cenários Testados**

- Criação de notificações
- Marcação como lida
- Exclusão de notificações
- Filtros e busca
- Diferentes tipos e prioridades

## 📚 Documentação Adicional

- [Hook useNotifications](./src/hooks/use-notifications.ts)
- [Componente NotificationBell](./src/components/notifications/notification-bell.tsx)
- [Página de Notificações](./src/app/notificacoes/page.tsx)
- [Script SQL](./create-notifications-table.sql)

## 🎉 Conclusão

O sistema de notificações está **completamente funcional** e integrado à aplicação, oferecendo:

- ✅ **Alertas automáticos** de prazo de vencimento
- ✅ **Notificações de IA** processadas
- ✅ **Interface intuitiva** com sino no header
- ✅ **Página dedicada** para gerenciamento
- ✅ **Filtros e busca** avançados
- ✅ **Prioridades visuais** por urgência
- ✅ **Atualizações em tempo real**
- ✅ **Responsividade** completa
- ✅ **Segurança** com RLS
- ✅ **Performance** otimizada

O sistema está pronto para uso em produção! 🚀
