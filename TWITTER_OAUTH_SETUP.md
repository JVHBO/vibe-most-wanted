# Twitter OAuth Setup Instructions

## Passo 1: Criar Twitter Developer Account

1. Acesse: https://developer.twitter.com/en/portal/petition/essential/basic-info
2. Faça login com sua conta do Twitter/X
3. Preencha o formulário de Developer Account
4. Aceite os termos

## Passo 2: Criar um App no Twitter Developer Portal

1. Acesse: https://developer.twitter.com/en/portal/dashboard
2. Clique em "Create Project" ou "Create App"
3. Dê um nome ao projeto (ex: "Vibe Most Wanted")
4. Selecione o Use Case apropriado
5. Dê uma descrição do app

## Passo 3: Configurar OAuth 2.0

1. No seu App, vá em "Settings" → "User authentication settings"
2. Clique em "Set up"
3. Configure:
   - **App permissions**: Read
   - **Type of App**: Web App
   - **Callback URI / Redirect URL**:
     ```
     https://vibe-most-wanted.vercel.app/api/auth/twitter/callback
     ```
     (Para desenvolvimento local, adicione também):
     ```
     http://localhost:3000/api/auth/twitter/callback
     ```
   - **Website URL**: https://vibe-most-wanted.vercel.app

4. Salve as configurações

## Passo 4: Copiar Credenciais

1. Após salvar, você verá:
   - **Client ID** (começa com algo como: `VGhpc0lzQW5FeGFtcGxl...`)
   - **Client Secret** (clique em "Regenerate" se necessário)

2. Copie esses valores

## Passo 5: Adicionar ao Vercel

1. Acesse: https://vercel.com/jvhbos-projects/vibe-most-wanted/settings/environment-variables
2. Adicione as variáveis:
   - `TWITTER_CLIENT_ID` = [seu Client ID]
   - `TWITTER_CLIENT_SECRET` = [seu Client Secret]
   - `NEXT_PUBLIC_APP_URL` = `https://vibe-most-wanted.vercel.app`

3. Salve e faça redeploy

## Passo 6: Testar

1. Após o deploy, vá em Settings no app
2. Clique em "Connect Twitter"
3. Você será redirecionado para o Twitter
4. Autorize o app
5. Será redirecionado de volta com seu Twitter conectado!

## Troubleshooting

Se der erro:
- Verifique se a Callback URL está exatamente como acima
- Verifique se as credenciais estão corretas no Vercel
- Verifique os logs no Vercel para ver mensagens de erro específicas
