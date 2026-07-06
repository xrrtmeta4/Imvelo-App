import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudLightning, Droplets, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

const Analysis = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tools = [
    {
      icon: CloudLightning,
      title: t('climateRisk'),
      desc: t('volatilityEngine'),
      path: '/climate-risk',
      iconBg: 'bg-destructive/15',
      iconColor: 'text-destructive',
      border: 'border-destructive/20',
    },
    {
      icon: Droplets,
      title: t('Smart Irrigation Planner'),
      desc: t('7-day rainfall analysis with watering schedule and water-saving tips.'),
      path: '/smart-irrigation',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-500',
      border: 'border-blue-500/20',
    },
    {
      icon: Leaf,
      title: t('Carbon Score & Analysis'),
      desc: t('Estimate your farm carbon footprint and find sustainability opportunities.'),
      path: '/carbon-score',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      border: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-4 py-6">
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('Analysis')}</h1>
            <p className="text-sm text-primary-foreground/85">{t('Climate & irrigation insights for your farm')}</p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-6 space-y-4">
        {tools.map((tool) => (
          <Card
            key={tool.path}
            className={`cursor-pointer hover:shadow-md transition-shadow ${tool.border}`}
            onClick={() => navigate(tool.path)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className={`${tool.iconBg} p-2.5 rounded-lg`}>
                  <tool.icon className={`w-5 h-5 ${tool.iconColor}`} />
                </div>
                {tool.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{tool.desc}</p>
              <Button variant="outline" size="sm" className="w-full">
                {t('openAnalysis')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default Analysis;