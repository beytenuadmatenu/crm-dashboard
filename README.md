# 📊 Admatenu CRM Dashboard

A premium lead management system for **Admatenu Beitenu Mortgages**.

## ✨ Features

- **Lead Overview**: Real-time dashboard with key metrics.
- **AI Summaries**: Direct view of the WhatsApp bot's conversation analysis.
- **Agent Notes**: Explicitly save custom notes for each lead.
- **Document Management**: Upload and organize client documents (IDs, paystubs, etc.) via Supabase Storage.
- **Manual Entry**: Add leads directly to the CRM when they come from non-WhatsApp sources.
- **Secure Deletion**: Double-confirmation for deleting leads.
- **RTL Support**: Native Hebrew support throughout the interface.

## 🛠️ Built With

- **Next.js 15** (App Router)
- **Supabase** (PostgreSQL & Storage)
- **Vanilla CSS** for a premium, lightweight UI.

## ⚙️ Configuration

Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚀 Development

```bash
npm install
npm run dev
```
