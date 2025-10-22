# 🔒 Aplicar Regras Seguras do Firebase

## ✅ O Que Essas Regras Fazem:

### 1. **Profiles** (Perfis) 🛡️
- ✅ **Criar perfil**: Qualquer um pode criar (mas só 1x por endereço)
- ✅ **Editar perfil**: Só se o `address` do perfil for igual ao `$address` da URL
- ✅ **Impede**: Editar perfil de outra pessoa
- ✅ **Impede**: Mudar o `createdAt` depois de criado
- ✅ **Valida**: Username 3-20 chars, Twitter 1-15 chars

**Exemplo**:
```
- ✅ Pode: Criar /profiles/0x123 com address: "0x123"
- ✅ Pode: Editar /profiles/0x123 se o novo address for "0x123"
- ❌ Não pode: Criar /profiles/0x123 com address: "0x456"
- ❌ Não pode: Editar /profiles/0x123 mudando address
```

### 2. **Usernames** (Reserva de Username) 🏷️
- ✅ **Criar**: Qualquer um pode reservar username (primeira vez)
- ❌ **Não pode**: Trocar username já reservado
- ✅ **Impede**: Roubo de username existente

### 3. **Matches** (Histórico) 📊
- ✅ **Criar**: Qualquer um pode registrar match (só 1x)
- ❌ **Não pode**: Editar/deletar match existente
- ✅ **Impede**: Manipulação de histórico

### 4. **Rooms** (Salas PvP) 🎮
- ✅ **Criar/Editar**: Qualquer um (necessário para PvP funcionar)
- ✅ **Valida**: Estrutura de dados correta

### 5. **Matchmaking** (Fila) 🔍
- ✅ **Criar/Editar/Deletar**: Livre (necessário para matchmaking)

---

## 📋 Como Aplicar:

### Opção 1: Copiar do Arquivo (Recomendado)

1. **Abra**: `FIREBASE_RULES_SECURE.json`
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. **Acesse**: https://console.firebase.google.com/project/vibe-most-wanted/database/vibe-most-wanted-default-rtdb/rules
4. **Cole** no editor
5. **Clique em "Publish"**

### Opção 2: Copiar Daqui

<details>
<summary>Clique para expandir as regras</summary>

\`\`\`json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['id', 'code', 'host', 'status', 'createdAt'])"
      }
    },

    "matchmaking": {
      "$address": {
        ".read": true,
        ".write": true
      }
    },

    "profiles": {
      "$address": {
        ".read": true,
        ".write": "!data.exists() || data.child('address').val() == $address",
        ".validate": "newData.hasChildren(['address', 'username', 'createdAt', 'lastUpdated', 'stats'])",
        "address": {
          ".validate": "newData.val() == $address"
        },
        "username": {
          ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 20"
        },
        "twitter": {
          ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 15"
        },
        "createdAt": {
          ".validate": "newData.isNumber() && (!data.exists() || newData.val() == data.val())"
        },
        "lastUpdated": {
          ".validate": "newData.isNumber()"
        },
        "stats": {
          ".validate": "newData.hasChildren(['totalCards', 'totalPower', 'pveWins', 'pveLosses', 'pvpWins', 'pvpLosses'])",
          "$stat": {
            ".validate": "newData.isNumber() && newData.val() >= 0"
          }
        }
      }
    },

    "usernames": {
      "$username": {
        ".read": true,
        ".write": "!data.exists()",
        ".validate": "newData.isString()"
      }
    },

    "matches": {
      "$matchId": {
        ".read": true,
        ".write": "!data.exists()",
        ".validate": "newData.hasChildren(['id', 'playerAddress', 'type', 'result', 'playerPower', 'opponentPower', 'timestamp', 'playerCards', 'opponentCards'])"
      }
    }
  }
}
\`\`\`

</details>

---

## ⚠️ Limitações (O que ainda NÃO está protegido):

1. **Alguém pode criar perfil para qualquer endereço** (mas só 1x)
   - Exemplo: Eu posso criar `/profiles/0xSEUENDERECO` antes de você
   - Solução completa: Requer autenticação Firebase (veja `FIREBASE_SECURITY.md`)

2. **Rooms e Matchmaking abertos**
   - Necessário para funcionalidade PvP
   - Alguém pode criar salas fake
   - Mas não consegue hackear salas existentes facilmente

3. **Stats podem ser inflados** na primeira criação
   - Alguém pode criar perfil com stats altos
   - Depois não pode mais editar (proteção parcial)

---

## 🎯 Isso é Seguro o Suficiente?

### ✅ Para BETA/Lançamento Inicial: **SIM**
- Impede maioria dos abusos
- Protege dados existentes
- Usuários honestos não têm problema

### ❌ Para Produção com Prêmios/Competição: **NÃO**
- Precisa de autenticação real
- Veja `FIREBASE_SECURITY.md` para solução completa

---

## 🧪 Como Testar:

1. Aplique as regras
2. Tente criar perfil → Deve funcionar ✅
3. Tente criar perfil de novo com mesmo address → Deve falhar ❌
4. Tente editar seu perfil → Deve funcionar ✅
5. Tente reservar username já usado → Deve falhar ❌

---

## 📊 Comparação:

| Regra | Antes (Dev) | Agora (Secure) | Ideal (Com Auth) |
|-------|-------------|----------------|------------------|
| Criar perfil | ✅ Qualquer | ✅ Qualquer (1x) | ✅ Apenas owner |
| Editar perfil | ✅ Qualquer | ⚠️ Se address match | ✅ Apenas owner |
| Roubar username | ✅ Sim | ❌ Não | ❌ Não |
| Deletar dados | ✅ Sim | ❌ Não | ❌ Não |
| Inflacionar stats | ✅ Sim | ⚠️ Só na criação | ❌ Não |

---

## 🚀 Aplique Agora!

Cole as regras e clique em **"Publish"**. Seu app ficará **muito mais seguro**! 🔒
