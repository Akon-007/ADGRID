import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Screen01OperationsCenter } from '../screens/Screen01OperationsCenter';
import { Screen02FieldDispatch } from '../screens/Screen02FieldDispatch';
import { Screen03ExecutiveMode } from '../screens/Screen03ExecutiveMode';
import { Screen04CustomerTracker } from '../screens/Screen04CustomerTracker';
import { Screen05MobileFieldOS } from '../screens/Screen05MobileFieldOS';
import { Screen06FinanceTreasury } from '../screens/Screen06FinanceTreasury';
import { Screen07MediaOwner } from '../screens/Screen07MediaOwner';
import { Screen08GovernanceAdmin } from '../screens/Screen08GovernanceAdmin';
import { Screen09ContractorHub } from '../screens/Screen09ContractorHub';
import { ClientTrackerEnhanced } from '../client/ClientTrackerEnhanced';
import { MarketplaceHome } from '../public/MarketplaceHome';
import { MarketplaceBillboard, ScreenId, VerificationItem } from '../../types';

interface RoleDashboardRouterProps {
  activeTab: string;
  onNavigatePublicMarketplace: () => void;
  onSelectBillboard?: (b: MarketplaceBillboard) => void;
  onPurchaseBillboard?: (b: MarketplaceBillboard) => void;
  onOpenProof?: (item: VerificationItem) => void;
  onNavigateLegacy?: (screen: ScreenId) => void;
}

export const RoleDashboardRouter: React.FC<RoleDashboardRouterProps> = ({
  activeTab,
  onNavigatePublicMarketplace,
  onSelectBillboard,
  onPurchaseBillboard,
  onOpenProof = () => {},
  onNavigateLegacy = () => {},
}) => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  // 1. Customer / Client Company Role
  if (currentUser.role === 'Customer / Client Company') {
    if (activeTab === 'dashboard' || activeTab === 'live-tracker') {
      return <ClientTrackerEnhanced />;
    }
    if (activeTab === 'campaigns' || activeTab === 'locations') {
      return <Screen03ExecutiveMode onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;
    }
    if (activeTab === 'jobs') {
      return <Screen02FieldDispatch onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;
    }
    if (activeTab === 'evidence' || activeTab === 'issues' || activeTab === 'reports' || activeTab === 'activity') {
      return <Screen04CustomerTracker onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;
    }
    if (activeTab === 'invoices') {
      return <Screen06FinanceTreasury onNavigate={onNavigateLegacy} />;
    }
    if (activeTab === 'company-settings') {
      return <Screen08GovernanceAdmin onNavigate={onNavigateLegacy} />;
    }
    return <ClientTrackerEnhanced />;
  }

  // 2. Field Agent
  if (currentUser.role === 'Field Agent') {
    return <Screen05MobileFieldOS onNavigate={onNavigateLegacy} />;
  }

  // 3. Vendor
  if (currentUser.role === 'Vendor') {
    return <Screen09ContractorHub onNavigate={onNavigateLegacy} />;
  }

  // 4. Media Owner
  if (currentUser.role === 'Media Owner') {
    return <Screen07MediaOwner onNavigate={onNavigateLegacy} />;
  }

  // 5. Finance Manager
  if (currentUser.role === 'Finance Manager') {
    return <Screen06FinanceTreasury onNavigate={onNavigateLegacy} />;
  }

  // 6. Platform Admin
  if (currentUser.role === 'Platform Admin') {
    if (activeTab === 'compliance' || activeTab === 'audit-logs' || activeTab === 'system-settings') {
      return <Screen08GovernanceAdmin onNavigate={onNavigateLegacy} />;
    }
    if (activeTab === 'finance') {
      return <Screen06FinanceTreasury onNavigate={onNavigateLegacy} />;
    }
    return <Screen01OperationsCenter onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;
  }

  // 7. Agency Admin, Campaign Manager, Operations Manager, Account Manager, Field Manager, Agency Staff
  switch (activeTab) {
    case 'command-center':
    case 'operations':
    case 'platform-overview':
      return <Screen01OperationsCenter onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;

    case 'campaigns':
    case 'bookings':
    case 'locations':
      return <Screen03ExecutiveMode onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;

    case 'verification':
    case 'evidence':
    case 'reports':
      return <Screen04CustomerTracker onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;

    case 'jobs':
    case 'my-jobs':
    case 'field-teams':
    case 'field-agents':
    case 'route':
      return <Screen02FieldDispatch onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;

    case 'vendors':
    case 'assigned-jobs':
      return <Screen09ContractorHub onNavigate={onNavigateLegacy} />;

    case 'finance':
    case 'invoices':
    case 'payments':
    case 'settlements':
    case 'reconciliation':
    case 'earnings':
    case 'revenue':
      return <Screen06FinanceTreasury onNavigate={onNavigateLegacy} />;

    case 'clients':
    case 'agencies':
    case 'activity':
      return <Screen04CustomerTracker onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;

    case 'ai-assistant':
      return <Screen01OperationsCenter onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;

    case 'team':
      return <Screen04CustomerTracker onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;

    case 'settings':
      return <Screen08GovernanceAdmin onNavigate={onNavigateLegacy} />;

    case 'inventory':
    case 'media-owners':
      return <Screen07MediaOwner onNavigate={onNavigateLegacy} />;

    case 'live-tracker':
    case 'live-map':
      return <ClientTrackerEnhanced />;

    case 'marketplace':
      return (
        <MarketplaceHome
          onSelectBillboard={onSelectBillboard || (() => {})}
          onPurchaseBillboard={onPurchaseBillboard || (() => {})}
        />
      );

    default:
      return <Screen01OperationsCenter onNavigate={onNavigateLegacy} onOpenProof={onOpenProof} />;
  }
};
