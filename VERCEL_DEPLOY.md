# Deploy para Vercel

Este projeto é um aplicativo Vite + React configurado para deploy no Vercel.

## Passos para Deploy

### 1. Preparar o Projeto Localmente

```bash
# Instalar dependências
npm install

# Testar o build localmente
npm run build

# Visualizar a prévia
npm run preview
```

### 2. Variáveis de Ambiente

O Vercel utiliza automaticamente as variáveis de ambiente configuradas. Você precisa adicionar a variável `GEMINI_API_KEY` no painel do Vercel:

1. Acesse [vercel.com](https://vercel.com)
2. Vá para o seu projeto
3. Clique em **Settings** → **Environment Variables**
4. Adicione a variável:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** sua chave de API do Google Gemini

### 3. Deploy com Git

**Opção A: Via GitHub (Recomendado)**

1. Faça o push do código para um repositório no GitHub
2. Acesse [vercel.com/new](https://vercel.com/new)
3. Selecione o repositório GitHub
4. Vercel detectará automaticamente como um projeto Vite
5. Clique em **Deploy**

**Opção B: Via CLI Vercel**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer deploy
vercel

# Para atualizar variáveis de ambiente
vercel env pull
```

## Configuração

- **`vercel.json`**: Configuração do Vercel com suporte a framework Vite
- **`package.json`**: Scripts de build configurados
- **`vite.config.ts`**: Configurado para passar variáveis de ambiente
- **`.env.example`**: Exemplo de variáveis necessárias

## Monitoramento

Após o deploy, você pode:
- Ver logs em tempo real no dashboard do Vercel
- Monitorar performance e analytics
- Configurar domínios personalizados
- Ativar CI/CD automático

## Troubleshooting

Se encontrar problemas:
1. Verifique os logs no Vercel Dashboard
2. Certifique-se que `GEMINI_API_KEY` está configurada
3. Verifique se o build passa localmente com `npm run build`
