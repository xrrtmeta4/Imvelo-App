import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WhatsAppButton = () => {
  const phoneNumber = '+26879215624';
  const message = encodeURIComponent('Hello Imvelo AI! I need help with farming.');
  const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 left-4 z-40"
    >
      <Button
        className="rounded-full w-14 h-14 shadow-lg bg-[#25D366] hover:bg-[#128C7E] text-white"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </a>
  );
};

export default WhatsAppButton;
