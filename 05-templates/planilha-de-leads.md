# Template — Planilha de leads e qualificação

> Estrutura proposta. **Não confirmada com o time nem com os corretores** — validar antes de implementar.
> Princípio de design: quanto menos campos, maior a chance de o corretor preencher. O preenchimento é o elo mais frágil do sistema.

## Campos sugeridos

| Campo | Tipo | Preenchido por | Obrigatório |
|---|---|---|---|
| `data_entrada` | Data | Automático | Sim |
| `nome_lead` | Texto | Automático (formulário) | Sim |
| `telefone` | Texto | Automático | Sim |
| `campanha_origem` | Texto | Automático | Sim |
| `empreendimento` | Texto | Automático | Sim |
| `corretor_responsavel` | Lista | Automático | Sim |
| `respondeu` | Sim/Não | Corretor | Sim |
| `qualificado` | Sim/Não | **Corretor** | **Sim — campo crítico** |
| `motivo_desqualificacao` | Lista | Corretor | Se não qualificado |
| `agendou_visita` | Sim/Não | Corretor | Não |
| `status` | Lista | Corretor | Não |
| `observacoes` | Texto livre | Corretor | Não |

## Listas sugeridas

**`motivo_desqualificacao`:**
- Sem poder de compra
- Fora do perfil de ticket
- Buscava aluguel
- Fora da região de atuação
- Não respondeu / contato inválido
- Curioso / sem intenção real
- Outro

**`status`:**
- Novo
- Em contato
- Visita agendada
- Visita realizada
- Em negociação
- Fechado
- Perdido

## Definição de "lead qualificado" — ⚠️ PENDENTE

Este é o campo mais importante da planilha e **a definição ainda não foi fechada com o Carlos**.

Opções levantadas no histórico:
- Preencheu formulário **e** respondeu no WhatsApp em até 24h?
- Agendou visita?
- Tem poder de compra compatível com R$ 1M+ (verificado na conversa)?

**Ação:** fechar essa definição com o Carlos antes da primeira campanha. Sem isso, o dado que volta pro Meta via Stape não significa nada consistente.

## Requisitos práticos

- **Mobile-friendly** — o corretor preenche do celular, entre atendimentos
- **Poucos cliques** — listas suspensas em vez de texto livre sempre que possível
- **Um lead por linha**, sem abas separadas por corretor (dificulta a consolidação)
- Formato compatível com a integração do **Stape** para devolução ao Meta

## Uso do dado

```
Planilha preenchida
    → consolidação semanal
    → envio ao Meta via Stape (Conversions Offline)
    → algoritmo reotimiza para o perfil que realmente qualifica
    → insumo dos relatórios semanais e das reuniões mensais com corretores
```
