import { useState } from 'react';
import { LayoutDashboard, TableProperties, Map, Briefcase, FileClock, ShieldAlert, ShieldCheck, Award, LogOut, Users, DollarSign, CreditCard, ArrowUpCircle, Menu, X, Search, ClipboardList, Calculator, FileText, Handshake, BarChart3, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import CommandCenterDashboard from './components/CommandCenterDashboard';
import DirectoryView from './components/DirectoryView';
import MapView from './components/MapView';
import AcquisitionCenterView from './components/AcquisitionCenterView';
import CrmPipelineView from './components/CrmPipelineView';
import LeadDetailsDrawer from './components/LeadDetailsDrawer';
import ScraperLogsView from './components/ScraperLogsView';
import MarketIntelligenceDashboard from './components/MarketIntelligenceDashboard';
import SouthernCoverageDashboard from './components/SouthernCoverageDashboard';
import CashBuyersView from './components/CashBuyersView';
import PropertyFileView from './components/PropertyFileView';
import LoginView from './components/LoginView';
import UserManagementView from './components/UserManagementView';
import SecurityDashboardView from './components/SecurityDashboardView';
import SalesTrackingView from './components/SalesTrackingView';
import PricingLandingPage from './components/PricingLandingPage';
import SubscriptionManagementView from './components/SubscriptionManagementView';

// Plan-based sidebar feature gating
const PLAN_FEATURES = {
  FREE_TRIAL: ['dashboard', 'directory', 'map', 'acquisition'],
  STARTER: ['dashboard', 'directory', 'map', 'acquisition', 'deal_radar_trustee', 'deal_radar_tax', 'deal_radar_probate', 'deal_radar_sheriff', 'deal_radar_counties', 'deal_radar_coverage'],
  PROFESSIONAL: 'ALL',
  EXPIRED: [],
  NONE: [],
};

// Domain-based branding — ForeclosureFinder on frontend-one-roan, MyWholesaleOS on mywholesaleos.com
const isForeclosureFinder = !window.location.hostname.includes('mywholesaleos');
const BRAND_NAME = isForeclosureFinder ? 'ForeclosureFinder AI' : 'MyWholesaleOS';
const BRAND_ICON = isForeclosureFinder ? '🏠' : 'OS';
const BRAND_ICON_BG = isForeclosureFinder ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'var(--accent)';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('ff_auth_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ff_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [maskedToggle, setMaskedToggle] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dealRadarExpanded, setDealRadarExpanded] = useState(false);

  // Check URL query parameters for deep-linked property share links
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const leadIdParam = params.get('lead') || params.get('property');
    if (leadIdParam) {
      setSelectedLeadId(leadIdParam);
      setActiveView('property_file');
    }
  });

  function handleLoginSuccess(loggedInUser, userToken) {
    setUser(loggedInUser);
    setToken(userToken);
  }

  function handleLogout() {
    localStorage.removeItem('ff_auth_token');
    localStorage.removeItem('ff_auth_user');
    setUser(null);
    setToken(null);
  }

  function handleSelectLead(leadId) {
    setSelectedLeadId(leadId);
    // Admins go straight to full property file detail view
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    if (isAdmin) {
      setActiveView('property_file');
    }
  }

  function handleViewChange(viewName) {
    setActiveView(viewName);
    // Auto-expand Deal Radar if navigating to a sub-view
    if (viewName.startsWith('deal_radar')) {
      setDealRadarExpanded(true);
    }
  }

  function handleSubscriptionComplete(updatedUser) {
    const newUser = { ...user, ...updatedUser };
    setUser(newUser);
    localStorage.setItem('ff_auth_user', JSON.stringify(newUser));
    setShowPricing(false);
  }

  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Role-based override: admins always get PROFESSIONAL — no trial, no limits
  const isAdminOrSuper = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const subscriptionPlan = isAdminOrSuper ? 'PROFESSIONAL' : (user?.subscription_plan || 'FREE_TRIAL');
  const isExpiredOrNone = subscriptionPlan === 'EXPIRED' || subscriptionPlan === 'NONE';

  if (isExpiredOrNone || (showPricing && !isAdminOrSuper)) {
    return (
      <PricingLandingPage
        user={user}
        onSubscriptionComplete={handleSubscriptionComplete}
        onContinueTrial={subscriptionPlan === 'FREE_TRIAL' ? () => setShowPricing(false) : undefined}
      />
    );
  }

  const isProfessional = subscriptionPlan === 'PROFESSIONAL';

  // Navbar title map
  const NAVBAR_TITLES = {
    dashboard: 'Command Center',
    directory: 'Deal Radar — Distressed Leads',
    deal_radar_trustee: 'Deal Radar — Trustee Sales',
    deal_radar_tax: 'Deal Radar — Tax Delinquencies',
    deal_radar_probate: 'Deal Radar — Probate',
    deal_radar_sheriff: 'Deal Radar — Sheriff Sales',
    deal_radar_counties: 'Deal Radar — Counties',
    deal_radar_coverage: 'Deal Radar — Coverage',
    deal_radar_intelligence: 'Deal Radar — Intelligence',
    map: 'Deal Radar — Geographic Overview',
    acquisition: 'Acquisition Center',
    crm: 'CRM Pipeline (Legacy)',
    property_file: 'Property Analyzer',
    buyers: 'Disposition Center — Cash Buyers',
    sales_tracking: 'Revenue Center',
    logs: 'Deal Radar — Scraper Logs',
    users_mgmt: 'Team Workspace — User Management',
    security_dashboard: 'Security & Access Configuration',
    subscriptions_mgmt: 'Subscription Management',
    pricing_page: 'Pricing Plans',
  };

  // Deal Radar sub-navigation items
  const dealRadarSubItems = [
    { id: 'directory', name: 'Distressed Leads', icon: Search },
    { id: 'map', name: 'Geographic Map', icon: Map },
    { id: 'deal_radar_coverage', name: 'Coverage', icon: ShieldAlert },
    { id: 'deal_radar_intelligence', name: 'Intelligence', icon: Award },
    { id: 'logs', name: 'Scraper Logs', icon: FileClock },
  ];

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar Nav */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Brand Logo */}
          <div className="logo-container">
            <div className="logo-icon" style={{ background: BRAND_ICON_BG, fontSize: isForeclosureFinder ? '0.85rem' : '0.7rem', fontWeight: 800 }}>{BRAND_ICON}</div>
            <div className="logo-text">{BRAND_NAME}</div>
          </div>

          <nav className="menu-list">
            {/* Dashboard */}
            <button
              className={`menu-item ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            {/* Deal Radar (collapsible) */}
            <button
              className={`menu-item ${['directory', 'map', 'deal_radar_coverage', 'deal_radar_intelligence', 'logs'].includes(activeView) ? 'active' : ''}`}
              onClick={() => {
                setDealRadarExpanded(!dealRadarExpanded);
                if (!dealRadarExpanded) {
                  setActiveView('directory');
                  setMobileMenuOpen(false);
                }
              }}
              style={{ justifyContent: 'space-between' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={18} />
                Deal Radar
              </span>
              {dealRadarExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {dealRadarExpanded && (
              <div style={{ paddingLeft: '18px' }}>
                {dealRadarSubItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={`menu-item ${activeView === item.id ? 'active' : ''}`}
                      onClick={() => { setActiveView(item.id); setMobileMenuOpen(false); }}
                      style={{ fontSize: '0.72rem', padding: '6px 12px' }}
                    >
                      <Icon size={15} />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Acquisition Center */}
            <button
              className={`menu-item ${activeView === 'acquisition' ? 'active' : ''}`}
              onClick={() => { setActiveView('acquisition'); setMobileMenuOpen(false); }}
            >
              <ClipboardList size={18} />
              Acquisition Center
            </button>

            {/* Property Analyzer — accessible via lead detail panel for now */}

            {/* Disposition Center */}
            {isProfessional && (
              <button
                className={`menu-item ${activeView === 'buyers' ? 'active' : ''}`}
                onClick={() => { setActiveView('buyers'); setMobileMenuOpen(false); }}
              >
                <Handshake size={18} />
                Disposition Center
              </button>
            )}

            {/* Revenue Center */}
            {isAdminOrSuper && (
              <button
                className={`menu-item ${activeView === 'sales_tracking' ? 'active' : ''}`}
                onClick={() => { setActiveView('sales_tracking'); setMobileMenuOpen(false); }}
              >
                <BarChart3 size={18} />
                Revenue Center
              </button>
            )}

            {/* Admin sections */}
            {isAdminOrSuper && (
              <>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 4px' }} />
                <button
                  className={`menu-item ${activeView === 'users_mgmt' ? 'active' : ''}`}
                  onClick={() => { setActiveView('users_mgmt'); setMobileMenuOpen(false); }}
                >
                  <Users size={18} />
                  Team Workspace
                </button>
              </>
            )}

            {isSuperAdmin && (
              <>
                <button
                  className={`menu-item ${activeView === 'security_dashboard' ? 'active' : ''}`}
                  onClick={() => { setActiveView('security_dashboard'); setMobileMenuOpen(false); }}
                >
                  <ShieldCheck size={18} />
                  Security
                </button>
                <button
                  className={`menu-item ${activeView === 'subscriptions_mgmt' ? 'active' : ''}`}
                  onClick={() => { setActiveView('subscriptions_mgmt'); setMobileMenuOpen(false); }}
                >
                  <CreditCard size={18} />
                  Subscriptions
                </button>
              </>
            )}
          </nav>
          
          {/* Upgrade Plan Button (non-Professional only) */}
          {!isProfessional && (
            <button
              onClick={() => setShowPricing(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: 'calc(100% - 8px)',
                margin: '8px 4px',
                padding: '8px 12px',
                background: 'var(--accent-subtle)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--accent-subtle)'; }}
            >
              <ArrowUpCircle size={14} />
              Upgrade Plan
            </button>
          )}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div className="user-avatar" style={{ flexShrink: 0 }}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'AD'}
            </div>
            <div className="user-info" style={{ minWidth: 0, overflow: 'hidden' }}>
              <span className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{user?.name || 'Administrator'}</span>
              <span className="user-role" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Administrator' : 'Wholesaler'}
              </span>
              {/* Plan Badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.4px',
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                marginTop: '2px',
                border: '1px solid var(--border-color)',
              }}>
                {subscriptionPlan === 'PROFESSIONAL' ? 'PRO'
                  : subscriptionPlan === 'STARTER' ? 'STARTER'
                  : 'TRIAL'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            title="Log Out"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              padding: '4px',
              transition: 'var(--transition-fast)',
              flexShrink: 0
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--rose)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Navbar */}
        <header className="top-navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="navbar-title">
              {NAVBAR_TITLES[activeView] || BRAND_NAME}
            </h2>
          </div>
          
          <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Pricing Plans — top navbar button */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveView('pricing_page')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: activeView === 'pricing_page' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  border: '1px solid ' + (activeView === 'pricing_page' ? 'var(--accent)' : 'var(--border-color)'),
                  borderRadius: 'var(--radius-md)',
                  color: activeView === 'pricing_page' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <CreditCard size={13} />
                Pricing Plans
              </button>
            )}

            
            <div className="county-pill">
              <div className="pulse-dot" />
              <span>Deal Radar Online (4 MSAs Active)</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Body */}
        <div className="view-body">
          {activeView === 'dashboard' && (
            <CommandCenterDashboard onViewChange={handleViewChange} user={user} />
          )}
          {activeView === 'directory' && (
            <DirectoryView onSelectLead={handleSelectLead} maskedToggle={maskedToggle} />
          )}
          {activeView === 'map' && (
            <MapView onSelectLead={handleSelectLead} maskedToggle={maskedToggle} />
          )}
          {activeView === 'acquisition' && (
            <AcquisitionCenterView onSelectLead={handleSelectLead} />
          )}
          {activeView === 'crm' && (
            <CrmPipelineView onSelectLead={handleSelectLead} />
          )}
          {activeView === 'deal_radar_intelligence' && (
            <MarketIntelligenceDashboard />
          )}
          {activeView === 'deal_radar_coverage' && (
            <SouthernCoverageDashboard />
          )}
          {activeView === 'buyers' && (
            <CashBuyersView onSelectLead={handleSelectLead} />
          )}
          {activeView === 'logs' && (
            <ScraperLogsView />
          )}
          {activeView === 'property_file' && (
            <PropertyFileView leadId={selectedLeadId} onClose={() => setActiveView('directory')} maskedToggle={maskedToggle} />
          )}
          {activeView === 'users_mgmt' && (
            <UserManagementView currentUser={user} />
          )}
          {activeView === 'security_dashboard' && (
            <SecurityDashboardView />
          )}
          {activeView === 'sales_tracking' && (
            <SalesTrackingView />
          )}
          {activeView === 'subscriptions_mgmt' && (
            <SubscriptionManagementView />
          )}
          {activeView === 'pricing_page' && (
            <PricingLandingPage user={user} onSubscriptionComplete={() => setActiveView('dashboard')} embedded={true} />
          )}
        </div>

        {/* Slide-out details drawer overlay */}
        {selectedLeadId && activeView !== 'property_file' && (
          <LeadDetailsDrawer 
            leadId={selectedLeadId} 
            onClose={() => setSelectedLeadId(null)} 
            onOpenFullPage={() => setActiveView('property_file')} 
            currentUser={user}
          />
        )}
      </main>
    </div>
  );
}
