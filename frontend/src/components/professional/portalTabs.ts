import {
  LayoutDashboard, Home as HomeIcon, ClipboardList, FolderKanban, Users, Wallet,
  ShieldCheck, CreditCard, MessageSquare, Package, ShoppingCart,
} from 'lucide-react';
import type { ProfessionalRole } from '@/lib/portal';

export interface PortalTab {
  to: string; // absolute path ('' = base)
  end?: boolean;
  label: string;
  icon: typeof LayoutDashboard;
}

export const PORTAL_TABS: Record<ProfessionalRole, PortalTab[]> = {
  engineer: [
    { to: '/app/engineer', end: true, label: 'Home', icon: HomeIcon },
    { to: '/app/engineer/requests', label: 'Project Requests', icon: ClipboardList },
    { to: '/app/engineer/projects', label: 'My Projects', icon: FolderKanban },
    { to: '/app/engineer/clients', label: 'Clients', icon: Users },
    { to: '/app/engineer/earnings', label: 'Earnings', icon: Wallet },
    { to: '/app/engineer/verification', label: 'Verification', icon: ShieldCheck },
    { to: '/app/engineer/subscription', label: 'Subscription', icon: CreditCard },
    { to: '/app/engineer/messages', label: 'Messages', icon: MessageSquare },
  ],
  plumber: [
    { to: '/app/plumber', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/plumber/requests', label: 'Project Requests', icon: ClipboardList },
    { to: '/app/plumber/projects', label: 'My Projects', icon: FolderKanban },
    { to: '/app/plumber/clients', label: 'Clients', icon: Users },
    { to: '/app/plumber/earnings', label: 'Earnings', icon: Wallet },
    { to: '/app/plumber/verification', label: 'Verification', icon: ShieldCheck },
    { to: '/app/plumber/subscription', label: 'Subscription', icon: CreditCard },
    { to: '/app/plumber/messages', label: 'Messages', icon: MessageSquare },
  ],
  electrician: [
    { to: '/app/electrician', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/electrician/requests', label: 'Project Requests', icon: ClipboardList },
    { to: '/app/electrician/projects', label: 'My Projects', icon: FolderKanban },
    { to: '/app/electrician/clients', label: 'Clients', icon: Users },
    { to: '/app/electrician/earnings', label: 'Earnings', icon: Wallet },
    { to: '/app/electrician/verification', label: 'Verification', icon: ShieldCheck },
    { to: '/app/electrician/subscription', label: 'Subscription', icon: CreditCard },
    { to: '/app/electrician/messages', label: 'Messages', icon: MessageSquare },
  ],
  material_shop: [
    { to: '/app/material-shop', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/material-shop/inventory', label: 'Inventory', icon: Package },
    { to: '/app/material-shop/orders', label: 'Orders', icon: ShoppingCart },
    { to: '/app/material-shop/requests', label: 'Project Requests', icon: ClipboardList },
    { to: '/app/material-shop/projects', label: 'My Projects', icon: FolderKanban },
    { to: '/app/material-shop/clients', label: 'Customers', icon: Users },
    { to: '/app/material-shop/earnings', label: 'Earnings', icon: Wallet },
    { to: '/app/material-shop/verification', label: 'Verification', icon: ShieldCheck },
    { to: '/app/material-shop/subscription', label: 'Subscription', icon: CreditCard },
    { to: '/app/material-shop/messages', label: 'Messages', icon: MessageSquare },
  ],
};
