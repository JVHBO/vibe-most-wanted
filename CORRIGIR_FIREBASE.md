# 🔧 Como Corrigir "Permissão Negada" no Firebase

## ❌ Problema

Ao tentar criar perfil, você recebe: **"Permission Denied"** (Permissão Negada)

## ✅ Solução Rápida (Desenvolvimento)

### Passo 1: Abra o Firebase Console
1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá em **Realtime Database**
4. Clique na aba **"Rules"**

### Passo 2: Cole estas regras SIMPLES

**Copie o conteúdo do arquivo `FIREBASE_RULES_DEV.json`** e cole lá:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true
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
        ".write": true
      }
    },

    "usernames": {
      "$username": {
        ".read": true,
        ".write": true
      }
    },

    "matches": {
      "$matchId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Passo 3: Publique
- Clique em **"Publish"** (Publicar)

### Passo 4: Teste
- Volte para http://localhost:3003
- Conecte sua wallet
- Clique em "Criar Perfil"
- Digite um username
- Clique em "Salvar"

## ✅ Deve Funcionar Agora!

---

## 🔐 Por que as regras anteriores não funcionaram?

As regras em `FIREBASE_RULES_BASIC.json` tinham:

```json
".write": "newData.child('address').val() === $address"
```

Isso tenta validar se o address corresponde, mas **sem autenticação Firebase**, o Firebase não consegue verificar.

---

## ⚠️ IMPORTANTE - Segurança

Essas regras (`FIREBASE_RULES_DEV.json`) deixam **TUDO ABERTO**.

**Use APENAS para desenvolvimento/teste local!**

Para produção, você precisará implementar autenticação conforme `FIREBASE_SECURITY.md`.

---

## 📁 Arquivos de Regras:

1. **`FIREBASE_RULES_DEV.json`** ← **USE AGORA** (desenvolvimento)
2. **`FIREBASE_RULES_BASIC.json`** - Com validação (não funciona sem auth)
3. **`FIREBASE_RULES.json`** - Completo (requer Firebase Auth)
