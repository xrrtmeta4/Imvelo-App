import { useState } from 'react';
import { useUsageLimits, PlanTier, PLANS } from '@/hooks/useUsageLimits';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';

interface PaymentMethod {
  name: string;
  svg: React.ReactNode;
  methods: string[]; // Dodo API payment method enum values
}

const PaymentLogo = ({ name, svg, onClick }: { name: string; svg: React.ReactNode; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 bg-background rounded-lg px-2 py-2.5 border border-border/50 hover:border-primary hover:shadow-md transition-all cursor-pointer active:scale-95"
  >
    <div className="h-6 flex items-center justify-center">{svg}</div>
    <span className="text-[10px] text-muted-foreground leading-tight">{name}</span>
  </button>
);

const VisaSvg = () => (
  <svg viewBox="0 0 48 16" className="h-5 w-auto" fill="none">
    <path d="M17.4 1.2l-3.2 13.6h-2.8l3.2-13.6h2.8zm13.6 8.8l1.5-4.1.8 4.1h-2.3zm3.1 4.8h2.6l-2.3-13.6h-2.4c-.5 0-1 .3-1.2.8l-4.2 12.8h3l.6-1.6h3.6l.3 1.6zm-7.5-4.4c0-3.6-5-3.8-5-5.4 0-.5.5-1 1.5-1.1.5-.1 1.9-.1 3.5.6l.6-2.9c-.9-.3-2-.6-3.3-.6-3.5 0-6 1.9-6 4.5 0 2 1.8 3.1 3.1 3.7 1.4.7 1.8 1.1 1.8 1.7 0 .9-1.1 1.3-2.1 1.4-1.8 0-2.8-.5-3.6-.9l-.6 3c.8.4 2.3.7 3.9.7 3.7 0 6.1-1.8 6.2-4.7zM12 1.2L7.5 14.8H4.4L2.2 3.5c-.1-.5-.3-.7-.7-.9C.7 2.2 0 1.8 0 1.8l.1-.6h4.8c.6 0 1.2.4 1.3 1.2l1.2 6.3 3-7.5H12z" fill="#1A1F71"/>
  </svg>
);

const MastercardSvg = () => (
  <svg viewBox="0 0 36 24" className="h-5 w-auto" fill="none">
    <circle cx="13" cy="12" r="8" fill="#EB001B"/>
    <circle cx="23" cy="12" r="8" fill="#F79E1B"/>
    <path d="M18 5.8a8 8 0 010 12.4 8 8 0 000-12.4z" fill="#FF5F00"/>
  </svg>
);

const ApplePaySvg = () => (
  <svg viewBox="0 0 50 20" className="h-4 w-auto" fill="none">
    <path d="M8.8 3.4c-.5.6-1.3 1.1-2.1 1-.1-.8.3-1.7.7-2.2.5-.6 1.4-1 2-.1.1.9-.2 1.7-.6 2.3zm.6 1.2c-1.2-.1-2.2.7-2.7.7s-1.4-.6-2.4-.6c-1.2 0-2.3.7-3 1.8-1.3 2.2-.3 5.4.9 7.2.6.9 1.4 1.9 2.3 1.8 1-.1 1.3-.6 2.4-.6s1.4.6 2.4.6 1.6-.9 2.2-1.8c.7-1 1-2 1-2-.1 0-1.9-.7-1.9-2.8 0-1.7 1.4-2.6 1.5-2.6-.8-1.2-2.1-1.4-2.6-1.4l-.1-.3z" fill="currentColor"/>
    <path d="M19.3 2.2c3 0 5.1 2.1 5.1 5.1s-2.1 5.1-5.2 5.1h-3.3v5.3h-2.4V2.2h5.8zm-3.4 8.2h2.7c2.1 0 3.3-1.1 3.3-3.1s-1.2-3.1-3.3-3.1h-2.7v6.2zm10.5 3c0-2 1.5-3.2 4.2-3.3l3.1-.2v-.9c0-1.3-.8-2-2.4-2-1.4 0-2.3.6-2.5 1.6h-2.2c.1-2 1.9-3.5 4.8-3.5 2.8 0 4.6 1.5 4.6 3.8v8h-2.3v-1.9h-.1c-.7 1.3-2.1 2.1-3.6 2.1-2.3 0-3.6-1.4-3.6-3.7zm7.3-1.1v-.9l-2.8.2c-1.4.1-2.2.7-2.2 1.7s.9 1.7 2 1.7c1.6 0 3-1.1 3-2.7zm4.4 6.6v-1.8c.2 0 .6.1.9.1 1.3 0 2-.5 2.4-1.9l.3-.8-4.5-12.4h2.5l3.2 10.3h.1l3.2-10.3H48l-4.6 13c-1 2.9-2.2 3.8-4.7 3.8h-.6z" fill="currentColor"/>
  </svg>
);

const GooglePaySvg = () => (
  <svg viewBox="0 0 48 20" className="h-4 w-auto" fill="none">
    <path d="M22.3 10v5.8h-1.8V2.2h4.8c1.2 0 2.2.4 3 1.2.9.8 1.3 1.8 1.3 2.9 0 1.2-.4 2.1-1.3 2.9-.8.8-1.8 1.2-3 1.2h-3zm0-6.1v4.4h3.1c.7 0 1.3-.3 1.8-.8s.7-1.1.7-1.8c0-.6-.2-1.2-.7-1.7s-1.1-.8-1.8-.8h-3.1z" fill="#4285F4"/>
    <path d="M33.7 6c1.3 0 2.4.4 3.1 1.1.8.7 1.2 1.7 1.2 3v6h-1.8v-1.4h-.1c-.7 1.1-1.7 1.7-2.9 1.7-1 0-1.9-.3-2.6-1-.7-.6-1-1.4-1-2.4 0-1 .4-1.8 1.1-2.4.7-.6 1.7-.9 2.9-.9.9 0 1.8.2 2.4.6v-.4c0-.7-.3-1.2-.8-1.7s-1.1-.7-1.8-.7c-1 0-1.8.4-2.3 1.3l-1.7-1c.8-1.3 2-2 3.5-2h-.2zm-2.3 7.3c0 .5.2 1 .7 1.3.4.4.9.5 1.5.5.8 0 1.5-.3 2.1-.9.6-.6.9-1.3.9-2.1-.7-.5-1.4-.7-2.3-.7-.7 0-1.3.2-1.8.5-.7.4-1.1.8-1.1 1.4z" fill="#4285F4"/>
    <path d="M46.2 6.3l-6.3 14.5h-1.9l2.3-5.1-4.1-9.4h2l3 7.1h.1l2.9-7.1h2z" fill="#4285F4"/>
    <path d="M15.8 8.8c0-.5 0-1.1-.1-1.6H8.1v3h4.3c-.2 1-.7 1.8-1.5 2.4v2h2.4c1.4-1.3 2.2-3.2 2.5-5.8z" fill="#4285F4"/>
    <path d="M8.1 16.5c2.1 0 3.8-.7 5.1-1.9l-2.4-2c-.7.5-1.6.8-2.7.8-2.1 0-3.8-1.4-4.4-3.3H1.2v2c1.3 2.6 3.9 4.4 6.9 4.4z" fill="#34A853"/>
    <path d="M3.7 11.1c-.2-.5-.2-1 0-1.5v-2H1.2c-.7 1.4-.7 3.1 0 4.5l2.5-1z" fill="#FBBC04"/>
    <path d="M8.1 5.3c1.2 0 2.2.4 3 1.2l2.3-2.3C12 2.8 10.2 2 8.1 2 5.1 2 2.5 3.8 1.2 6.4l2.5 2c.6-1.9 2.3-3.1 4.4-3.1z" fill="#EA4335"/>
  </svg>
);

const PayPalSvg = () => (
  <svg viewBox="0 0 48 14" className="h-4 w-auto" fill="none">
    <path d="M5.5 13.8H1.3c-.3 0-.5-.2-.4-.5L3 .8c0-.2.2-.4.5-.4h5.6c1.9 0 3.2.4 3.9 1.2.3.4.5.7.6 1.1.1.4.1.9 0 1.5-.6 3.1-2.5 4.2-5 4.2H7.1c-.3 0-.6.3-.7.6l-.9 4.8z" fill="#253B80"/>
    <path d="M20.6 4.2c-.1.4-.2.8-.4 1.3-.8 3.5-3.4 4.7-6.7 4.7h-1.7c-.4 0-.7.3-.8.7L10 16.2c0 .2.1.4.4.4h3c.3 0 .6-.3.7-.5l.7-4c.1-.3.4-.6.7-.6h.5c3.1 0 5.5-1.2 6.2-4.8.3-1.5.1-2.7-.6-3.5" fill="#179BD7"/>
    <path d="M9 .4c0-.2.2-.4.5-.4h5.6c.7 0 1.3.1 1.8.1.2 0 .3.1.5.1.2.1.3.1.5.2.1 0 .1 0 .2.1.4.2.7.5.9.9-.4-2.3-2-3.1-4.5-3.1H8.8c-.4 0-.7.3-.8.7L5.9 12c0 .3.1.5.4.5h4.1l1-6.5L9 .4z" fill="#253B80"/>
    <path d="M25.3 0h5.3c.9 0 1.7.1 2.4.3.7.2 1.3.6 1.7 1.1.5.6.7 1.3.7 2.1 0 .9-.3 1.8-.8 2.5-.6.9-1.5 1.4-2.7 1.6.5.1.9.3 1.2.6.3.3.5.8.5 1.4v2c0 .4 0 .8.1 1.1.1.3.2.5.3.6h-2.5c-.1-.1-.1-.3-.2-.5 0-.2-.1-.5-.1-.8v-1.8c0-.7-.2-1.2-.5-1.4-.3-.3-.9-.4-1.6-.4h-2.5l-1.2 4.9h-2.4L25.3 0zm3.1 5.7c.8 0 1.5-.2 2-.5.5-.4.8-.9.8-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.9-.4-1.7-.4h-2.5L26 5.7h2.4z" fill="#253B80"/>
  </svg>
);

const PAYMENT_OPTIONS: PaymentMethod[] = [
  { name: 'Visa', svg: <VisaSvg />, methods: ['credit', 'debit'] },
  { name: 'Mastercard', svg: <MastercardSvg />, methods: ['credit', 'debit'] },
  { name: 'Apple Pay', svg: <ApplePaySvg />, methods: ['apple_pay'] },
  { name: 'Google Pay', svg: <GooglePaySvg />, methods: ['google_pay'] },
  { name: 'PayPal', svg: <PayPalSvg />, methods: ['paypal'] },
  { name: 'Klarna', svg: <span className="text-xs font-bold" style={{ color: '#FFB3C7' }}>Klarna</span>, methods: ['klarna'] },
  { name: 'Affirm', svg: <span className="text-xs font-bold text-foreground">affirm</span>, methods: ['affirm'] },
  { name: 'UPI', svg: <span className="text-[10px] font-bold" style={{ color: '#097939' }}>UPI</span>, methods: ['upi_collect', 'upi_intent'] },
];

const planOptions: { value: PlanTier; label: string; price: string }[] = [
  { value: 'premium', label: 'Premium', price: '$6.00/mo' },
];

const PaymentLogos = () => {
  const { openUpgrade, currentPlan } = useUsageLimits();
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('pro');
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  const handleClick = (methods: string[]) => {
    setSelectedMethods(methods);
    setShowPlanDialog(true);
  };

  const handleConfirm = () => {
    setShowPlanDialog(false);
    openUpgrade(selectedPlan, selectedMethods);
  };

  const availablePlans = planOptions.filter(p => {
    const order: PlanTier[] = ['free', 'starter', 'pro', 'enterprise'];
    return order.indexOf(p.value) > order.indexOf(currentPlan);
  });

  return (
    <>
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground text-center">Pay with your preferred method</p>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_OPTIONS.map((pm) => (
            <PaymentLogo key={pm.name} name={pm.name} svg={pm.svg} onClick={() => handleClick(pm.methods)} />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Tap a method to pay directly with it · 40+ options supported
        </p>
      </div>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Choose a Plan
            </DialogTitle>
          </DialogHeader>
          {availablePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">You're already on the highest plan!</p>
          ) : (
            <div className="space-y-4">
              <RadioGroup value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanTier)}>
                {availablePlans.map((plan) => (
                  <Label
                    key={plan.value}
                    htmlFor={plan.value}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary cursor-pointer transition-colors has-[&[data-state=checked]]:border-primary has-[&[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={plan.value} id={plan.value} />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{plan.label}</p>
                      <p className="text-xs text-muted-foreground">{plan.price}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
              <Button onClick={handleConfirm} className="w-full gap-2">
                <Crown className="w-4 h-4" />
                Pay with {PAYMENT_OPTIONS.find(p => p.methods[0] === selectedMethods[0])?.name || 'selected method'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentLogos;
