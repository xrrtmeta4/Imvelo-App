import { Home, ShoppingCart, Bug, MessageCircle, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

const MobileNav = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Likhaya' },
    { to: '/marketplace', icon: ShoppingCart, label: 'Imakethe' },
    { to: '/scanner', icon: Bug, label: 'Khangela' },
    { to: '/messages', icon: MessageCircle, label: 'Imilayeto' },
    { to: '/profile', icon: User, label: 'Mina' },
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
