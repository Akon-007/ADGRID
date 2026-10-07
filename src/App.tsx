import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BillboardProvider, useBillboards } from './context/BillboardContext';
import { MarketplaceBillboard, VerificationItem } from './types';

// Public experience
import { PublicHeader } from './components/public/PublicHeader';
import { MarketplaceHome } from './components/public/MarketplaceHome';
import { BillboardDetail } from './components/public/BillboardDetail';

// Authenticated operations platform
import { AdminLoginPage } from './components/auth/AdminLoginPage';
import { PersistentSidebar } from './components/layout/PersistentSidebar';
import { AdminTopNav } from './components/layout/AdminTopNav';
import { RoleDashboardRouter } from './components/dashboard/RoleDashboardRouter';
import { ProofModal } from './components/common/ProofModal';
import { ShieldAlert } from 'lucide-react';

const MainApp: React.FC = () => {
  const { billboards } = useBillboards();
  const {
    currentUser,
    isAuthenticated,
    validateRoute,
    activePurchaseBillboard,
    setActivePurchaseBillboard,
  } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    return path === '/' ? '/marketplace' : path;
  });

  const [selectedBillboard, setSelectedBillboard] = useState<MarketplaceBillboard | null>(null);
  const [activeTab, setActiveTab] = useState('command-center');
  const [activeProofItem, setActiveProofItem] = useState<VerificationItem | null>(null);
  const [authAlert, setAuthAlert] = useState<{
    message: string;
    type: 'warning' | 'info' | 'error';
  } | null>(null);

  const navigateTo = useCallback((path: string, options?: { replace?: boolean }) => {
    const targetPath = path === '/' ? '/marketplace' : path;

    if (options?.replace) {
      window.history.replaceState({}, '', targetPath);
    } else {
      window.history.pushState({}, '', targetPath);
    }

    setCurrentPath(targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePurchaseBillboard = useCallback(
    (billboard: MarketplaceBillboard) => {
      setActivePurchaseBillboard(billboard);

      if (isAuthenticated) {
        if (currentUser?.role === 'Customer / Client Company') {
          setActiveTab('live-tracker');
          navigateTo('/admin/client');
        } else {
          navigateTo(currentUser?.authorizedDashboard || '/admin/agency');
        }
        return;
      }

      setAuthAlert({
        message: `To continue with ${billboard.name}, sign in to your ADGRID enterprise account.`,
        type: 'info',
      });
      navigateTo('/admin');
    },
    [
      currentUser?.authorizedDashboard,
      currentUser?.role,
      isAuthenticated,
      navigateTo,
      setActivePurchaseBillboard,
    ],
  );

  const handleSelectBillboard = useCallback(
    (billboard: MarketplaceBillboard) => {
      setSelectedBillboard(billboard);
      navigateTo(`/marketplace/${billboard.id}`);
    },
    [navigateTo],
  );

  const handleAdminLoginSuccess = useCallback(
    (targetDashboardUrl: string) => {
      setAuthAlert(null);

      if (activePurchaseBillboard && targetDashboardUrl === '/admin/client') {
        setActiveTab('live-tracker');
        navigateTo('/admin/client');
        return;
      }

      navigateTo(targetDashboardUrl);
    },
    [activePurchaseBillboard, navigateTo],
  );

  // Keep browser back/forward navigation synchronized with React state.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path === '/' ? '/marketplace' : path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Validate every route through the existing authorization layer.
  useEffect(() => {
    let isMounted = true;

    const checkAuthorization = async () => {
      const validation = await validateRoute(currentPath);

      if (!isMounted) return;

      if (!validation.authorized) {
        if (validation.status === 401) {
          setAuthAlert({
            message: 'Authentication required. Redirected to the ADGRID authentication gateway.',
            type: 'warning',
          });
          navigateTo('/admin', { replace: true });
        } else if (validation.status === 403) {
          setAuthAlert({
            message:
              validation.error ||
              'Access denied for this account role. Redirected to the authorized workspace.',
            type: 'error',
          });

          navigateTo(
            validation.redirectTo || currentUser?.authorizedDashboard || '/admin/client',
            { replace: true },
          );
        }
        return;
      }

      if (
        validation.status === 200 &&
        (currentPath === '/admin' || currentPath === '/admin/') &&
        currentUser
      ) {
        navigateTo(currentUser.authorizedDashboard || '/admin/agency', { replace: true });
      }
    };

    void checkAuthorization();

    return () => {
      isMounted = false;
    };
  }, [currentPath, currentUser, navigateTo, validateRoute]);

  // Set the appropriate workspace tab whenever the protected route changes.
  useEffect(() => {
    if (!currentUser) return;

    if (currentPath.startsWith('/admin/client')) {
      setActiveTab((previous) =>
        ['live-tracker', 'campaigns', 'locations', 'evidence', 'invoices'].includes(previous)
          ? previous
          : 'live-tracker',
      );
    } else if (currentPath.startsWith('/admin/field-agent')) {
      setActiveTab('my-jobs');
    } else if (currentPath.startsWith('/admin/vendor')) {
      setActiveTab('assigned-jobs');
    } else if (currentPath.startsWith('/admin/media-owner')) {
      setActiveTab('inventory');
    } else if (currentPath.startsWith('/admin/platform')) {
      setActiveTab((previous) =>
        [
          'platform-overview',
          'tenants',
          'governance',
          'finance',
          'compliance',
          'audit-logs',
        ].includes(previous)
          ? previous
          : 'platform-overview',
      );
    } else if (currentPath.startsWith('/admin/agency')) {
      setActiveTab((previous) =>
        [
          'command-center',
          'campaigns',
          'clients',
          'marketplace',
          'bookings',
          'jobs',
          'locations',
          'operations',
        ].includes(previous)
          ? previous
          : 'command-center',
      );
    }
  }, [currentPath, currentUser]);

  // Resolve public billboard detail and purchase routes from the current inventory.
  useEffect(() => {
    if (currentPath.startsWith('/marketplace/')) {
      const id = currentPath.slice('/marketplace/'.length).trim();
      const found = billboards.find((billboard) => billboard.id === id) || null;
      setSelectedBillboard(found);
      return;
    }

    if (currentPath.startsWith('/purchase/')) {
      const id = currentPath.slice('/purchase/'.length).trim();
      const found = billboards.find((billboard) => billboard.id === id);

      if (found) {
        handlePurchaseBillboard(found);
      }
      return;
    }

    if (currentPath === '/marketplace' || currentPath === '/') {
      setSelectedBillboard(null);
    }
  }, [billboards, currentPath, handlePurchaseBillboard]);

  useEffect(() => {
    if (!authAlert) return;

    const timer = window.setTimeout(() => setAuthAlert(null), 6000);
    return () => window.clearTimeout(timer);
  }, [authAlert]);

  // Central authentication gateway.
  if (currentPath === '/admin' || currentPath === '/admin/') {
    return (
      <>
        {authAlert && <AuthToast alert={authAlert} />}
        <AdminLoginPage
          onSuccessRedirect={handleAdminLoginSuccess}
          onNavigatePublicMarketplace={() => navigateTo('/marketplace')}
        />
      </>
    );
  }

  // Protected operations platform.
  if (currentPath.startsWith('/admin/') && isAuthenticated && currentUser) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] text-slate-950 antialiased">
        {authAlert && <AuthToast alert={authAlert} />}

        <div className="flex min-h-screen">
          <PersistentSidebar
            activeTab={activeTab}
            onSelectTab={(tabId) => {
              setActiveTab(tabId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigatePublicMarketplace={() => navigateTo('/marketplace')}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopNav onNavigatePublicMarketplace={() => navigateTo('/marketplace')} />

            <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7">
              <RoleDashboardRouter
                activeTab={activeTab}
                onNavigatePublicMarketplace={() => navigateTo('/marketplace')}
                onSelectBillboard={handleSelectBillboard}
                onPurchaseBillboard={handlePurchaseBillboard}
                onOpenProof={(item) => setActiveProofItem(item)}
              />
            </main>
          </div>
        </div>

        <ProofModal
          item={activeProofItem}
          onClose={() => setActiveProofItem(null)}
          onApprove={(id) => alert(`Proof-of-play verified for ${id}.`)}
          onRetake={(id) => alert(`Retake request dispatched to field crew for ${id}.`)}
        />
      </div>
    );
  }

  // Public marketplace.
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-950 antialiased">
      {authAlert && <AuthToast alert={authAlert} />}

      <PublicHeader
        onNavigateMarketplace={() => navigateTo('/marketplace')}
        onNavigateAdmin={() => navigateTo('/admin')}
      />

      <main>
        {currentPath.startsWith('/marketplace/') && selectedBillboard ? (
          <BillboardDetail
            billboard={selectedBillboard}
            onBack={() => navigateTo('/marketplace')}
            onStartPurchase={handlePurchaseBillboard}
          />
        ) : (
          <MarketplaceHome
            onSelectBillboard={handleSelectBillboard}
            onPurchaseBillboard={handlePurchaseBillboard}
          />
        )}
      </main>

      <PublicFooter navigateTo={navigateTo} />
    </div>
  );
};

const AuthToast: React.FC<{
  alert: { message: string; type: 'warning' | 'info' | 'error' };
}> = ({ alert }) => {
  const iconClass =
    alert.type === 'error'
      ? 'text-red-600'
      : alert.type === 'warning'
        ? 'text-amber-600'
        : 'text-sky-600';

  return (
    <div className="fixed right-4 top-4 z-[80] flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl">
      <ShieldAlert className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
      <p className="text-xs font-semibold leading-5 text-slate-800">{alert.message}</p>
    </div>
  );
};

const PublicFooter: React.FC<{ navigateTo: (path: string) => void }> = ({ navigateTo }) => (
  <footer className="adgrid-footer">
    <div className="adgrid-container adgrid-footer-inner">
      <div className="adgrid-footer-grid">
        <div>
          <div className="adgrid-footer-brand">
            <img src="/branding/adgrid-mark.png" alt="ADGRID" />
            <div><strong>ADGRID</strong><small>OOH marketplace</small></div>
          </div>
          <p className="adgrid-footer-copy">
            A marketplace and operating layer for discovering, booking and managing out-of-home advertising inventory across African markets.
          </p>
        </div>

        <div className="adgrid-footer-col">
          <strong>Explore</strong>
          <button type="button" onClick={() => navigateTo('/marketplace')}>Locations</button>
          <button type="button" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
          <button type="button" onClick={() => document.getElementById('coverage')?.scrollIntoView({ behavior: 'smooth' })}>Coverage</button>
        </div>

        <div className="adgrid-footer-col">
          <strong>For owners</strong>
          <button type="button" onClick={() => document.getElementById('media-owner')?.scrollIntoView({ behavior: 'smooth' })}>List your space</button>
          <button type="button" onClick={() => navigateTo('/admin')}>Workspace</button>
          <button type="button" onClick={() => navigateTo('/marketplace')}>Marketplace</button>
        </div>

        <div className="adgrid-footer-col">
          <strong>Markets</strong>
          <button type="button" onClick={() => navigateTo('/marketplace')}>Lagos · Abuja</button>
          <button type="button" onClick={() => navigateTo('/marketplace')}>Nairobi · Accra</button>
          <button type="button" onClick={() => navigateTo('/marketplace')}>Johannesburg · Kigali</button>
        </div>
      </div>

      <div className="adgrid-footer-bottom">
        <span>© {new Date().getFullYear()} ADGRID. All rights reserved.</span>
        <span>Marketplace · Campaign operations · OOH infrastructure</span>
      </div>
    </div>
  </footer>
);


export default function App() {
  return (
    <BillboardProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </BillboardProvider>
  );
}