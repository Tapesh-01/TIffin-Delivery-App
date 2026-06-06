import React, { useState, useEffect } from 'react';
import { DollarSign, Layers, Utensils, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import './KitchenOverview.css';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, prefix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalDuration = 800; // ms
    const incrementTime = 30; // ms
    const totalSteps = Math.ceil(totalDuration / incrementTime);
    const stepValue = end / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(stepValue * currentStep));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}</span>;
};

interface KitchenOverviewProps {
  todayRevenue: number;
  todayCashInflow: number;
  allTimeRevenue: number;
  allTimeCashInflow: number;
  profiles: any[];
  orders: any[];
  basicCount: number;
  standardCount: number;
  premiumCount: number;
  totalMealCount: number;
  rawRice: number;
  rawAtta: number;
  rawPaneer: number;
  extraRotiCount: number;
  curdCount: number;
  jamunCount: number;
  saladCount: number;
  todayAddonOrdersCount: number;
  todayAddonRevenue: number;
  lastUpdatedTime: string;
  activityLogs: any[];
  transactions: any[];
  chartActive: boolean;
  setShowSubscribersModal: (s: boolean) => void;
  handleDispatch: (order: any, riderId?: string) => void;
  handleRejectTransaction: (tx: any) => void;
  handleApproveTransaction: (tx: any) => void;
  loadAllData: () => void;
}

export const KitchenOverview: React.FC<KitchenOverviewProps> = ({
  todayRevenue,
  todayCashInflow,
  allTimeRevenue,
  allTimeCashInflow,
  profiles,
  orders,
  basicCount,
  standardCount,
  premiumCount,
  totalMealCount,
  rawRice,
  rawAtta,
  rawPaneer,
  extraRotiCount,
  curdCount,
  jamunCount,
  saladCount,
  todayAddonOrdersCount,
  todayAddonRevenue,
  lastUpdatedTime,
  activityLogs,
  transactions,
  chartActive,
  setShowSubscribersModal,
  handleDispatch,
  handleRejectTransaction,
  handleApproveTransaction,
  loadAllData,
}) => {
  const [selectedRiders, setSelectedRiders] = useState<Record<string, string>>({});

  return (
    <div className="kitchen-overview-container">
      {/* Upper Widgets */}
      <div className="widgets-grid">
        {/* Card 1: Today's Revenue */}
        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Today's Revenue (Delivered)</span>
            <DollarSign size={18} style={{ color: '#10b981' }} />
          </div>
          <h3 className="widget-value green">
            <AnimatedCounter value={todayRevenue} prefix="₹" />
          </h3>
          <p className="widget-subtitle">
            From {orders.filter(o => o.status === 'delivered').length} delivered meals + add-ons today
          </p>
        </div>

        {/* Card 2: Today's Cash Inflow */}
        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Today's Cash Inflow (Recharges)</span>
            <DollarSign size={18} style={{ color: '#f59e0b' }} />
          </div>
          <h3 className="widget-value orange">
            <AnimatedCounter value={todayCashInflow} prefix="₹" />
          </h3>
          <p className="widget-subtitle">
            Total approved deposits today
          </p>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div 
          onClick={() => setShowSubscribersModal(true)}
          className="widget-card clickable"
        >
          <div className="widget-header">
            <span className="widget-title">Active Subscriptions</span>
            <Layers size={18} style={{ color: '#3b82f6' }} />
          </div>
          <h3 className="widget-value blue">
            <AnimatedCounter value={profiles.filter(p => p.plan !== 'none').length} /> / {profiles.length}
          </h3>
          <p className="widget-subtitle">
            Students with active meal plans (click to see)
          </p>
        </div>

        {/* Card 4: All-Time Revenue */}
        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">All-Time Revenue (Delivered)</span>
            <DollarSign size={18} style={{ color: '#10b981' }} />
          </div>
          <h3 className="widget-value green">
            <AnimatedCounter value={allTimeRevenue} prefix="₹" />
          </h3>
          <p className="widget-subtitle">
            Total value of all delivered meals + add-ons ever
          </p>
        </div>

        {/* Card 5: All-Time Cash Collected */}
        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">All-Time Cash Inflow (Recharges)</span>
            <DollarSign size={18} style={{ color: '#f59e0b' }} />
          </div>
          <h3 className="widget-value orange">
            <AnimatedCounter value={allTimeCashInflow} prefix="₹" />
          </h3>
          <p className="widget-subtitle">
            Total approved deposits ever
          </p>
        </div>

        {/* Card 6: Wallet Liability */}
        <div className="widget-card">
          <div className="widget-header">
            <span className="widget-title">Wallet Balance Liability</span>
            <DollarSign size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <h3 className="widget-value purple">
            <AnimatedCounter value={profiles.reduce((sum, p) => sum + Number(p.wallet_balance || 0), 0)} prefix="₹" />
          </h3>
          <p className="widget-subtitle purple">
            Outstanding liability of student balances
          </p>
        </div>
      </div>

      {/* Smart Demand Forecasting & Inventory Panel */}
      <div className="forecast-grid">
        {/* Kitchen Plan Count & Forecast */}
        <div className="preparation-card">
          <h3 className="prep-title">
            <Utensils style={{ color: 'var(--primary)' }} /> Kitchen Preparation & Demand
          </h3>
          
          <div className="prep-bars-wrap">
            <div className="prep-bar-row">
              <div className="prep-bar-label">
                <span>Basic Meal (₹70)</span>
                <span className="prep-bar-val">{basicCount} orders</span>
              </div>
              <div className="prep-bar-container">
                <div className="chart-bar-grow" style={{ width: `${chartActive && totalMealCount > 0 ? (basicCount / totalMealCount) * 100 : 0}%`, backgroundColor: '#3b82f6' }} />
              </div>
            </div>

            <div className="prep-bar-row">
              <div className="prep-bar-label">
                <span>Standard Meal (₹90)</span>
                <span className="prep-bar-val">{standardCount} orders</span>
              </div>
              <div className="prep-bar-container">
                <div className="chart-bar-grow" style={{ width: `${chartActive && totalMealCount > 0 ? (standardCount / totalMealCount) * 100 : 0}%`, backgroundColor: '#f97316' }} />
              </div>
            </div>

            <div className="prep-bar-row">
              <div className="prep-bar-label">
                <span>Premium Meal (₹130)</span>
                <span className="prep-bar-val">{premiumCount} orders</span>
              </div>
              <div className="prep-bar-container">
                <div className="chart-bar-grow" style={{ width: `${chartActive && totalMealCount > 0 ? (premiumCount / totalMealCount) * 100 : 0}%`, backgroundColor: '#8b5cf6' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Material requirement calculator */}
        <div className="material-card">
          <h3 className="material-title">
            <Sparkles size={18} /> Raw Material Forecast
          </h3>
          
          <div className="material-items-list">
            <div className="material-item-row">
              <span className="material-item-label">Rice required:</span>
              <strong className="material-item-val">{rawRice} kg</strong>
            </div>
            <div className="material-item-row">
              <span className="material-item-label">Wheat Flour (Atta):</span>
              <strong className="material-item-val">{rawAtta} kg</strong>
            </div>
            <div className="material-item-row">
              <span className="material-item-label">Paneer (Premium plan):</span>
              <strong className="material-item-val">{rawPaneer} kg</strong>
            </div>
          </div>
          <p className="material-note">
            * Calculated dynamically based on active subscription settings per student plan tonight.
          </p>
        </div>
      </div>

      {/* Daily Add-ons & Live Feed */}
      <div className="addons-feed-grid">
        {/* Daily Add-ons Counts */}
        <div className="addons-card">
          <div className="addons-header-row">
            <h3 className="addons-title">⚡ Today's Add-on Order Summary</h3>
            <span className="addons-updated-badge">
              Last Updated: {lastUpdatedTime}
            </span>
          </div>
          
          <div className="addons-items-grid">
            {/* Roti */}
            <div className="addon-box">
              <span className="addon-emoji">🫓</span>
              <h4 className="addon-name">Extra Roti</h4>
              <p className="addon-qty">{extraRotiCount} units</p>
              <p className="addon-multiplier">({extraRotiCount} × ₹15)</p>
              <p className="addon-cost">₹{extraRotiCount * 15}</p>
            </div>
            
            {/* Curd */}
            <div className="addon-box">
              <span className="addon-emoji">🥛</span>
              <h4 className="addon-name">Curd Cups</h4>
              <p className="addon-qty">{curdCount} units</p>
              <p className="addon-multiplier">({curdCount} × ₹20)</p>
              <p className="addon-cost">₹{curdCount * 20}</p>
            </div>

            {/* Gulab Jamun */}
            <div className="addon-box">
              <span className="addon-emoji">🍮</span>
              <h4 className="addon-name">Gulab Jamun</h4>
              <p className="addon-qty">{jamunCount} units</p>
              <p className="addon-multiplier">({jamunCount} × ₹25)</p>
              <p className="addon-cost">₹{jamunCount * 25}</p>
            </div>

            {/* Salad */}
            <div className="addon-box">
              <span className="addon-emoji">🥗</span>
              <h4 className="addon-name">Salad Bowls</h4>
              <p className="addon-qty">{saladCount} units</p>
              <p className="addon-multiplier">({saladCount} × ₹15)</p>
              <p className="addon-cost">₹{saladCount * 15}</p>
            </div>
          </div>

          {/* Addon Summary statistics banner */}
          <div className="addons-summary-banner">
            <span className="addons-summary-text">
              Today's Add-on Orders: <strong style={{ color: 'var(--text-primary)' }}>{todayAddonOrdersCount}</strong> • Items sold: <strong style={{ color: 'var(--text-primary)' }}>{extraRotiCount + curdCount + jamunCount + saladCount}</strong>
            </span>
            <span className="addons-summary-val">
              Total Add-on Revenue: ₹{todayAddonRevenue}
            </span>
          </div>

          {/* Yesterday Summary Gray Card */}
          <div className="yesterday-card">
            <div className="yesterday-meta-wrap">
              <span style={{ fontSize: '20px' }}>📅</span>
              <div>
                <h4 className="yesterday-title">Yesterday's Summary</h4>
                <p className="yesterday-desc">Performance reference from previous day</p>
              </div>
            </div>
            <div className="yesterday-stats-badge">
              3 addon orders • ₹185 revenue
            </div>
          </div>
        </div>

        {/* Real-time floating activity ticker panel */}
        <div className="live-feed-card">
          <div className="live-feed-header">
            <h3 className="live-feed-title">
              <span className="live-feed-pulse" />
              Live System Feed
            </h3>
            <span className="live-feed-status">ONLINE</span>
          </div>
          
          <div className="live-feed-list">
            {activityLogs.slice(0, 5).map((log, idx) => {
              const type = log.activityType || '';
              const mappings: Record<string, { bg: string, color: string, icon: string }> = {
                signup: { bg: '#dcfce7', color: '#15803d', icon: '🆕' },
                login: { bg: '#e0f2fe', color: '#0369a1', icon: '🔑' },
                profile_update: { bg: '#f1f5f9', color: '#475569', icon: '👤' },
                referral_applied: { bg: '#faf5ff', color: '#7e22ce', icon: '🎁' },
                wallet_recharge_request: { bg: '#fef3c7', color: '#b45309', icon: '💳' },
                wallet_recharge_approved: { bg: '#dcfce7', color: '#15803d', icon: '✅' },
                wallet_recharge_rejected: { bg: '#fee2e2', color: '#b91c1c', icon: '❌' },
                plan_subscribed: { bg: '#e0e7ff', color: '#4338ca', icon: '👑' },
                order_placed: { bg: '#ffedd5', color: '#c2410c', icon: '🍛' },
                order_dispatched: { bg: '#f3e8ff', color: '#6b21a8', icon: '🛵' },
                order_delivered: { bg: '#dcfce7', color: '#15803d', icon: '📦' },
                vacation_started: { bg: '#fee2e2', color: '#b91c1c', icon: '🏖️' },
                vacation_cancelled: { bg: '#f1f5f9', color: '#475569', icon: '↩️' },
                meal_rated: { bg: '#fef9c3', color: '#a16207', icon: '⭐' },
                poll_voted: { bg: '#ecfdf5', color: '#047857', icon: '🗳️' },
                admin_adjustment: { bg: '#e0f2fe', color: '#0369a1', icon: '⚙️' }
              };
              const style = mappings[type] || { bg: '#f1f5f9', color: '#475569', icon: '📝' };

              return (
                <div 
                  key={log._id || log.id || idx} 
                  className="activity-ticker-item"
                >
                  <span style={{ fontSize: '16px' }}>{style.icon}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: '1.4', fontWeight: 500 }}>
                      {log.description}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            {activityLogs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px 0' }}>
                Waiting for activities...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Active Kitchen Orders */}
      <div className="active-orders-card">
        <h3 className="active-orders-title">
          <span>👨‍🍳</span> Active Kitchen Orders ({orders.filter(o => ['pending', 'cooking', 'packed'].includes(o.status)).length})
        </h3>
        
        {orders.filter(o => ['pending', 'cooking', 'packed'].includes(o.status)).length > 0 ? (
          <div className="active-orders-grid">
            {orders.filter(o => ['pending', 'cooking', 'packed'].includes(o.status)).map((order) => {
              const studentName = order.user?.name || 'Student User';
              const addressText = order.user?.addressLine 
                ? `${order.user.addressLine}` 
                : `Hostel: ${order.user?.addressHostel || 'BH-3'}, Room ${order.user?.addressRoom || 'N/A'}`;
              return (
                <div key={order._id || order.id} className="active-order-box">
                  <div>
                    <div className="active-order-header">
                      <h4 className="active-order-student">{studentName}</h4>
                      <span className="active-order-price">₹{order.totalAmount}</span>
                    </div>
                    <p className="active-order-address">📍 {addressText}</p>
                    
                    <div className="active-order-items-list">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="active-order-item-row">
                          <span>{item.name} x {item.quantity}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="active-order-footer">
                    <span className="active-order-status-badge" style={{ 
                      backgroundColor: order.status === 'cooking' ? 'rgba(59,130,246,0.15)' : order.status === 'packed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: order.status === 'cooking' ? '#3b82f6' : order.status === 'packed' ? '#10b981' : '#f59e0b',
                    }}>
                      {order.status === 'cooking' ? '👨‍🍳 Cooking' : order.status === 'packed' ? '📦 Packed' : '⏳ Pending'}
                    </span>
                    
                    {order.status === 'pending' && (
                      <button 
                        onClick={async () => {
                          try {
                            await api.put(`/orders/${order._id || order.id}/status`, { status: 'cooking' });
                            loadAllData();
                          } catch (err: any) {
                            alert(`Failed to start cooking: ${err.message}`);
                          }
                        }}
                        style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                      >
                        🍳 Start Cooking
                      </button>
                    )}
                    
                    {order.status === 'cooking' && (
                      <button 
                        onClick={async () => {
                          try {
                            await api.put(`/orders/${order._id || order.id}/status`, { status: 'packed' });
                            loadAllData();
                          } catch (err: any) {
                            alert(`Failed to pack order: ${err.message}`);
                          }
                        }}
                        style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                      >
                        📦 Pack
                      </button>
                    )}

                    {order.status === 'packed' && (() => {
                      const riders = profiles.filter(p => p.role === 'rider');
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {riders.length > 0 && (
                            <select
                              value={selectedRiders[order._id || order.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedRiders(prev => ({
                                  ...prev,
                                  [order._id || order.id]: val
                                }));
                              }}
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: 'var(--text-primary)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                outline: 'none',
                                maxWidth: '140px',
                                height: '28px',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="" style={{ background: '#1e293b' }}>-- Select Rider --</option>
                              {riders.map(r => (
                                <option key={r._id || r.id} value={r._id || r.id} style={{ background: '#1e293b' }}>
                                  {r.name} {r.isOnline ? '🟢' : '⚫'}
                                </option>
                              ))}
                            </select>
                          )}
                          <button 
                            onClick={() => {
                              const riderId = selectedRiders[order._id || order.id];
                              handleDispatch(order, riderId);
                            }}
                            style={{ backgroundColor: '#f97316', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, height: '28px' }}
                          >
                            🛵 Dispatch
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="active-order-empty-state">
            🎉 No active orders in preparation right now!
          </div>
        )}
      </div>

      {/* Live UPI Payment Approvals Panel */}
      <div className="upi-approvals-card">
        <h3 className="upi-approvals-title">
          <span>💳</span> Pending UPI Payment Approvals (Real-time)
        </h3>
        
        {transactions.filter(t => t.type === 'recharge' && t.status === 'pending').length > 0 ? (
          <div className="upi-table-wrap">
            <table className="upi-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>UTR / Reference ID</th>
                  <th>Request Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.filter(t => t.type === 'recharge' && t.status === 'pending').map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 600 }}>{tx.profiles?.name || 'Student User'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{tx.profiles?.phone || 'N/A'}</td>
                    <td style={{ fontWeight: 'bold', color: '#10b981' }}>₹{tx.amount}</td>
                    <td style={{ fontFamily: 'monospace', color: '#f59e0b', fontSize: '13px', letterSpacing: '0.5px' }}>
                      {tx.utr || 'N/A'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                    </td>
                    <td className="upi-actions-cell">
                      <button
                        onClick={() => handleRejectTransaction(tx)}
                        className="btn-reject-tx"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveTransaction(tx)}
                        className="btn-approve-tx"
                      >
                        Approve & Credit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="upi-empty-state">
            ✅ No pending payment approvals. All recharges are up to date!
          </div>
        )}
      </div>
    </div>
  );
};
