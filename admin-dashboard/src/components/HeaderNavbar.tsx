import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Utensils, 
  ChefHat, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Activity, 
  RefreshCw, 
  Moon, 
  Sun 
} from 'lucide-react';
import './HeaderNavbar.css';

interface HeaderNavbarProps {
  currentUser: any;
  roleMode: string;
  handleRoleChange: (role: 'owner' | 'kitchen' | 'support') => void;
  handleGenerateTiffins: () => void;
  isGeneratingTiffins: boolean;
  loadAllData: () => void;
  isLoading: boolean;
  toggleTheme: () => void;
  theme: string;
  handleLogout: () => void;
  activeTab: string;
  navigate: (path: string) => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentUser,
  roleMode,
  handleRoleChange,
  handleGenerateTiffins,
  isGeneratingTiffins,
  loadAllData,
  isLoading,
  toggleTheme,
  theme,
  handleLogout,
  activeTab,
  navigate,
}) => {
  return (
    <header className="header-navbar">
      {/* Top row: brand, live indicator, and user buttons */}
      <div className="header-top-row">
        <div className="brand-wrap">
          <span className="brand-emoji">🍱</span>
          <div>
            <h1 className="brand-title">Student Tiffin Hub</h1>
            <p className="brand-subtitle">
              {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Host Dashboard'}
            </p>
          </div>
        </div>

        <div className="actions-wrap">
          {/* Live Indicator */}
          <div className="sync-badge">
            <span className="sync-dot"></span>
            Live Sync
          </div>

          {/* Daily Tiffin Orders Generator (Admin Dispatch Activator) */}
          {roleMode !== 'support' && (
            <button
              onClick={handleGenerateTiffins}
              disabled={isGeneratingTiffins}
              className="btn-generate-tiffins"
            >
              🍳 {isGeneratingTiffins ? 'Starting Tiffins...' : 'Start Today\'s Tiffins'}
            </button>
          )}

          {/* Access Role Switcher */}
          <div className="role-switcher">
            <button 
              onClick={() => handleRoleChange('owner')} 
              className={`btn-role ${roleMode === 'owner' ? 'active' : ''}`}
            >
              Owner
            </button>
            <button 
              onClick={() => handleRoleChange('kitchen')} 
              className={`btn-role ${roleMode === 'kitchen' ? 'active' : ''}`}
            >
              Kitchen
            </button>
            <button 
              onClick={() => handleRoleChange('support')} 
              className={`btn-role ${roleMode === 'support' ? 'active' : ''}`}
            >
              Support
            </button>
          </div>

          {/* Icons row */}
          <div className="icons-wrap">
            <button onClick={loadAllData} title="Refresh Data" className="btn-icon">
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={toggleTheme} title="Toggle Theme" className="btn-icon">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button onClick={handleLogout} className="btn-logout">
              🚪 Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Tab buttons (Horizontally scrollable on mobile) */}
      <div className="tabs-row">
        {roleMode !== 'support' && (
          <button
            onClick={() => navigate('/dashboard')}
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={16} />
            <span>Kitchen & Overview</span>
          </button>
        )}

        {roleMode !== 'support' && (
          <button
            onClick={() => navigate('/fleet')}
            className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
          >
            <Truck size={16} />
            <span>Fleet Tracking Map</span>
          </button>
        )}

        {roleMode !== 'support' && (
          <button
            onClick={() => navigate('/menu')}
            className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          >
            <Utensils size={16} />
            <span>Menu Management</span>
          </button>
        )}

        {roleMode !== 'support' && (
          <button
            onClick={() => navigate('/restaurant-menu')}
            className={`tab-btn ${activeTab === 'restaurant-menu' ? 'active' : ''}`}
          >
            <ChefHat size={16} />
            <span>Restaurant Menu</span>
          </button>
        )}

        {roleMode !== 'support' && (
          <button
            onClick={() => navigate('/riders-mgmt')}
            className={`tab-btn ${activeTab === 'riders-mgmt' ? 'active' : ''}`}
          >
            <Truck size={16} />
            <span>🛵 Riders Section</span>
          </button>
        )}

        {roleMode !== 'kitchen' && (
          <button
            onClick={() => navigate('/crm')}
            className={`tab-btn ${activeTab === 'crm' ? 'active' : ''}`}
          >
            <Users size={16} />
            <span>CRM & Refunds</span>
          </button>
        )}

        {roleMode === 'owner' && (
          <button
            onClick={() => navigate('/finance')}
            className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
          >
            <DollarSign size={16} />
            <span>Earnings & Finance</span>
          </button>
        )}

        {roleMode !== 'kitchen' && (
          <button
            onClick={() => navigate('/reviews')}
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          >
            <MessageSquare size={16} />
            <span>Student Reviews</span>
          </button>
        )}

        {roleMode === 'owner' && (
          <button
            onClick={() => navigate('/logs')}
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          >
            <Activity size={16} />
            <span>System Activity Logs</span>
          </button>
        )}
      </div>
    </header>
  );
};
