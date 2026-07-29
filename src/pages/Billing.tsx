import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/UserMenu';
import { useToast } from '@/hooks/use-toast';

type Plan = {
  id: 'free' | 'pro';
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started tracking your job hunt.',
    icon: <Sparkles className="h-5 w-5" />,
    features: [
      'Up to 20 job applications',
      'Basic dashboard & filters',
      '1 CV upload',
      '5 templates',
    ],
    cta: 'Current plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: 'per month',
    description: 'For serious job seekers.',
    icon: <Zap className="h-5 w-5" />,
    features: [
      'Unlimited job applications',
      'AI CV tailoring',
      'Answer application questions with AI',
      'Unlimited templates & question bank',
      'Advanced filters & analytics',
      'Offer negotiation assistant',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
];

const Billing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelect = (plan: Plan) => {
    if (plan.id === 'free') return;
    toast({
      title: 'Coming soon',
      description: 'Payments are not enabled yet. Stay tuned!',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Billing & Plans</h1>
              <p className="text-sm text-muted-foreground">Manage your subscription</p>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mb-10 text-center">
          <Badge variant="secondary" className="mb-3">Current plan: Free</Badge>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Choose the plan that fits your search</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upgrade any time to unlock unlimited applications and AI-powered assistance.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.highlight
                  ? 'border-primary shadow-lg relative overflow-hidden'
                  : 'relative'
              }
            >
              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-md">
                  Most popular
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  {plan.icon}
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm ml-1">/ {plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={plan.id === 'free'}
                  onClick={() => handleSelect(plan)}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-12 text-center text-sm text-muted-foreground">
          <p>
            Payments are not yet enabled on Qwest. Once available, you'll be able to manage your
            subscription, update payment methods, and download invoices from this page.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Billing;
