import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Search, Plus, X, Loader2, AlertCircle, ScanBarcode } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useLedger } from '../context/LedgerContext';
import styles from './Scan.module.css';

interface FoodProduct {
  barcode: string;
  name: string;
  brand?: string;
  image?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: string;
}

type TabType = 'search' | 'scan';

interface ScanProps {
  onClose?: () => void;
  isModal?: boolean;
}

export function Scan({ onClose, isModal = false }: ScanProps) {
  const { addFoodEntry } = useLedger();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [searchResults, setSearchResults] = useState<FoodProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [manualBarcode, setManualBarcode] = useState('');
  const [servingAmount, setServingAmount] = useState<number>(100);
  const [servingUnit, setServingUnit] = useState<string>('g');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Determine food quality based on protein-to-calorie ratio
  const getFoodQuality = (calories?: number, protein?: number, fat?: number) => {
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
  const parseServingSize = (servingSize?: string): { amount: number; unit: string } => {
    if (!servingSize) return { amount: 100, unit: 'g' };
    const match = servingSize.match(/(\d+\.?\d*)\s*(g|ml|oz|piece|serving|slice)?/i);
    if (match) {
      return { amount: parseFloat(match[1]), unit: match[2]?.toLowerCase() || 'g' };
    }
    return { amount: 100, unit: 'g' };
  };

  // Calculate nutrition based on serving amount
  const getAdjustedNutrition = (product: FoodProduct) => {
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

  const searchProducts = async (query: string, pageNum: number = 1) => {
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
        const results: FoodProduct[] = data.products
          .filter((p: any) => p.product_name)
          .map((p: any) => {
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

  const lookupBarcode = async (barcode: string) => {
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

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    lookupBarcode(barcode);
  };

  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
    }
  };

  const handleAddFood = (foodProduct: FoodProduct) => {
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
  };

  const selectProduct = (p: FoodProduct) => {
    setProduct(p);
    setSearchResults([]);
    const base = parseServingSize(p.servingSize);
    setServingAmount(base.amount);
    setServingUnit(base.unit);
  };

  const content = (
    <div className={`${styles.scan} ${isModal ? styles.modal : ''}`}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Track Food</h1>
          {(isModal || onClose) && (
            <button className={styles.closeBtn} onClick={onClose || (() => navigate(-1))}>
              <X size={24} />
            </button>
          )}
        </div>
        <p>Search or scan to add food</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'search' ? styles.active : ''}`}
          onClick={() => { setActiveTab('search'); clearResults(); }}
        >
          <Search size={18} />
          Search
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'scan' ? styles.active : ''}`}
          onClick={() => { setActiveTab('scan'); clearResults(); }}
        >
          <ScanBarcode size={18} />
          Scan
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && !product && (
        <div className={styles.actions}>
          <div className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food..."
              className={styles.input}
              autoFocus
            />
            {loading ? (
              <div className={styles.searchBtn}>
                <Loader2 size={20} className={styles.spinner} />
              </div>
            ) : (
              <div className={styles.searchBtn}>
                <Search size={20} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Tab */}
      {activeTab === 'scan' && !product && !loading && (
        <div className={styles.actions}>
          <button 
            className={styles.scanBtn}
            onClick={() => setShowScanner(true)}
          >
            <Camera size={24} />
            <span>Open Camera</span>
          </button>

          <div className={styles.divider}>
            <span>or enter barcode</span>
          </div>

          <form onSubmit={handleBarcodeSearch} className={styles.searchForm}>
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Enter barcode number"
              className={styles.input}
            />
            <button 
              type="submit" 
              className={styles.searchBtn}
              disabled={!manualBarcode.trim()}
            >
              <Search size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Loading state - only show for scan tab */}
      {loading && activeTab === 'scan' && (
        <div className={styles.loadingState}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Looking up product...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className={styles.errorState}>
          <AlertCircle size={32} />
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={clearResults}>
            Try Again
          </button>
        </div>
      )}

      {/* Search Results List */}
      <AnimatePresence mode="wait">
        {searchResults.length > 0 && !product && (
          <motion.div 
            className={styles.resultsList}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {searchResults.map((item, index) => {
              const quality = getFoodQuality(item.calories, item.protein, item.fat);
              return (
                <motion.button
                  key={`${item.barcode}-${index}`}
                  className={`${styles.resultItem} ${styles[quality]}`}
                  onClick={() => selectProduct(item)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.03 }}
                >
                  <div className={styles.resultMain}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className={styles.resultImage} />
                    ) : (
                      <div className={styles.resultImagePlaceholder}>
                        <Camera size={20} />
                      </div>
                    )}
                    <div className={styles.resultInfo}>
                      <span className={styles.resultName}>{item.name}</span>
                      {item.brand && <span className={styles.resultBrand}>{item.brand}</span>}
                      <div className={styles.resultNutritionMini}>
                        <span>{Math.round(item.protein || 0)}g P</span>
                        <span>{Math.round(item.carbs || 0)}g C</span>
                        <span>{Math.round(item.fat || 0)}g F</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.resultMeta}>
                    <span className={styles.resultCalories}>
                      {Math.round(item.calories || 0)} <small>CAL</small>
                    </span>
                    <Plus className={styles.addIcon} size={20} />
                  </div>
                </motion.button>
              );
            })}
            
            {hasMore && (
              <button 
                className={styles.loadMoreBtn} 
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={20} className={styles.spinner} />
                ) : (
                  'Load More Results'
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
            className={styles.productCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button className={styles.clearBtn} onClick={clearResults}>
              <X size={20} />
            </button>

            <div className={styles.productHeader}>
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className={styles.productImage}
                />
              ) : (
                <div className={styles.productImagePlaceholder}>
                  <Camera size={24} />
                </div>
              )}
              <div className={styles.productInfo}>
                <h3>{product.name}</h3>
                {product.brand && <p className={styles.brand}>{product.brand}</p>}
                <p className={styles.serving}>Nutrition per {product.servingSize || '100g'}</p>
              </div>
            </div>

            {/* Serving Size Input */}
            <div className={styles.servingInput}>
              <label>How much are you having?</label>
              <div className={styles.servingRow}>
                <input
                  type="number"
                  value={servingAmount}
                  onChange={(e) => setServingAmount(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className={styles.servingNumber}
                />
                <span className={styles.servingUnit}>{servingUnit}</span>
              </div>
            </div>

            {/* Calculated Nutrition */}
            <div className={styles.nutrition}>
              <div className={styles.nutritionItem}>
                <span className={styles.nutritionValue}>
                  {getAdjustedNutrition(product).calories}
                </span>
                <span className={styles.nutritionLabel}>CAL</span>
              </div>
              <div className={styles.nutritionItem}>
                <span className={styles.nutritionValue}>
                  {getAdjustedNutrition(product).protein}g
                </span>
                <span className={styles.nutritionLabel}>protein</span>
              </div>
              <div className={styles.nutritionItem}>
                <span className={styles.nutritionValue}>
                  {getAdjustedNutrition(product).carbs}g
                </span>
                <span className={styles.nutritionLabel}>carbs</span>
              </div>
              <div className={styles.nutritionItem}>
                <span className={styles.nutritionValue}>
                  {getAdjustedNutrition(product).fat}g
                </span>
                <span className={styles.nutritionLabel}>fat</span>
              </div>
            </div>

            <button className={styles.addBtn} onClick={() => handleAddFood(product)}>
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
      <div className={styles.overlay} onClick={onClose}>
        <motion.div 
          className={styles.modalContainer} 
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
