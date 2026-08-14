import { useEffect } from 'react';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CHECKOUT_URL = 'https://checkout.dodopayments.com/buy/pdt_0NYZaqcOARihEXXOPIdmC?quantity=1';

const Upgrade = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    window.location.href = CHECKOUT_URL;
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-screen-sm mx-auto text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Crown className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Redirecting to checkout...</h1>
        <p className="text-sm text-muted-foreground">
          You are being redirected to our secure payment page.
        </p>
        <button
          onClick={() => (window.location.href = CHECKOUT_URL)}
          className="text-primary underline text-sm"
        >
          Click here if you are not redirected automatically.
        </button>
        <button
          onClick={() => navigate(-1)}
          className="block mx-auto text-sm text-muted-foreground hover:text-foreground"
        >
          Go back
        </button>
      </div>
    </div>
  );
};

export default Upgrade;
