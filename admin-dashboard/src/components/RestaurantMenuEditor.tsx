import React from 'react';
import './RestaurantMenuEditor.css';

interface RestaurantMenuEditorProps {
  restaurants: any[];
  customCategories: Record<string, string[]>;
  setCustomCategories: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setShowRestaurantModal: (show: boolean) => void;
  handleDeleteRestaurant: (id: string, name: string) => void;
  openAddItemModal: (restaurantId: string, category: string) => void;
  openEditItemModal: (restaurantId: string, item: any) => void;
  handleDeleteItem: (restaurantId: string, itemId: string, name: string) => void;
  toggleItemAvailability: (restaurantId: string, itemId: string, currentStatus: boolean) => void;
}

export const RestaurantMenuEditor: React.FC<RestaurantMenuEditorProps> = ({
  restaurants,
  customCategories,
  setCustomCategories,
  setShowRestaurantModal,
  handleDeleteRestaurant,
  openAddItemModal,
  openEditItemModal,
  handleDeleteItem,
  toggleItemAvailability,
}) => {
  return (
    <div className="editor-container">
      <div className="editor-header">
        <div>
          <h3 className="editor-title">Restaurant Menu Editor</h3>
          <p className="editor-subtitle">
            Manage menus, create sections dynamically, and toggle item availability in real-time.
          </p>
        </div>
        <button
          onClick={() => setShowRestaurantModal(true)}
          className="btn-add-section"
        >
          ➕ Add New Section / Restaurant
        </button>
      </div>

      {restaurants.length === 0 ? (
        <div className="editor-empty">
          No restaurants found or loading...
        </div>
      ) : (
        <div className="section-list">
          {restaurants.map((restaurant) => {
            // Handle dynamic custom category creation
            const handleAddCategory = () => {
              const sectionName = window.prompt("Enter new section name (e.g. Drinks, Desserts, Starters):");
              if (sectionName && sectionName.trim()) {
                const trimmed = sectionName.trim();
                setCustomCategories(prev => {
                  const existing = prev[restaurant._id] || [];
                  if (existing.map(e => e.toLowerCase()).includes(trimmed.toLowerCase())) {
                    alert(`Section "${trimmed}" already exists.`);
                    return prev;
                  }
                  return {
                    ...prev,
                    [restaurant._id]: [...existing, trimmed]
                  };
                });
              }
            };

            const items = restaurant.menuItems || [];
            const restaurantCats = customCategories[restaurant._id] || [];
            
            // Extract all categories from items and merge with customCategories
            const itemCats = Array.from(new Set(items.map((i: any) => i.category || 'Popular Dishes'))) as string[];
            const categoriesToRender = Array.from(new Set([...restaurantCats, ...itemCats]));

            return (
              <div key={restaurant._id} className="section-card">
                <div className="section-card-header">
                  <div className="vendor-info">
                    {restaurant.image && (
                      <img src={restaurant.image} alt={restaurant.name} className="vendor-img" />
                    )}
                    <div>
                      <h4 className="vendor-name">{restaurant.name}</h4>
                      <span className="vendor-meta">{restaurant.cuisine} • {restaurant.deliveryTime}</span>
                    </div>
                  </div>
                  <div className="vendor-actions">
                    <button
                      onClick={handleAddCategory}
                      className="btn-create-category"
                    >
                      ➕ Create New Section
                    </button>
                    <button
                      onClick={() => handleDeleteRestaurant(restaurant._id, restaurant.name)}
                      className="btn-delete-section"
                    >
                      🗑️ Delete Section
                    </button>
                  </div>
                </div>

                <div className="categories-container">
                  {categoriesToRender.map((categoryName) => {
                    const catItems = items.filter((item: any) => (item.category || 'Popular Dishes').toLowerCase() === categoryName.toLowerCase());
                    return (
                      <div key={categoryName} className="category-block">
                        <div className="category-block-header">
                          <h5 className="category-title">
                            {categoryName}
                          </h5>
                          <button
                            onClick={() => openAddItemModal(restaurant._id, categoryName)}
                            className="btn-add-dish"
                          >
                            ➕ Add Dish to {categoryName}
                          </button>
                        </div>

                        {catItems.length === 0 ? (
                          <div className="category-empty">
                            No dishes in this section yet. Click "Add Dish to {categoryName}" to add one!
                          </div>
                        ) : (
                          <div className="dishes-grid">
                            {catItems.map((item: any) => {
                              const isVeg = item.isVeg !== false;
                              const isAvailable = item.isAvailable !== false;
                              return (
                                <div key={item._id} className="dish-card" style={{ opacity: isAvailable ? 1 : 0.8 }}>
                                  <div className="dish-body">
                                    {item.image && (
                                      <img src={item.image} alt={item.name} className="dish-img" />
                                    )}
                                    <div className="dish-info">
                                      <div className="dish-title-wrap">
                                        <div className="dish-veg-indicator">
                                          <span>{isVeg ? '🟢' : '🔴'}</span>
                                          <h5 className="dish-name">{item.name}</h5>
                                        </div>
                                        <div className="dish-btn-group">
                                          <button
                                            onClick={() => openEditItemModal(restaurant._id, item)}
                                            title="Edit Dish"
                                            className="btn-edit-dish"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            onClick={() => handleDeleteItem(restaurant._id, item._id || item.id, item.name)}
                                            title="Delete Dish"
                                            className="btn-delete-dish"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>
                                      <p className="dish-desc">{item.description}</p>
                                    </div>
                                  </div>

                                  <div className="dish-footer">
                                    <div className="price-wrap">
                                      <span className="dish-price">₹{item.price}</span>
                                      {item.originalPrice && item.originalPrice > item.price && (
                                        <>
                                          <span className="dish-original-price">₹{item.originalPrice}</span>
                                          <span className="dish-discount-badge">
                                            {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => toggleItemAvailability(restaurant._id, item._id, isAvailable)}
                                      className="btn-availability"
                                      style={{
                                        backgroundColor: isAvailable ? 'var(--accent-green)' : 'var(--accent-red)',
                                      }}
                                    >
                                      {isAvailable ? (
                                        <>🟢 Available</>
                                      ) : (
                                        <>🔴 Out of Stock</>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
