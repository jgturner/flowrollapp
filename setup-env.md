# Environment Setup

To get the authentication system working, you need to create a `.env.local` file in the root of your project with the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://mrpiclpwihtqzgywfocm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycGljbHB3aWh0cXpneXdmb2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDI2MDksImV4cCI6MjA2NDQ3ODYwOX0.1VWIj3LkAunSnzLJntkpxPsprMXeXLSkbP8VmrRo-Ek
```

## Steps to set up:

1. Create a file named `.env.local` in the my-app directory
2. Copy the above environment variables into the file
3. Save the file
4. Restart your development server

The authentication system will then work properly with your Supabase project.
