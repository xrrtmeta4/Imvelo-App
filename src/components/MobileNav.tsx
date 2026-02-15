import { Home, Bug, Cloud, BookOpen, User, Droplets } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

const MobileNav = () => {
  const { t } = useLanguage();

  const navItems = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/scanner', icon: Bug, label: t('scan') },
    { to: '/pesticide-calendar', icon: Droplets, label: t('spray') },
    { to: '/ledger', icon: BookOpen, label: t('ledger') },
    { to: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-sm mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-primary transition-colors"
            activeClassName="text-primary font-medium"
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
