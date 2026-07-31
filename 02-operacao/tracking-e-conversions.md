# Tracking e Conversions Offline

> Este é o pilar técnico que diferencia o trabalho da Case do que a agência da matriz faz. Sem ele, o algoritmo otimiza para volume, não para perfil de comprador de R$ 1M+.

## O problema que resolve

Imóvel de alto padrão tem ciclo de venda de **6 a 18 meses**. O Meta não sabe, sozinho, se o lead que ele entregou era um comprador real ou alguém sem poder de compra. Sem essa informação de volta, o algoritmo fica **cego** e continua entregando o perfil errado — que é exatamente o problema atual (10–15% de qualificação).

## O loop

```
1. Lead clica no anúncio
        ↓
2. Vai para o WhatsApp do corretor específico
        ↓
3. Corretor conversa e QUALIFICA o lead
        ↓
4. Corretor preenche a PLANILHA (qualificado? sim/não)
        ↓
5. Planilha retorna o dado ao Meta via STAPE
        ↓
6. Algoritmo aprende qual perfil realmente qualifica
        ↓
7. Entrega melhora → volta ao passo 1
```

## Componentes

| Componente | Função | Responsável |
|---|---|---|
| **Gerenciador de anúncios** | Operação das campanhas | Manuel (Case) — acesso via Carlos |
| **Stape** | API de conversão, devolve o dado de qualificação ao Meta | Vitor França (Case) |
| **Planilha de leads** | Registro e qualificação feita pelo corretor | Case cria, corretores alimentam |

## O elo mais frágil: o preenchimento da planilha

**Só o corretor sabe se o lead é qualificado.** Se ele não preencher, todo o resto do sistema para de funcionar.

Mitigações previstas:
- Cobrança ativa da Case
- Reuniões mensais com os 4 corretores (20–30 min cada) para colher feedback
- Tornar o preenchimento o mais simples possível (poucos campos, mobile-friendly)

> Este é o risco operacional #1 do projeto. Vale monitorar semanalmente nas primeiras semanas.

## Argumento para o cliente

> "Vocês vão nos dizer na planilha se o lead é qualificado ou não, e a gente usa isso para ensinar o algoritmo. Sem o feedback de vocês, a gente fica cego. A matriz não faz isso."

## Pendências técnicas

- [ ] Confirmar setup do Stape concluído
- [ ] Confirmar acesso ao gerenciador de anúncios
- [ ] Validar planilha com os corretores antes da 1ª campanha
- [ ] Testar o fluxo ponta a ponta na primeira campanha
- [ ] Fechar a definição operacional de "lead qualificado" (ver pendência B3)
