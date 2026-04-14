import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';

const AgriSchool = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground py-3 px-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-primary-foreground/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Imvelo AgriSchool</h1>
      </header>
      <iframe
        src="https://imveloagrischool.vercel.app"
        className="flex-1 w-full border-0"
        title="Imvelo AgriSchool"
        allow="camera; microphone; geolocation"
      />
    </div>
  );
};

export default AgriSchool;
