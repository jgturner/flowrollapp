import Image from 'next/image';
import { Card } from '@/components/ui/card';

interface AdPlaceholderProps {
  className?: string;
}

export function AdPlaceholder({ className = '' }: AdPlaceholderProps) {
  return (
    <Card className={`overflow-hidden p-0 border-0 ${className}`}>
      <div className="relative w-full h-[250px]">
        <Image src="/imgs/addplaceholder.webp" alt="Advertisement" fill className="object-cover object-top" />
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
          <div className="text-white text-[10px] font-medium px-1.5 py-0.5">AD</div>
        </div>
        <div className="absolute bottom-3 left-3 text-white">
          <h4 className="text-sm font-semibold drop-shadow-lg">Kingz</h4>
          <p className="text-xs drop-shadow-lg">get 10% off your next order</p>
        </div>
      </div>
    </Card>
  );
}
