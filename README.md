# S-Pulse - Sistema de Monitoramento e Controle Prisional

Sistema completo de controle e monitoramento de visitantes em unidades prisionais através de tecnologia NFC, desenvolvido com foco no Presídio de Alcaçuz/RN.

## 📋 Sobre o Projeto

O **S-Pulse** é uma solução React Native para automatizar o controle de entrada, permanência e gerenciamento de visitantes em unidades prisionais, oferecendo uma plataforma segura, precisa e integrada para monitoramento em tempo real.

### Objetivos do Sistema

- 🔒 **Aumentar a segurança** nas unidades prisionais
- ⚠️ **Reduzir falhas humanas** no controle de acesso
- 📍 **Melhorar a rastreabilidade** dos fluxos de visitantes
- ⏱️ **Monitoramento em tempo real** de entrada e permanência
- 🏛️ **Gestão integrada** de pavilhões e áreas restritas
- 🛣️ **Controle de rotas obrigatórias** para visitantes

## 🎯 Funcionalidades Principais

### 👥 Gestão de Usuários

#### Cadastro de Administradores e Controladores
- **Admins**: Acesso total ao sistema, gerenciamento de pavilhões e rotas
- **Controladores**: Responsáveis por pavilhões específicos, registro de checkpoints

#### Permissões por Role
| Funcionalidade | Admin | Controlador |
|---|---|---|
| Cadastrar visitantes | ✅ (Todos pavilhões) | ✅ (Apenas 1º pavilhão) |
| Gerenciar pavilhões | ✅ | ❌ |
| Criar/Editar rotas | ✅ | ❌ |
| Registrar checkpoints | ❌ | ✅ |
| Gerenciar usuários | ✅ | ❌ |
| Visualizar dashboard | ✅ | ✅ |

### 🏢 Gestão de Pavilhões

- **Cadastro de pavilhões** (acesso restrito a admins)
- **Registro de checkpoints de agentes** por pavilhão
- Definição de responsável diário por cada pavilhão
- Controle de capacidade e fluxo

### 👤 Cadastro de Visitantes

Informações completas do visitante:
- Nome completo
- Gênero e idade
- CPF e RG
- Telefone de contato
- Foto de identificação
- Localização de registro
- Agente responsável pelo cadastro

### 🛣️ Sistema de Rotas

#### Criação de Rotas (Admin)
- Definição de sequência de pavilhões obrigatórios
- Exemplo: Pavilhão 1 → Pavilhão 5 → Pavilhão 2 → Destino
- Checkpoints obrigatórios por rota
- Possibilidade de permitir desvios (opcional por visitante)

#### Controle de Rotas
- Visualização de todas as rotas cadastradas
- Detalhes completos de cada rota
- Gerenciamento de rotas existentes
- Exclusão de rotas (não permite edição)

#### Verificação de Rotas
- ✅ **Check automático**: Marca checkpoint apenas se o visitante estiver no pavilhão correto da rota
- 🚫 **Bloqueio de desvios**: Impede registro em pavilhões fora da rota (mesmo pelo agente)
- 📍 **Rastreamento**: Acompanhamento em tempo real da progressão na rota
- ⚠️ **Alertas**: Notificação quando visitante está fora da rota

### 📅 Agendamento de Visitas

Criação de agendamentos com:
- Data e horário estipulados
- Duração estimada da visita
- Motivo da visita
- Notas e observações sobre o visitante

#### Status de Visitas
- 🟡 **Pendente**: Aguardando início
- 🟢 **Confirmada**: Visita confirmada
- 🟣 **Em Andamento**: Visita em curso
- 🔵 **Concluída**: Visita finalizada
- 🔴 **Cancelada**: Visita cancelada
- ⏰ **Atrasada**: Passou do horário sem iniciar

#### Controle de Agendamentos
- Modal de visitas atrasadas (notificação automática)
- Listagem de todas as visitas agendadas
- Alteração de status das visitas
- Filtros por data, status e visitante

### 📊 Dashboard de Controle

#### Painel Principal
- Lista de visitantes cadastrados
- Seleção de visitante para vinculação à pulseira NFC
- Leitura de pulseiras NFC
- Visualização de todos os checkpoints do visitante
- Gráficos de visitantes dos últimos 7 dias
- Gráficos de checkpoints por pavilhão (7 dias)

#### Ações Disponíveis
1. **Gerenciar Visitantes**: Ver e editar todos os visitantes
2. **Registrar Checkpoints**: Marcar passagem de visitantes (apenas controladores)
3. **Controlar Agendamentos**: Gerenciar agendamentos dos visitantes
4. **Novo Visitante**: Cadastrar visitantes (admin ou agente do 1º pavilhão)
5. **Gerenciar Usuários**: Cadastrar novos controladores (apenas admins)
6. **Agendar Visitas**: Programar visitas dos visitantes
7. **Gerenciar NFC**: Ler e gravar pulseiras NFC

### 📊 Dashboard Web
- Tela de Login
- Visualização de métricas dos visistantes

### 📍 Sistema de Checkpoints

#### Registro de Checkpoints
- Controlador marca checkpoint apenas no seu pavilhão designado
- Validação automática se visitante está na rota correta
- Histórico completo de checkpoints por visitante
- Timestamp preciso de cada passagem

#### Validações de Segurança
- Visitante deve estar na ordem correta da rota
- Bloqueio de checkpoints fora de sequência
- Impossibilidade de burlar o sistema (mesmo por agentes)
- Registro do agente que marcou o checkpoint

### 💳 Gestão de Pulseiras NFC

#### Informações Vinculadas à Pulseira
- Dados completos do visitante
- Rota atribuída e pavilhões a percorrer
- Checkpoints realizados (apenas os corretos)
- Status da visita (atrasada, em andamento, etc.)
- Localização de cadastro
- Permitir/Bloquear desvios da rota

#### Operações NFC
- Leitura de pulseira
- Gravação de dados na pulseira
- Atualização de checkpoints em tempo real
- Validação de autenticidade

### 📈 Painel Administrativo

Dashboard completo com:
- **Gráfico de Visitantes**: Últimos 7 dias
- **Gráfico de Checkpoints por Pavilhão**: Últimos 7 dias (por agente)
- **Estatísticas gerais**: Total de visitantes, visitas ativas, pendências
- **Alertas de segurança**: Visitantes fora de rota, visitas atrasadas
- **Relatórios**: Exportação de dados e históricos

## 🗄️ Banco de Dados - Supabase

O S-Pulse utiliza o **Supabase** como banco de dados, garantindo escalabilidade, segurança e sincronização em tempo real.

### Esquema das Tabelas

#### Tabela: `usersSpulse`
Armazena administradores e controladores do sistema.

```sql
usersSpulse
├── id (BIGINT, PK, AUTO INCREMENT)
├── name (VARCHAR)
├── email (VARCHAR)
├── senha (VARCHAR) - Senha criptografada
├── cpf (VARCHAR)
├── image_url (VARCHAR)
├── admin (BOOLEAN) - true = Admin, false = Controlador
```

**Características:**
- Campo `admin` define a role do usuário
- Admins têm acesso total ao sistema
- Controladores têm acesso limitado por pavilhão

---

#### Tabela: `pavilions`
Define os pavilhões da unidade prisional.

```sql
pavilions
├── id (BIGINT, PK, AUTO INCREMENT)
├── name (VARCHAR, DEFAULT '')
├── latitude (DOUBLE PRECISION)
├── longitude (DOUBLE PRECISION)
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
```

**Características:**
- Coordenadas geográficas para localização
- Utilizado para controle de checkpoints
- Referenciado em rotas e agendamentos

---

#### Tabela: `visitors`
Cadastro completo dos visitantes.

```sql
visitors
├── id (BIGINT, PK, AUTO INCREMENT)
├── name (VARCHAR)
├── gender (VARCHAR)
├── age (VARCHAR)
├── cpf (VARCHAR)
├── rg (VARCHAR)
├── telefone (VARCHAR)
├── image_url (VARCHAR)
├── latitude (DOUBLE PRECISION) - Local do cadastro
├── longitude (DOUBLE PRECISION) - Local do cadastro
├── registered_by (VARCHAR) - Nome do agente
├── user_id (BIGINT, FK) - Agente que cadastrou
├── userEdit_id (BIGINT, FK) - Último agente que editou
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())

FOREIGN KEYS:
├── user_id → usersSpulse(id)
└── userEdit_id → usersSpulse(id)
```

**Características:**
- Armazena dados completos do visitante
- Coordenadas do local de cadastro
- Histórico de cadastro e edição por agentes
- Vinculado a pulseiras NFC

---

#### Tabela: `visit_routes`
Rotas predefinidas que visitantes devem percorrer.

```sql
visit_routes
├── id (BIGINT, PK, AUTO INCREMENT)
├── visitor_id (BIGINT, FK, NULLABLE)
├── name_route (VARCHAR)
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())

FOREIGN KEYS:
└── visitor_id → visitors(id)
```

**Características:**
- Define rotas para visitantes
- Pode ser reutilizada para múltiplos visitantes
- Contém sequência de pavilhões

---

#### Tabela: `route_checkpoints`
Sequência de pavilhões em cada rota (checkpoints obrigatórios).

```sql
route_checkpoints
├── id (BIGINT, PK, AUTO INCREMENT)
├── route_id (BIGINT, FK)
├── pavilion (VARCHAR)
├── pavilion_id (BIGINT, FK)
├── order_number (BIGINT) - Ordem na sequência
├── allow_override (BOOLEAN) - Permite desvios
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())

FOREIGN KEYS:
├── route_id → visit_routes(id)
└── pavilion_id → pavilions(id)
```

**Características:**
- Define a ordem exata dos pavilhões na rota
- `order_number` determina a sequência obrigatória
- `allow_override` permite exceções na rota
- Validação automática de checkpoints

---

#### Tabela: `visitor_agendamento`
Agendamentos de visitas dos visitantes.

```sql
visitor_agendamento
├── id (BIGINT, PK, AUTO INCREMENT)
├── visitor_id (BIGINT, FK)
├── route_id (BIGINT, FK)
├── scheduled_date (DATE)
├── scheduled_time (TIMESTAMP WITH TIME ZONE)
├── expected_duration (TEXT) - Duração estimada
├── motivo_da_visita (TEXT)
├── notes (TEXT) - Observações
├── status (VARCHAR) - 'pendente', 'confirmada', 'em_andamento', 'concluida', 'cancelada'
├── created_by (BIGINT, FK) - Agente que criou
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
├── updated_at (TIMESTAMP WITH TIME ZONE)

FOREIGN KEYS:
├── visitor_id → visitors(id)
├── route_id → visit_routes(id)
└── created_by → usersSpulse(id)
```

**Status Possíveis:**
- `pendente`: Aguardando início
- `confirmada`: Visita confirmada
- `em_andamento`: Visita em curso
- `concluida`: Visita finalizada
- `cancelada`: Visita cancelada

**Características:**
- Controle completo de agendamentos
- Histórico de quem criou/modificou
- Vinculação com rota específica
- Alertas automáticos de visitas atrasadas

---

#### Tabela: `scheduled_checkpoints`
Checkpoints planejados para cada agendamento.

```sql
scheduled_checkpoints
├── id (BIGINT, PK, AUTO INCREMENT)
├── visit_schedule_id (BIGINT, FK)
├── pavilion (VARCHAR)
├── tempo_estimado (TIME WITH TIME ZONE)
├── order_number (BIGINT)
├── notes (TEXT)
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())

FOREIGN KEYS:
└── visit_schedule_id → visitor_agendamento(id)
```

**Características:**
- Planejamento de tempo por pavilhão
- Ordem de visitação esperada
- Tempo estimado de permanência
- Referência ao agendamento

---

#### Tabela: `agent_checkpoints`
Registro de plantões dos controladores por pavilhão.

```sql
agent_checkpoints
├── id (BIGINT, PK, AUTO INCREMENT)
├── user_id (BIGINT, FK)
├── user_email (VARCHAR)
├── pavilion_id (BIGINT, FK)
├── date (DATE)
├── hours (TIME WITHOUT TIME ZONE)
├── latitude (DOUBLE PRECISION)
├── longitude (DOUBLE PRECISION)
├── active (BOOLEAN)
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())

FOREIGN KEYS:
├── user_id → usersSpulse(id)
└── pavilion_id → pavilions(id)

CONSTRAINTS:
└── UNIQUE (user_id, pavilion_id, date)
```

**Características:**
- Um controlador por pavilhão por dia
- Registro de localização do plantão
- Constraint única evita duplicação

---

#### Tabela: `visitor_checkpoints`
Registro de passagem dos visitantes pelos pavilhões.

```sql
visitor_checkpoints
├── id (BIGINT, PK, AUTO INCREMENT)
├── visitor_id (BIGINT, FK)
├── pavilion (VARCHAR)
├── pavilion_id (BIGINT, FK)
├── registered_by (BIGINT, FK) - Controlador que registrou
├── timestamp (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
├── checkpoint_status (VARCHAR)
├── notes (TEXT)
├── created_at (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())

FOREIGN KEYS:
├── visitor_id → visitors(id)
├── pavilion_id → pavilions(id)
└── registered_by → usersSpulse(id)
```

**Características:**
- Registro imediato de passagem
- Validação automática com rota esperada
- Apenas controlador do pavilhão pode registrar
- Timestamp preciso de cada checkpoint
- Histórico completo de movimentação

---

### Diagrama de Relacionamentos

![Diagrama UML](C:\Users\Windows\Documents\Spulse\images\supabase-schema-vokjwwivvluuqsesodyi.svg)

### Triggers e functions

**1.trigger_atualizar_status_visita:**

```
BEGIN
  -- Aguardar um pequeno intervalo para garantir que o checkpoint foi commitado
  PERFORM pg_sleep(0.1);
  
  -- Chamar a função de atualização de status
  PERFORM atualizar_status_visitas();
  
  RETURN NEW;
END;

```
**2.atualizar_visitas_em_andamento:**

```
DECLARE
    visitas_afetadas INTEGER;
BEGIN
    UPDATE visitor_agendamento 
    SET status = 'em_andamento',
        updated_at = NOW()
    WHERE status = 'confirmada'
    AND scheduled_time <= NOW()
    AND scheduled_time >= (NOW() - INTERVAL '1 day')
    AND status NOT IN ('cancelada', 'concluída', 'pendente');
    
    GET DIAGNOSTICS visitas_afetadas = ROW_COUNT;
    
    RETURN visitas_afetadas;
END;

```

**3.atualizar_status_visitas:**

```
BEGIN
  -- Primeiro, atualizar para 'concluída' as visitas onde TODOS os checkpoints foram marcados como 'check'
  UPDATE visitor_agendamento 
  SET status = 'concluída', 
      updated_at = NOW()
  WHERE status IN ('em_andamento', 'confirmada')
    AND id IN (
      SELECT va.id
      FROM visitor_agendamento va
      JOIN scheduled_checkpoints sc ON va.id = sc.visit_schedule_id
      LEFT JOIN visitor_checkpoints vc ON va.visitor_id = vc.visitor_id 
        AND (sc.pavilion = vc.pavilion_id::text OR sc.pavilion = vc.pavilion)
        AND vc.timestamp >= va.scheduled_date::timestamp
        AND vc.checkpoint_status = 'check'  -- Apenas checkpoints com status 'check'
      WHERE va.status IN ('em_andamento', 'confirmada')
      GROUP BY va.id
      HAVING 
        COUNT(DISTINCT sc.pavilion) = 
        COUNT(DISTINCT CASE WHEN vc.id IS NOT NULL THEN sc.pavilion END)
    );

  -- Depois, atualizar para 'em_andamento' as visitas onde ALGUNS checkpoints foram marcados como 'check'
  UPDATE visitor_agendamento 
  SET status = 'em_andamento', 
      updated_at = NOW()
  WHERE status = 'confirmada'
    AND id IN (
      SELECT va.id
      FROM visitor_agendamento va
      JOIN scheduled_checkpoints sc ON va.id = sc.visit_schedule_id
      LEFT JOIN visitor_checkpoints vc ON va.visitor_id = vc.visitor_id 
        AND (sc.pavilion = vc.pavilion_id::text OR sc.pavilion = vc.pavilion)
        AND vc.timestamp >= va.scheduled_date::timestamp
        AND vc.checkpoint_status = 'check'  -- Apenas checkpoints com status 'check'
      WHERE va.status = 'confirmada'
      GROUP BY va.id
      HAVING 
        COUNT(DISTINCT CASE WHEN vc.id IS NOT NULL THEN sc.pavilion END) > 0
        AND 
        COUNT(DISTINCT sc.pavilion) > 
        COUNT(DISTINCT CASE WHEN vc.id IS NOT NULL THEN sc.pavilion END)
    );
END;

```

### Fluxo de Dados

**1. Cadastro de Visitante:**
```
usersSpulse (agente) → visitors (cadastro) → visit_routes (rota atribuída)
```

**2. Agendamento:**
```
visitors → visitor_agendamento → scheduled_checkpoints (checkpoints planejados)
```

**3. Plantão do Agente:**
```
usersSpulse (controlador) → agent_checkpoints → pavilions (plantão diário)
```

**4. Registro de Checkpoint:**
```
visitor_checkpoints ← usersSpulse (controlador registra)
     ↓
route_checkpoints (valida se está na rota correta)
     ↓
visitor_agendamento (atualiza progresso)
```


## 🚀 Começando

### Pré-requisitos

- Node.js 16+
- React Native CLI
- Android Studio (para Android)
- Xcode (para iOS)
- Conta no Supabase
- Dispositivos/leitores NFC para teste

### Instalação

**1. Clone o repositório**

```bash
git clone https://github.com/Titan-Dev-RN/spulse/tree/master
cd s-pulse
```

**2. Instale as dependências**

```bash
# usando npm
npm install

# OU usando Yarn
yarn install
```

**3. Instale dependências específicas**

```bash
# NFC
npm install react-native-nfc-manager

# Supabase
npm install @supabase/supabase-js

# Navegação
npm install @react-navigation/native @react-navigation/native-stack
```

**4. Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica
NFC_TIMEOUT=30000
MAX_RETRY_ATTEMPTS=3
```

## 🎯 Configuração

### Configuração do Ambiente NFC

#### Para Android

Adicione no `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

#### Para iOS

Adicione no `ios/SPulse/Info.plist`:

```xml
<key>NFCReaderUsageDescription</key>
<string>Este aplicativo precisa de acesso ao NFC para controle de visitantes</string>
<key>com.apple.developer.nfc.readersession.formats</key>
<array>
    <string>NDEF</string>
    <string>TAG</string>
</array>
```

### Configuração do Supabase

**1. Inicializar cliente**

```javascript
// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**2. Configurar autenticação**

```javascript
// src/services/auth.js
import { supabase } from '../config/supabase';

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};
```

## 🏃‍♂️ Executando a Aplicação

### Passo 1: Inicie o Servidor Metro

```bash
npm start
```

### Passo 2: Execute no Dispositivo/Emulador

#### Android

```bash
npm run android
```

#### iOS

```bash
npm run ios
```

## 🔧 Exemplos de Uso

### Cadastrar Visitante

```javascript
import { supabase } from '../config/supabase';

const cadastrarVisitante = async (dados, usuarioId) => {
  const { data, error } = await supabase
    .from('visitantes')
    .insert({
      nome: dados.nome,
      cpf: dados.cpf,
      rg: dados.rg,
      genero: dados.genero,
      idade: dados.idade,
      telefone: dados.telefone,
      foto_url: dados.fotoUrl,
      local_cadastro: dados.localCadastro,
      cadastrado_por: usuarioId,
      ativo: true
    })
    .select()
    .single();
    
  return { data, error };
};
```

### Vincular Pulseira NFC

```javascript
import NfcManager from 'react-native-nfc-manager';

const vincularPulseira = async (visitanteId) => {
  try {
    await NfcManager.start();
    const tag = await NfcManager.getTag();
    
    // Gravar dados na pulseira
    await NfcManager.writeNdefMessage([
      { type: 'text/plain', payload: JSON.stringify({ visitanteId }) }
    ]);
    
    // Atualizar no banco
    await supabase
      .from('visitantes')
      .update({ nfc_tag_id: tag.id })
      .eq('id', visitanteId);
      
    return { success: true, tagId: tag.id };
  } catch (error) {
    console.error('Erro ao vincular pulseira:', error);
    return { success: false, error };
  }
};
```

### Registrar Checkpoint

```javascript
const registrarCheckpoint = async (visitanteId, agendamentoId, pavilhaoId, usuarioId) => {
  // 1. Verificar se visitante está na rota correta
  const { data: agendamento } = await supabase
    .from('agendamentos')
    .select('*, rotas_pavilhoes(*)')
    .eq('id', agendamentoId)
    .single();
    
  // 2. Verificar ordem do pavilhão na rota
  const proximoPavilhao = agendamento.rotas_pavilhoes
    .sort((a, b) => a.ordem - b.ordem)
    .find(rp => !rp.checkpointRealizado);
    
  const dentroRota = proximoPavilhao?.pavilhao_id === pavilhaoId;
  
  // 3. Se não está na rota e não permite desvios, bloquear
  if (!dentroRota && !agendamento.permite_desvios) {
    return { 
      success: false, 
      error: 'Visitante fora da rota. Checkpoint bloqueado.' 
    };
  }
  
  // 4. Registrar checkpoint
  const { data, error } = await supabase
    .from('checkpoints_visitantes')
    .insert({
      visitante_id: visitanteId,
      agendamento_id: agendamentoId,
      pavilhao_id: pavilhaoId,
      registrado_por: usuarioId,
      timestamp: new Date().toISOString(),
      ordem_na_rota: proximoPavilhao?.ordem,
      dentro_da_rota: dentroRota
    })
    .select()
    .single();
    
  return { success: !error, data, error };
};
```

### Criar Rota com Checkpoints

```javascript
const criarRota = async (nomeRota, descricao, pavilhoes) => {
  // 1. Criar rota
  const { data: rota, error: erroRota } = await supabase
    .from('rotas')
    .insert({
      nome: nomeRota,
      descricao,
      ativa: true
    })
    .select()
    .single();
    
  if (erroRota) return { success: false, error: erroRota };
  
  // 2. Adicionar pavilhões na ordem
  const rotaPavilhoes = pavilhoes.map((p, index) => ({
    rota_id: rota.id,
    pavilhao_id: p.id,
    ordem: index + 1,
    obrigatorio: p.obrigatorio
  }));
  
  const { error: erroPavilhoes } = await supabase
    .from('rotas_pavilhoes')
    .insert(rotaPavilhoes);
    
  return { 
    success: !erroPavilhoes, 
    data: rota, 
    error: erroPavilhoes 
  };
};
```

### Agendar Visita

```javascript
const agendarVisita = async (dadosAgendamento) => {
  const { data, error } = await supabase
    .from('agendamentos')
    .insert({
      visitante_id: dadosAgendamento.visitanteId,
      rota_id: dadosAgendamento.rotaId,
      data_agendada: dadosAgendamento.data,
      horario_inicio: dadosAgendamento.horario,
      duracao_estimada: dadosAgendamento.duracao,
      motivo_visita: dadosAgendamento.motivo,
      observacoes: dadosAgendamento.observacoes,
      status: 'pendente',
      permite_desvios: dadosAgendamento.permiteDesvios || false
    })
    .select()
    .single();
    
  return { data, error };
};
```

### Verificar Visitas Atrasadas

```javascript
const verificarVisitasAtrasadas = async () => {
  const agora = new Date();
  
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, visitantes(*)')
    .eq('status', 'pendente')
    .lt('horario_inicio', agora.toISOString())
    .order('horario_inicio', { ascending: true });
    
  return { data, error };
};
```

## 📊 Status de Visitas

O sistema trabalha com os seguintes status:

```javascript
const statusOptions = [
  { 
    value: 'pendente', 
    label: 'Pendente', 
    color: '#F59E0B', 
    icon: 'time' 
  },
  { 
    value: 'confirmada', 
    label: 'Confirmada', 
    color: '#10B981', 
    icon: 'checkmark-circle' 
  },
  { 
    value: 'em_andamento', 
    label: 'Em Andamento', 
    color: '#8B5CF6', 
    icon: 'walk' 
  },
  { 
    value: 'concluida', 
    label: 'Concluída', 
    color: '#3B82F6', 
    icon: 'checkmark-done-circle' 
  },
  { 
    value: 'cancelada', 
    label: 'Cancelada', 
    color: '#EF4444', 
    icon: 'close-circle' 
  }
];
```

## 🐛 Solução de Problemas

### Problemas Comuns

**1. Erro de conexão com Supabase**

```bash
# Verifique as variáveis de ambiente
cat .env

# Teste a conexão
curl https://seu-projeto.supabase.co/rest/v1/
```

**2. NFC não detectado**
- Verifique se o dispositivo possui hardware NFC
- Confirme que o NFC está ativado
- Valide as permissões no manifest

**3. Checkpoint bloqueado indevidamente**
- Verifique se a rota está corretamente configurada
- Confirme a ordem dos pavilhões
- Valide se `permite_desvios` está configurado corretamente

**4. Visitas não aparecem como atrasadas**
- Verifique o fuso horário do servidor
- Confirme que o status está como 'pendente'
- Valide a query de filtro por horário

## 📚 Documentação Adicional

- [Documentação React Native](https://reactnative.dev/docs/getting-started)
- [React Native NFC Manager](https://github.com/revtel/react-native-nfc-manager)
- [Supabase Documentation](https://supabase.com/docs)
- [Manual do Usuário](./docs/USER_MANUAL.md)

## 🔒 Segurança

Este sistema lida com dados sensíveis. Por favor:
- ✅ Não compartilhe credenciais em commits
- ✅ Use variáveis de ambiente para informações sensíveis
- ✅ Ative RLS (Row Level Security) no Supabase
- ✅ Implemente autenticação forte
- ✅ Faça backup regular dos dados
- ✅ Reporte vulnerabilidades de forma responsável
- ✅ Siga as diretrizes de segurança da instituição

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Email**: leoctescossia11@gmail.com
- **Documentação**: [Wiki do Projeto](https://docs.google.com/document/d/1t5GoDoCOwiY_LvXCgCeJNx3ltKpH0Khn_EcNpMa1_Ok/edit?usp=sharing)
- **Manual do Usuário**: [Manual do Projeto](https://docs.google.com/document/d/1jJ32iwPQ3DdhyCCJUfYPUxQP9E3e0HNW76FNEUswouM/edit?usp=sharing)

## 🏆 Caso de Uso: Presídio de Alcaçuz/RN

O S-Pulse foi desenvolvido com base no funcionamento real das visitas no Presídio de Alcaçuz, no Rio Grande do Norte, considerando:

- ✅ Múltiplos pavilhões com fluxo controlado
- ✅ Necessidade de rotas obrigatórias para segurança
- ✅ Controle rigoroso de entrada e saída
- ✅ Rastreamento preciso de visitantes
- ✅ Gestão de múltiplos agentes e turnos
- ✅ Prevenção de desvios não autorizados

O sistema pode ser adaptado para outras unidades prisionais brasileiras, mantendo a conformidade com as normas de segurança prisional.

---

**S-Pulse** - Tecnologia e segurança para o sistema prisional brasileiro. 🔒
