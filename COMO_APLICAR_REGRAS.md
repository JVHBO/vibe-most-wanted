# Como Aplicar as Regras do Firebase

## Passo a Passo

1. **Abra o arquivo**: `FIREBASE_RULES_BASIC.json`

2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)

3. **Acesse o Firebase Console**:
   - https://console.firebase.google.com/
   - Selecione seu projeto

4. **Vá em Realtime Database**:
   - Menu lateral → Realtime Database
   - Clique na aba **"Rules"** (Regras)

5. **Cole as regras**:
   - Delete tudo que está lá
   - Cole o conteúdo copiado (Ctrl+V)
   - Clique em **"Publish"** (Publicar)

## ✅ Pronto!

As regras estão aplicadas com:
- ✅ Validação de estrutura de dados
- ✅ Validação de tipos (string, number, boolean)
- ✅ Validação de tamanhos (username 3-20 chars, twitter 1-15 chars)
- ✅ Validação de valores (status, type, result)
- ✅ Proteção básica: profiles só podem ser escritos se `address` corresponder ao `$address`

## ⚠️ Limitações

Essas regras têm validação mas ainda permitem:
- ❌ Qualquer usuário pode criar/modificar rooms
- ❌ Qualquer usuário pode criar/modificar matches
- ❌ Não valida signatures de wallet

Para segurança completa em produção, siga o guia em `FIREBASE_SECURITY.md`.

## 🧪 Testando

Depois de aplicar, teste criando um perfil no app:
1. Conecte wallet
2. Crie perfil
3. Se funcionar = regras OK ✅
4. Se der erro = verifique o console do Firebase para ver qual validação falhou
