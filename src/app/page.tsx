import { LoginForm } from '@/components/login-form';
import { AuthGuard } from '@/components/auth-guard';
import Image from 'next/image';

export default function Home() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Image src="/imgs/logo.png" alt="Logo" width={120} height={120} className="dark:brightness-110" />
          </div>
          <LoginForm />
        </div>
      </div>
    </AuthGuard>
  );
}
