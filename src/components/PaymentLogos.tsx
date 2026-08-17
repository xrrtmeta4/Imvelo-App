import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

const PAYMENT_CATEGORIES = [
  {
    key: 'cardsWallets',
    methods: ['Credit Cards', 'Debit Cards', 'Apple Pay', 'Google Pay', 'Amazon Pay', 'Samsung Pay', 'Cash App Pay', 'Venmo', 'PayPal', 'Paze'],
  },
  {
    key: 'bnpl',
    methods: ['Klarna', 'Afterpay / Clearpay', 'Affirm', 'Alma', 'Atome', 'Billie', 'Zip'],
  },
  {
    key: 'mobileWallets',
    methods: ['Alipay', 'Alipay HK', 'WeChat Pay', 'DANA', 'GCash', 'Kakao Pay', 'Touch \'n Go', 'Momo', 'GoPay', 'Naver Pay'],
  },
  {
    key: 'bankTransfers',
    methods: ['ACH Direct Debit', 'SEPA Direct Debit', 'iDEAL', 'Bancontact', 'EPS', 'Multibanco', 'BLIK', 'Giropay', 'Przelewy24', 'SOFORT', 'Pix', 'PromptPay', 'Swish', 'Trustly', 'VIpps', 'MB Way', 'Boleto', 'OXXO'],
  },
  {
    key: 'regionalMethods',
    methods: ['Online Banking (FPX)', 'Online Banking (Thailand)', 'Online Banking (Czech)', 'Online Banking (Finland)', 'Online Banking (Poland)', 'Online Banking (Slovakia)', 'Open Banking UK'],
  },
  {
    key: 'crypto',
    methods: ['Stablecoins (USDC, USDT)'],
  },
];

const PaymentLogos = () => {
  const { t } = useLanguage();

  return (
    <Card className="bg-muted/50 rounded-xl border border-border/50">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground text-center">
          {t('supportedPaymentMethods')}
        </p>
        <div className="space-y-2">
          {PAYMENT_CATEGORIES.map((category) => (
            <div key={category.key}>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {t(category.key)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.methods.map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          {t('secureCheckout')}
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentLogos;
