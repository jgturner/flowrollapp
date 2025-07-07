import { RegistrationForm } from '@/components/registration-form';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/imgs/logo.png" alt="Logo" width={120} height={120} className="dark:brightness-110" />
        </div>
        <RegistrationForm />
      </div>
    </div>
  );
}
