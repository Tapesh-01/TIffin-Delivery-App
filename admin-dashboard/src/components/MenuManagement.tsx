import React from 'react';
import './MenuManagement.css';

interface WeeklyMenuDay {
  id: string;
  emoji: string;
  day_name: string;
  main_dish: string;
  side_dish: string;
}

interface MenuManagementProps {
  weeklyMenu: WeeklyMenuDay[];
  handleMenuChange: (dayId: string, field: string, value: string) => void;
  saveMenuDay: (day: WeeklyMenuDay) => void;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({
  weeklyMenu,
  handleMenuChange,
  saveMenuDay,
}) => {
  return (
    <div className="menu-container">
      <div className="menu-header">
        <h3 className="menu-title">Weekly Menu Manager</h3>
        <p className="menu-subtitle">Update the daily menu. Changes reflect instantly on the student app.</p>
      </div>
      
      <div className="menu-grid">
        {weeklyMenu.map((day) => (
          <div key={day.id} className="menu-row">
            <div className="menu-emoji-wrap">
              <input 
                type="text" 
                value={day.emoji} 
                onChange={(e) => handleMenuChange(day.id, 'emoji', e.target.value)}
                className="menu-emoji-input" 
              />
            </div>
            
            <div className="menu-day-name-wrap">
              <h4 className="menu-day-name">{day.day_name}</h4>
            </div>
            
            <div className="menu-fields-wrap">
              <input 
                type="text" 
                value={day.main_dish} 
                onChange={(e) => handleMenuChange(day.id, 'main_dish', e.target.value)}
                placeholder="Main Dish"
                className="menu-field-input"
              />
              <input 
                type="text" 
                value={day.side_dish} 
                onChange={(e) => handleMenuChange(day.id, 'side_dish', e.target.value)}
                placeholder="Side Dish"
                className="menu-field-input"
              />
            </div>
            
            <button 
              onClick={() => saveMenuDay(day)}
              className="btn-save-menu"
            >
              Save
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
