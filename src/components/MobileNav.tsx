import { Home, Bug, BookOpen, User, Settings, BarChart3 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/hooks/useLanguage';

const MobileNav = () => {
  const { t } = useLanguage();

  const navItems = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/scanner', icon: Bug, label: t('scan') },
    { to: '/analysis', icon: BarChart3, label: 'Analysis' },
    { to: '/ledger', icon: BookOpen, label: t('ledger') },
    { to: '/profile', icon: User, label: t('profile') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="grid grid-cols-6 items-center h-14 max-w-screen-sm mx-auto px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center h-full text-muted-foreground hover:text-primary transition-colors relative"
            activeClassName="text-primary font-medium"
          >
            <item.icon className="w-[18px] h-[18px] mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-full">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
