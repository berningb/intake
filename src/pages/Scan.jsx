import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Search, Plus, X, Loader2, AlertCircle, ScanBarcode } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useLedger } from '../context/LedgerContext';

export function Scan({ onClose, isModal = false }) {
  const { addFoodEntry } = useLedger();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('search');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [manualBarcode, setManualBarcode] = useState('');
  const [servingAmount, setServingAmount] = useState(100);
  const [servingUnit, setServingUnit] = useState('g');
  const debounceRef = useRef(null);

  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  // Determine food quality based on protein-to-calorie ratio
  const getFoodQuality = (calories, protein, fat) => {
    if (!calories || calories === 0) return 'neutral';
    
    const p = protein || 0;
    const f = fat || 0;
    const proteinCalRatio = (p * 4) / calories;
    const fatCalRatio = (f * 9) / calories;
    
    if (proteinCalRatio >= 0.25 && fatCalRatio < 0.5) return 'good';
    if (fatCalRatio >= 0.6 || (calories > 400 && proteinCalRatio < 0.1)) return 'bad';
    if (proteinCalRatio < 0.2 || fatCalRatio > 0.4) return 'caution';
    
    return 'neutral';
  };

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isModal]);

  // Parse serving size to get base amount (usually 100g)
  const parseServingSize = (servingSize) => {
    if (!servingSize) return { amount: 100, unit: 'g' };
    const match = servingSize.match(/(\d+\.?\d*)\s*(g|ml|oz|piece|serving|slice)?/i);
    if (match) {
      return { amount: parseFloat(match[1]), unit: match[2]?.toLowerCase() || 'g' };
    }
    return { amount: 100, unit: 'g' };
  };

  // Calculate nutrition based on serving amount
  const getAdjustedNutrition = (product) => {
    const base = parseServingSize(product.servingSize);
    const ratio = servingAmount / base.amount;
    return {
      calories: Math.round((product.calories || 0) * ratio),
      protein: Math.round((product.protein || 0) * ratio),
      carbs: Math.round((product.carbs || 0) * ratio),
      fat: Math.round((product.fat || 0) * ratio),
    };
  };

  // Auto-search with debounce
  useEffect(() => {
    if (activeTab !== 'search' || !searchQuery.trim() || searchQuery.length < 2) {
      return;
    }

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      searchProducts(searchQuery);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, activeTab]);

  const searchProducts = async (query, pageNum = 1) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    if (pageNum === 1) {
      setProduct(null);
      setSearchResults([]);
    }

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&page=${pageNum}`
      );
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        const results = data.products
          .filter((p) => p.product_name)
          .map((p) => {
            const nutrients = p.nutriments || {};
            return {
              barcode: p.code || '',
              name: p.product_name || p.product_name_en || 'Unknown Product',
              brand: p.brands,
              image: p.image_front_small_url || p.image_url,
              calories: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'],
              protein: nutrients.proteins_100g || nutrients.proteins,
              carbs: nutrients.carbohydrates_100g || nutrients.carbohydrates,
              fat: nutrients.fat_100g || nutrients.fat,
              servingSize: p.serving_size || '100g',
            };
          });
        
        if (pageNum === 1) {
          setSearchResults(results);
        } else {
          setSearchResults(prev => [...prev, ...results]);
        }
        
        setHasMore(data.products.length === 20);
        setPage(pageNum);
      } else {
        if (pageNum === 1) {
          setError('No products found. Try a different search term.');
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      if (pageNum === 1) {
        setError('Failed to search products. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      searchProducts(searchQuery, page + 1);
    }
  };

  const lookupBarcode = async (barcode) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutrients = p.nutriments || {};
        
        setProduct({
          barcode,
          name: p.product_name || p.product_name_en || 'Unknown Product',
          brand: p.brands,
          image: p.image_front_small_url || p.image_url,
          calories: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'],
          protein: nutrients.proteins_100g || nutrients.proteins,
          carbs: nutrients.carbohydrates_100g || nutrients.carbohydrates,
          fat: nutrients.fat_100g || nutrients.fat,
          servingSize: p.serving_size || '100g',
        });
      } else {
        setError('Product not found. Try a different barcode or search by name.');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setError('Failed to look up product. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (barcode) => {
    setShowScanner(false);
    lookupBarcode(barcode);
  };

  const handleBarcodeSearch = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
    }
  };

  const handleAddFood = (foodProduct) => {
    const adjustedNutrition = getAdjustedNutrition(foodProduct);
    addFoodEntry({
      name: foodProduct.brand ? `${foodProduct.brand} ${foodProduct.name}` : foodProduct.name,
      finalNutrition: adjustedNutrition,
      imageUrl: foodProduct.image,
      portionDescription: `${servingAmount}${servingUnit}`,
    });

    if (onClose) {
      onClose();
    } else {
      // Reset state if staying on page
      setProduct(null);
      setSearchResults([]);
      setSearchQuery('');
      setManualBarcode('');
      setServingAmount(100);
      setServingUnit('g');
    }
  };

  const clearResults = () => {
    setProduct(null);
    setSearchResults([]);
    setError(null);
    setSearchQuery('');
    setPage(1);
    setHasMore(true);
    setManualBarcode('');
    setServingAmount(100);
    setServingUnit('g');
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    addFoodEntry({
      name: manualName.trim(),
      finalNutrition: {
        calories: Number(manualCalories) || 0,
        protein: Number(manualProtein) || 0,
        carbs: Number(manualCarbs) || 0,
        fat: Number(manualFat) || 0,
      },
      portionDescription: 'Custom',
    });

    if (onClose) {
      onClose();
    } else {
      clearResults();
      setActiveTab('search');
    }
  };

  const selectProduct = (p) => {
    setProduct(p);
    setSearchResults([]);
    const base = parseServingSize(p.servingSize);
    setServingAmount(base.amount);
    setServingUnit(base.unit);
  };

  const content = (
    <div className={`max-w-[600px] w-full mx-auto flex flex-col h-full overflow-hidden ${isModal ? 'max-w-full p-0 h-full' : ''}`}>
      <div className="mb-md pb-md border-b border-gray-800 shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-[1.25rem] sm:text-[1.5rem] font-black font-display text-white uppercase tracking-[0.1em] mb-xs">Track Food</h1>
          {(isModal || onClose) && (
            <button className="p-xs text-gray-500 bg-transparent rounded-sm transition-all duration-fast hover:bg-error/10 hover:text-error shrink-0" onClick={onClose || (() => navigate(-1))}>
              <X size={24} />
            </button>
          )}
        </div>
        <p className="text-primary m-0 text-[0.6rem] sm:text-[0.7rem] font-display uppercase tracking-[0.2em] opacity-70">Search or scan to add food</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-xs sm:gap-md mb-md sm:mb-lg bg-bg-card p-[4px] sm:p-[6px] rounded-md border border-gray-800 shrink-0">
        <button
          className={`flex-1 flex items-center justify-center gap-xs sm:gap-sm p-2 sm:p-3 text-gray-500 font-extrabold font-display uppercase tracking-[0.1em] text-[0.6rem] sm:text-[0.7rem] rounded-sm transition-colors duration-150 ease-out hover:text-white hover:bg-white/3 ${activeTab === 'search' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent'}`}
          onClick={() => { setActiveTab('search'); clearResults(); }}
        >
          <Search size={16} />
          Search
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-xs sm:gap-sm p-2 sm:p-3 text-gray-500 font-extrabold font-display uppercase tracking-[0.1em] text-[0.6rem] sm:text-[0.7rem] rounded-sm transition-colors duration-150 ease-out hover:text-white hover:bg-white/3 ${activeTab === 'scan' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent'}`}
          onClick={() => { setActiveTab('scan'); clearResults(); }}
        >
          <ScanBarcode size={16} />
          Scan
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-xs sm:gap-sm p-2 sm:p-3 text-gray-500 font-extrabold font-display uppercase tracking-[0.1em] text-[0.6rem] sm:text-[0.7rem] rounded-sm transition-colors duration-150 ease-out hover:text-white hover:bg-white/3 ${activeTab === 'manual' ? 'bg-primary text-bg-deep shadow-neon' : 'bg-transparent'}`}
          onClick={() => { setActiveTab('manual'); clearResults(); }}
        >
          <Plus size={16} />
          Manual
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && !product && (
        <div className="flex flex-col gap-md sm:gap-[3rem] shrink-0">
          <div className="flex gap-sm sm:gap-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food..."
              className="flex-1 p-3 sm:p-[1.25rem] bg-bg-accent border border-gray-800 text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:shadow-neon outline-none text-sm"
              autoFocus
            />
            {loading ? (
              <div className="flex items-center justify-center px-4 sm:px-5 bg-bg-card text-primary border border-gray-800 rounded-sm">
                <Loader2 size={18} className="animate-spin shadow-neon" />
              </div>
            ) : (
              <div className="flex items-center justify-center px-4 sm:px-5 bg-bg-card text-primary border border-gray-800 rounded-sm">
                <Search size={18} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Tab */}
      {activeTab === 'scan' && !product && !loading && (
        <div className="flex flex-col gap-[3rem] shrink-0">
          <button 
            className="flex flex-col items-center justify-center gap-md w-full py-[4.5rem] px-xl bg-bg-accent text-primary border border-primary rounded-md text-[1rem] font-extrabold font-display uppercase tracking-[0.2em] transition-all duration-normal shadow-[inset_0_0_20px_rgba(0,242,255,0.05)] hover:bg-primary hover:text-bg-deep hover:shadow-neon-strong hover:scale-[1.02]"
            onClick={() => setShowScanner(true)}
          >
            <Camera size={48} />
            <span>Open Camera</span>
          </button>

          <div className="flex items-center gap-lg text-gray-700 text-[0.7rem] font-display uppercase tracking-[0.1em] before:content-[''] before:flex-1 before:height-[1px] before:bg-gray-800 after:content-[''] after:flex-1 after:height-[1px] after:bg-gray-800">
            <span>or enter barcode</span>
          </div>

          <form onSubmit={handleBarcodeSearch} className="flex gap-md">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Enter barcode number"
              className="flex-1 p-[1.25rem] bg-bg-accent border border-gray-800 text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:shadow-neon outline-none"
            />
            <button 
              type="submit" 
              className="flex items-center justify-center px-5 bg-bg-card text-primary border border-gray-800 rounded-sm transition-all duration-fast hover:not-disabled:border-primary hover:not-disabled:bg-primary/5 disabled:opacity-20 disabled:cursor-not-allowed"
              disabled={!manualBarcode.trim()}
            >
              <Search size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Manual Tab */}
      {activeTab === 'manual' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-xs">
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-md sm:gap-lg">
            <div className="flex flex-col gap-xs">
              <label className="text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500">Food Name</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Grilled Chicken"
                className="p-3 sm:p-[1.25rem] bg-bg-accent border border-gray-800 text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:shadow-neon outline-none text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-md sm:gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500">Calories</label>
                <input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  placeholder="0"
                  className="p-3 sm:p-[1.25rem] bg-bg-accent border border-gray-800 text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:shadow-neon outline-none text-sm"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500">Protein (g)</label>
                <input
                  type="number"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  placeholder="0"
                  className="p-3 sm:p-[1.25rem] bg-bg-accent border border-gray-800 text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:shadow-neon outline-none text-sm"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500">Carbs (g)</label>
                <input
                  type="number"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  placeholder="0"
                  className="p-3 sm:p-[1.25rem] bg-bg-accent border border-gray-800 text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:shadow-neon outline-none text-sm"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-[0.65rem] sm:text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500">Fat (g)</label>
                <input
                  type="number"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                  placeholder="0"
                  className="p-3 sm:p-[1.25rem] bg-bg-accent border border-gray-800 text-white rounded-sm font-body transition-all duration-fast focus:border-primary focus:shadow-neon outline-none text-sm"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="flex items-center justify-center gap-md w-full p-3 sm:p-xl bg-secondary text-white rounded-sm font-extrabold font-display uppercase tracking-[0.2em] shadow-[0_0_20px_var(--color-secondary-glow)] transition-all duration-fast hover:bg-white hover:text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={!manualName.trim()}
            >
              <Plus size={18} />
              Add Food
            </button>
          </form>
        </div>
      )}

      {/* Loading state - only show for scan tab */}
      {loading && activeTab === 'scan' && (
        <div className="flex flex-col items-center justify-center gap-md py-[4.5rem] px-[2rem] text-primary font-display uppercase tracking-[0.1em] text-[0.8rem]">
          <Loader2 size={32} className="animate-spin shadow-neon" />
          <p>Looking up product...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center gap-md py-[4.5rem] px-[2rem] text-error font-display uppercase tracking-[0.1em] text-[0.8rem]">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button className="flex items-center gap-sm py-[6px] px-md bg-transparent text-primary border border-primary rounded-xs font-extrabold font-display text-[0.65rem] uppercase tracking-[0.1em] transition-all duration-fast hover:bg-primary hover:text-bg-deep hover:shadow-neon" onClick={clearResults}>
            Try Again
          </button>
        </div>
      )}

      {/* Search Results List */}
      <AnimatePresence mode="wait">
        {searchResults.length > 0 && !product && (
          <motion.div 
            className="flex flex-col gap-sm sm:gap-md flex-1 overflow-y-auto no-scrollbar p-xs mt-md sm:mt-lg scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {searchResults.map((item, index) => {
              const quality = getFoodQuality(item.calories, item.protein, item.fat);
              return (
                <motion.button
                  key={`${item.barcode}-${index}`}
                  className={`flex items-center justify-between gap-sm sm:gap-lg p-sm sm:p-lg bg-bg-card border border-gray-800 rounded-md text-left transition-all duration-fast cursor-pointer relative overflow-hidden min-h-[70px] sm:min-h-[80px] hover:border-primary hover:bg-primary/5 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] sm:before:w-[4px] before:transition-all before:duration-fast ${
                    quality === 'good' ? 'before:bg-success' :
                    quality === 'caution' ? 'before:bg-warning' :
                    quality === 'bad' ? 'before:bg-error' : 'before:bg-gray-700'
                  }`}
                  onClick={() => selectProduct(item)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.03 }}
                >
                  <div className="flex items-center gap-sm sm:gap-lg flex-1 min-w-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] object-contain rounded-sm bg-white shrink-0 border border-gray-800" />
                    ) : (
                      <div className="w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] flex items-center justify-center bg-bg-accent rounded-sm text-gray-700 shrink-0 border border-gray-800">
                        <Camera size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-[1px] sm:gap-[2px]">
                      <span className="font-extrabold text-white text-[0.85rem] sm:text-[0.95rem] font-display truncate uppercase tracking-[0.05em]">{item.name}</span>
                      {item.brand && <span className="text-[0.65rem] sm:text-[0.7rem] text-primary truncate opacity-80 uppercase tracking-[0.05em] mb-[1px]">{item.brand}</span>}
                      <div className="flex gap-sm sm:gap-md text-[0.6rem] sm:text-[0.7rem] text-gray-500 font-display font-semibold uppercase tracking-[0.05em]">
                        <span>{Math.round(item.protein || 0)}g P</span>
                        <span>{Math.round(item.carbs || 0)}g C</span>
                        <span>{Math.round(item.fat || 0)}g F</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm sm:gap-lg shrink-0">
                    <span className="text-[0.9rem] sm:text-[1.1rem] font-black text-white font-display whitespace-nowrap text-right leading-tight">
                      {Math.round(item.calories || 0)} <small className="text-[0.55rem] sm:text-[0.65rem] text-gray-500 uppercase block leading-none">CAL</small>
                    </span>
                    <Plus className="text-primary opacity-30 sm:block hidden" size={20} />
                  </div>
                </motion.button>
              );
            })}
            
            {hasMore && (
              <button 
                className="w-full p-3 sm:p-md bg-bg-card border border-gray-800 text-primary rounded-sm font-display font-extrabold uppercase tracking-[0.1em] text-[0.65rem] sm:text-[0.7rem] mt-md mb-[5rem] transition-all duration-fast flex items-center justify-center hover:not-disabled:bg-primary hover:not-disabled:text-bg-deep disabled:opacity-50" 
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin shadow-neon" />
                ) : (
                  'Load More'
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Product Detail */}
      <AnimatePresence>
        {product && !loading && (
          <motion.div
            className="bg-bg-card rounded-md border border-gray-800 p-xl relative shadow-card overflow-y-auto flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button className="absolute top-md right-md p-xs bg-bg-accent text-gray-500 rounded-sm transition-all duration-fast hover:text-error hover:bg-error/10" onClick={clearResults}>
              <X size={20} />
            </button>

            <div className="flex gap-xl mb-xl pb-lg border-b border-gray-800">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-[100px] h-[100px] object-contain rounded-sm bg-white border border-gray-800"
                />
              ) : (
                <div className="w-[100px] h-[100px] flex items-center justify-center bg-bg-accent rounded-sm text-gray-700 shrink-0 border border-gray-800">
                  <Camera size={24} />
                </div>
              )}
              <div className="productInfo">
                <h3 className="text-[1.25rem] font-black mb-xs text-white font-display uppercase tracking-[0.05em]">{product.name}</h3>
                {product.brand && <p className="text-primary text-[0.75rem] font-display uppercase tracking-[0.1em] m-0 mb-sm opacity-80">{product.brand}</p>}
                <p className="text-gray-500 text-[0.8rem] m-0">Nutrition per {product.servingSize || '100g'}</p>
              </div>
            </div>

            {/* Serving Size Input */}
            <div className="mb-xl">
              <label className="block text-[0.7rem] font-extrabold font-display uppercase tracking-[0.1em] text-gray-500 mb-sm">How much are you having?</label>
              <div className="flex items-center gap-md">
                <input
                  type="number"
                  value={servingAmount}
                  onChange={(e) => setServingAmount(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-[120px] p-4 text-[1.5rem] font-black text-center border border-gray-800 rounded-sm bg-bg-accent text-white font-display focus:border-primary focus:shadow-neon outline-none"
                />
                <span className="text-[0.9rem] text-gray-400 font-extrabold font-display uppercase">{servingUnit}</span>
              </div>
            </div>

            {/* Calculated Nutrition */}
            <div className="grid grid-cols-4 gap-md p-xl bg-bg-accent rounded-sm mb-[3rem] border border-gray-800">
              <div className="flex flex-col items-center text-center">
                <span className="font-black text-[1.25rem] text-white font-display">
                  {getAdjustedNutrition(product).calories}
                </span>
                <span className="text-[0.6rem] text-gray-500 uppercase font-display tracking-[0.1em] mt-1">CAL</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="font-black text-[1.25rem] text-white font-display">
                  {getAdjustedNutrition(product).protein}g
                </span>
                <span className="text-[0.6rem] text-gray-500 uppercase font-display tracking-[0.1em] mt-1">protein</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="font-black text-[1.25rem] text-white font-display">
                  {getAdjustedNutrition(product).carbs}g
                </span>
                <span className="text-[0.6rem] text-gray-500 uppercase font-display tracking-[0.1em] mt-1">carbs</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="font-black text-[1.25rem] text-white font-display">
                  {getAdjustedNutrition(product).fat}g
                </span>
                <span className="text-[0.6rem] text-gray-500 uppercase font-display tracking-[0.1em] mt-1">fat</span>
              </div>
            </div>

            <button className="flex items-center justify-center gap-md w-full p-xl bg-secondary text-white rounded-sm font-extrabold font-display uppercase tracking-[0.2em] shadow-[0_0_20px_var(--color-secondary-glow)] transition-all duration-fast hover:bg-white hover:text-secondary hover:shadow-[0_0_30px_var(--color-secondary-glow)]" onClick={() => handleAddFood(product)}>
              <Plus size={20} />
              Add to Today
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-[#050507]/85 backdrop-blur-[8px] z-[1000] flex justify-end" onClick={onClose}>
        <motion.div 
          className="w-full max-w-[600px] h-screen bg-bg-deep overflow-hidden shadow-[-10px_0_50px_rgba(0,0,0,0.5)] border-l border-gray-800 p-xl flex flex-col" 
          onClick={e => e.stopPropagation()}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return content;
}
