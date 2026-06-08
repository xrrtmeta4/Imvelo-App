import { Card, CardContent } from '@/components/ui/card';

const PaymentLogos = () => (
  <Card className="bg-muted/50 rounded-xl border border-border/50">
    <CardContent className="p-4 space-y-2 text-center">
      <p className="text-sm font-semibold text-foreground">Secure checkout</p>
      <p className="text-xs text-muted-foreground">
        Payment options are handled safely in the upgrade flow. The icon grid has been removed to keep the checkout clean and simple.
      </p>
    </CardContent>
  </Card>
);

export default PaymentLogos;
