import { Home, Bug, Cloud, BookOpen, User, Droplets, GraduationCap, WifiOff } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/hooks/useLanguage';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const MobileNav = () => {
  const { t } = useLanguage();
  const { isOnline, pendingCount } = useOfflineSync();

  const navItems = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/scanner', icon: Bug, label: t('scan') },
    { to: '/pesticide-calendar', icon: Droplets, label: t('spray') },
    { to: '/ledger', icon: BookOpen, label: t('ledger') },
    { to: '/profile', icon: User, label: t('profile') },
    { to: '/agrischool', icon: GraduationCap, label: t('school') },
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
            {item.to === '/profile' && !isOnline && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
            {item.to === '/ledger' && pendingCount > 0 && (
              <span className="absolute -top-0.5 right-0 min-w-[14px] h-[14px] rounded-full bg-destructive text-destructive-foreground text-[8px] flex items-center justify-center font-bold px-0.5">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
