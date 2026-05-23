/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CAMPUSES, CATEGORIES, CAKE_PRODUCTS, STUDENT_TESTIMONIALS, FAQS, AI_RECOMMENDATION_TEMPLATES 
} from './data';
import { 
  Campus, CakeItem, KioskCake, CartItem, Order, UserProfile, SavedCelebration, FeedbackReview, OrderStatus 
} from './types';

// Importing custom modular components
import CampusSelector from './components/CampusSelector';
import KioskSection from './components/KioskSection';
import CustomOrderModal from './components/CustomOrderModal';
import DashboardSection from './components/DashboardSection';

// Lucide React Icons
import { 
  ShoppingBag, Search, Sparkles, SlidersHorizontal, Heart, Clock, Star, 
  HelpCircle, MessageSquare, ChevronRight, CheckCircle2, Phone, ShieldCheck, 
  ArrowRight, X, AlertTriangle, CreditCard, Check, Compass, Info, Send,
  LogOut, GraduationCap, MapPin, User, Zap, Trash2, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, authenticateWithGoogle, isRealFirebase } from './firebase';
import { 
  testFirestoreConnection, getCampuses, writeCampus, removeCampus, 
  getProducts, writeProduct, removeProduct, getKioskProducts, writeKioskProduct, 
  removeKioskProduct, getUserProfile, writeUserProfile, getUserOrders, writeOrder, 
  writeCakeImage, getAllOrders,
  subscribeToUserProfile, subscribeToUserOrders, subscribeToAllOrders
} from './lib/firestoreService';

export default function App() {
  // --- 0. FIREBASE AUTHENTICATION FLOW STATE ---
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  
  const isAdmin = firebaseUser && (
    firebaseUser.email === 'tanishapahal606@gmail.com' ||
    firebaseUser.email === 'saransh1860@gmail.com'
  );

  const [campusSelected, setCampusSelected] = useState<boolean>(() => {
    return localStorage.getItem('campus_cakes_selected_campus') !== null;
  });
  const [activeZomatoTab, setActiveZomatoTab] = useState<'delivery' | 'kiosk' | 'portal'>('delivery');
  const [tempSelectedCampus, setTempSelectedCampus] = useState<Campus | null>(null);

  // --- 1. STATE CONFIGURATIONS ---
  const [selectedCampus, setSelectedCampus] = useState<Campus>(() => {
    const cached = localStorage.getItem('campus_cakes_selected_campus');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) return parsed;
      } catch (e) {}
    }
    return CAMPUSES[0];
  });
  
  // Catalogs
  const [campuses, setCampuses] = useState<Campus[]>(CAMPUSES);
  const [activeProducts, setActiveProducts] = useState<CakeItem[]>(CAKE_PRODUCTS);
  const [kioskInventory, setKioskInventory] = useState<KioskCake[]>([
    {
      id: 'kiosk-choc-truffle',
      name: 'Campus Truffle Smash (Kiosk Ready)',
      price: 16.50,
      flavor: 'Double Chocolate Fudge',
      remainingStock: 3,
      totalStock: 5,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'kiosk-velvet-bite',
      name: 'Red Velvet Classic Kiosk Joy',
      price: 17.00,
      flavor: 'Classic Whipped Cream Velvet',
      remainingStock: 4,
      totalStock: 4,
      image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'kiosk-mini-bento',
      name: 'Bento Kiosk Surprise (Limited)',
      price: 11.99,
      flavor: 'Vanilla Sprinkles with Cute Art',
      remainingStock: 1,
      totalStock: 4,
      image: 'https://images.unsplash.com/photo-1516685018646-549198525c1b?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'kiosk-pineapple-rush',
      name: 'Emergency Pineapple Dream',
      price: 13.50,
      flavor: 'Fresh Eggless Pineapple Blast',
      remainingStock: 0,
      totalStock: 3,
      image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500&auto=format&fit=crop&q=80',
    }
  ]);

  // Student Account Simulation State
  const [studentUser, setStudentUser] = useState<UserProfile>({
    name: 'Campus Student',
    email: 'student@campus-cakes.com',
    phone: '+91 90000 00000',
    address: 'Campus Domain',
    campusId: CAMPUSES[0].id,
    rewardPoints: 0,
    savedCelebrations: [],
    wishlist: [],
    walletBalance: 0
  });

  // --- 1.1 FIREBASE AUTH AND LOCAL STORAGE PERSISTENCE EFFECTS ---
  useEffect(() => {
    // Read initial local user cache
    const cachedUser = localStorage.getItem('campus_cakes_user');
    if (cachedUser) {
      try {
        setFirebaseUser(JSON.parse(cachedUser));
      } catch (e) {}
    }

    // Subscribe to Firebase real Auth changes if available
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user: any) => {
        if (user) {
          const customUser = {
            uid: user.uid,
            displayName: user.displayName || 'Campus Student',
            email: user.email || 'student@campus-cakes.com',
            photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            emailVerified: user.emailVerified
          };
          setFirebaseUser(customUser);
          localStorage.setItem('campus_cakes_user', JSON.stringify(customUser));
        } else {
          // Keep cache if simulated, otherwise clear it on explicit signout
          const cached = localStorage.getItem('campus_cakes_user');
          if (!cached) {
            setFirebaseUser(null);
          }
        }
        setAuthChecking(false);
      });
      return () => unsubscribe();
    } else {
      setAuthChecking(false);
    }
  }, []);

  // Master database sync on startup (Catalog and Stock synchronizer)
  useEffect(() => {
    async function initDatabaseCatalog() {
      if (!isRealFirebase) return;
      try {
        await testFirestoreConnection();
        
        // 1. Sync Campuses
        try {
          const dbCampuses = await getCampuses();
          const hasArr = localStorage.getItem('_has_bootstrapped_campuses');
          if ((dbCampuses && dbCampuses.length > 0) || hasArr) {
            setCampuses(dbCampuses);
            if (!hasArr) localStorage.setItem('_has_bootstrapped_campuses', 'true');
          } else {
            // Bootstrap Firestore with initial static campuses
            for (const c of CAMPUSES) {
              await writeCampus(c).catch(e => console.warn("Admin rights needed to bootstrap campuses", e));
            }
            localStorage.setItem('_has_bootstrapped_campuses', 'true');
          }
        } catch (e) { console.error("Error syncing campuses:", e); }

        // 2. Sync Products (Standard Delivery Cakes)
        try {
          const dbProducts = await getProducts();
          const hasProd = localStorage.getItem('_has_bootstrapped_products');
          if ((dbProducts && dbProducts.length > 0) || hasProd) {
            setActiveProducts(dbProducts);
            if (!hasProd) localStorage.setItem('_has_bootstrapped_products', 'true');
          } else {
            // Bootstrap Firestore with initial static products
            for (const p of CAKE_PRODUCTS) {
              await writeProduct(p).catch(e => console.warn("Admin rights needed to bootstrap products", e));
            }
            localStorage.setItem('_has_bootstrapped_products', 'true');
          }
        } catch (e) { console.error("Error syncing products:", e); }

        // 3. Sync Kiosk Inventory Stock Levels
        try {
          const dbKiosk = await getKioskProducts();
          const hasKiosk = localStorage.getItem('_has_bootstrapped_kiosk');
          if ((dbKiosk && dbKiosk.length > 0) || hasKiosk) {
            setKioskInventory(dbKiosk);
            if (!hasKiosk) localStorage.setItem('_has_bootstrapped_kiosk', 'true');
          } else {
            // Bootstrap Firestore with initial default kiosk inventory and log initial state images
            const initialKiosk = [
            {
              id: 'kiosk-choc-truffle',
              name: 'Campus Truffle Smash (Kiosk Ready)',
              price: 16.50,
              flavor: 'Double Chocolate Fudge',
              remainingStock: 3,
              totalStock: 5,
              image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
            },
            {
              id: 'kiosk-velvet-bite',
              name: 'Red Velvet Classic Kiosk Joy',
              price: 17.00,
              flavor: 'Classic Whipped Cream Velvet',
              remainingStock: 4,
              totalStock: 4,
              image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=500&auto=format&fit=crop&q=80',
            },
            {
              id: 'kiosk-mini-bento',
              name: 'Bento Kiosk Surprise (Limited)',
              price: 11.99,
              flavor: 'Vanilla Sprinkles with Cute Art',
              remainingStock: 1,
              totalStock: 4,
              image: 'https://images.unsplash.com/photo-1516685018646-549198525c1b?w=500&auto=format&fit=crop&q=80',
            },
            {
              id: 'kiosk-pineapple-rush',
              name: 'Emergency Pineapple Dream',
              price: 13.50,
              flavor: 'Fresh Eggless Pineapple Blast',
              remainingStock: 0,
              totalStock: 3,
              image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500&auto=format&fit=crop&q=80',
            }
          ];
          for (const k of initialKiosk) {
            await writeKioskProduct(k).catch(e => console.warn("Admin rights needed to bootstrap kiosk products", e));
          }
          localStorage.setItem('_has_bootstrapped_kiosk', 'true');
        }
        } catch (e) { console.error("Error syncing kiosk products:", e); }
      } catch (err) {
        console.error("Error connecting to Firestore database:", err);
      }
    }
    initDatabaseCatalog();
  }, [isRealFirebase]);

  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  // Pre-populate studentUser with firebaseUser details while profile is loading to prevent flashing/placeholders
  useEffect(() => {
    if (firebaseUser && !profileLoaded) {
      setStudentUser(prev => {
        if (prev.name === 'Campus Student') {
          return {
            ...prev,
            name: firebaseUser.displayName || prev.name,
            email: firebaseUser.email || prev.email,
          };
        }
        return prev;
      });
    }
  }, [firebaseUser, profileLoaded]);

  // Load or construct user profile and order history when authenticated in real-time
  useEffect(() => {
    if (!isRealFirebase || !firebaseUser) return;

    let unsubProfile: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;

    // 1. Subscribe to User Profile
    unsubProfile = subscribeToUserProfile(firebaseUser.uid, async (profile) => {
      if (profile) {
        // Heal impacted profiles showing 'Campus Student' instead of the real info
        const healedProfile = { ...profile };
        if ((profile.name === 'Campus Student' && firebaseUser.displayName) || profile.email === 'student@campus-cakes.com') {
          healedProfile.name = firebaseUser.displayName || profile.name;
          healedProfile.email = firebaseUser.email || profile.email;
        }
        // One-time migration/reset of the legacy default wallet balance to zero for all users
        if (!healedProfile.didWalletReset2026) {
          healedProfile.walletBalance = 0;
          healedProfile.didWalletReset2026 = true;
        }
        // Ensure wallet balance is initialized
        if (healedProfile.walletBalance === undefined) {
          healedProfile.walletBalance = 0;
        }
        setStudentUser(healedProfile);
        setProfileLoaded(true);
      } else {
        // Bootstrap new user
        const defaultProfile: UserProfile = {
          name: firebaseUser.displayName || 'Campus Student',
          email: firebaseUser.email || 'student@campus-cakes.com',
          phone: '',
          address: '',
          campusId: selectedCampus.id,
          rewardPoints: 0,
          savedCelebrations: [],
          wishlist: [],
          walletBalance: 0,
          didWalletReset2026: true
        };
        (defaultProfile as any).uid = firebaseUser.uid;
        setStudentUser(defaultProfile);
        await writeUserProfile(defaultProfile);
        setProfileLoaded(true);
      }
    });

    // 2. Subscribe to Orders (All if Admin, else just User)
    const ordersCallback = (dbOrders: Order[]) => {
      setActiveOrders([...dbOrders].sort((a, b) => {
        const timeB = new Date(b.timestamp || b.date || 0).getTime();
        const timeA = new Date(a.timestamp || a.date || 0).getTime();
        return timeB - timeA;
      }));
    };

    if (isAdmin) {
      unsubOrders = subscribeToAllOrders(ordersCallback);
    } else {
      unsubOrders = subscribeToUserOrders(firebaseUser.uid, ordersCallback);
    }

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubOrders) unsubOrders();
    };
  }, [firebaseUser, isRealFirebase, selectedCampus, isAdmin]);

  // Fallback Sync profile details when user authenticates using simulation mode
  useEffect(() => {
    if (!isRealFirebase && firebaseUser) {
      setStudentUser(prev => ({
        ...prev,
        name: firebaseUser.displayName || prev.name,
        email: firebaseUser.email || prev.email,
        campusId: selectedCampus.id
      }));
      setProfileLoaded(true);
    }
  }, [firebaseUser, selectedCampus, isRealFirebase]);

  // master profile loaded flag
  const [activeOrders, setActiveOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('campus_cakes_active_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Error parsing saved active orders:", err);
      }
    }
    return [
      {
        id: 'CK-9831',
        campusId: 'abc-univ',
        items: [
          {
            id: 'test-item-1',
            cakeId: 'choc-hazelnut',
            name: 'Gourmet Chocolate Hazelnut Dream',
            basePrice: 549,
            price: 549,
            image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80',
            quantity: 1,
            customization: {
              flavor: 'Classic Hazelnut Premium',
              weight: 0.5,
              messageOnCake: 'Pass Midterms!',
              addCandles: true,
              addKnife: true,
              pickupTime: '2026-05-21 @ 17:00'
            }
          }
        ],
        orderType: 'pre-order',
        status: 'placed',
        subtotal: 549,
        tax: 30,
        deliveryFee: 20,
        total: 599,
        paymentMethod: 'UPI (GPay)',
        pointsEarned: 55,
        date: 'May 20, 2026',
        timestamp: '2026-05-20T12:00:00Z',
        customerName: 'Aman Sharma',
        customerPhone: '+919988776655',
        deliveryAddress: 'Sarojini Naidu Hostel, Room No. 302A'
      }
    ];
  });

  // Keep active orders persisted in localStorage for offline & simulation modes
  useEffect(() => {
    localStorage.setItem('campus_cakes_active_orders', JSON.stringify(activeOrders));
  }, [activeOrders]);

  const [reviews, setReviews] = useState<FeedbackReview[]>(STUDENT_TESTIMONIALS);

  // Search, Filters & AI occasions
  const [selectedCategory, setSelectedCategory] = useState<string>('All Cakes');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEgglessOnly, setIsEgglessOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<number>(1500);
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);
  const [activeOccasionId, setActiveOccasionId] = useState<string | null>(null);

  // Admin states
  const [showAddCampus, setShowAddCampus] = useState(false);
  const [newCampus, setNewCampus] = useState({ name: '', location: '' });

  // Cart Mechanics State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [activeCustomizingCake, setActiveCustomizingCake] = useState<CakeItem | null>(null);

  // Payment/Checkout Simulator State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<string>('upi');
  const [upiIdInput, setUpiIdInput] = useState('saransh@okaxis');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [useWallet, setUseWallet] = useState<boolean>(false);

  // Review submission inputs
  const [submittingRating, setSubmittingRating] = useState<number>(5);
  const [submittingComment, setSubmittingComment] = useState('');
  const [selectedReviewCake, setSelectedReviewCake] = useState('Gourmet Chocolate Hazelnut Dream');

  // New FAQ active key state
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // Simulated live feedback sound/animations
  const [orderCompletePopup, setOrderCompletePopup] = useState<boolean>(false);
  const [newOrderId, setNewOrderId] = useState<string>('');

  // --- 2. LOGICAL SIDE-EFFECTS & UPDATES ---
  // Handle Campus Select resets
  const handleCampusChange = (campus: Campus) => {
    setSelectedCampus(campus);
    localStorage.setItem('campus_cakes_selected_campus', JSON.stringify(campus));
    setCampusSelected(true);
    
    const updatedUser = {
      ...studentUser,
      campusId: campus.id
    };
    setStudentUser(updatedUser);
    if (isRealFirebase && firebaseUser) {
      writeUserProfile({ ...updatedUser, uid: firebaseUser.uid }).catch(e => console.error("Error updating campus:", e));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { user, isSimulated } = await authenticateWithGoogle();
      setFirebaseUser(user);
      localStorage.setItem('campus_cakes_user', JSON.stringify(user));
      if (isSimulated) {
        console.log("Using simulated Google login fallback.");
      }
    } catch (error) {
      console.error("Sign-in triggered error", error);
    }
  };

  const handleSignOut = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
    } catch (e) {}
    localStorage.removeItem('campus_cakes_user');
    localStorage.removeItem('campus_cakes_selected_campus');
    setFirebaseUser(null);
    setStudentUser({
      name: 'Campus Student',
      email: 'student@campus-cakes.com',
      phone: '+91 90000 00000',
      address: 'Campus Domain',
      campusId: CAMPUSES[0].id,
      rewardPoints: 0,
      savedCelebrations: [],
      wishlist: []
    });
    setProfileLoaded(false);
    setActiveOrders([]);
    setCampusSelected(false);
    setActiveZomatoTab('delivery');
  };

  const handleSelectCampus = (campus: Campus) => {
    if (campus.id === 'admin-bypass') {
      setSelectedCampus(campus);
      localStorage.setItem('campus_cakes_selected_campus', JSON.stringify(campus));
      setCampusSelected(true);
      setStudentUser(prev => ({
        ...prev,
        campusId: campus.id,
        address: 'Admin Headquarters'
      }));
    } else {
      setTempSelectedCampus(campus);
    }
  };

  const handleConfirmHostelAddress = (hostelBlock: string, roomNo: string, instructions: string) => {
    if (!tempSelectedCampus) return;
    const fullAddress = `${hostelBlock}, ${roomNo}${instructions ? ` (${instructions})` : ''}`;
    setSelectedCampus(tempSelectedCampus);
    localStorage.setItem('campus_cakes_selected_campus', JSON.stringify(tempSelectedCampus));
    
    const updatedUser = { 
      ...studentUser,
      campusId: tempSelectedCampus.id,
      address: fullAddress
    };
    
    setStudentUser(updatedUser);
    if (isRealFirebase && firebaseUser) {
      writeUserProfile({ ...updatedUser, uid: firebaseUser.uid }).catch(e => console.error("Error saving address:", e));
    }
    
    setCampusSelected(true);
    setTempSelectedCampus(null);
  };

  // Kiosk instant reservation
  const handleReserveKioskCake = (kioskItem: KioskCake) => {
    // Check if stock exists
    if (kioskItem.remainingStock <= 0) {
      alert("Uh-oh! That ready-to-go slice is currently out of stock. Try customizing a fresh one to pick up tomorrow!");
      return;
    }

    // Allocate items in cart as instant-pickup
    const cartItemId = `kiosk-${kioskItem.id}-${Date.now()}`;
    const cartItem: CartItem = {
      id: cartItemId,
      cakeId: kioskItem.id,
      name: kioskItem.name,
      basePrice: kioskItem.price,
      price: kioskItem.price,
      image: kioskItem.image,
      quantity: 1,
      isInstantKiosk: true,
      customization: {
        flavor: kioskItem.flavor,
        weight: 0.5,
        messageOnCake: 'Quick Kiosk Grab',
        addCandles: false,
        addKnife: true,
        pickupTime: 'Instant pickup (10 mins)'
      }
    };

    // Deduct stock in UI temporarily to signify block reservation
    setKioskInventory(prev => prev.map(k => {
      if (k.id === kioskItem.id) {
        const updated = { ...k, remainingStock: k.remainingStock - 1 };
        if (isRealFirebase) {
          writeKioskProduct(updated).catch(err => console.error("Error writing updated kiosk stock to Firestore:", err));
        }
        return updated;
      }
      return k;
    }));

    setCart(prev => [...prev, cartItem]);
    setIsCartOpen(true);
  };

  // Add Customized pre-order cake to cart
  const handleAddCustomCakeToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
    setIsCartOpen(true);
  };

  // Add celebration event
  const handleAddCelebration = (celeb: SavedCelebration) => {
    const updatedUser = {
      ...studentUser,
      savedCelebrations: [...studentUser.savedCelebrations, celeb]
    };
    setStudentUser(updatedUser);
    if (isRealFirebase && firebaseUser) {
      writeUserProfile({ ...updatedUser, uid: firebaseUser.uid }).catch(e => console.error("Error adding celebration:", e));
    }
  };

  // Delete celebration
  const handleDeleteCelebration = (id: string) => {
    const updatedUser = {
      ...studentUser,
      savedCelebrations: studentUser.savedCelebrations.filter(c => c.id !== id)
    };
    setStudentUser(updatedUser);
    if (isRealFirebase && firebaseUser) {
      writeUserProfile({ ...updatedUser, uid: firebaseUser.uid }).catch(e => console.error("Error deleting celebration:", e));
    }
  };

  // Repeat past order logic
  const handleRepeatPastOrder = (orderId: string) => {
    const original = activeOrders.find(o => o.id === orderId);
    if (!original) return;
    
    // Convert order items flat back into Cartesian array
    const reordered: CartItem[] = original.items.map(it => ({
      ...it,
      id: `${it.cakeId}-repeat-${Date.now()}`
    }));

    setCart(prev => [...prev, ...reordered]);
    setIsCartOpen(true);
  };

  // Admin kiosk stock changer helper
  const handleUpdateKioskStock = (id: string, newStock: number) => {
    setKioskInventory(prev => prev.map(k => {
      if (k.id === id) {
        const updated = { ...k, remainingStock: newStock };
        if (isRealFirebase) {
          writeKioskProduct(updated).catch(err => console.error("Error updating kiosk stock in Firestore:", err));
        }
        return updated;
      }
      return k;
    }));
  };

  // Admin order state timeline modifier
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setActiveOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, status };
        if (isRealFirebase) {
          writeOrder(updated).catch(err => console.error("Error updating order status in Firestore:", err));
        }
        return updated;
      }
      return o;
    }));
  };

  // Admin dynamic product publish
  const handleAddCustomCake = (newCake: CakeItem) => {
    setActiveProducts(prev => [newCake, ...prev]);
    if (isRealFirebase) {
      writeProduct(newCake).catch(err => console.error("Error publishing cake product: ", err));
      // Log / Maintain image data in cake_images
      writeCakeImage({
        id: `img-${Date.now()}`,
        cakeId: newCake.id,
        imageUrl: newCake.image,
        name: `${newCake.name} (Delivery Product)`,
        uploadedBy: firebaseUser?.uid || 'admin',
        createdAt: new Date().toISOString()
      }).catch(err => console.error("Error tracking cake image entry: ", err));
    }
  };

  const handleDeleteCustomCake = (cakeId: string) => {
    setActiveProducts(prev => prev.filter(c => c.id !== cakeId));
    if (isRealFirebase) {
      removeProduct(cakeId).catch(err => console.error("Error removing cake product: ", err));
    }
  };

  const handleEditCustomCake = (updatedCake: CakeItem) => {
    setActiveProducts(prev => prev.map(c => c.id === updatedCake.id ? updatedCake : c));
    if (isRealFirebase) {
      writeProduct(updatedCake).catch(err => console.error("Error updating cake product: ", err));
      // Log / Maintain image data in cake_images
      writeCakeImage({
        id: `img-${Date.now()}`,
        cakeId: updatedCake.id,
        imageUrl: updatedCake.image,
        name: `${updatedCake.name} (Edited Delivery Product)`,
        uploadedBy: firebaseUser?.uid || 'admin',
        createdAt: new Date().toISOString()
      }).catch(err => console.error("Error tracking cake image edit: ", err));
    }
  };

  const handleAddKioskProduct = (newProduct: KioskCake) => {
    setKioskInventory(prev => [...prev, newProduct]);
    if (isRealFirebase) {
      writeKioskProduct(newProduct).catch(err => console.error("Error publishing kiosk product: ", err));
      // Log/Maintain image data in cake_images
      writeCakeImage({
        id: `img-kiosk-${Date.now()}`,
        cakeId: newProduct.id,
        imageUrl: newProduct.image,
        name: `${newProduct.name} (Kiosk Product)`,
        uploadedBy: firebaseUser?.uid || 'admin',
        createdAt: new Date().toISOString()
      }).catch(err => console.error("Error tracking kiosk cake image entry: ", err));
    }
  };

  const handleDeleteKioskProduct = (kioskId: string) => {
    setKioskInventory(prev => prev.filter(k => k.id !== kioskId));
    if (isRealFirebase) {
      removeKioskProduct(kioskId).catch(err => console.error("Error removing kiosk product: ", err));
    }
  };

  const handleEditKioskProduct = (updatedKioskProduct: KioskCake) => {
    setKioskInventory(prev => prev.map(k => k.id === updatedKioskProduct.id ? updatedKioskProduct : k));
    if (isRealFirebase) {
      writeKioskProduct(updatedKioskProduct).catch(err => console.error("Error updating kiosk product: ", err));
    }
  };

  // Remove individual items from sidebar cart
  const handleRemoveFromCart = (cartId: string) => {
    const item = cart.find(i => i.id === cartId);
    if (item && item.isInstantKiosk) {
      // Re-add to Kiosk inventory level
      setKioskInventory(prev => prev.map(k => {
        if (k.id === item.cakeId) {
          return { ...k, remainingStock: Math.min(k.totalStock, k.remainingStock + 1) };
        }
        return k;
      }));
    }
    setCart(prev => prev.filter(c => c.id !== cartId));
  };

  const hasCupcakesInCart = cart.some(item => {
    const cake = activeProducts.find(p => p.id === item.cakeId);
    return cake?.category === 'Cupcakes';
  });

  // Checkout submission action
  const handleCompletePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const subtotal = cart.reduce((acc, c) => acc + (c.price * c.quantity), 0);
    const tax = 30; // standard tax & packaging
    const deliveryFee = 20; // standard delivery surcharge
    const surchargeTotal = 50;
    
    const effectiveRedeemPoints = redeemPoints && hasCupcakesInCart;
    const pointsDiscount = effectiveRedeemPoints ? (studentUser.rewardPoints || 0) : 0;
    const totalBeforeWallet = Math.max(0, subtotal + surchargeTotal - pointsDiscount);
    const walletUsed = useWallet ? Math.min((studentUser.walletBalance || 0), totalBeforeWallet) : 0;
    const total = Math.max(0, totalBeforeWallet - walletUsed);
    const pointsDeducted = effectiveRedeemPoints ? Math.min((studentUser.rewardPoints || 0), subtotal + surchargeTotal) : 0;

    // Generated ID
    const genOrderNo = 'CK-' + Math.floor(1000 + Math.random() * 9000);
    
    const newOrderRecord: Order = {
      id: genOrderNo,
      campusId: selectedCampus.id,
      items: [...cart],
      orderType: cart.some(c => c.isInstantKiosk) ? 'instant-pickup' : 'pre-order',
      status: 'placed',
      subtotal,
      tax,
      deliveryFee,
      total,
      paymentMethod: walletUsed > 0 && total === 0 ? 'Campus Wallet' : (paymentMode === 'upi' ? `UPI (${upiIdInput})` + (walletUsed > 0 ? ` + Wallet (₹${walletUsed})` : '') : 'Credit Card' + (walletUsed > 0 ? ` + Wallet (₹${walletUsed})` : '')),
      pointsEarned: Math.round(subtotal),
      date: 'May 20, 2026',
      timestamp: new Date().toISOString()
    };

    const userOrderRecord: Order = {
      ...newOrderRecord,
      userId: firebaseUser?.uid || 'anonymous-user',
      userEmail: firebaseUser?.email || 'unverified@campus-cakes.com',
      customerName: studentUser?.name || firebaseUser?.displayName || 'Campus Student',
      customerPhone: studentUser?.phone || '',
      deliveryAddress: studentUser?.address || 'Campus Domain'
    };

    setActiveOrders(prev => [userOrderRecord, ...prev]);

    if (isRealFirebase) {
      writeOrder(userOrderRecord).catch(err => console.error("Error writing purchase order to Firestore: ", err));

      // Maintain uploaded customized customer designs in the image catalog
      for (const item of cart) {
        if (item.customization && item.customization.photoUrl) {
          writeCakeImage({
            id: `img-custom-${genOrderNo}-${item.cakeId}`,
            cakeId: item.cakeId,
            imageUrl: item.customization.photoUrl,
            name: `Customized Photo cake order: ${item.name}`,
            uploadedBy: firebaseUser?.uid || 'anonymous-user',
            createdAt: new Date().toISOString()
          }).catch(err => console.error("Error registering cake custom reference image: ", err));
        }
      }
    }
    
    // Award loyalty points to user profile and deduct spent points & wallet balance
    const updatedPoints = studentUser.rewardPoints - Math.floor(pointsDeducted) + Math.round(subtotal);
    const updatedWallet = Math.max(0, (studentUser.walletBalance ?? 0) - walletUsed);
    
    const updatedUser = {
      ...studentUser,
      rewardPoints: updatedPoints,
      walletBalance: updatedWallet
    };

    setStudentUser(updatedUser);
    if (isRealFirebase && firebaseUser) {
      writeUserProfile({ ...updatedUser, uid: firebaseUser.uid }).catch(e => console.error("Error updating profile after order:", e));
    }

    // Reset workflow
    setNewOrderId(genOrderNo);
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setOrderCompletePopup(true);
    setRedeemPoints(false);
    setUseWallet(false);
  };

  // Review submission
  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingComment) return;

    const newRev: FeedbackReview = {
      id: 'rev-' + Date.now(),
      userName: studentUser.name,
      userImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      rating: submittingRating,
      comment: submittingComment,
      cakeName: selectedReviewCake,
      date: 'Just now',
    };

    setReviews(prev => [newRev, ...prev]);
    setSubmittingComment('');
    alert('Thank you! Your verified student review was successfully published.');
  };

  // Toggle wishlist cake
  const handleToggleWishlist = (cakeId: string) => {
    const isStarred = studentUser.wishlist.includes(cakeId);
    const newList = isStarred 
      ? studentUser.wishlist.filter(id => id !== cakeId)
      : [...studentUser.wishlist, cakeId];
    
    const updatedUser = { ...studentUser, wishlist: newList };
    setStudentUser(updatedUser);
    
    if (isRealFirebase && firebaseUser) {
      writeUserProfile({ ...updatedUser, uid: firebaseUser.uid }).catch(e => console.error("Error updating wishlist:", e));
    }
  };

  // Filter application calculation
  const filteredProducts = activeProducts.filter(cake => {
    // 1. Text Search query
    const matchesSearch = 
      cake.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cake.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cake.category.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Select Category
    const matchesCategory = 
      selectedCategory === 'All Cakes' || 
      cake.category.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Eggless Cakes' && cake.isEggless);

    // 3. Eggless filter
    const matchesEggless = !isEgglessOnly || cake.isEggless;

    // 4. Price range limit
    const matchesPrice = cake.price <= priceRange;

    // 5. Trending tags
    const matchesTrending = !trendingOnly || cake.isTrending;

    // 6. Occasion/Celebration filter
    let matchesOccasion = true;
    if (activeOccasionId) {
      const template = AI_RECOMMENDATION_TEMPLATES.find(t => t.occasionId === activeOccasionId);
      if (template) {
        matchesOccasion = template.recommendedIds.includes(cake.id);
      }
    }

    return matchesSearch && matchesCategory && matchesEggless && matchesPrice && matchesTrending && matchesOccasion;
  });

  // occasion recommend trigger
  const handleSelectOccasion = (id: string | null) => {
    setActiveOccasionId(id);
    if (!id) {
      setSelectedCategory('All Cakes');
      return;
    }
    const template = AI_RECOMMENDATION_TEMPLATES.find(t => t.occasionId === id);
    if (template) {
      // Direct users to relevant subset
      setSearchQuery('');
    }
  };

  // --- 3. RENDERING LAYOUT SEGREGATION ---
  // 1. Loading State Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 selection:bg-red-100">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#E23744] via-red-500 to-rose-600 flex items-center justify-center text-white shadow-2xl shadow-red-500/20 mb-6 animate-pulse">
            <span className="text-2xl font-black font-display tracking-tight">CC</span>
          </div>
          <h2 className="text-xl font-black font-display text-gray-900 tracking-tight">Campus Cakes Hub</h2>
          <p className="text-xs text-gray-400 font-bold tracking-wide mt-2">Checking your student dispatch credentials...</p>
          <div className="mt-6 flex items-center justify-center">
            <div className="w-6 h-6 border-3 border-[#E23744] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Google Sign-In Screen (Mandated Exclusive Method)
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-red-50/20 via-white to-amber-50/10 flex items-center justify-center p-4 selection:bg-red-100">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-md w-full bg-white rounded-[40px] border border-gray-150 shadow-2xl shadow-red-500/5 p-8 md:p-10 text-center"
        >
          {/* Logo Brand Accent */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-[#E23744] via-red-550 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-red-500/25 ring-4 ring-white animate-bounce-slow">
              <span className="text-2xl font-black font-display tracking-tighter">CC</span>
            </div>
          </div>

          <h1 className="text-3xl font-black font-display text-gray-900 tracking-tight leading-tight italic text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] to-red-650">
            campus cakes
          </h1>
          <p className="text-[10px] font-black tracking-widest text-[#E23744] uppercase mt-1">Dorm Sweet Dispatch</p>

          <p className="text-sm text-gray-500 mt-4 mb-8 leading-relaxed">
            Verify your student account to access next-day guaranteed dorm birthday delivery, custom theme pre-orders, and our instant live kiosk inventory tracking.
          </p>

          {/* Secure Exclusive Google Sign-In Trigger */}
          <div className="space-y-3">
            <button
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              className="w-full h-12 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm px-6 rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-md active:scale-98 transition-all duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with student Google account
            </button>
            <p className="text-[10px] text-gray-400 font-medium font-mono">Only student organization Google credentials are supported.</p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-[11px] text-gray-400 font-bold">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E23744]" /> Firebase Verified
            </span>
            <span>•</span>
            <span>Est. May 2026</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Post-Login Campus Selection Screen
  if (!campusSelected) {
    const activeCampuses = campuses.filter(c => c.active);

    const handleDeleteCampus = async (campusId: string) => {
      try {
        if (isRealFirebase) {
          await removeCampus(campusId);
        }
        setCampuses(prev => prev.filter(c => c.id !== campusId));
      } catch (err) {
        console.error("Error deleting campus:", err);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-tr from-rose-50/30 via-neutral-50 to-red-50/10 flex flex-col items-center justify-center p-4 selection:bg-red-100">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-lg w-full bg-white rounded-[40px] border border-gray-150 shadow-2xl shadow-red-500/5 p-6 md:p-8"
        >
          {/* Header Brand */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E23744] via-red-550 to-rose-500 flex items-center justify-center text-white font-black text-sm">
                CC
              </div>
              <div>
                <h4 className="font-black text-xs text-gray-900 leading-none">Campus Cakes</h4>
                <p className="text-[9px] text-[#E23744] font-black mt-0.5">Welcome, {firebaseUser.displayName?.split(' ')[0] || 'Friend'}</p>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl border transition-all text-[10px] font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          {tempSelectedCampus ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center mb-1">
                <div className="mx-auto w-12 h-12 bg-red-50 text-[#E23744] flex items-center justify-center rounded-2xl mb-3 shadow-inner">
                  <MapPin className="w-6 h-6 animate-bounce" />
                </div>
                <h2 className="text-xl md:text-2xl font-black font-display text-gray-900 tracking-tight">
                  Delivery Details at {tempSelectedCampus.name}
                </h2>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Enter your hostel address so our student delivery partners find you instantly!
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const hostelBlock = fd.get('hostelBlock') as string;
                  const roomNo = fd.get('roomNo') as string;
                  const instructions = fd.get('instructions') as string;
                  if (!hostelBlock.trim() || !roomNo.trim()) return;
                  handleConfirmHostelAddress(hostelBlock, roomNo, instructions);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                    Hostel Name / Block
                  </label>
                  <input
                    name="hostelBlock"
                    placeholder="e.g. Vindhyachal Hostel, Block C"
                    className="w-full text-xs p-3 border border-gray-200 hover:border-gray-350 rounded-xl outline-none focus:border-[#E23744] focus:ring-1 focus:ring-red-100 placeholder-gray-400 font-medium transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                    Room No. / Door / Lab Desk
                  </label>
                  <input
                    name="roomNo"
                    placeholder="e.g. Room No. 204, Flat 12B"
                    className="w-full text-xs p-3 border border-gray-200 hover:border-gray-355 rounded-xl outline-none focus:border-[#E23744] focus:ring-1 focus:ring-red-100 placeholder-gray-400 font-medium transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                    Specific Delivery Notes / Landmarks (Optional)
                  </label>
                  <textarea
                    name="instructions"
                    placeholder="e.g. Leave with security guard at gate, call when arrived at entrance door, or meet at common room stairs."
                    rows={2}
                    className="w-full text-xs p-3 border border-gray-200 hover:border-gray-360 rounded-xl outline-none focus:border-[#E23744] focus:ring-1 focus:ring-red-100 placeholder-gray-400 font-medium transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTempSelectedCampus(null)}
                    className="flex-1 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold border border-gray-200 rounded-xl text-xs transition-colors cursor-pointer select-none text-center"
                  >
                    Change Campus
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-[#E23744] hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-500/10 transition-colors cursor-pointer select-none text-center animate-pulse"
                  >
                    Confirm & Enter Hub
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <h2 className="text-xl md:text-2xl font-black font-display text-gray-900 tracking-tight text-center">
                Where is your dorm or lab?
              </h2>
              <p className="text-xs text-gray-500 text-center mt-1 mb-6 leading-relaxed">
                Select the active university startup hub below to update current catalogs and live kiosk menus.
              </p>

              {/* Active Hub Grid */}
              <div className="space-y-3 mb-6">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Active Startup Hubs</h5>
                {activeCampuses.map((campus) => (
                  <div
                    key={campus.id}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gradient-to-r hover:from-red-50/5 hover:to-white hover:border-red-300 border-2 border-gray-100 text-left transition-all duration-300 transform hover:-translate-y-0.5 group shadow-sm active:scale-[0.99]"
                  >
                    <div 
                      className="flex items-start gap-3.5 flex-1 cursor-pointer"
                      onClick={() => handleSelectCampus(campus)}
                    >
                      <div className="p-2.5 bg-white rounded-xl text-gray-400 group-hover:text-[#E23744] group-hover:bg-red-50 transition-colors border border-gray-150">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-800 leading-tight group-hover:text-red-900">
                          {campus.name}
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#E23744]" /> {campus.location}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleSelectCampus(campus)}
                        className="flex items-center gap-1 text-[#E23744] text-[10px] font-bold uppercase tracking-wider bg-red-50 px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Enter Hub <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCampus(campus.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                          title="Delete Campus (Admin Only)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="mt-6 border-t pt-5">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">Admin Overrides</h5>
                  
                  <div className="space-y-4">
                    <button
                       onClick={() => {
                         // Create a dummy campus to bypass selection and get into the dashboard
                         const bypassCampus: Campus = { id: 'admin-bypass', name: 'Admin Control Center', location: 'Virtual', active: true };
                         handleSelectCampus(bypassCampus);
                       }}
                       className="w-full flex items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-xs font-bold border border-purple-200"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" /> Bypass to Admin Dashboard
                    </button>
                    
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Emergency Add Hub</h6>
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const name = fd.get('name') as string;
                          const location = fd.get('location') as string;
                          if (!name || !location) return;
                          const newC = {
                            id: `campus-${Date.now()}`,
                            name,
                            location,
                            active: true
                          };
                          setCampuses(prev => [...prev, newC]);
                          if (isRealFirebase) {
                            try {
                              await writeCampus(newC);
                            } catch (err) {
                               console.error(err);
                            }
                          }
                          (e.target as HTMLFormElement).reset();
                        }}
                        className="space-y-2"
                      >
                        <input name="name" placeholder="Campus Name" className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-red-400" required />
                        <input name="location" placeholder="Location Details" className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-red-400" required />
                        <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white text-[10px] font-bold p-2.5 rounded-lg transition-colors cursor-pointer">
                          Provision Campus
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    );
  }  return (
    <div className="min-h-screen bg-neutral-50/60 text-gray-800 font-sans selection:bg-red-100 selection:text-[#E23744]">
      
      {/* APP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-150 px-4 md:px-8 py-3 flex items-center justify-between">
        
        {/* Brand Logo and Title in classical Zomato lowercase italic bold layout */}
        <div className="flex items-center gap-1.5">
          <div 
            onClick={() => { setActiveZomatoTab('delivery'); handleSelectOccasion(null); }}
            className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#E23744] font-display hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer select-none"
          >
            campus cakes
          </div>
          <span className="text-[8px] bg-red-50 text-[#E23744] ring-1 ring-red-100 px-1.5 py-0.5 rounded-md font-extrabold uppercase uppercase tracking-wide hidden sm:inline-block">Dorm Dispatch</span>
        </div>

        {/* Combined Location + Dish Search Bar (Like Classic Zomato) */}
        <div className="hidden md:flex items-center bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm max-w-xl flex-1 mx-6 h-11">
          {/* Location Picker display */}
          <div className="flex items-center gap-1.5 text-gray-700 text-xs font-bold max-w-[180px] truncate">
            <MapPin className="w-4 h-4 text-[#E23744] flex-shrink-0" />
            <span>{selectedCampus.name.split('(')[0]}</span>
          </div>
          
          {/* Central Divider */}
          <div className="w-[1px] h-5 bg-gray-200 mx-3"></div>
          
          {/* Culinary and flavour input search */}
          <div className="flex items-center flex-1 gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for cakes, toppings, bento, flavors..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveZomatoTab('delivery');
              }}
              className="bg-transparent border-none text-xs w-full focus:outline-none placeholder-gray-400 font-medium"
            />
          </div>
        </div>

        {/* Global Controls Side */}
        <div className="flex items-center gap-2.5">
          
          {/* Advanced Campus choosing dropdown */}
          <CampusSelector 
            selectedCampus={selectedCampus}
            onCampusChange={handleCampusChange}
            campuses={campuses}
          />

          {/* Checkout Cart Anchor Button */}
          <button
            id="global-cart-anchor"
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 bg-gray-50 hover:bg-red-50 rounded-2xl border text-gray-700 hover:text-[#E23744] transition-all duration-300 cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 block w-5 h-5 rounded-full bg-[#E23744] text-[9px] font-black text-white text-center leading-5 shadow-md">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>

          {/* Checkout Account Sign Out */}
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-550 hover:text-[#E23744] rounded-2xl border transition-all duration-300 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-gray-500 hover:text-[#E23744]" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* MOBILE COMBINED SEARCH BAR (Rendered on phones for high fidelity) */}
      <div className="block md:hidden px-4 pt-3.5 pb-2 bg-white border-b border-gray-100">
        <div className="flex items-center bg-gray-50 border border-gray-150 rounded-xl px-3 py-2 flex-1 h-10 shadow-inner">
          <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search toppings, chocolate, cupcakes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveZomatoTab('delivery');
            }}
            className="bg-transparent border-none text-xs w-full focus:outline-none placeholder-gray-400 font-semibold"
          />
        </div>
      </div>

      {/* TRIPLE TAB NAVIGATION SELECTOR (ZOMATO STYLE HOME TABS) */}
      <div className="bg-white border-b border-gray-150">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-6 md:gap-12 overflow-x-auto scrollbar-none">
          
          {/* Tab 1: Delivery */}
          <button
            onClick={() => setActiveZomatoTab('delivery')}
            className={`pb-3.5 pt-4 text-sm md:text-base font-bold flex items-center gap-3 border-b-3 transition-all cursor-pointer relative select-none ${
              activeZomatoTab === 'delivery'
                ? 'border-[#E23744] text-[#E23744] font-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <div className={`p-2 rounded-full transition-colors ${activeZomatoTab === 'delivery' ? 'bg-[#FCECEF] text-[#E23744]' : 'bg-gray-100 text-gray-400'}`}>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left font-display">
              <p className="font-extrabold text-xs md:text-sm leading-tight">Delivery</p>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block">Guaranteed student dispatch</p>
            </div>
          </button>

          {/* Tab 2: Campus Kiosk Fridge */}
          <button
            onClick={() => setActiveZomatoTab('kiosk')}
            className={`pb-3.5 pt-4 text-sm md:text-base font-bold flex items-center gap-3 border-b-3 transition-all cursor-pointer relative select-none ${
              activeZomatoTab === 'kiosk'
                ? 'border-[#E23744] text-[#E23744] font-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <div className={`p-2 rounded-full transition-colors ${activeZomatoTab === 'kiosk' ? 'bg-[#FCECEF] text-[#E23744]' : 'bg-gray-100 text-gray-400'}`}>
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left font-display">
              <p className="font-extrabold text-xs md:text-sm leading-tight">Instant Kiosk</p>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block">Pick up in 10 mins today</p>
            </div>
          </button>

          {/* Tab 3: Student Portal Logs */}
          <button
            onClick={() => setActiveZomatoTab('portal')}
            className={`pb-3.5 pt-4 text-sm md:text-base font-bold flex items-center gap-3 border-b-3 transition-all cursor-pointer relative select-none ${
              activeZomatoTab === 'portal'
                ? 'border-[#E23744] text-[#E23744] font-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <div className={`p-2 rounded-full transition-colors ${activeZomatoTab === 'portal' ? 'bg-[#FCECEF] text-[#E23744]' : 'bg-gray-100 text-gray-400'}`}>
              <User className="w-4 h-4" />
            </div>
            <div className="text-left font-display">
              <p className="font-extrabold text-xs md:text-sm leading-tight">Student Portal</p>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block">History, Perks & FAQ</p>
            </div>
          </button>
        </div>
      </div>

      {/* BODY WRAPPED FOR SPACING RESTRAINT */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
               {/* --- STATE 1: DELIVERY DUCK CHANNEL (PRE-ORDE CATALOGUE) --- */}
        {activeZomatoTab === 'delivery' && (
          <div className="space-y-6">
            
            {/* PRE-ORDER CATALOGUE SECTION */}
            <section id="marketplace-shelf" className="scroll-mt-20">
              
              {/* Filter Row Title */}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-black font-display text-gray-950 tracking-tight">
                    Order for Tomorrow at {selectedCampus.name.split(' ')[0]}
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5 font-medium">
                    Order 24 hours in advance. Include special candles, written notes, and customize toppings.
                  </p>
                </div>
              </div>

              {/* VERTICAL FILTER CONTROLS */}
              <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-150 shadow-sm mb-6 space-y-5">
                
                {/* Occasion / Celebration Filters */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#E23744]" /> Filter by Celebration Occasion:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectOccasion(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        activeOccasionId === null
                          ? 'bg-[#E23744] text-white shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200/80 text-gray-600'
                      }`}
                    >
                      All Celebrations
                    </button>
                    {AI_RECOMMENDATION_TEMPLATES.map((item) => {
                      const active = activeOccasionId === item.occasionId;
                      return (
                        <button
                          key={item.occasionId}
                          type="button"
                          onClick={() => handleSelectOccasion(active ? null : item.occasionId)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-500 text-indigo-950 shadow-sm font-black'
                              : 'bg-gray-100/80 hover:bg-gray-200/80 text-gray-600'
                          }`}
                        >
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full h-[1px] bg-gray-100"></div>

                {/* Category Filters */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Categories:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((category) => {
                      const active = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#E23744] text-white shadow-sm'
                              : 'bg-gray-100 hover:bg-gray-200/80 text-gray-600'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full h-[1px] bg-gray-100"></div>

                {/* Bottom Config Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Pricing limitation slider */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs w-full sm:w-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Max Budget:</span>
                    <input
                      type="range"
                      min="150"
                      max="1500"
                      step="50"
                      value={priceRange}
                      onChange={(e) => setPriceRange(parseInt(e.target.value))}
                      className="w-full sm:w-32 accent-[#E23744] cursor-pointer"
                    />
                    <span className="font-extrabold text-gray-800">₹{priceRange}</span>
                  </div>

                  {/* Pure eggless toggler */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-650">Pure Eggless Only</span>
                    <button
                      type="button"
                      onClick={() => setIsEgglessOnly(!isEgglessOnly)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-250 focus:outline-none ${
                        isEgglessOnly ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        isEgglessOnly ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

              </div>

                {/* Active Advisor Tip details */}
                {activeOccasionId && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 flex items-start gap-3"
                  >
                    <div className="p-1.5 bg-amber-500 text-indigo-950 rounded-lg shrink-0 animate-pulse">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      {AI_RECOMMENDATION_TEMPLATES.filter(t => t.occasionId === activeOccasionId).map((t, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[#E23744] text-[9px] tracking-wide uppercase">★ Campus Intel Advisor</span>
                          </div>
                          <p className="font-extrabold text-gray-900">{t.tagline}</p>
                          <p className="text-gray-600 leading-relaxed font-semibold">{t.counsel}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              {/* GRID OF PRODUCT CARDS IN HIGH FIDELITY ZOMATO STYLE */}
              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 max-w-xl mx-auto space-y-3 shadow-inner">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="font-black text-sm text-gray-900">No Cakes Match Your Filters</p>
                  <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                    Try raising your budget limit to ₹1500, clearing eggless checks, or returning to the master categories filter shelf!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All Cakes');
                      setSearchQuery('');
                      setIsEgglessOnly(false);
                      setPriceRange(1500);
                      setTrendingOnly(false);
                      handleSelectOccasion(null);
                    }}
                    className="px-4 py-2 bg-red-50 text-[#E23744] font-black text-xs rounded-xl"
                  >
                    Reset Culinary Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((cake) => {
                    const inWishlist = studentUser.wishlist.includes(cake.id);
                    return (
                      <motion.div
                        key={cake.id}
                        layoutId={`card-layout-${cake.id}`}
                        className="bg-white rounded-[24px] border border-transparent overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col justify-between p-3.5 hover:border-gray-100"
                      >
                        {/* Progressive Card aspect-ratio and Zoom hover */}
                        <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden bg-neutral-100">
                          <img
                            src={cake.image}
                            alt={cake.name}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />

                          {/* Instant pick elements & labels */}
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            {cake.isEggless && (
                              <span className="text-[9px] font-black uppercase text-white bg-green-600 px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                                <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> EGGLESS
                              </span>
                            )}
                            {cake.isTrending && (
                              <span className="text-[9px] font-black uppercase text-white bg-[#E23744] px-2 py-0.5 rounded-md shadow-sm">
                                TRENDING
                              </span>
                            )}
                          </div>

                          {/* Heart Wishlist button */}
                          <button
                            type="button"
                            onClick={() => handleToggleWishlist(cake.id)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-gray-400 hover:text-[#E23744] transition-colors shadow-sm"
                          >
                            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#E23744] text-[#E23744]' : ''}`} />
                          </button>

                          {/* Prep-delivery tag */}
                          <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white rounded-md px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 shadow-sm">
                            <Clock className="w-3 h-3 text-red-405" /> prep & dispatch: {cake.deliveryTime}
                          </div>
                        </div>

                        {/* Text labels styled like Zomato lists */}
                        <div className="pt-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-3">
                              <h3 className="font-extrabold text-sm md:text-base text-gray-900 group-hover:text-[#E23744] transition-colors leading-tight truncate">
                                {cake.name}
                              </h3>
                              
                              {/* ZOMATO TRADEMARK GREEN RATING BADGE VALUE (e.g. 4.9 ★) */}
                              <span className="flex items-center gap-0.5 text-[#24963F] font-black text-xs leading-none bg-emerald-50 px-1.5 py-1 rounded-md flex-shrink-0">
                                {cake.rating} ★
                              </span>
                            </div>

                            <p className="text-[10px] tracking-wide text-gray-400 uppercase font-black tracking-widest mt-0.5 mb-1.5">
                              {cake.category}
                            </p>

                            <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                              {cake.description}
                            </p>
                          </div>

                          {/* Price Tag & Custom Button row */}
                          <div className="border-t border-gray-100 mt-4 pt-3.5 flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold uppercase leading-none">Starting from</p>
                              <p className="text-sm font-black text-gray-950 mt-1">₹{cake.price} <span className="text-[10px] text-gray-400 font-medium">for one</span></p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveCustomizingCake(cake)}
                              className="px-4 py-2 bg-red-50 hover:bg-[#E23744] text-[#E23744] hover:text-white font-extrabold text-xs rounded-xl transition-all duration-205 cursor-pointer shadow-sm active:scale-95"
                            >
                              Add & Customise
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        )}

        {/* --- STATE 2: LIVE KIOSK FRIDGE TAB --- */}
        {activeZomatoTab === 'kiosk' && (
          <div className="space-y-1">
            <KioskSection 
              selectedCampus={selectedCampus}
              onReserveCake={handleReserveKioskCake}
              inventory={kioskInventory}
            />
          </div>
        )}

        {/* --- STATE 3: STUDENT PORTAL JOURNAL AND REVIEW LOGS TAB --- */}
        {activeZomatoTab === 'portal' && (
          <div className="space-y-12">
            
            {/* RENDER USER DASHBOARD COMPONENT */}
            <DashboardSection 
              user={studentUser}
              isAdmin={isAdmin}
              orders={activeOrders}
              allCakes={activeProducts}
              kioskInventory={kioskInventory}
              onRepeatOrder={handleRepeatPastOrder}
              onUpdateKioskStock={handleUpdateKioskStock}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onAddCelebration={handleAddCelebration}
              onDeleteCelebration={handleDeleteCelebration}
              onAddCustomCake={handleAddCustomCake}
              onAddKioskProduct={handleAddKioskProduct}
              onDeleteCustomCake={handleDeleteCustomCake}
              onEditCustomCake={handleEditCustomCake}
              onDeleteKioskProduct={handleDeleteKioskProduct}
              onEditKioskProduct={handleEditKioskProduct}
              campuses={campuses}
              onDeleteCampus={async (id) => {
                try {
                  if (isRealFirebase) {
                    await removeCampus(id);
                  }
                  setCampuses(prev => prev.filter(c => c.id !== id));
                } catch (err) {
                  console.error("Error deleting campus:", err);
                }
              }}
              onAddCampus={(name, location) => {
                const newC = {
                  id: `campus-${Date.now()}`,
                  name,
                  location,
                  active: true
                };
                setCampuses(prev => [...prev, newC]);
                if (isRealFirebase) {
                  writeCampus(newC).catch(err => console.error("Error writing network campus to database:", err));
                }
              }}
            />

            {/* VERIFIED STUDENT REVIEWS & COMMUNITY FEEDBACK */}
            <section className="scroll-mt-12">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-[#E23744] font-bold uppercase tracking-widest text-xs">Community Feedback</span>
                <h2 className="text-2xl md:text-3xl font-black font-display text-gray-950 tracking-tight mt-1">
                  Verified Student Notes
                </h2>
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-semibold">
                  Check out actual experiences submitted instantly by dorm wings, Rep committees, and academic scholars in real time.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:border-red-100 transition-colors">
                    <div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <img src={rev.userImage} className="w-9 h-9 rounded-full object-cover border" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-extrabold text-xs text-gray-900 leading-none">{rev.userName}</p>
                          <p className="text-[9px] text-gray-400 mt-1">{rev.date} • Verified Student Member</p>
                        </div>
                      </div>

                      {/* Rating Stars */}
                      <div className="flex items-center gap-1 text-xs mb-2.5">
                        <span className="flex items-[#24963F] font-bold text-[10px] bg-green-50 text-[#24963F] px-1.5 py-0.5 rounded mr-1">
                          {rev.rating} ★ Rating
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">for {rev.cakeName}</span>
                      </div>

                      <p className="text-gray-600 text-xs leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                    </div>

                    {rev.image && (
                      <div className="mt-4 rounded-xl overflow-hidden aspect-video relative border">
                        <img src={rev.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* WRITE FEEDBACK FORM PANEL */}
              <div className="p-5 md:p-6 bg-white border border-gray-150 rounded-3xl max-w-xl mx-auto shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-2 bg-red-50 text-[#E23744] rounded-xl flex-shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-gray-800 uppercase tracking-widest pl-1 leading-none">Post a Review Note</h4>
                    <span className="text-[10px] text-gray-400 mt-1 block">Help underclassmen discover the absolute best items on campus</span>
                  </div>
                </div>

                <form onSubmit={handleAddReview} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={selectedReviewCake}
                      onChange={(e) => setSelectedReviewCake(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E23744]"
                    >
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.name}>{p.name.substring(0, 24)}...</option>
                      ))}
                      <option value="Kiosk Quick Grab Chocolate">Kiosk Emergency Truffle</option>
                    </select>

                    <select
                      value={submittingRating}
                      onChange={(e) => setSubmittingRating(parseInt(e.target.value))}
                      className="px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E23744]"
                    >
                      <option value="5">★★★★★ Excellent (5/5)</option>
                      <option value="4">★★★★ Tasty (4/5)</option>
                      <option value="3">★★★ Average (3/5)</option>
                    </select>
                  </div>

                  <textarea
                    placeholder="Describe flavour layers, crust quality, written msg fidelity, or dispatch promptness..."
                    value={submittingComment}
                    onChange={(e) => setSubmittingComment(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-150 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E23744]"
                    required
                  />

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#E23744] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md transition-colors"
                  >
                    Publish Verified Experience Note
                  </button>
                </form>
              </div>
            </section>

            {/* FREQUENTLY ASKED QUESTIONS CARD ACCORDION LIST */}
            <section className="scroll-mt-12">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-[#E23744] font-bold uppercase tracking-widest text-xs">Student Help Desk</span>
                <h2 className="text-2xl md:text-3xl font-black font-display text-gray-950 tracking-tight mt-1">
                  Curious Campus FAQs
                </h2>
                <p className="text-gray-400 text-xs mt-1 font-semibold">
                  Everything you need to know about student-led safety protocols, curation, or dispatch logistics.
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-3">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div 
                      key={idx} 
                      className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        className="w-full p-4 text-left font-bold text-xs md:text-sm text-gray-800 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors focus:outline-none"
                      >
                        <span>{faq.q}</span>
                        <span className="text-[#E23744] text-lg leading-none">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="p-4 border-t border-gray-100 text-xs leading-relaxed text-gray-500 bg-white font-medium">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="relative bg-zinc-950 text-zinc-300 mt-20 border-t border-zinc-800">
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-[#E23744] to-amber-500" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E23744] to-red-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-red-950/40">
                CC
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                campus <span className="text-[#E23744]">cakes</span>
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed font-normal max-w-sm">
              Delivering handcrafted premium cakes, customized celebrations, and gourmet treats straight to your campus address—from canteens to dorm rooms.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 w-fit shrink-0 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                Freshly Baked Daily
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1">
                🚀 Room Service Active
              </div>
            </div>
          </div>

          {/* College Network Column */}
          <div className="md:col-span-3 space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E23744]" />
              <h5 className="font-bold text-xs uppercase tracking-widest text-zinc-100">Live Campus Network</h5>
            </div>
            <ul className="text-xs text-zinc-400 space-y-3 font-medium">
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <span className="text-emerald-500">●</span> ABC University <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">Cafe</span>
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <span className="text-emerald-500">●</span> XYZ College of Chemistry <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">Cafe</span>
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <span className="text-emerald-500">●</span> PQR Business Inst. <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">Hub</span>
              </li>
              <li className="pt-1">
                <button 
                  onClick={() => alert('Campus suggestion form loaded soon! Tell us your university canteens details.')}
                  className="text-[#E23744] hover:text-red-400 font-bold transition-colors inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  ⚡ Vote For Your Campus ! 
                </button>
              </li>
            </ul>
          </div>

          {/* Operations Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <h5 className="font-bold text-xs uppercase tracking-widest text-zinc-100">Operations</h5>
            </div>
            <ul className="text-xs text-zinc-400 space-y-3 font-medium">
              <li className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Delivery & Pickup</span>
                <span className="text-white">10:00 AM – 10:00 PM</span>
              </li>
              <li className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Dorm HQ Hub</span>
                <span className="text-white">Student Block C, Booth #3</span>
              </li>
              <li className="pt-1">
                <a 
                  href="https://wa.me/15557236902" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#128C7E] hover:bg-[#075E54] hover:scale-[1.02] text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  WhatsApp Support
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Premium Bottom Bar */}
        <div className="bg-zinc-950 border-t border-zinc-900/80 px-6 md:px-12 py-8 text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            <p className="text-[11px] leading-relaxed max-w-2xl text-left text-zinc-500 md:max-w-xl">
              © 2026 Campus Cakes Inc. Operated in partnership with college student committees. Baked fresh, handled on-campus, and hand-delivered securely with supreme hygiene standards.
            </p>
            <div className="flex flex-wrap gap-4 text-[11px] text-zinc-400 font-semibold justify-end">
              <button onClick={() => alert('Campus Cakes startup operational terms simulation')} className="hover:text-white transition-colors duration-200">Terms of Service</button>
              <span className="text-zinc-700 select-none">•</span>
              <button onClick={() => alert('Student privacy security rules simulation')} className="hover:text-white transition-colors duration-200">Dorm Protection & Privacy</button>
            </div>
          </div>
        </div>
      </footer>

      {/* --- CART SIDEBAR DRAWER PANEL --- */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop blur */}
            <div 
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm md:max-w-md bg-white z-50 shadow-2xl flex flex-col justify-between"
            >
              {/* Drawer header */}
              <div className="p-4 bg-pink-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-pink-600 text-white rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-black text-sm text-gray-900 leading-none">Your Campus Cart</h3>
                    <p className="text-[10px] text-gray-500 mt-1">Ready for {selectedCampus.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded-lg text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer scroll content list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {cart.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 space-y-4">
                    <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto" />
                    <p className="text-xs font-bold">Your campus bucket is empty!</p>
                    <p className="text-[10px] pr-4 pl-4 text-gray-400 leading-normal">
                      Pre-order a gorgeous birthday cake for tomorrow, or grab a 10-minutes pickup item from the Kiosk at canteen!
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="px-3 py-1.5 bg-pink-100 text-pink-700 font-bold text-[10px] rounded-lg"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 pl-1">Selected Confectionery</p>
                    
                    {cart.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-3 rounded-2xl border border-gray-100/90 hover:border-gray-200 bg-gray-50/50 flex gap-3 h-auto relative"
                      >
                        <img src={item.image} className="w-14 h-14 rounded-xl object-cover border" referrerPolicy="no-referrer" />
                        
                        <div className="flex-1 min-w-0 pr-6">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block mb-1 ${
                            item.isInstantKiosk ? 'bg-amber-100 text-amber-800' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {item.isInstantKiosk ? '⚡ Kiosk emergency' : '🗓️ Scheduled pre-order'}
                          </span>

                          <h4 className="font-extrabold text-xs text-gray-900 truncate">{item.name}</h4>
                          
                          {item.customization && (
                            <div className="mt-1 space-y-0.5 text-[9px] text-gray-500">
                              <p>✓ Msg: <strong className="text-pink-600 animate-pulse">"{item.customization.messageOnCake}"</strong></p>
                              <p>✓ Weight: {item.customization.weight} kg • {item.customization.flavor}</p>
                              <p>✓ Slot: {item.customization.pickupTime}</p>
                            </div>
                          )}

                          <div className="mt-2 text-xs font-black text-gray-900">
                            ₹{item.price}
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* Smart order rule notice summary in summary drawer */}
                    {cart.some(c => !c.isInstantKiosk) && (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[10px] text-indigo-900 flex items-start gap-1.5 leading-normal">
                        <Info className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Smart Order Check: Passed.</strong> Custom bakes requires 24h prep. We have reserved your scheduled kitchen timeslot on university grid.
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Drawer footer calculation */}
              {cart.length > 0 && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Cakes Subtotal</span>
                      <span className="font-bold text-gray-900 font-mono">
                        ₹{Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Campus Packaging & Box</span>
                      <span className="font-bold text-gray-900 font-mono">₹20</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST & State Food Tax</span>
                      <span className="font-bold text-gray-900 font-mono">₹30</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed pt-2 text-sm text-gray-900 font-extrabold">
                      <span>Grand Total Charges</span>
                      <span className="text-pink-600 font-mono text-base font-black">
                        ₹{Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50)}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty XP points projection */}
                  <div className="p-2.5 bg-yellow-100 text-yellow-905 font-bold rounded-xl text-[10px] text-center flex items-center justify-center gap-1">
                    <span className="animate-spin text-amber-600">★</span> 
                    You earns +{Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0))} XP student loyalty points!
                  </div>

                  <button
                    onClick={() => {
                      setIsCheckoutOpen(true);
                      setIsCartOpen(false);
                    }}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs rounded-2xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-1"
                  >
                    Proceed to Payment Gate <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- PAYMENT INTEGRATION CHECKOUT DRAWER --- */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => setIsCheckoutOpen(false)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl overflow-hidden border border-gray-100 max-w-md w-full p-6 shadow-2xl relative z-50 space-y-4"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-5 h-5 text-pink-600" />
                <h3 className="font-black text-base text-gray-900">University Payment Gate</h3>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 leading-normal">
              Campus Cakes manages secure terminal simulations. Pick your transaction mode to dispatch orders into our active bakery queue.
            </p>

            <form onSubmit={handleCompletePayment} className="space-y-4 text-xs">
              
              {/* Payment Mode choices */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-0.5">Choose checkout mode</label>
                
                {/* UPI Option */}
                <label className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMode === 'upi' ? 'bg-pink-50/50 border-pink-400' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymode"
                      value="upi"
                      checked={paymentMode === 'upi'}
                      onChange={() => setPaymentMode('upi')}
                      className="accent-pink-600"
                    />
                    <span className="font-bold text-gray-800">Scan & Pay (GPay / PhonePe UPI)</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded">Fastest</span>
                </label>

                {/* Credit Card Option */}
                <label className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMode === 'card' ? 'bg-pink-50/50 border-pink-400' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymode"
                      value="card"
                      checked={paymentMode === 'card'}
                      onChange={() => setPaymentMode('card')}
                      className="accent-pink-600"
                    />
                    <span className="font-bold text-gray-800">Credit / Debit Card</span>
                  </div>
                </label>

                {/* Cash on Pickup Option */}
                <label className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMode === 'cash' ? 'bg-pink-50/50 border-pink-400' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymode"
                      value="cash"
                      checked={paymentMode === 'cash'}
                      onChange={() => setPaymentMode('cash')}
                      className="accent-pink-600"
                    />
                    <span className="font-bold text-gray-800">Cash on Pickup (Canteen Stalls)</span>
                  </div>
                </label>
              </div>

              {/* UPI fields details */}
              {paymentMode === 'upi' && (
                <div className="p-3 bg-gray-50 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-3">
                    {/* Simulated dynamic dummy QR code */}
                    <div className="w-14 h-14 bg-white border border-gray-200 rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
                      <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-60">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className={`rounded-sm ${(i * 7) % 3 === 0 ? 'bg-black' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-[11px] leading-tight text-gray-800">Quick Scan QR Terminal</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Applet generates mock UPI addresses instantly.</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Confirm Student VPA ID</span>
                    <input
                      type="text"
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CARD fields details */}
              {paymentMode === 'card' && (
                <div className="p-3 bg-gray-50 rounded-2xl space-y-2.5">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">16 digit Card Number</span>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Expiry Date</span>
                      <input
                        type="text"
                        placeholder="08/29"
                        className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">CVV</span>
                      <input
                        type="password"
                        placeholder="***"
                        className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Redeem XP Loyalty Points Application */}
              <div className="space-y-1.5 pb-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 rounded-lg text-amber-500">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Campus XP Points</h4>
                      <p className="text-[10px] text-gray-600">Balance: {studentUser.rewardPoints} XP (₹{studentUser.rewardPoints})</p>
                      {!hasCupcakesInCart && (
                        <p className="text-[9px] text-red-500 font-bold mt-0.5">Only applicable on Cupcakes!</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemPoints(!redeemPoints)}
                    disabled={studentUser.rewardPoints <= 0 || !hasCupcakesInCart}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-250 focus:outline-none ${
                        redeemPoints && hasCupcakesInCart ? 'bg-amber-500' : 'bg-gray-300'
                    } ${(studentUser.rewardPoints <= 0 || !hasCupcakesInCart) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        redeemPoints && hasCupcakesInCart ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                {redeemPoints && hasCupcakesInCart && <p className="text-[10px] text-amber-600 font-bold">XP points applied to offset the total!</p>}
              </div>

              {/* Wallet Balance Application */}
              <div className="space-y-1.5 pb-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Campus Wallet</h4>
                      <p className="text-[10px] text-gray-600">Available: ₹{studentUser.walletBalance ?? 0}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseWallet(!useWallet)}
                    disabled={(studentUser.walletBalance ?? 0) <= 0}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-250 focus:outline-none ${
                        useWallet && (studentUser.walletBalance ?? 0) > 0 ? 'bg-emerald-500' : 'bg-gray-300'
                    } ${(studentUser.walletBalance ?? 0) <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        useWallet && (studentUser.walletBalance ?? 0) > 0 ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                {useWallet && (studentUser.walletBalance ?? 0) > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold">
                    Deducting ₹{Math.min(studentUser.walletBalance ?? 0, Math.max(0, Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50) - ((redeemPoints && hasCupcakesInCart) ? studentUser.rewardPoints : 0)))} from your wallet!
                  </p>
                )}
              </div>

              {/* Segment calculations totals */}
              <div className="border-t border-dashed pt-3 text-xs flex justify-between font-extrabold text-gray-800 items-end">
                <span>Amount to Pay</span>
                <div className="text-right">
                  {((redeemPoints && hasCupcakesInCart) || (useWallet && (studentUser.walletBalance ?? 0) > 0)) && (
                    <span className="text-[10px] text-gray-400 line-through mr-2 font-mono">
                      ₹{Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50)}
                    </span>
                  )}
                  <span className="text-pink-600 font-mono text-sm">
                    ₹{Math.max(0, Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50) - ((redeemPoints && hasCupcakesInCart) ? studentUser.rewardPoints : 0) - (useWallet ? Math.min(studentUser.walletBalance ?? 0, Math.max(0, Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50) - ((redeemPoints && hasCupcakesInCart) ? studentUser.rewardPoints : 0))) : 0))}
                  </span>
                </div>
              </div>

              {/* Submission buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="py-2.5 bg-white border hover:bg-gray-50 rounded-xl font-bold"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-md transition-colors"
                >
                  Authorize Simulation
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* --- ORDER COMPLETE & SUCCESS POPUP BANNER --- */}
      <AnimatePresence>
        {orderCompletePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setOrderCompletePopup(false)} />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full text-center relative z-50 space-y-4 shadow-2xl border"
            >
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-wider text-green-600">Dispach Confirmed!</p>
                <h3 className="font-black text-xl text-gray-900">Your Cake is Booked!</h3>
                <p className="text-xs font-extrabold text-gray-400">Order Number: #{newOrderId}</p>
              </div>

              <p className="text-xs text-gray-500 leading-normal">
                Congratulations! We have routed details to our premium baking kitchen team. You can tracking real-time delivery state updates in the <strong>Student Hub Active Orders</strong> panel right now!
              </p>

              {/* Stepper visual preview inside success modal */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl text-[10px] font-bold text-gray-600 text-left space-y-2 border">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Timelines Status Stage: Placed</p>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  <span className="text-gray-900">1. Order placed successfully</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="w-2.5 h-2.5 bg-gray-200 rounded-full" />
                  <span>2. Bakery preparing chef layers</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="w-2.5 h-2.5 bg-gray-200 rounded-full" />
                  <span>3. Out for college delivery</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOrderCompletePopup(false)}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-lg shadow-pink-600/10 text-xs text-center"
              >
                Done, Back to Shop
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PRE-ORDER ACTIVE MODAL OVERLAY --- */}
      <AnimatePresence>
        {activeCustomizingCake && (
          <CustomOrderModal 
            cake={activeCustomizingCake}
            onClose={() => setActiveCustomizingCake(null)}
            onAddToCart={handleAddCustomCakeToCart}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
