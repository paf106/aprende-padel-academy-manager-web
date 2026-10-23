import { LoginForm } from '@/app/login/login-form'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-background p-5">
      <LoginForm unauthorized={error === 'unauthorized'} />
    </main>
  )
}
