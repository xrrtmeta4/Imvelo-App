import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

const PAYMENT_CATEGORIES = [
  {
    key: 'cardsWallets',
    methods: ['Credit Cards', 'Debit Cards', 'Apple Pay', 'Google Pay'],
  },
];

const PaymentLogos = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-white text-center">
        {t('supportedPaymentMethods')}
      </p>
      <div className="space-y-2">
        {PAYMENT_CATEGORIES.map((category) => (
          <div key={category.key}>
            <p className="text-xs font-medium text-white/70 mb-1">
              {t(category.key)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {category.methods.map((method) => (
                <span
                  key={method}
                  className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/60 text-center pt-1">
        {t('secureCheckout')}
      </p>
    </div>
  );
};

export default PaymentLogos;
