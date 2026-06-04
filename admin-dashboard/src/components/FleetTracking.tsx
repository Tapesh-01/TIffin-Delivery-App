import React from 'react';
import { MapPin, Send } from 'lucide-react';
import { api } from '../lib/api';
import './FleetTracking.css';

interface FleetTrackingProps {
  orders: any[];
  loadAllData: () => void;
  dispatchedOrderId: string | null;
  handleDispatch: (order: any) => void;
  riderPosition: { x: number; y: number };
  deliveryProgress: number;
  liveRiders: Record<string, any>;
}

export const FleetTracking: React.FC<FleetTrackingProps> = ({
  orders,
  loadAllData,
  dispatchedOrderId,
  handleDispatch,
  riderPosition,
  deliveryProgress,
  liveRiders,
}) => {
  const mapCoordsToSvg = (lat: number, lng: number) => {
    const baseLat = 28.6139;
    const baseLng = 77.2090;
    const scaleY = (lat - baseLat) / 0.007;
    const scaleX = (lng - baseLng) / 0.002;
    const x = Math.max(20, Math.min(340, 40 + scaleX * 240 + scaleY * 40));
    const y = Math.max(20, Math.min(300, 180 - scaleY * 120 + scaleX * 30));
    return { x, y };
  };

  return (
    <div className="fleet-tracking-container">
      <div className="fleet-tracking-grid">
        
        {/* Delivery Orders List */}
        <div className="shipments-card">
          <h3 className="shipments-title">Hostel Shipments</h3>
          <p className="shipments-subtitle">Select a packed meal and dispatch to simulate GPS movement.</p>
          
          <div className="shipments-list">
            {orders.map((order) => {
              const studentName = order.user?.name || 'Student';
              const isNewAddress = !!order.user?.addressLine;
              const addressText = isNewAddress 
                ? `${order.user.addressLine}, ${order.user.city || ''} ${order.user.pincode || ''}`
                : `Hostel: ${order.user?.addressHostel || order.user?.address_hostel || 'BH-3'} (Room ${order.user?.addressRoom || order.user?.address_room || '204'})`;
              
              return (
                <div key={order._id || order.id} className="shipment-item">
                  <div className="shipment-header">
                    <div>
                      <h4 className="shipment-user">{studentName}</h4>
                      <p className="shipment-address">
                        {addressText}
                      </p>
                      {order.isTiffinOrder ? (
                        <span className="shipment-type-badge" style={{ color: '#f97316' }}>🍱 Tiffin Subscription ({order.user?.plan || 'Standard'})</span>
                      ) : (
                        <span className="shipment-type-badge" style={{ color: '#3b82f6' }}>🍔 Restaurant: {order.restaurant?.name || 'Partner Restaurant'}</span>
                      )}
                      <div className={`shipment-status-badge`} style={{
                        backgroundColor: order.status === 'delivered' ? 'rgba(16,185,129,0.15)' : order.status === 'out_for_delivery' ? 'rgba(139,92,246,0.15)' : order.status === 'cooking' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                        color: order.status === 'delivered' ? '#10b981' : order.status === 'out_for_delivery' ? '#8b5cf6' : order.status === 'cooking' ? '#3b82f6' : '#f59e0b'
                      }}>
                        {order.status === 'out_for_delivery' ? '🛵 Out For Delivery' : order.status === 'delivered' ? '✅ Delivered' : order.status === 'cooking' ? '🍳 Cooking' : order.status === 'packed' ? '📦 Packed' : '⏳ Pending'}
                      </div>
                    </div>
                  </div>
                  <div className="shipment-actions-bar">
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
                        className="btn-start-cooking"
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
                        className="btn-pack-order"
                      >
                        📦 Pack Order
                      </button>
                    )}
                    {order.status === 'packed' && !dispatchedOrderId && (
                      <button 
                        onClick={() => handleDispatch(order)}
                        className="btn-dispatch-order"
                      >
                        <Send size={12} /> Dispatch
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GPS Live Map Simulator Graphic (SVG) */}
        <div className="map-card">
          <h3 className="map-title">
            <MapPin size={18} style={{ color: '#ef4444' }} /> Campus GPS Fleet Monitor
          </h3>
          
          {/* SVG Live Simulation Area */}
          <div className="map-simulation-area">
            
            {/* Central Kitchen */}
            <div className="kitchen-node">
              <div className="kitchen-icon">🍳</div>
              <span className="node-label">Central Kitchen</span>
            </div>

            {/* Hostel BH-1 */}
            <div className="hostel-node" style={{ right: '140px', top: '30px' }}>
              <div className="hostel-icon">🏢</div>
              <span className="node-label">Boys Hostel-1</span>
            </div>

            {/* Hostel BH-3 */}
            <div className="hostel-node" style={{ right: '40px', top: '80px' }}>
              <div className="hostel-icon">🏢</div>
              <span className="node-label">Boys Hostel-3</span>
            </div>

            {/* Hostel GH-2 */}
            <div className="hostel-node" style={{ right: '80px', bottom: '60px' }}>
              <div className="hostel-icon">🏢</div>
              <span className="node-label">Girls Hostel-2</span>
            </div>

            {/* Road Paths */}
            <svg className="road-path-svg">
              {/* Path to BH-3 */}
              <line x1="50" y1="180" x2="280" y2="100" stroke="var(--border)" strokeWidth="2" strokeDasharray="5" />
              {/* Path to GH-2 */}
              <line x1="50" y1="180" x2="320" y2="240" stroke="var(--border)" strokeWidth="2" strokeDasharray="5" />
            </svg>

             {/* Delivery Rider Dot Indicator */}
            {dispatchedOrderId && (
              <div className="rider-dot-indicator" style={{ left: `${riderPosition.x}px`, top: `${riderPosition.y}px` }}>
                <div className="rider-dot-icon">
                  <span style={{ fontSize: '14px' }}>🛵</span>
                </div>
                <div className="rider-dot-label">
                  Dispatched {deliveryProgress}%
                </div>
              </div>
            )}

            {/* Live Tracked Riders from GPS */}
            {Object.values(liveRiders).map((rider: any) => {
              const pos = mapCoordsToSvg(rider.latitude, rider.longitude);
              return (
                <div key={rider.riderId} className="live-rider-indicator" style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
                  <div className="live-rider-icon">
                    <span style={{ fontSize: '14px' }}>🛵</span>
                  </div>
                  <div className="live-rider-label">
                    🟢 {rider.riderName} {rider.riderVehicle ? `(${rider.riderVehicle})` : ''} (Live)
                  </div>
                </div>
              );
            })}

            {!dispatchedOrderId && Object.keys(liveRiders).length === 0 && (
              <div className="map-empty-state">
                Ready to Dispatch. Active riders will show up moving live on this map in real-time.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
