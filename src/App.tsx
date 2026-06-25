/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  CAMPUSES, CATEGORIES, CAKE_PRODUCTS, KIOSK_INVENTORY, FAQS, AI_RECOMMENDATION_TEMPLATES 
} from './data';
import { 
  Campus, CakeItem, KioskCake, CartItem, Order, UserProfile, SavedCelebration, FeedbackReview, OrderStatus 
} from './types';

// Importing custom modular components
import CampusSelector from './components/CampusSelector';
import KioskSection from './components/KioskSection';
import CustomOrderModal from './components/CustomOrderModal';
import DashboardSection from './components/DashboardSection';
import SupportSection from './components/SupportSection';
import OffersInstagramCarousel from './components/OffersInstagramCarousel';
import { DarkModeToggle } from './components/DarkModeToggle';
import CelebrationConfetti from './components/CelebrationConfetti';

// Lucide React Icons
import { 
  ShoppingBag, Search, Sparkles, SlidersHorizontal, Heart, Clock, Star, 
  HelpCircle, MessageSquare, ChevronRight, CheckCircle2, Phone, ShieldCheck, 
  ArrowRight, X, AlertTriangle, CreditCard, Check, Compass, Info, Send,
  LogOut, GraduationCap, MapPin, User, Zap, Trash2, Download, Gift,
  Bell, BellOff, BellRing, Tag, Coffee, Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, authenticateWithGoogle, isRealFirebase } from './firebase';
import { 
  testFirestoreConnection, getCampuses, writeCampus, removeCampus, 
  getProducts, writeProduct, removeProduct, getKioskProducts, writeKioskProduct, 
  removeKioskProduct, getUserProfile, writeUserProfile, getAllUserProfiles, getUserOrders, writeOrder, 
  writeCakeImage, getAllOrders, removeOrder, subscribeToCoupons, writeCoupon, removeCoupon,
  subscribeToUserProfile, subscribeToUserOrders, subscribeToAllOrders, clearAllFirestoreCaches,
  subscribeToReviews, writeReview, removeReview
} from './lib/firestoreService';
import { downloadReceiptFile } from './lib/receipt';
import { safeStorage } from './lib/safeStorage';
import brandLogo from './assets/images/brand_logo_1781589358418.jpg';
import { Coupon } from './types';

export default function App() {
  // --- 0. FIREBASE AUTHENTICATION FLOW STATE ---
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  
  const [campusSelected, setCampusSelected] = useState<boolean>(() => {
    return safeStorage.getItem('campus_cakes_selected_campus') !== null;
  });
  const [activeZomatoTab, setActiveZomatoTab] = useState<'delivery' | 'kiosk' | 'portal' | 'support'>('delivery');
  const [tempSelectedCampus, setTempSelectedCampus] = useState<Campus | null>(null);
  const [tempAddressDetails, setTempAddressDetails] = useState<{hostelBlock: string, roomNo: string, instructions: string} | null>(null);
  const [tempDob, setTempDob] = useState<string>('');
  const [activeDocModal, setActiveDocModal] = useState<'terms' | 'privacy' | 'refund' | null>(null);

  // --- 1. STATE CONFIGURATIONS ---
  const [selectedCampus, setSelectedCampus] = useState<Campus>(() => {
    const cached = safeStorage.getItem('campus_cakes_selected_campus');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) return parsed;
      } catch (e) {}
    }
    return CAMPUSES[0];
  });
  
  // Catalogs
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(isRealFirebase);
  const [campuses, setCampuses] = useState<Campus[]>(() => {
    return isRealFirebase ? [] : CAMPUSES;
  });
  const [activeProducts, setActiveProducts] = useState<CakeItem[]>(() => {
    return isRealFirebase ? [] : CAKE_PRODUCTS;
  });
  const [kioskInventory, setKioskInventory] = useState<KioskCake[]>(() => {
    return isRealFirebase ? [] : KIOSK_INVENTORY;
  });

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

  const isAdmin = !!(
    (firebaseUser && (firebaseUser.email === 'tanishapahal606@gmail.com' || firebaseUser.email === 'saransh1860@gmail.com')) ||
    (studentUser && (studentUser.email === 'tanishapahal606@gmail.com' || studentUser.email === 'saransh1860@gmail.com')) ||
    (selectedCampus && selectedCampus.id === 'admin-bypass')
  );

  // --- 1.1 FIREBASE AUTH AND LOCAL STORAGE PERSISTENCE EFFECTS ---
  useEffect(() => {
    // Read initial local user cache
    const cachedUser = safeStorage.getItem('campus_cakes_user');
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
          safeStorage.setItem('campus_cakes_user', JSON.stringify(customUser));
        } else {
          // Keep cache if simulated, otherwise clear it on explicit signout
          const cached = safeStorage.getItem('campus_cakes_user');
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
      if (!isRealFirebase) {
        setLoadingCatalog(false);
        return;
      }
      try {
        await testFirestoreConnection();
        
        // 1. Sync Campuses
        try {
          const dbCampuses = await getCampuses();
          const hasArr = safeStorage.getItem('_has_bootstrapped_campuses');
          if ((dbCampuses && dbCampuses.length > 0) || hasArr) {
            setCampuses(dbCampuses);
            if (!hasArr) safeStorage.setItem('_has_bootstrapped_campuses', 'true');
          } else {
            // Bootstrap Firestore with initial static campuses
            for (const c of CAMPUSES) {
              await writeCampus(c).catch(e => console.warn("Admin rights needed to bootstrap campuses", e));
            }
            safeStorage.setItem('_has_bootstrapped_campuses', 'true');
            setCampuses(CAMPUSES);
          }
        } catch (e) {
          console.error("Error syncing campuses:", e);
          setCampuses(CAMPUSES);
        }

        // 2. Sync Products (Standard Delivery Cakes)
        try {
          const dbProducts = await getProducts();
          const hasProd = safeStorage.getItem('_has_bootstrapped_products');
          if ((dbProducts && dbProducts.length > 0) || hasProd) {
            setActiveProducts(dbProducts);
            if (!hasProd) safeStorage.setItem('_has_bootstrapped_products', 'true');
          } else {
            // Bootstrap Firestore with initial static products
            for (const p of CAKE_PRODUCTS) {
              await writeProduct(p).catch(e => console.warn("Admin rights needed to bootstrap products", e));
            }
            safeStorage.setItem('_has_bootstrapped_products', 'true');
            setActiveProducts(CAKE_PRODUCTS);
          }
        } catch (e) {
          console.error("Error syncing products:", e);
          setActiveProducts(CAKE_PRODUCTS);
        }

        // 3. Sync Kiosk Inventory Stock Levels
        try {
          const dbKiosk = await getKioskProducts();
          const hasKiosk = safeStorage.getItem('_has_bootstrapped_kiosk');
          if ((dbKiosk && dbKiosk.length > 0) || hasKiosk) {
            setKioskInventory(dbKiosk);
            if (!hasKiosk) safeStorage.setItem('_has_bootstrapped_kiosk', 'true');
          } else {
            // Bootstrap Firestore with initial default kiosk inventory and log initial state images
            for (const k of KIOSK_INVENTORY) {
              await writeKioskProduct(k).catch(e => console.warn("Admin rights needed to bootstrap kiosk products", e));
            }
            safeStorage.setItem('_has_bootstrapped_kiosk', 'true');
            setKioskInventory(KIOSK_INVENTORY);
          }
        } catch (e) {
          console.error("Error syncing kiosk products:", e);
          setKioskInventory(KIOSK_INVENTORY);
        }
      } catch (err) {
        console.error("Error connecting to Firestore database:", err);
      } finally {
        setLoadingCatalog(false);
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
        // Force-reset loyalty points & wallet balance for all users for clean deployment slate
        let profileChanged = false;
        if (!healedProfile.didDeploymentReset2026) {
          healedProfile.rewardPoints = 0;
          healedProfile.walletBalance = 0;
          healedProfile.didDeploymentReset2026 = true;
          profileChanged = true;
        }
        // Ensure wallet balance is initialized
        if (healedProfile.walletBalance === undefined) {
          healedProfile.walletBalance = 0;
          profileChanged = true;
        }
        if (profileChanged) {
          await writeUserProfile(healedProfile).catch(err => console.error("Error auto-writing reset profile:", err));
        }
        setStudentUser(healedProfile);
        setProfileLoaded(true);

        // --- NEW CUSTOMER VS RE-SIGN-IN VERIFICATION ---
        // If a returning customer has registered their campus, hostel address, and DOB previously
        if (healedProfile.campusId && healedProfile.address && healedProfile.dob) {
          const matchedCampus = campuses.find(c => c.id === healedProfile.campusId) || CAMPUSES.find(c => c.id === healedProfile.campusId);
          if (matchedCampus) {
            setSelectedCampus(matchedCampus);
            safeStorage.setItem('campus_cakes_selected_campus', JSON.stringify(matchedCampus));
          }
          setCampusSelected(true);
        } else {
          // New customer or profile lacking full registration credentials
          setCampusSelected(false);
        }
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
        
        // Brand new user must supply campus selection, hostel address, and DOB
        setCampusSelected(false);
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
  }, [firebaseUser, isRealFirebase, selectedCampus, isAdmin, campuses]);

  // Fallback Sync profile details when user authenticates using simulation mode
  useEffect(() => {
    if (!isRealFirebase && firebaseUser) {
      // Check for cached profile in safeStorage for simulated users
      const cachedProfileStr = safeStorage.getItem(`campus_cakes_profile_${firebaseUser.uid}`);
      if (cachedProfileStr) {
        try {
          const cachedProfile = JSON.parse(cachedProfileStr);
          if (cachedProfile && cachedProfile.address && cachedProfile.dob) {
            setStudentUser(cachedProfile);
            setProfileLoaded(true);
            const matchedCampus = campuses.find(c => c.id === cachedProfile.campusId) || CAMPUSES.find(c => c.id === cachedProfile.campusId);
            if (matchedCampus) {
              setSelectedCampus(matchedCampus);
              safeStorage.setItem('campus_cakes_selected_campus', JSON.stringify(matchedCampus));
            }
            setCampusSelected(true);
            return;
          }
        } catch (e) {}
      }

      // If no cached fully registered profile, handle as new customer
      setStudentUser(prev => ({
        ...prev,
        name: firebaseUser.displayName || 'Campus Student',
        email: firebaseUser.email || 'student@campus-cakes.com',
        address: '',
        dob: '',
        campusId: selectedCampus.id
      }));
      setProfileLoaded(true);
      setCampusSelected(false);
    }
  }, [firebaseUser, selectedCampus, isRealFirebase, campuses]);

  // master profile loaded flag
  const [activeOrders, setActiveOrders] = useState<Order[]>(() => {
    const saved = safeStorage.getItem('campus_cakes_active_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean stale development or mock orders from client's storage
          return parsed.filter(o => o.id !== 'CK-9831' && !o.id.startsWith('mock-'));
        }
      } catch (err) {
        console.error("Error parsing saved active orders:", err);
      }
    }
    return [];
  });

  // Keep active orders persisted in localStorage for offline & simulation modes
  useEffect(() => {
    safeStorage.setItem('campus_cakes_active_orders', JSON.stringify(activeOrders));
  }, [activeOrders]);

  // --- BROWSER / IN-APP NOTIFICATIONS SYSTEM INITIALIZATION ---
  interface InAppToast {
    id: string;
    title: string;
    body: string;
  }
  const [inAppToasts, setInAppToasts] = useState<InAppToast[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    const saved = safeStorage.getItem('campus_cakes_notify_pref');
    if (saved) return saved as any;
    return 'granted'; // Default to enabled / granted as requested!
  });

  // Try to sync with native permission on mount, but respect our 'granted' default preference
  useEffect(() => {
    if ('Notification' in window) {
      try {
        const saved = safeStorage.getItem('campus_cakes_notify_pref');
        if (!saved) {
          safeStorage.setItem('campus_cakes_notify_pref', 'granted');
          Notification.requestPermission().then((p) => {
            if (p === 'granted') {
              setNotificationPermission('granted');
            }
          }).catch(() => {
            // Silence sandbox exceptions
          });
        }
      } catch (err) {
        console.warn("Permission sync issue in sandboxed environment: ", err);
      }
    }
  }, []);

  const addInAppToast = (title: string, body: string) => {
    const freshId = `toast-${Date.now()}`;
    setInAppToasts(prev => [...prev, { id: freshId, title, body }]);
    setTimeout(() => {
      setInAppToasts(prev => prev.filter(t => t.id !== freshId));
    }, 8500);
  };

  const removeInAppToast = (id: string) => {
    setInAppToasts(prev => prev.filter(t => t.id !== id));
  };

  const triggerPopupNotification = (title: string, body: string) => {
    // If the user has disabled/denied notifications, do not issue sounds or banners
    if (notificationPermission === 'denied') return;

    // 1. Premium sound chime alert using the Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(512.33, audioCtx.currentTime); // C5 accent frequency
      osc.frequency.exponentialRampToValueAtTime(768.0, audioCtx.currentTime + 0.12); // G5 elegant transition
      
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.22);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn("Audio Context alert blocked or prevented: ", e);
    }

    // 2. HTML5 native browser Push Notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
          body: body,
          icon: '/favicon.ico'
        });
        setTimeout(() => n.close(), 6500);
      } catch (err) {
        console.warn("Iframe native push context prevented:", err);
      }
    }

    // 3. Smart UI Fallback Toasts (guarantees notice visibility under iframe sandbox limitations)
    addInAppToast(title, body);
  };

  const handleRequestNotificationPermission = async () => {
    if (notificationPermission === 'granted') {
      // Toggle off (Muted)
      setNotificationPermission('denied');
      safeStorage.setItem('campus_cakes_notify_pref', 'denied');
      addInAppToast("🔕 live alerts paused", "Live updates and audio chime alerts are now silenced.");
      return;
    }

    // Toggle on (Enabled!)
    setNotificationPermission('granted');
    safeStorage.setItem('campus_cakes_notify_pref', 'granted');

    // Attempt to prompt HTML5 system Notifications as progressive enhancement
    if ('Notification' in window) {
      try {
        const p = await Notification.requestPermission();
        if (p === 'granted') {
          const n = new Notification("🔔 Notifications Enabled!", {
            body: "You'll receive push tracking updates for campus cake arrivals!",
            icon: '/favicon.ico'
          });
          setTimeout(() => n.close(), 4500);
        }
      } catch (err) {
        console.warn("Iframe native push prompt prevented:", err);
      }
    }

    addInAppToast("🔔 Live Alerts Active!", "You will now receive beautiful real-time order tracking alerts.");
    
    // Quick success chime audio
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); 
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (_) {}
  };

  // Comparative Order Monitor Ref track
  const prevOrdersRef = useRef<Order[]>([]);
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  // Function to calculate remaining days until a recurring yearly event date
  const getDaysUntilCelebration = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return -1;
    const celebMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
    const celebDay = parseInt(parts[2], 10);
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Construct target celebration date on current year
    let celebDateThisYear = new Date(currentYear, celebMonth, celebDay);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (celebDateThisYear < todayMidnight) {
      celebDateThisYear.setFullYear(currentYear + 1);
    }
    
    const diffTime = celebDateThisYear.getTime() - todayMidnight.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Check saved celebration reminders and trigger push/in-app alert updates
  useEffect(() => {
    if (!profileLoaded || !studentUser.savedCelebrations || studentUser.savedCelebrations.length === 0) return;

    studentUser.savedCelebrations.forEach((celeb) => {
      if (!celeb.remindMe) return;
      // Prevent duplicate triggers in same browser segment / session
      if (notifiedEventsRef.current.has(celeb.id)) return;

      const daysLeft = getDaysUntilCelebration(celeb.date);

      if (daysLeft === 0) {
        triggerPopupNotification(
          `🎉 Event Today: ${celeb.name}`,
          `Happy Celebration! Today is ${celeb.name}'s (${celeb.relation}) special day. Treat them with a custom cake pre-order or instant kiosk pickup!`
        );
        notifiedEventsRef.current.add(celeb.id);
      } else if (daysLeft > 0 && daysLeft <= 2) {
        const dayLabel = daysLeft === 1 ? "tomorrow" : "in 2 days";
        triggerPopupNotification(
          `⏰ Celebration Alert: ${celeb.name}`,
          `${celeb.name}'s (${celeb.relation}) celebration is coming up ${dayLabel} (on ${celeb.date}). Don't forget to secure their cake from Campus Cakes!`
        );
        notifiedEventsRef.current.add(celeb.id);
      }
    });
  }, [studentUser.savedCelebrations, profileLoaded]);

  useEffect(() => {
    if (!profileLoaded) return;
    
    // Initial silent load of existing active orders on app launch/login
    if (prevOrdersRef.current.length === 0 && activeOrders.length > 0) {
      prevOrdersRef.current = activeOrders;
      return;
    }

    activeOrders.forEach(currentOrder => {
      const prevOrder = prevOrdersRef.current.find(o => o.id === currentOrder.id);
      
      if (!prevOrder) {
        // Brand new order detected
        if (isAdmin) {
          triggerPopupNotification(
            "🔔 New Order Dispatched!",
            `Order #${currentOrder.id} placed by ${currentOrder.customerName} for ₹${Math.round(currentOrder.total)} has entered the kitchen queue.`
          );
        } else if (currentOrder.userId === firebaseUser?.uid) {
          triggerPopupNotification(
            "🎂 Order Booked Successfully!",
            `Your Order #${currentOrder.id} is securely submitted to the campus kitchen.`
          );
        }
      } else if (prevOrder.status !== currentOrder.status) {
        // Status Transition detected
        const mappedStatus = currentOrder.status === 'completed' || currentOrder.status === 'ready' ? 'delivered' : currentOrder.status;
        
        if (isAdmin) {
          triggerPopupNotification(
            `📈 Order #${currentOrder.id} Updated`,
            `Status of order from ${currentOrder.customerName} marked as: ${mappedStatus}.`
          );
        } else if (currentOrder.userId === firebaseUser?.uid) {
          let customTitle = "";
          let customBody = "";
          
          if (currentOrder.status === 'preparing') {
            customTitle = "🍳 Cake Bake Active!";
            customBody = `The baker chefs are active on Order #${currentOrder.id}! Layer modeling is in progress.`;
          } else if (currentOrder.status === 'delivery') {
            customTitle = "🚴 Out for Campus Delivery!";
            customBody = `Your cake for Order #${currentOrder.id} has left the oven and is heading with our runner.`;
          } else if (currentOrder.status === 'ready' || currentOrder.status === 'completed') {
            customTitle = "✅ Cake Delivered!";
            customBody = `Success! Order #${currentOrder.id} has reached your designated campus dispatch location. Enjoy!`;
          }

          if (customTitle && customBody) {
            triggerPopupNotification(customTitle, customBody);
          }
        }
      }
    });

    prevOrdersRef.current = activeOrders;
  }, [activeOrders, profileLoaded, isAdmin, firebaseUser]);

  const [reviews, setReviews] = useState<FeedbackReview[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [lastSeenCouponId, setLastSeenCouponId] = useState<string | null>(safeStorage.getItem('lastSeenCouponId'));
  const [activeCouponPopup, setActiveCouponPopup] = useState<Coupon | null>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setCoupons([]);
      return;
    }
    const unsub = subscribeToCoupons((data) => {
      setCoupons(data);
    });
    return () => unsub();
  }, [firebaseUser]);

  useEffect(() => {
    if (!isRealFirebase) {
      // Seed some default reviews if user is working offline
      setReviews([
        {
          id: 'mock-1',
          userName: 'Arjun Mehta',
          userImage: 'https://ui-avatars.com/api/?name=Arjun+Mehta&background=random',
          rating: 5,
          comment: 'The chocolate hazelnut cake was absolutely heavenly. Kept us awake during midnight exam prep!',
          cakeName: 'Gourmet Chocolate Hazelnut Dream',
          date: '2 hours ago'
        },
        {
          id: 'mock-2',
          userName: 'Sneha Sharma',
          userImage: 'https://ui-avatars.com/api/?name=Sneha+Sharma&background=random',
          rating: 4,
          comment: 'Cutest bento cake layout ever! Made our roommate anniversary celebration perfect.',
          cakeName: 'Korean Pastel Bento Cake',
          date: 'Yesterday'
        }
      ]);
      return;
    }
    const unsub = subscribeToReviews((data) => {
      setReviews(data);
    });
    return () => unsub();
  }, [isRealFirebase]);



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
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, pct?: number, flat?: number, id?: string, isBday?: boolean} | null>(null);
  const [serviceMode, setServiceMode] = useState<'delivery' | 'dinein'>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    return modeParam === 'dinein' ? 'dinein' : 'delivery';
  });
  const [tableNumber, setTableNumber] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('table');
  });

  const handleApplyCoupon = (codeOverride?: string | any) => {
    const override = typeof codeOverride === 'string' ? codeOverride : undefined;
    const input = override || couponInput;
    if (!input || typeof input !== 'string') return;
    
    // First check dynamic coupons
    const match = coupons.find(c => c.code.toUpperCase() === input.trim().toUpperCase());
    if (match) {
      if (!match.isActive) {
        addInAppToast("Coupon Expired", "This discount code is no longer active.");
        return;
      }
      if (match.usageLimit > 0 && match.usersUsed.length >= match.usageLimit) {
        addInAppToast("Coupon Limit Reached", "This discount code usage limit has been reached.");
        return;
      }
      if (match.usersUsed.includes(studentUser.uid)) {
        addInAppToast("Coupon Used", "You have already used this discount code.");
        return;
      }

      setAppliedCoupon({ 
        code: match.code, 
        pct: match.discountType === 'percentage' ? match.discountValue : undefined,
        flat: match.discountType === 'flat' ? match.discountValue : undefined,
        id: match.id,
        isBday: false
      });
      addInAppToast("Discount Applied!", `${match.discountType === 'percentage' ? match.discountValue + '%' : '₹' + match.discountValue} off for ${match.occasion}. Enjoy!`);
      setCouponInput('');
      return;
    }

    // Default birthday check logic
    const storedCoupon = safeStorage.getItem(`campus_cakes_bday_coupon_${studentUser.uid || 'anon'}`);
    if (storedCoupon === input.trim() && studentUser?.dob) {
      const today = new Date();
      const dobDate = new Date(studentUser.dob);
      if (today.getMonth() === dobDate.getMonth() && today.getDate() === dobDate.getDate()) {
        const isUsed = safeStorage.getItem(`campus_cakes_bday_used_${storedCoupon}`);
        if (!isUsed) {
          setAppliedCoupon({ code: storedCoupon, pct: 10, isBday: true });
          addInAppToast("Birthday Discount Applied!", "10% off on your special day. Enjoy!");
          setCouponInput('');
          return;
        } else {
          addInAppToast("Coupon Expired", "This birthday coupon has already been used.");
          return;
        }
      } else {
         addInAppToast("Not Your Birthday", "This coupon can only be used on your birthday.");
         return;
      }
    }
    
    addInAppToast("Invalid Coupon", "Please enter a valid discount code.");
  };

  // Review submission inputs
  const [submittingRating, setSubmittingRating] = useState<number>(5);
  const [submittingComment, setSubmittingComment] = useState('');
  const [selectedReviewCake, setSelectedReviewCake] = useState('Gourmet Chocolate Hazelnut Dream');

  // New FAQ active key state
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // Simulated live feedback sound/animations
  const [orderCompletePopup, setOrderCompletePopup] = useState<boolean>(false);
  const [newOrderId, setNewOrderId] = useState<string>('');

  const [showBdayPopup, setShowBdayPopup] = useState<boolean>(false);
  const [bdayDiscountCode, setBdayDiscountCode] = useState<string>('');

  // Birthday check effect
  useEffect(() => {
    if (campusSelected && studentUser?.dob) {
      const today = new Date();
      const dobDate = new Date(studentUser.dob);
      if (today.getMonth() === dobDate.getMonth() && today.getDate() === dobDate.getDate()) {
        const storedCouponKey = `campus_cakes_bday_coupon_${studentUser.uid || 'anon'}`;
        let code = safeStorage.getItem(storedCouponKey);
        
        if (!code) {
          code = `BDAY-${Math.floor(100000 + Math.random() * 900000)}`;
          safeStorage.setItem(storedCouponKey, code);
        }

        const isUsed = safeStorage.getItem(`campus_cakes_bday_used_${code}`);
        const popupShownKey = `campus_cakes_bday_popup_shown_${studentUser.uid || 'anon'}_${today.getFullYear()}`;
        const hasShownToday = safeStorage.getItem(popupShownKey);

        if (!isUsed && !hasShownToday) {
          setBdayDiscountCode(code);
          setShowBdayPopup(true);
          safeStorage.setItem(popupShownKey, 'true');
        }
      }
    }
  }, [campusSelected, studentUser?.dob, studentUser?.uid]);

  // --- 2. LOGICAL SIDE-EFFECTS & UPDATES ---
  // Handle Campus Select resets
  const handleCampusChange = (campus: Campus) => {
    setSelectedCampus(campus);
    safeStorage.setItem('campus_cakes_selected_campus', JSON.stringify(campus));
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
      safeStorage.setItem('campus_cakes_user', JSON.stringify(user));
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
    safeStorage.removeItem('campus_cakes_user');
    safeStorage.removeItem('campus_cakes_selected_campus');
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
      safeStorage.setItem('campus_cakes_selected_campus', JSON.stringify(campus));
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
    setTempAddressDetails({ hostelBlock, roomNo, instructions });
  };

  const handleConfirmDob = (dobStr: string) => {
    if (!tempSelectedCampus || !tempAddressDetails) return;
    
    const { hostelBlock, roomNo, instructions } = tempAddressDetails;
    const fullAddress = `${hostelBlock}, ${roomNo}${instructions ? ` (${instructions})` : ''}`;
    
    setSelectedCampus(tempSelectedCampus);
    safeStorage.setItem('campus_cakes_selected_campus', JSON.stringify(tempSelectedCampus));
    
    const updatedUser = { 
      ...studentUser,
      dob: dobStr,
      campusId: tempSelectedCampus.id,
      address: fullAddress
    };
    
    setStudentUser(updatedUser);
    safeStorage.setItem('campus_cakes_user', JSON.stringify(updatedUser));
    if (firebaseUser) {
      safeStorage.setItem(`campus_cakes_profile_${firebaseUser.uid}`, JSON.stringify(updatedUser));
    }
    
    if (isRealFirebase && firebaseUser) {
      writeUserProfile({ ...updatedUser, uid: firebaseUser.uid }).catch(e => console.error("Error saving profile:", e));
    }
    
    setCampusSelected(true);
    setTempSelectedCampus(null);
    setTempAddressDetails(null);
  };

  // Kiosk instant reservation
  const handleReserveKioskCake = (kioskItem: KioskCake) => {
    // Check if stock exists
    if (kioskItem.remainingStock <= 0) {
      addInAppToast("Out of Stock Today", "Uh-oh! That ready-to-go slice is currently out of stock. Try customizing a fresh pre-order cake!");
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
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + item.quantity } : p);
      }
      return [...prev, item];
    });
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

  // Admin operational routine to purge all orders, reset everyone's database state metrics for live deployment
  const handlePurgeAllOrders = async () => {
    if (!isAdmin) {
      addInAppToast("Operation Blocked", "Unauthorized operational request: Administrative rights needed to wipe records.");
      return;
    }
    if (!window.confirm("⚠️ DANGER: Are you absolutely sure you want to permanently delete ALL order data from the remote Firestore database and reset analytics for all active users? This cannot be undone.")) {
      return;
    }
    try {
      if (isRealFirebase) {
        // 1. Fetch and delete ALL orders from the remote Database to completely clean operations and start analytics
        const allDbOrders = await getAllOrders();
        const deletePromises = allDbOrders.map(order => removeOrder(order.id));
        await Promise.all(deletePromises);

        // 2. Fetch ALL user profiles from the remote database and reset their XP (reward points) and wallet balances
        const allUserProfiles = await getAllUserProfiles();
        const resetUserPromises = allUserProfiles.map(async (profile) => {
          const resetP = {
            ...profile,
            rewardPoints: 0,
            walletBalance: 0,
            didDeploymentReset2026: true
          };
          await writeUserProfile(resetP);
        });
        await Promise.all(resetUserPromises);

        // 3. Purge all local cached server states
        clearAllFirestoreCaches();
      }
      
      // 3. Clear state and cache
      setActiveOrders([]);
      safeStorage.removeItem('campus_cakes_active_orders');
      
      // 4. Force-reset reward points & wallet parameters on user's active session profile
      const zeroedProfile = {
        ...studentUser,
        rewardPoints: 0,
        walletBalance: 0,
        didDeploymentReset2026: true
      };
      setStudentUser(zeroedProfile);
      
      if (isRealFirebase && firebaseUser) {
        await writeUserProfile({ ...zeroedProfile, uid: firebaseUser.uid });
      }
      
      addInAppToast("Clean Slate Success", "🎉 All test orders have been purged, all user profile XP metrics have been reset, and startup analytics are cleared!");
    } catch (err) {
      console.error("Critical error while purging deployment database:", err);
      addInAppToast("Operational Error", "Failure resetting database records on live server. Please inspect connectivity logs.");
    }
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
          return { ...k, remainingStock: Math.min(k.totalStock, k.remainingStock + item.quantity) };
        }
        return k;
      }));
    }
    setCart(prev => prev.filter(c => c.id !== cartId));
  };

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === cartId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  // Checkout submission action
  const handleCompletePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const subtotal = cart.reduce((acc, c) => acc + (c.price * c.quantity), 0);
    const tax = 30; // standard tax & packaging
    const deliveryFee = serviceMode === 'dinein' ? 0 : 20; // standard delivery surcharge
    const surchargeTotal = tax + deliveryFee;
    
    const effectiveRedeemPoints = redeemPoints;
    const pointsDiscount = effectiveRedeemPoints ? (studentUser.rewardPoints || 0) : 0;
    
    let couponDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.pct) {
        couponDiscount = Math.floor(subtotal * (appliedCoupon.pct / 100));
      } else if (appliedCoupon.flat) {
        couponDiscount = appliedCoupon.flat;
      }
    }

    const total = Math.max(0, subtotal + surchargeTotal - pointsDiscount - couponDiscount);
    const pointsDeducted = effectiveRedeemPoints ? Math.min((studentUser.rewardPoints || 0), subtotal + surchargeTotal - couponDiscount) : 0;

    if (appliedCoupon) {
      if (appliedCoupon.isBday) {
        safeStorage.setItem(`campus_cakes_bday_used_${appliedCoupon.code}`, 'used');
      } else if (appliedCoupon.id) {
        // Find existing coupon and update uses
        const match = coupons.find(c => c.id === appliedCoupon.id);
        if (match) {
          writeCoupon({
            ...match,
            usersUsed: [...match.usersUsed, studentUser.uid]
          });
        }
      }
    }

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
      paymentMethod: paymentMode === 'upi' ? `UPI (${upiIdInput})` : 'Credit Card',
      pointsEarned: Math.floor(subtotal / 10),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timestamp: new Date().toISOString(),
      serviceMode
    };

    const userOrderRecord: Order = {
      ...newOrderRecord,
      userId: firebaseUser?.uid || 'anonymous-user',
      userEmail: firebaseUser?.email || 'unverified@campus-cakes.com',
      customerName: studentUser?.name || firebaseUser?.displayName || 'Campus Student',
      customerPhone: studentUser?.phone || '',
      deliveryAddress: serviceMode === 'dinein' ? (tableNumber ? `Dine-In Canteen Venue / Table ${tableNumber}` : 'Dine-In Canteen Venue / Hall') : (studentUser?.address || 'Campus Domain')
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
    
    // Award loyalty points to user profile and deduct spent points
    const updatedPoints = studentUser.rewardPoints - Math.floor(pointsDeducted) + Math.floor(subtotal / 10);
    
    const updatedUser = {
      ...studentUser,
      rewardPoints: updatedPoints
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
    setAppliedCoupon(null);
  };

  // Review submission
  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingComment) return;

    const newRev: FeedbackReview = {
      id: 'rev-' + Date.now(),
      userName: firebaseUser?.displayName || studentUser.name || 'Anonymous Student',
      userImage: firebaseUser?.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(studentUser.name) + '&background=random',
      rating: submittingRating,
      comment: submittingComment,
      cakeName: selectedReviewCake || 'Gourmet Chocolate Hazelnut Dream',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • Just now',
    };

    if (isRealFirebase) {
      writeReview(newRev)
        .then(() => {
          setSubmittingComment('');
          addInAppToast("Review Contribution", "Thank you! Your verified student review was successfully published.");
        })
        .catch(err => {
          console.error("Error writing review:", err);
          addInAppToast("Failed to post feedback", err instanceof Error ? err.message : "Error saving to cloud");
        });
    } else {
      setReviews(prev => [newRev, ...prev]);
      setSubmittingComment('');
      addInAppToast("Review Contribution", "Thank you! Your verified student review was successfully published.");
    }
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
      serviceMode === 'dinein' ||
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

    // 7. Campus filter (products are campus-specific if associated)
    const matchesCampus = !cake.campusIds || cake.campusIds.length === 0 || cake.campusIds.includes(selectedCampus.id);

    // 8. Service mode availability filter
    const matchesServiceMode = 
      serviceMode === 'delivery' 
        ? cake.isDelivery !== false 
        : cake.isDineIn !== false;

    return matchesSearch && matchesCategory && matchesEggless && matchesPrice && matchesTrending && matchesOccasion && matchesCampus && matchesServiceMode;
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
      <div className="min-h-screen bg-[#0A0304] flex items-center justify-center p-6 selection:bg-amber-100/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(226,55,68,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="flex flex-col items-center max-w-sm text-center relative z-10">
          
          {/* Circular Embossed Logo Container with Luxury Shine and Ripple */}
          <div className="relative mb-8">
            {/* Spinning/pulsing aura boundary */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#D4AF37] via-amber-500/20 to-transparent opacity-40 blur-md"
            />
            {/* Soft breathing pulse ring */}
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -inset-1 rounded-full border-2 border-dashed border-[#D4AF37]/30"
            />
            {/* Outer embossed ring */}
            <div className="relative p-1 bg-gradient-to-tr from-[#D4AF37] via-amber-200 to-[#996515] rounded-full shadow-2xl shadow-amber-500/10">
              <motion.img 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                src={brandLogo} 
                className="w-24 h-24 rounded-full object-cover shadow-inner bg-black border-2 border-black/50"
                alt="Campus Cakes"
              />
            </div>
          </div>

          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black font-display text-amber-100 tracking-tight leading-none italic uppercase"
          >
            campus cakes
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[9px] text-[#D4AF37] font-black tracking-[0.25em] uppercase mt-2 mb-6"
          >
            THE ONLY DESTINATION FOR EVERY OCCASION
          </motion.p>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/10 text-[9px] font-bold text-amber-200/80 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-ping" />
            Initializing Dispatch Grid
          </div>
        </div>
      </div>
    );
  }
  // 2. Google Sign-In Screen (Mandated Exclusive Method)
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#070102] flex items-center justify-center p-4 selection:bg-[#F3E5AB] selection:text-[#805000] relative overflow-hidden">
        {/* Elite Ambient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-tr from-[#D4AF37]/10 via-[#E23744]/10 to-transparent rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-[#E23744]/10 via-[#996515]/5 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:16px_28px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="relative max-w-md w-full bg-[#120709]/95 backdrop-blur-xl rounded-[44px] border-2 border-[#D4AF37]/30 shadow-[0_30px_70px_rgba(0,0,0,0.8)] p-8 md:p-11 text-center relative z-10"
        >
          {/* Gilded Top Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#D4AF37] to-[#E23744] text-black text-[8px] font-black uppercase tracking-[0.25em] px-4 py-1 rounded-full border-2 border-[#070102] shadow-md">
            👑 MEMBER SECURED PORTAL
          </div>

          {/* Logo Brand Accent with luxury hover and pulse */}
          <div className="flex justify-center mb-6 mt-2">
            <motion.div 
              whileHover={{ scale: 1.11, rotate: 6 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative"
            >
              {/* Spinning/shining aura boundary */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="absolute -inset-3.5 rounded-full bg-gradient-to-tr from-[#D4AF37]/45 via-red-500/20 to-transparent opacity-60 blur-md"
              />
              <div className="p-1.5 bg-gradient-to-tr from-[#D4AF37] via-[#FFF3CD] to-[#996515] rounded-full shadow-2xl ring-4 ring-[#120709] transition-all">
                <img 
                  src={brandLogo} 
                  className="w-22 h-22 rounded-full object-cover bg-black"
                  alt="Campus Cakes Premium Logo"
                />
              </div>
            </motion.div>
          </div>

          <h1 className="text-3xl font-extrabold font-serif text-white tracking-tight leading-none italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FEFAF6] via-[#D4AF37] to-[#FEFAF6]">
            campus cakes
          </h1>
          <p className="text-[9px] font-black tracking-[0.3em] text-[#E23744] uppercase mt-1.5">THE ONLY DESTINATION FOR EVERY CELEBRATION</p>

          <p className="text-xs text-zinc-300 mt-5 mb-8 leading-relaxed font-medium">
            Welcome to the members-only gateway. Verify your student account to unlock guaranteed premium dorm deliveries, exquisite bespoke decorations, and instantaneous campus kiosk live fridge reserves.
          </p>

          {/* Secure Exclusive Google Sign-In Trigger */}
          <div className="space-y-3">
            <button
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              className="w-full h-13 flex items-center justify-center bg-gradient-to-r from-[#1E0E10] to-[#251013] hover:from-[#2B1519] hover:to-[#2F1518] text-zinc-200 hover:text-white font-extrabold text-xs px-6 rounded-2xl border-2 border-[#D4AF37]/35 shadow-md hover:shadow-lg hover:border-[#D4AF37]/65 transition-all duration-300 cursor-pointer"
            >
              <svg className="w-5 h-5 mr-3.5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with student Google account
            </button>
            <p className="text-[9px] text-zinc-500 font-bold font-mono uppercase tracking-widest pt-1">Only official student organization credentials permitted.</p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#D4AF37]/20 flex items-center justify-center gap-4 text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide">
            <span className="flex items-center gap-1.5 text-[#FEFAF6]">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> Firebase Secure Gate
            </span>
            <span className="text-zinc-650">•</span>
            <span className="text-zinc-500 font-mono">Est. May 2026</span>
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
          className="relative max-w-lg w-full bg-white dark:bg-[#120709] rounded-[40px] border border-gray-150 dark:border-[#291316] shadow-2xl shadow-red-500/5 p-6 md:p-8"
        >
          {/* Header Brand */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <motion.div 
                whileHover={{ scale: 1.12, rotate: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 12 }}
                className="w-10 h-10 rounded-full border border-amber-500/25 overflow-hidden shadow-inner bg-black flex items-center justify-center shrink-0"
              >
                <img src={brandLogo} className="w-full h-full object-cover" alt="Campus Cakes" />
              </motion.div>
              <div>
                <h4 className="font-black text-xs text-gray-900 dark:text-white leading-none">Campus Cakes</h4>
                <p className="text-[9px] text-[#E23744] font-black mt-0.5">Welcome, {firebaseUser.displayName?.split(' ')[0] || 'Friend'}</p>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#1a0d0f]/80 hover:bg-red-50 hover:dark:bg-red-500/10 text-gray-500 dark:text-[#a1a1aa] hover:text-red-600 rounded-xl border transition-all text-[10px] font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          {tempSelectedCampus && !tempAddressDetails ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center mb-1">
                <div className="mx-auto w-12 h-12 bg-red-50 dark:bg-red-500/10 text-[#E23744] flex items-center justify-center rounded-2xl mb-3 shadow-inner">
                  <MapPin className="w-6 h-6 animate-bounce" />
                </div>
                <h2 className="text-xl md:text-2xl font-black font-display text-gray-900 dark:text-white tracking-tight">
                  Delivery Details at {tempSelectedCampus.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
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
                    className="w-full text-xs p-3 border border-gray-200 dark:border-[#3c1a1e] hover:border-gray-350 rounded-xl outline-none focus:border-[#E23744] focus:ring-1 focus:ring-red-100 placeholder-gray-400 font-medium transition-all"
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
                    className="w-full text-xs p-3 border border-gray-200 dark:border-[#3c1a1e] hover:border-gray-355 rounded-xl outline-none focus:border-[#E23744] focus:ring-1 focus:ring-red-100 placeholder-gray-400 font-medium transition-all"
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
                    className="w-full text-xs p-3 border border-gray-200 dark:border-[#3c1a1e] hover:border-gray-360 rounded-xl outline-none focus:border-[#E23744] focus:ring-1 focus:ring-red-100 placeholder-gray-400 font-medium transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTempSelectedCampus(null)}
                    className="flex-1 py-3 px-4 bg-gray-50 dark:bg-[#1a0d0f]/80 hover:bg-gray-100 hover:dark:bg-[#1a0d0f] text-gray-600 dark:text-[#d4d4d8] font-bold border border-gray-200 dark:border-[#3c1a1e] rounded-xl text-xs transition-colors cursor-pointer select-none text-center"
                  >
                    Change Campus
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-[#E23744] hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-500/10 transition-colors cursor-pointer select-none text-center animate-pulse"
                  >
                    Confirm & Proceed
                  </button>
                </div>
              </form>
            </div>
          ) : tempSelectedCampus && tempAddressDetails ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center mb-1">
                <div className="mx-auto w-12 h-12 bg-pink-50 dark:bg-pink-500/10 text-pink-600 flex items-center justify-center rounded-2xl mb-3 shadow-inner">
                  <Gift className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-xl md:text-2xl font-black font-display text-gray-900 dark:text-white tracking-tight">
                  When's your Birthday?
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                  We love to celebrate with our students! We'll give you a special treat on your special day.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const dob = fd.get('dob') as string;
                  if (!dob.trim()) return;
                  handleConfirmDob(dob);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    className="w-full text-xs p-3 border border-gray-200 dark:border-[#3c1a1e] hover:border-gray-350 rounded-xl outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-100 placeholder-gray-400 font-medium transition-all"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTempAddressDetails(null)}
                    className="flex-1 py-3 px-4 bg-gray-50 dark:bg-[#1a0d0f]/80 hover:bg-gray-100 hover:dark:bg-[#1a0d0f] text-gray-600 dark:text-[#d4d4d8] font-bold border border-gray-200 dark:border-[#3c1a1e] rounded-xl text-xs transition-colors cursor-pointer select-none text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-pink-500/10 transition-colors cursor-pointer select-none text-center"
                  >
                    Confirm & Enter Hub
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <h2 className="text-xl md:text-2xl font-black font-display text-gray-900 dark:text-white tracking-tight text-center">
                Select your campus
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#a1a1aa] text-center mt-1 mb-6 leading-relaxed">
                Select the active university startup hub below to update current catalogs and live kiosk menus.
              </p>

              {/* Active Hub Grid */}
              <div className="space-y-3 mb-6">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Active Startup Hubs</h5>
                {loadingCatalog ? (
                  Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#1a0d0f]/80 border-2 border-gray-100 dark:border-[#291316] animate-pulse">
                      <div className="flex items-start gap-3.5 flex-1">
                        <div className="p-2.5 bg-gray-205 dark:bg-zinc-800 rounded-xl w-10 h-10 shrink-0" />
                        <div className="space-y-2 flex-1 pt-1">
                          <div className="h-4 bg-gray-205 dark:bg-zinc-800 rounded w-2/3" />
                          <div className="h-3 bg-gray-205 dark:bg-zinc-800 rounded w-1/3" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : activeCampuses.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50/50 dark:bg-[#100608]/50 rounded-2xl border border-dashed border-gray-200 dark:border-[#291316]">
                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500">No active campuses listed currently.</p>
                  </div>
                ) : (
                  activeCampuses.map((campus) => (
                  <div
                    key={campus.id}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#1a0d0f]/80 hover:bg-gradient-to-r hover:from-red-50/5 hover:to-white hover:border-red-300 border-2 border-gray-100 dark:border-[#291316] text-left transition-all duration-300 transform hover:-translate-y-0.5 group shadow-sm dark:shadow-none active:scale-[0.99]"
                  >
                    <div 
                      className="flex items-start gap-3.5 flex-1 cursor-pointer"
                      onClick={() => handleSelectCampus(campus)}
                    >
                      <div className="p-2.5 bg-white dark:bg-[#120709] rounded-xl text-gray-400 group-hover:text-[#E23744] group-hover:bg-red-50 hover:dark:bg-red-500/10 transition-colors border border-gray-150 dark:border-[#291316]">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-800 dark:text-[#fafafa] leading-tight group-hover:text-red-900">
                          {campus.name}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#E23744]" /> {campus.location}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleSelectCampus(campus)}
                        className="flex items-center gap-1 text-[#E23744] text-[10px] font-bold uppercase tracking-wider bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Enter Hub <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCampus(campus.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:dark:bg-red-500/10 rounded-full transition-colors cursor-pointer"
                          title="Delete Campus (Admin Only)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )))}
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
                       className="w-full flex items-center justify-center p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-700 hover:bg-purple-100 transition-colors text-xs font-bold border border-purple-200"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" /> Bypass to Admin Dashboard
                    </button>
                    
                    <div className="bg-white dark:bg-[#120709] p-4 rounded-xl border border-gray-200 dark:border-[#3c1a1e] shadow-sm dark:shadow-none">
                      <h6 className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase mb-2">Emergency Add Hub</h6>
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
                        <input name="name" placeholder="Campus Name" className="w-full text-xs p-2.5 border border-gray-200 dark:border-[#3c1a1e] rounded-lg outline-none focus:border-red-400" required />
                        <input name="location" placeholder="Location Details" className="w-full text-xs p-2.5 border border-gray-200 dark:border-[#3c1a1e] rounded-lg outline-none focus:border-red-400" required />
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
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#070102] text-zinc-850 dark:text-[#FEFAF6] font-sans selection:bg-[#F3E5AB] selection:text-[#805000] relative overflow-x-hidden">
      
      {/* PREMIUM CHIC AMBIENT ARTISTIC GLOWS */}
      <div className="absolute top-[5%] left-[10%] w-[45vw] h-[45vw] md:w-[35rem] md:h-[35rem] bg-gradient-to-tr from-amber-200/20 via-rose-200/10 to-transparent dark:from-rose-950/10 dark:via-[#4A0E17]/10 dark:to-transparent rounded-full blur-[80px] pointer-events-none select-none z-0" />
      <div className="absolute top-[35%] right-[5%] w-[40vw] h-[40vw] md:w-[30rem] md:h-[30rem] bg-gradient-to-br from-amber-300/10 via-amber-100/5 to-transparent dark:from-yellow-950/5 dark:via-zinc-900/5 dark:to-transparent rounded-full blur-[100px] pointer-events-none select-none z-0" />
      
      {/* APP HEADER */}
      <header className="sticky top-0 z-40 bg-[#FCFAF7]/95 dark:bg-[#0B0405]/95 backdrop-blur-md border-b border-[#D4AF37]/25 dark:border-[#3C2216]/60 px-4 md:px-8 py-4.5 flex items-center justify-between shadow-[0_4px_30px_rgba(212,175,55,0.04)] relative z-10">
        
        {/* Brand Logo and Title in classical Zomato lowercase italic bold layout with premium animated logo stamp */}
        <div className="flex items-center gap-2.5">
          <motion.div
            onClick={() => { setActiveZomatoTab('delivery'); handleSelectOccasion(null); }}
            whileHover={{ scale: 1.15, rotate: 360, boxShadow: "0 0 20px rgba(212, 175, 55, 0.6)" }}
            transition={{ type: "spring", stiffness: 220, damping: 15 }}
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-lg bg-black cursor-pointer shrink-0 hidden xs:flex items-center justify-center p-0.5 relative group"
          >
            {/* Spinning golden sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <img src={brandLogo} className="w-full h-full rounded-full object-cover" alt="Campus Cakes" />
          </motion.div>
          <div 
            onClick={() => { setActiveZomatoTab('delivery'); handleSelectOccasion(null); }}
            className="text-2xl md:text-3.5xl font-black italic tracking-tighter text-[#E23744] dark:text-[#FCFAF7] font-display hover:opacity-95 transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            <span className="font-serif font-black tracking-tight drop-shadow-sm">campus</span> 
            <span className="text-zinc-950 dark:text-[#D4AF37] not-italic font-black bg-gradient-to-r from-[#D4AF37] via-[#FFDF00] to-[#C5A02B] bg-clip-text text-transparent uppercase tracking-widest font-sans text-xl md:text-2xl ml-1 pl-1.5 border-l-2 border-[#D4AF37]/30">cakes</span>
          </div>
          <span className="text-[8px] bg-gradient-to-r from-[#D4AF37]/15 to-transparent text-[#C49A25] ring-1 ring-[#D4AF37]/45 px-2 py-0.5 rounded-md font-black uppercase tracking-[0.2em] hidden sm:inline-block shadow-xs">Dorm Dispatch</span>
        </div>



        {/* Global Controls Side */}
        <div className="flex items-center gap-2.5">
          
          <DarkModeToggle />

          {/* Advanced Campus choosing dropdown */}
          <CampusSelector 
            selectedCampus={selectedCampus}
            onCampusChange={handleCampusChange}
            campuses={campuses}
            onShowToast={addInAppToast}
          />

          {/* Checkout Cart Anchor Button */}
          <button
            id="global-cart-anchor"
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 bg-[#FCFAF7] dark:bg-[#120708] hover:bg-[#FCECEF] hover:dark:bg-[#200A0E] rounded-2xl border border-[#D4AF37]/20 dark:border-[#3C2216]/60 text-zinc-700 dark:text-[#FEFAF6] hover:text-[#E23744] hover:border-[#E23744] transition-all duration-300 cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-5 h-5" />
            
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 block w-5 h-5 rounded-full bg-[#E23744] text-[9px] font-black text-white text-center leading-5 shadow-md dark:shadow-none">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>

          {/* Checkout Account Sign Out */}
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2.5 bg-[#FCFAF7] dark:bg-[#120708] hover:bg-red-50 hover:dark:bg-red-950/20 text-zinc-500 hover:text-[#E23744] rounded-2xl border border-[#D4AF37]/20 dark:border-[#3C2216]/60 transition-all duration-300 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4 text-zinc-500 dark:text-zinc-400 hover:text-[#E23744]" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* SERVICE SELECTOR DONGLE & SEARCH BAR (CLASSIC ZOMATO SUB-NAV REGION) */}
      <div className="w-full bg-[#FCFAF7] dark:bg-[#0B0405] border-b border-[#D4AF37]/15 dark:border-[#3C2216]/45 py-5 px-4 flex flex-col items-center gap-4 relative z-10">
        
        {/* THE DONGLE (High-Fidelity Bluetooth Styled Toggle Switch) */}
        <div className="w-full max-w-sm bg-white dark:bg-[#120708] p-4 rounded-[24px] border border-[#D4AF37]/20 dark:border-[#3C2216]/50 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${serviceMode === 'dinein' ? 'bg-[#FAF3D9] dark:bg-[#251D0B] text-[#C49A25]' : 'bg-[#FCECEF] dark:bg-[#200A0D] text-[#E23744]'}`}>
              {serviceMode === 'dinein' ? <Utensils className="w-4 h-4 animate-pulse" /> : <ShoppingBag className="w-4 h-4" />}
            </div>
            <div className="text-left font-sans">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-[#FEFAF6]">
                {serviceMode === 'dinein' ? (tableNumber ? `🍽️ Dine-In (Table ${tableNumber})` : '🍽️ Dine-In Canteen') : '🚚 Room Delivery'}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-bold">
                {serviceMode === 'dinein' ? 'Table booking & dining active' : 'Direct hostel dispatch active'}
              </p>
            </div>
          </div>
          
          {/* THE BLUETOOTH STYLE SWITCH BUTTON */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="service-mode-toggle-button"
              onClick={() => {
                const nextMode = serviceMode === 'delivery' ? 'dinein' : 'delivery';
                setServiceMode(nextMode);
                if (nextMode === 'dinein' && activeZomatoTab === 'kiosk') {
                  setActiveZomatoTab('delivery');
                }
                addInAppToast(
                  "Service Mode Updated", 
                  nextMode === 'dinein' 
                    ? "Changed to Canteen Dine-In table service mode." 
                    : "Switched to Dorm Delivery dispatch mode."
                );
              }}
              className={`w-13 h-7.5 rounded-full p-1 transition-all duration-300 relative focus:outline-none cursor-pointer border ${
                serviceMode === 'dinein' 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
              }`}
            >
              <motion.div
                className="w-5.5 h-5.5 bg-white rounded-full shadow-md"
                animate={{ x: serviceMode === 'dinein' ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              />
            </button>
          </div>
        </div>

        {/* UNIFIED RESPONSIVE SEARCH BAR */}
        <div className="w-full max-w-xl">
          <div className="flex items-center bg-[#FAF6F0] dark:bg-[#120708] border border-[#D4AF37]/25 dark:border-[#3C2216] rounded-2xl px-3.5 py-1.5 shadow-sm h-11 transition-all focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/10">
            {/* Location Picker display */}
            <div className="flex items-center gap-1.5 text-zinc-750 dark:text-[#FEFAF6] text-xs font-bold max-w-[130px] sm:max-w-[180px] truncate">
              <MapPin className="w-4 h-4 text-[#C49A25] flex-shrink-0" />
              <span className="truncate">{selectedCampus.name.split('(')[0]}</span>
            </div>
            
            {/* Central Divider */}
            <div className="w-[1px] h-5 bg-[#D4AF37]/35 dark:bg-[#3C2216]/50 mx-3"></div>
            
            {/* Culinary and flavour input search */}
            <div className="flex items-center flex-1 gap-2">
              <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-550" />
              <input
                type="text"
                placeholder="Search for cakes, toppings, bento, flavors..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveZomatoTab('delivery');
                }}
                className="bg-transparent border-none text-xs w-full focus:outline-none placeholder-zinc-455 dark:placeholder-zinc-500 font-semibold text-zinc-900 dark:text-[#FEFAF6]"
              />
            </div>
          </div>
        </div>

      </div>

      {/* TRIPLE TAB NAVIGATION SELECTOR (ZOMATO STYLE HOME TABS) */}
      <div id="main-tabs-anchor" className="bg-[#FAF7F2] dark:bg-[#0B0405] border-b border-[#D4AF37]/25 dark:border-[#3C2216]/65 shadow-[0_5px_15px_-10px_rgba(212,175,55,0.1)] relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-4 md:gap-10 overflow-x-auto scrollbar-none py-1">
          
          {/* Tab 1: Delivery / Dine-In Menu */}
          <button
            onClick={() => setActiveZomatoTab('delivery')}
            className={`pb-4 pt-4 text-sm md:text-base font-bold flex items-center gap-3 transition-all cursor-pointer relative select-none shrink-0 group ${
              activeZomatoTab === 'delivery'
                ? 'text-[#E23744] dark:text-[#F3E5AB] font-black'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-[#FEFAF6]'
            }`}
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${activeZomatoTab === 'delivery' ? 'bg-gradient-to-br from-[#FCFAF7] to-[#FCECEF] dark:from-[#200A0D] dark:to-[#0C0405] text-[#E23744] dark:text-[#FEFAF6] shadow-sm scale-105 border border-[#E23744]/20' : 'bg-[#FAF6F0] dark:bg-[#120708]/85 text-zinc-400 border border-transparent'}`}>
              {serviceMode === 'dinein' ? <Utensils className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
            </div>
            <div className="text-left font-display">
              <p className="font-extrabold text-xs md:text-sm tracking-tight leading-tight">
                {serviceMode === 'dinein' ? 'Dine-In Menu' : 'Delivery Pantry'}
              </p>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold hidden sm:block uppercase tracking-wider mt-0.5">
                {serviceMode === 'dinein' ? 'Explore Canteen offerings' : 'Guaranteed dispatch'}
              </p>
            </div>
            {activeZomatoTab === 'delivery' && (
              <motion.div 
                layoutId="activeZomatoUnderline" 
                className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] rounded-t-full shadow-[0_-2px_10px_rgba(212,175,55,0.4)]"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            )}
          </button>

          {/* Tab 2: Campus Kiosk Fridge */}
          {serviceMode !== 'dinein' && (
            <button
              onClick={() => setActiveZomatoTab('kiosk')}
              className={`pb-4 pt-4 text-sm md:text-base font-bold flex items-center gap-3 transition-all cursor-pointer relative select-none shrink-0 group ${
                activeZomatoTab === 'kiosk'
                  ? 'text-[#E23744] dark:text-[#F3E5AB] font-black'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-[#FEFAF6]'
              }`}
            >
              <div className={`p-2.5 rounded-2xl transition-all duration-300 ${activeZomatoTab === 'kiosk' ? 'bg-gradient-to-br from-[#FFFDF0] to-[#FAF3D9] dark:from-[#251D0B] dark:to-[#0C0405] text-amber-600 dark:text-[#F3E5AB] shadow-sm scale-105 border border-[#D4AF37]/30' : 'bg-[#FAF6F0] dark:bg-[#120708]/85 text-zinc-400 border border-transparent'}`}>
                <Zap className="w-4 h-4 text-[#D4AF37] animate-pulse" />
              </div>
              <div className="text-left font-display">
                <p className="font-extrabold text-xs md:text-sm tracking-tight leading-tight">Instant Kiosk</p>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold hidden sm:block uppercase tracking-wider mt-0.5">Pick up in 10 mins today</p>
              </div>
              {activeZomatoTab === 'kiosk' && (
                <motion.div 
                  layoutId="activeZomatoUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] rounded-t-full shadow-[0_-2px_10px_rgba(212,175,55,0.4)]"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          )}

          {/* Tab 3: Student Portal Logs */}
          <button
            onClick={() => setActiveZomatoTab('portal')}
            className={`pb-4 pt-4 text-sm md:text-base font-bold flex items-center gap-3 transition-all cursor-pointer relative select-none shrink-0 group ${
              activeZomatoTab === 'portal'
                ? 'text-[#E23744] dark:text-[#F3E5AB] font-black'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-[#FEFAF6]'
            }`}
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${activeZomatoTab === 'portal' ? 'bg-gradient-to-br from-[#FCFAF5] to-[#F5EFE0] dark:from-[#222116] dark:to-[#0C0405] text-[#C49A25] shadow-sm scale-105 border border-[#D4AF37]/35' : 'bg-[#FAF6F0] dark:bg-[#120708]/85 text-zinc-400 border border-transparent'}`}>
              <User className="w-4 h-4" />
            </div>
            <div className="text-left font-display">
              <p className="font-extrabold text-xs md:text-sm tracking-tight leading-tight">Student Portal</p>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold hidden sm:block uppercase tracking-wider mt-0.5">History, Perks & FAQ</p>
            </div>
            {activeZomatoTab === 'portal' && (
              <motion.div 
                layoutId="activeZomatoUnderline" 
                className="absolute bottom-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] rounded-t-full shadow-[0_-2px_10px_rgba(212,175,55,0.4)]"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* BODY WRAPPED FOR SPACING RESTRAINT */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
               {/* --- STATE 1: DELIVERY DUCK CHANNEL (PRE-ORDE CATALOGUE) --- */}
        {activeZomatoTab === 'delivery' && (
          <div className="space-y-6">
            


            {/* INSTAGRAM STYLE OFFER COMMUNITY CAROUSEL */}
            <OffersInstagramCarousel 
              coupons={coupons}
              user={studentUser}
              onApplyCoupon={handleApplyCoupon}
              onShowToast={addInAppToast}
            />

            {/* BRAND LUXURY SHOWCASE HERO BANNER - GOLD & ROYAL VELVET */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-8 md:p-11 bg-gradient-to-br from-[#160406] via-[#0C0203] to-[#240A0D] rounded-[40px] border-2 border-[#D4AF37]/30 shadow-[0_25px_60px_-15px_rgba(226,55,68,0.15)] overflow-hidden text-white"
            >
              {/* Premium royal overlays and light stars */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.15),transparent_60%)] pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-96 h-96 bg-gradient-to-tr from-[#E23744]/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
              
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                {/* Brand Text */}
                <div className="space-y-4 max-w-2xl text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[9px] font-black text-[#F3E5AB] uppercase tracking-[0.2em] leading-none shadow-sm">
                    <Sparkles className="w-3 h-3 text-[#D4AF37] animate-spin" /> ESTABLISHED CAMPUS PATISSERIE
                  </div>
                  
                  <h1 className="text-3xl md:text-4.5xl font-extrabold font-serif tracking-tight text-white leading-none">
                    Gourmet Royal Pastries <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FFF3CD] to-[#D4AF37] italic font-serif">Handcrafted for the Campus Elite</span>
                  </h1>
                  
                  <p className="text-xs md:text-sm text-zinc-300 font-medium leading-relaxed max-w-xl">
                    Welcome to the verified Campus Cakes dispatch. Every cake is custom-made by master pastry chefs using direct-sourced organic vanilla beans, Belgian cocoa reserves, and gold leaf dust—hand-delivered in temperature-restrained crystal boxes directly to your dorm gate.
                  </p>
                  
                  {/* Real-time VIP perks row */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-3 text-[10px] uppercase font-black tracking-widest text-[#D4AF37]/90">
                    <span className="flex items-center gap-1.5 bg-[#1F1407]/80 border border-[#D4AF37]/25 px-3 py-1.5 rounded-xl"><Check className="w-3.5 h-3.5 text-emerald-500" /> FREE DORM COURIER</span>
                    <span className="flex items-center gap-1.5 bg-[#1F1407]/80 border border-[#D4AF37]/25 px-3 py-1.5 rounded-xl"><Check className="w-3.5 h-3.5 text-emerald-500" /> 100% HIGHEST QUALITY</span>
                  </div>
                </div>
 
                {/* Golden Animated Emblem Emblem Showcase */}
                <div className="relative shrink-0 select-none group mt-4 lg:mt-0">
                  {/* Outer glowing pulsing background rings */}
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    className="absolute -inset-10 bg-gradient-to-tr from-[#D4AF37]/35 via-[#E23744]/25 to-transparent rounded-full blur-[40px] opacity-80"
                  />
                  
                  {/* Logo frame */}
                  <motion.div
                    whileHover={{ scale: 1.13, rotate: -4 }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ 
                      y: { repeat: Infinity, duration: 4.5, ease: "easeInOut" },
                      scale: { type: "spring", stiffness: 300, damping: 15 }
                    }}
                    className="relative p-2 bg-gradient-to-tr from-[#D4AF37] via-[#FFF3CD] to-[#996515] rounded-full shadow-2xl cursor-pointer ring-4 ring-black/50"
                  >
                    <img 
                      src={brandLogo} 
                      className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-4 border-black/90 shadow-inner bg-black" 
                      alt="Campus Cakes Seal" 
                    />
                    
                    {/* Tiny golden tag overlay */}
                    <motion.div 
                      animate={{ scale: [0.95, 1.08, 0.95] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#D01C2B] via-[#E23744] to-[#D01C2B] text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full border-2 border-[#D4AF37] shadow-lg uppercase tracking-widest whitespace-nowrap"
                    >
                      👑 PREMIUM RATING
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* PRE-ORDER CATALOGUE SECTION */}
            <section id="marketplace-shelf" className="scroll-mt-20">
              
              {/* Filter Row Title */}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black font-serif text-gray-950 dark:text-[#FEFAF6] tracking-tight leading-none">
                    Order for Tomorrow at <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#C5A02B] italic">{selectedCampus.name.split(' ')[0]}</span>
                  </h2>
                  <div className="w-20 h-[3px] bg-gradient-to-r from-[#D4AF37] to-transparent mt-2.5 rounded-full" />
                </div>
              </div>

              {/* VERTICAL FILTER CONTROLS */}
              <div className="bg-[#FCFAF7] dark:bg-[#0B0405] rounded-[28px] p-4 md:p-6 border border-[#D4AF37]/15 dark:border-[#3C2216]/50 shadow-md mb-6 space-y-5">
                
                {serviceMode !== 'dinein' && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.16em] flex items-center gap-1.5 font-display">
                      <Sparkles className="w-3.5 h-3.5 text-[#C49A25]" /> FILTER BY CELEBRATION OCCASION:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        key="all-celebrations"
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectOccasion(null)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shadow-sm ${
                          activeOccasionId === null
                            ? 'bg-gradient-to-r from-[#D01C2B] to-[#E23744] text-white border-[#E23744]'
                            : 'bg-[#FCFAF7] dark:bg-[#120708] border-[#D4AF37]/25 dark:border-[#3C2216] hover:bg-[#FAF3D9] hover:dark:bg-[#1E1407] text-zinc-650 dark:text-zinc-300'
                        }`}
                      >
                        All Celebrations
                      </motion.button>
                      {AI_RECOMMENDATION_TEMPLATES.map((item) => {
                        const active = activeOccasionId === item.occasionId;
                        return (
                          <motion.button
                            key={item.occasionId}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSelectOccasion(active ? null : item.occasionId)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shadow-sm ${
                              active
                                ? 'bg-gradient-to-r from-[#AF2430] to-[#C49A25] text-white border-[#D4AF37] font-black shadow-md'
                                : 'bg-[#FCFAF7] dark:bg-[#120708] border-[#D4AF37]/20 dark:border-[#3C2216] hover:bg-[#FAF3D9] hover:dark:bg-[#1E1407] text-zinc-650 dark:text-zinc-300'
                            }`}
                          >
                            {item.title}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {serviceMode !== 'dinein' && (
                  <>
                    <div className="w-full h-[1px] bg-[#D4AF37]/15 dark:bg-[#3C2216]/50"></div>

                    {/* Category Filters */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.16em] font-display">
                        CATEGORIES:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((category) => {
                          const active = selectedCategory === category;
                          return (
                            <motion.button
                              key={category}
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedCategory(category)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shadow-sm ${
                                active
                                  ? 'bg-[#E23744] text-white border-[#E23744]'
                                  : 'bg-[#FCFAF7] dark:bg-[#120708] border-[#D4AF37]/20 dark:border-[#3C2216] hover:bg-[#FAF3D9] hover:dark:bg-[#1E1407] text-zinc-650 dark:text-zinc-300'
                              }`}
                            >
                              {category}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="w-full h-[1px] bg-[#D4AF37]/15 dark:bg-[#3C2216]/50"></div>

                {/* Bottom Config Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Pricing limitation slider */}
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-[#FAF6F0] dark:bg-[#120708] rounded-xl border border-[#D4AF37]/25 dark:border-[#3C2216] text-xs w-full sm:w-auto shadow-sm">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#C49A25]" />
                    <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-550 uppercase tracking-wider pl-1">Max Budget:</span>
                    <input
                      type="range"
                      min="150"
                      max="1500"
                      step="50"
                      value={priceRange}
                      onChange={(e) => setPriceRange(parseInt(e.target.value))}
                      className="w-full sm:w-32 accent-[#D4AF37] cursor-pointer"
                    />
                    <span className="font-extrabold text-zinc-805 dark:text-[#FEFAF6] font-mono">₹{priceRange}</span>
                  </div>

                  {/* Pure eggless toggler */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-zinc-600 dark:text-zinc-400 tracking-wide uppercase text-[10px]">Pure Eggless Only</span>
                    <button
                      type="button"
                      onClick={() => setIsEgglessOnly(!isEgglessOnly)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-250 focus:outline-none cursor-pointer ${
                        isEgglessOnly ? 'bg-emerald-600' : 'bg-zinc-350 dark:bg-zinc-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white dark:bg-[#070102] shadow-sm transform transition-transform duration-200 ${
                        isEgglessOnly ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

              </div>

              {/* GRID OF PRODUCT CARDS IN HIGH FIDELITY ZOMATO STYLE */}
              {loadingCatalog ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white dark:bg-[#120709] rounded-[24px] border border-gray-100 dark:border-[#291316] p-3.5 space-y-4 animate-pulse">
                      <div className="aspect-[4/3] rounded-[18px] bg-gray-205 dark:bg-zinc-800" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-205 dark:bg-zinc-800 rounded w-2/3" />
                        <div className="h-3 bg-gray-205 dark:bg-zinc-800 rounded w-1/2" />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-gray-205 dark:bg-zinc-800 rounded w-1/4" />
                        <div className="h-8 bg-gray-205 dark:bg-zinc-800 rounded-xl w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#120709] rounded-3xl border border-gray-100 dark:border-[#291316] max-w-xl mx-auto space-y-3 shadow-inner">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="font-black text-sm text-gray-900 dark:text-white">No Cakes Match Your Filters</p>
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
                    className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-[#E23744] font-black text-xs rounded-xl"
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
                        whileHover={{ y: -8, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 350, damping: 22 }}
                        className="bg-[#FCFAF7] dark:bg-[#0C0405] rounded-[28px] border border-[#D4AF37]/15 dark:border-[#3C2216]/50 overflow-hidden group flex flex-col justify-between p-4 transition-all duration-350 hover:border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] shadow-sm"
                      >
                        {/* Progressive Card aspect-ratio and Zoom hover */}
                        <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden bg-[#FAF6F0]">
                          <img
                            src={cake.image}
                            alt={cake.name}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />

                          {/* Instant pick elements & labels */}
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            {cake.isEggless && (
                              <span className="text-[9px] font-black uppercase text-white bg-emerald-600 px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm dark:shadow-none">
                                <span className="w-1 h-1 rounded-full bg-white dark:bg-[#120709] animate-pulse" /> EGGLESS
                              </span>
                            )}
                            {cake.isTrending && (
                              <span className="text-[9px] font-black uppercase text-white bg-[#E23744] px-2 py-0.5 rounded-md shadow-sm dark:shadow-none tracking-wider">
                                LATEST TREND
                              </span>
                            )}
                          </div>

                          {/* Heart Wishlist button */}
                          <button
                            type="button"
                            onClick={() => handleToggleWishlist(cake.id)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-[#FCFAF7]/95 dark:bg-[#0C0405]/95 hover:bg-white text-zinc-400 hover:text-[#E23744] transition-colors shadow-sm"
                          >
                            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#E23744] text-[#E23744]' : ''}`} />
                          </button>

                          {/* Prep-delivery tag */}
                          <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md text-white rounded-md px-2.5 py-1 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Clock className="w-3 h-3 text-[#D4AF37]" /> PREP & DISPATCH: {cake.deliveryTime}
                          </div>
                        </div>

                        {/* Text labels styled like Zomato lists */}
                        <div className="pt-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-3">
                              <h3 className="font-black text-base md:text-lg text-zinc-900 dark:text-[#FEFAF6] group-hover:text-[#E23744] transition-colors leading-tight truncate font-display">
                                {cake.name}
                              </h3>
                              
                              {/* PREMIUM RATING BADGE VALUE (e.g. 4.9 ★) */}
                              <span className="flex items-center gap-0.5 text-[#A57C1E] dark:text-[#F3E5AB] font-black text-xs leading-none bg-[#FDF6E2] dark:bg-[#1F1407] px-2 py-1 rounded-md flex-shrink-0 border border-[#D4AF37]/20 font-mono">
                                {cake.rating} ★
                              </span>
                            </div>

                            {serviceMode !== 'dinein' && (
                              <p className="text-[10px] tracking-widest text-[#C49A25] uppercase font-bold mt-1 mb-2 font-mono">
                                {cake.category}
                              </p>
                            )}

                            <p className="text-zinc-600 dark:text-zinc-300 text-[13px] leading-relaxed line-clamp-2 font-serif italic mt-1">
                              {cake.description}
                            </p>
                          </div>

                          {/* Price Tag & Custom Button row */}
                          <div className="border-t border-[#D4AF37]/15 dark:border-[#3C2216]/50 mt-4 pt-3.5 flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase leading-none font-sans">Starting from</p>
                              <p className="text-sm font-black text-zinc-900 dark:text-[#FEFAF6] mt-1 font-mono">₹{cake.price} <span className="text-[9px] text-zinc-400 font-medium not-mono font-serif">/ tier</span></p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveCustomizingCake(cake)}
                              className="px-4 py-2 bg-gradient-to-r from-[#D01C2B] to-[#E23744] hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#E23744]/15 transition-all cursor-pointer active:scale-95 font-display"
                            >
                              Customize
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
              coupons={coupons}
              onAddCoupon={async (c) => {
                await writeCoupon(c);
              }}
              onUpdateCouponStatus={async (id, active) => {
                const c = coupons.find(x => x.id === id);
                if (c) {
                  await writeCoupon({ ...c, isActive: active });
                }
              }}
              onDeleteCoupon={async (id) => {
                await removeCoupon(id);
              }}
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
              onPurgeAndResetDatabase={handlePurgeAllOrders}
              onShowToast={addInAppToast}
            />

            {/* VERIFIED STUDENT REVIEWS & COMMUNITY FEEDBACK */}
            <section className="scroll-mt-12">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-[#E23744] font-bold uppercase tracking-widest text-xs">Community Feedback</span>
                <h2 className="text-2xl md:text-3xl font-black font-display text-gray-950 dark:text-white tracking-tight mt-1">
                  Verified Student Notes
                </h2>
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-semibold">
                  Check out actual experiences submitted instantly by dorm wings, Rep committees, and academic scholars in real time.
                </p>
              </div>

              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="bg-white dark:bg-[#120709] rounded-3xl p-5 border border-gray-100 dark:border-[#291316] shadow-sm dark:shadow-none flex flex-col justify-between hover:border-red-100 transition-colors relative group">
                      <div>
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this verified student review note?")) {
                                try {
                                  if (isRealFirebase) {
                                    await removeReview(rev.id);
                                  } else {
                                    setReviews(prev => prev.filter(r => r.id !== rev.id));
                                  }
                                  addInAppToast("Moderation Action", "Verified experience review deleted successfully.");
                                } catch (err) {
                                  console.error("Error deleting review:", err);
                                }
                              }
                            }}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Delete Review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="flex items-center gap-2.5 mb-3">
                          <img src={rev.userImage} className="w-9 h-9 rounded-full object-cover border" referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-extrabold text-xs text-gray-900 dark:text-white leading-none">{rev.userName}</p>
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

                        <p className="text-gray-600 dark:text-[#d4d4d8] text-xs leading-relaxed italic">
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
              ) : (
                <div className="bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-100 dark:border-[#291316] border-dashed dark:border-[#3c1a1e] rounded-3xl p-8 text-center mb-8">
                  <p className="text-sm font-bold text-gray-800 dark:text-[#fafafa]">No reviews yet!</p>
                  <p className="text-[10px] text-gray-500 dark:text-[#a1a1aa] mt-1">Be the first to share your Campus Cakes experience.</p>
                </div>
              )}

              {/* WRITE FEEDBACK FORM PANEL */}
              <div className="p-5 md:p-6 bg-white dark:bg-[#120709] border border-gray-150 dark:border-[#291316] rounded-3xl max-w-xl mx-auto shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-2 bg-red-50 dark:bg-red-500/10 text-[#E23744] rounded-xl flex-shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-black text-xs text-gray-800 dark:text-[#fafafa] uppercase tracking-widest pl-1 leading-none">Post a Review Note</h4>
                    <span className="text-[10px] text-gray-400 mt-1 block">Help underclassmen discover the absolute best items on campus</span>
                  </div>
                </div>

                <form onSubmit={handleAddReview} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <select
                      value={selectedReviewCake}
                      onChange={(e) => setSelectedReviewCake(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-150 dark:border-[#291316] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E23744]"
                    >
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.name}>{p.name.substring(0, 24)}...</option>
                      ))}
                      <option value="Kiosk Quick Grab Chocolate">Kiosk Emergency Truffle</option>
                    </select>

                    <select
                      value={submittingRating}
                      onChange={(e) => setSubmittingRating(parseInt(e.target.value))}
                      className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-150 dark:border-[#291316] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E23744]"
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
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-150 dark:border-[#291316] text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E23744]"
                    required
                  />

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#E23744] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md dark:shadow-none transition-colors"
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
                <h2 className="text-2xl md:text-3xl font-black font-display text-gray-950 dark:text-white tracking-tight mt-1">
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
                      className="bg-white dark:bg-[#120709] rounded-2xl border border-gray-150 dark:border-[#291316] overflow-hidden shadow-sm dark:shadow-none transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        className="w-full p-4 text-left font-bold text-xs md:text-sm text-gray-800 dark:text-[#fafafa] flex justify-between items-center bg-gray-50 dark:bg-[#1a0d0f]/80 hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80 transition-colors focus:outline-none"
                      >
                        <span>{faq.q}</span>
                        <span className="text-[#E23744] text-lg leading-none">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="p-4 border-t border-gray-100 dark:border-[#291316] text-xs leading-relaxed text-gray-500 dark:text-[#a1a1aa] bg-white dark:bg-[#120709] font-medium">
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

        {/* --- STATE 4: AI CUSTOMER SUPPORT CHAT HUB --- */}
        {activeZomatoTab === 'support' && (
          <SupportSection user={studentUser} />
        )}

      </main>

      {/* FOOTER */}
      <footer className="relative bg-[#67613f] text-zinc-100 mt-20 border-t border-zinc-800/10 overflow-hidden">
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-500 via-[#E23744] to-amber-500" />
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[#E23744]/10 blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 relative z-10">
          
          {/* Brand Column */}
          <div className="md:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <img 
                src={brandLogo} 
                className="w-11 h-11 rounded-full object-cover border-2 border-[#D4AF37] shadow-lg shadow-black/40 bg-black" 
                alt="Campus Cakes Logo" 
              />
              <span className="font-extrabold text-2xl tracking-tight text-white flex items-center gap-1">
                campus <span className="text-[#E23744]">cakes</span>
              </span>
            </div>
            <p className="text-sm text-zinc-100 leading-relaxed font-semibold max-w-sm">
              Your college campus, sweetened. Delivering handcrafted premium cakes, customized celebrations, and gourmet treats straight to your dorm room, library, or canteen.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 bg-black/35 border border-white/10 rounded-full px-3.5 py-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                Freshly Baked Daily
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 bg-black/35 border border-white/10 rounded-full px-3.5 py-1.5 shadow-sm">
                🚀 Room Service Active
              </div>
            </div>
          </div>

          {/* Operations & Support Column */}
          <div className="md:col-span-5 space-y-5">
            <h5 className="font-bold text-sm uppercase tracking-widest text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-300" />
              Operations & Support
            </h5>
            <div className="text-sm text-zinc-100 space-y-4 font-semibold">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-zinc-200 mt-0.5" />
                <div>
                  <span className="text-white block">Delivery & Pickup Hours</span>
                  <span className="text-zinc-200 text-xs font-medium">Mon-Sun: 10:00 AM – 10:00 PM</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-zinc-200 mt-0.5" />
                <div>
                  <span className="text-white block">Dorm HQ Hub</span>
                  <span className="text-zinc-200 text-xs font-medium">Student Block C, Booth #3</span>
                </div>
              </div>
              <div className="pt-3 flex flex-col gap-2.5">
                <button 
                  onClick={() => {
                    setActiveZomatoTab('support');
                    setTimeout(() => {
                      document.getElementById('main-tabs-anchor')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 bg-gradient-to-r from-red-950/40 to-rose-950/40 hover:from-[#E23744]/20 hover:to-[#E23744]/30 border border-red-500/30 hover:border-red-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer group shadow-[0_0_15px_rgba(226,55,68,0.15)] active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E23744] group-hover:scale-120 transition-transform animate-pulse" />
                  Customer Support
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Premium Bottom Bar */}
        <div className="bg-[#67613f] border-t border-zinc-800/10 px-6 md:px-12 py-6 text-center text-xs text-zinc-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            <p className="text-xs leading-relaxed max-w-2xl text-left text-zinc-200 md:max-w-xl font-medium">
              © {new Date().getFullYear()} Campus Cakes Inc. Operated in partnership with college student committees. 
              Baked fresh, handled on-campus, and hand-delivered securely.
            </p>
            <div className="flex flex-wrap gap-5 text-xs text-zinc-200 font-medium justify-end">
              <button 
                onClick={() => setActiveDocModal('terms')} 
                className="hover:text-white underline decoration-zinc-400/50 transition-colors duration-200 cursor-pointer"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => setActiveDocModal('privacy')} 
                className="hover:text-white underline decoration-zinc-400/50 transition-colors duration-200 cursor-pointer"
              >
                Dorm Privacy
              </button>
              <button 
                onClick={() => setActiveDocModal('refund')} 
                className="hover:text-white underline decoration-zinc-400/50 transition-colors duration-200 cursor-pointer"
              >
                Refund Policy
              </button>
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
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm md:max-w-md bg-white dark:bg-[#0C0405] z-50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col justify-between border-l border-[#D4AF37]/20"
            >
              {/* Drawer header */}
              <div className="p-4 bg-gradient-to-r from-[#FAF3D9] to-[#FCFAF7] dark:from-[#1E1407] dark:to-[#0B0405] border-b border-[#D4AF37]/25 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-gradient-to-br from-[#D4AF37] to-[#C49A25] text-black rounded-xl shadow-xs">
                    <ShoppingBag className="w-4 h-4 text-black" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-xs md:text-sm text-gray-900 dark:text-white leading-none uppercase tracking-wider font-display">Your Campus Cart</h3>
                    <p className="text-[9px] text-[#C49A25] font-bold mt-1">Ready for {selectedCampus.name.split(' ')[0]}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 hover:bg-gray-200 hover:dark:bg-[#291316] rounded-xl text-gray-500 dark:text-[#a1a1aa] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer scroll content list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {cart.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 space-y-5">
                    <ShoppingBag className="w-14 h-14 text-zinc-300 dark:text-zinc-800 mx-auto animate-bounce-slow" />
                    <p className="text-xs font-black text-gray-800 dark:text-white">Your campus bucket is empty!</p>
                    <p className="text-[10px] pr-4 pl-4 text-zinc-500 dark:text-zinc-400 leading-normal font-medium">
                      Pre-order a gorgeous birthday cake for tomorrow, or explore our student delivery menu!
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#C49A25] text-black font-black text-[10px] rounded-xl uppercase tracking-wider shadow-md"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Selected Confectionery</p>
                    
                    {cart.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-3.5 rounded-2xl border border-gray-150 dark:border-[#291316] bg-gray-50 dark:bg-[#120709] flex gap-3 h-auto relative transition-all hover:border-[#D4AF37]/35"
                      >
                        <img src={item.image} className="w-14 h-14 rounded-xl object-cover border border-[#D4AF37]/20" referrerPolicy="no-referrer" />
                        
                        <div className="flex-1 min-w-0 pr-6">
                          <span className={`text-[8px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-md inline-block mb-1 shadow-xs ${
                            item.isInstantKiosk ? 'bg-[#FAF3D9] text-amber-800 border border-[#D4AF37]/20' : 'bg-red-50 text-[#E23744] border border-red-150/30'
                          }`}>
                            {item.isInstantKiosk ? '⚡ Kiosk emergency' : '🗓️ Scheduled pre-order'}
                          </span>

                          <h4 className="font-extrabold text-xs text-gray-900 dark:text-[#FEFAF6] truncate font-serif">{item.name}</h4>
                          
                          {item.customization && (
                            <div className="mt-1 space-y-0.5 text-[9px] text-zinc-500 dark:text-zinc-400">
                              <p>✓ Msg: <strong className="text-[#E23744] dark:text-[#D4AF37] font-black">"{item.customization.messageOnCake}"</strong></p>
                              <p>✓ Weight: {item.customization.weight} kg • {item.customization.flavor}</p>
                              <p>✓ Slot: {item.customization.pickupTime}</p>
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-black text-gray-950 dark:text-white font-mono">
                              ₹{item.price}
                            </span>
                            <div className="flex items-center gap-2 bg-white dark:bg-[#1a0d0f] rounded-lg border border-gray-200 dark:border-[#3c1a1e] p-0.5">
                              <button 
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2a1418] rounded"
                              >-</button>
                              <span className="text-[10px] font-bold w-3 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2a1418] rounded"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="absolute right-2 top-2 p-1 text-gray-450 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* Smart order rule notice summary in summary drawer */}
                    {cart.some(c => !c.isInstantKiosk) && (
                      <div className="p-3 bg-amber-50/50 dark:bg-[#1E1407]/40 border border-[#D4AF37]/25 rounded-2xl text-[10px] text-[#805000] dark:text-[#FEFAF6] flex items-start gap-1.5 leading-normal">
                        <Info className="w-3.5 h-3.5 text-[#C49A25] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Gilded Prep Time Reserved.</strong> Custom bakes require fine assembly. We have locked your premium kitchen block.
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Drawer footer calculation */}
              {cart.length > 0 && (
                <div className="p-4 bg-[#FAF7F2] dark:bg-[#120709] border-t border-[#D4AF37]/20 space-y-3 relative z-10">
                  <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-405">
                    <div className="flex justify-between">
                      <span>Cakes Subtotal</span>
                      <span className="font-extrabold text-gray-900 dark:text-white font-mono">
                        ₹{Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Campus Packaging & Box</span>
                      <span className="font-extrabold text-gray-900 dark:text-white font-mono">₹20</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST & State Food Tax</span>
                      <span className="font-extrabold text-gray-900 dark:text-white font-mono">₹30</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed dark:border-[#3c1a1e] pt-2 text-sm text-gray-900 dark:text-white font-black">
                      <span>Grand Total Charges</span>
                      <span className="text-[#E23744] dark:text-[#D4AF37] font-mono text-base font-black">
                        ₹{Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50)}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty XP points projection */}
                  <div className="p-2.5 bg-gradient-to-r from-[#FAF3D9] to-[#FCFAF7] dark:from-[#1E1407] dark:to-[#0B0405] border border-[#D4AF37]/25 text-amber-900 dark:text-[#F3E5AB] font-bold rounded-xl text-[9px] text-center flex items-center justify-center gap-1.5">
                    <span className="text-[#C49A25] animate-pulse">👑</span> 
                    You earn +{Math.floor(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) / 10)} XP student loyalty points!
                  </div>

                  <button
                    onClick={() => {
                      setIsCheckoutOpen(true);
                      setIsCartOpen(false);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-[#D01C2B] to-[#E23744] hover:brightness-110 text-white font-black text-xs rounded-2xl shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => setIsCheckoutOpen(false)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-[#120709] rounded-3xl border border-gray-100 dark:border-[#291316] max-w-md w-full p-6 shadow-2xl relative z-50 space-y-4 my-auto max-h-[92vh] overflow-y-auto scrollbar-thin"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <h3 className="font-black text-base text-gray-900 dark:text-white">University Payment Gate</h3>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 hover:bg-gray-100 hover:dark:bg-[#1a0d0f] rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] leading-normal">
              Campus Cakes manages secure terminal simulations. Pick your transaction mode to dispatch orders into our active bakery queue.
            </p>

            <div className="bg-gray-50 dark:bg-[#1a0d0f] border border-gray-200 dark:border-[#3c1a1e] rounded-xl p-3 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Delivery Destination</p>
                <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                  {serviceMode === 'dinein' 
                    ? (tableNumber ? `Dine-In Canteen • Table ${tableNumber}` : 'Dine-In Canteen (Pick any empty table)')
                    : `Dorm Delivery • ${studentUser?.address || 'Your Room'}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleCompletePayment} className="space-y-4 text-xs">
              
              {/* Payment Mode choices */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-0.5">Choose checkout mode</label>
                
                {/* UPI Option */}
                <label className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMode === 'upi' ? 'bg-pink-50 dark:bg-pink-500/10/50 border-pink-400' : 'bg-gray-50 dark:bg-[#1a0d0f]/80 border-gray-100 dark:border-[#291316]'
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
                    <span className="font-bold text-gray-800 dark:text-[#fafafa]">Scan & Pay (GPay / PhonePe UPI)</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-pink-600 dark:text-pink-400 bg-pink-100 px-1.5 py-0.5 rounded">Fastest</span>
                </label>

                {/* Credit Card Option */}
                <label className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMode === 'card' ? 'bg-pink-50 dark:bg-pink-500/10/50 border-pink-400' : 'bg-gray-50 dark:bg-[#1a0d0f]/80 border-gray-100 dark:border-[#291316]'
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
                    <span className="font-bold text-gray-800 dark:text-[#fafafa]">Credit / Debit Card</span>
                  </div>
                </label>

                {/* Cash on Pickup Option */}
                <label className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMode === 'cash' ? 'bg-pink-50 dark:bg-pink-500/10/50 border-pink-400' : 'bg-gray-50 dark:bg-[#1a0d0f]/80 border-gray-100 dark:border-[#291316]'
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
                    <span className="font-bold text-gray-800 dark:text-[#fafafa]">Cash on Pickup (Canteen Stalls)</span>
                  </div>
                </label>
              </div>

              {/* UPI fields details */}
              {paymentMode === 'upi' && (
                <div className="p-3 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-3">
                    {/* Simulated dynamic dummy QR code */}
                    <div className="w-14 h-14 bg-white dark:bg-[#120709] border border-gray-200 dark:border-[#3c1a1e] rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
                      <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-60">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className={`rounded-sm ${(i * 7) % 3 === 0 ? 'bg-black' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-[11px] leading-tight text-gray-800 dark:text-[#fafafa]">Quick Scan QR Terminal</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Applet generates mock UPI addresses instantly.</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Confirm Student VPA ID</span>
                    <input
                      type="text"
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      className="w-full mt-1 p-2 bg-white dark:bg-[#120709] border rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CARD fields details */}
              {paymentMode === 'card' && (
                <div className="p-3 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl space-y-2.5">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">16 digit Card Number</span>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full mt-1 p-2 bg-white dark:bg-[#120709] border rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Expiry Date</span>
                      <input
                        type="text"
                        placeholder="08/29"
                        className="w-full mt-1 p-2 bg-white dark:bg-[#120709] border rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">CVV</span>
                      <input
                        type="password"
                        placeholder="***"
                        className="w-full mt-1 p-2 bg-white dark:bg-[#120709] border rounded-xl text-xs font-semibold focus:outline-none"
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
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Campus XP Points</h4>
                      <p className="text-[10px] text-gray-600 dark:text-[#d4d4d8]">Balance: {studentUser.rewardPoints} XP (₹{studentUser.rewardPoints})</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemPoints(!redeemPoints)}
                    disabled={studentUser.rewardPoints <= 0}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-250 focus:outline-none ${
                        redeemPoints ? 'bg-amber-500' : 'bg-gray-300'
                    } ${(studentUser.rewardPoints <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white dark:bg-[#120709] shadow-sm dark:shadow-none transform transition-transform duration-200 ${
                        redeemPoints ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                {redeemPoints && <p className="text-[10px] text-amber-600 font-bold">XP points applied to offset the total!</p>}
              </div>

              {/* Coupon Code Section */}
              <div className="space-y-1.5 pb-2">
                <div className="flex items-center gap-2 p-2 rounded-xl border border-pink-200 bg-pink-50">
                  <div className="flex-1 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-pink-500 ml-1" />
                    <input
                      type="text"
                      placeholder="Discount code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold outline-none placeholder-pink-300 text-pink-900 uppercase"
                      disabled={appliedCoupon !== null}
                    />
                  </div>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                      className="px-3 py-1.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-lg border border-red-200 uppercase"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      className="px-3 py-1.5 bg-pink-600 text-white text-[10px] font-bold rounded-lg uppercase hover:bg-pink-700"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-[10px] text-pink-600 font-bold">
                    {appliedCoupon.pct 
                      ? `${appliedCoupon.pct}% ${appliedCoupon.isBday ? 'Birthday ' : ''}Discount applied!`
                      : `₹${appliedCoupon.flat} Discount applied!`
                    }
                  </p>
                )}
              </div>

              {/* Segment calculations totals */}
              <div className="border-t border-dashed dark:border-[#3c1a1e] pt-3 text-xs flex justify-between font-extrabold text-gray-800 dark:text-[#fafafa] items-end">
                <span>Amount to Pay</span>
                <div className="text-right">
                  {(() => {
                    const sub = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const fee = serviceMode === 'dinein' ? 0 : 20;
                    const taxAndFee = 30 + fee;
                    return (
                      <>
                        {(redeemPoints || appliedCoupon) && (
                          <span className="text-[10px] text-gray-400 line-through mr-2 font-mono">
                            ₹{Math.round(sub + taxAndFee)}
                          </span>
                        )}
                        <span className="text-pink-600 dark:text-pink-400 font-mono text-sm">
                          ₹{
                            Math.max(0, Math.round(
                              (sub + taxAndFee)
                              - (redeemPoints ? studentUser.rewardPoints : 0)
                              - (appliedCoupon ? (appliedCoupon.pct ? (sub * (appliedCoupon.pct / 100)) : (appliedCoupon.flat || 0)) : 0)
                            ))
                          }
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Submission buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="py-2.5 bg-white dark:bg-[#120709] border hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80 rounded-xl font-bold"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-md dark:shadow-none transition-colors"
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
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setOrderCompletePopup(false)} />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#120709] rounded-3xl p-6 md:p-8 max-w-sm w-full text-center relative z-50 space-y-4 shadow-2xl border my-auto max-h-[92vh] overflow-y-auto scrollbar-thin"
            >
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-md dark:shadow-none">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <p className="text-[10px] uppercase font-black tracking-wider text-green-600">Dispach Confirmed!</p>
                <h3 className="font-black text-xl text-gray-900 dark:text-white pb-1">Your Cake is Booked!</h3>
                <p className="text-xs font-black text-gray-800 dark:text-amber-200 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 inline-block">
                  Order Number: #{newOrderId}
                </p>
              </div>

              <p className="text-xs text-gray-500 dark:text-[#a1a1aa] leading-normal">
                Congratulations! We have routed details to our premium baking kitchen team. You can tracking real-time delivery state updates in the <strong>Student Hub Active Orders</strong> panel right now!
              </p>

              {/* Stepper visual preview inside success modal */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl text-[10px] font-bold text-gray-600 dark:text-[#d4d4d8] text-left space-y-2 border">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Timelines Status Stage: Placed</p>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  <span className="text-gray-900 dark:text-white">1. Order placed successfully</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="w-2.5 h-2.5 bg-gray-200 dark:bg-[#1a0d0f] rounded-full" />
                  <span>2. Bakery preparing chef layers</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="w-2.5 h-2.5 bg-gray-200 dark:bg-[#1a0d0f] rounded-full" />
                  <span>3. Out for college delivery</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const currentOrderObj = activeOrders.find(o => o.id === newOrderId);
                    if (currentOrderObj) {
                      downloadReceiptFile(currentOrderObj, studentUser.name);
                    } else {
                      addInAppToast("Receipt Issue", "Order details not found to generate receipt.");
                    }
                  }}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white dark:bg-[#1a0e10] hover:dark:bg-[#251214] font-extrabold rounded-xl text-xs text-center border border-gray-200 dark:border-[#3c1a1e] flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
                >
                  <Download className="w-3.5 h-3.5" /> Download Digital Receipt
                </button>

                <button
                  type="button"
                  onClick={() => setOrderCompletePopup(false)}
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-lg shadow-pink-600/10 text-xs text-center"
                >
                  Done, Back to Shop
                </button>
              </div>
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
            onShowToast={addInAppToast}
          />
        )}
      </AnimatePresence>

      {/* --- FLOATING TOAST NOTIFICATIONS DRAWER OVERLAY --- */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {inAppToasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 55, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.16 } }}
              className="bg-white dark:bg-[#120709] border border-gray-150 dark:border-[#291316] rounded-2xl shadow-2xl p-4 pointer-events-auto flex gap-3.5 items-start"
              style={{ boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15)" }}
            >
              <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-500 flex-shrink-0">
                <BellRing className="w-4 h-4 animate-bounce-slow text-rose-500 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[11px] font-black text-gray-900 dark:text-white leading-tight uppercase tracking-wider">
                  {toast.title}
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mt-1 font-medium leading-normal">
                  {toast.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeInAppToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 flex-shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- BIRTHDAY POPUP MODAL --- */}
      <AnimatePresence>
        {showBdayPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setShowBdayPopup(false)}
            />
            
            {/* Celebration Animations Backdrop Layer */}
            <CelebrationConfetti />

            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                transition: { type: 'spring', damping: 20, stiffness: 200 }
              }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-gradient-to-br from-[#200508] via-[#0b0103] to-[#180407] rounded-[36px] overflow-hidden shadow-[0_0_50px_rgba(236,72,153,0.25)] border-2 border-pink-500/40 text-center p-8 z-30"
            >
              {/* Animated Floating Background Sparks */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-pink-500 blur-2xl"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-[#D4AF37] blur-2xl"
                />
              </div>

              {/* Twinkling decorative icons */}
              <motion.div 
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-10 left-10 text-pink-400"
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              <motion.div 
                animate={{ scale: [1.3, 1, 1.3], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute bottom-24 right-10 text-[#D4AF37]"
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>

              <button 
                onClick={() => setShowBdayPopup(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/15 rounded-full text-zinc-400 hover:text-white transition-colors"
                title="Close"
                name="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Premium Gift Cylinder Ring */}
              <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-pink-500/20 rounded-full blur-md shadow-[0_0_40px_rgba(236,72,153,0.4)] border border-pink-500/40"
                />
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 w-16 h-16 bg-gradient-to-tr from-pink-600 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30"
                >
                  <Gift className="w-9 h-9 text-pink-50" />
                </motion.div>
              </div>

              <h2 className="text-3.5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-pink-500 font-serif leading-none uppercase tracking-tight mb-2">
                Happy Birthday!
              </h2>
              <p className="text-sm font-extrabold text-[#FEFAF6] tracking-wide mb-6 uppercase">
                Hope you have an amazing day, <span className="text-[#D4AF37] font-black">{studentUser.name?.split(' ')[0]}</span>! 🥳
              </p>

              {/* Glowing High-Tech Voucher Card */}
              <div className="bg-black/50 rounded-3xl p-6 border border-pink-500/25 mb-6 relative overflow-hidden group">
                {/* Shiny diagonal reflection stripe */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[250%] transition-transform duration-1000 ease-out pointer-events-none" />
                
                <p className="text-[10px] text-pink-300/80 uppercase tracking-[0.2em] font-black mb-3.5">Your Special Birthday Voucher</p>
                
                <div className="relative">
                  <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-2 border-dashed border-pink-500/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 shadow-inner">
                    <span className="font-mono text-2xl font-black text-pink-300 tracking-[0.1em] select-all filter drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]">
                      {bdayDiscountCode}
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(bdayDiscountCode);
                        addInAppToast("Birthday Gift Coupon", "📋 Copied template code to clipboard! Double-click input box to paste.");
                      }}
                      className="text-[9px] font-black text-[#D4AF37] hover:text-white uppercase tracking-widest mt-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 px-2.5 py-1 rounded-md transition-all active:scale-95"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 mt-4 leading-relaxed font-semibold">
                  Enter this premium key at checkout to reduce <span className="text-[#D4AF37] font-bold">10% OFF</span> your custom bakes! Valid for today only.
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowBdayPopup(false)}
                className="w-full py-4 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-pink-600/30 transition-all duration-300 cursor-pointer border border-pink-400/25 group overflow-hidden"
              >
                <span className="flex items-center justify-center gap-2">
                  <span>Claim & Continue</span>
                  <ArrowRight className="w-4 h-4 text-pink-200 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- NEW DISCOUNT COUPON POPUP MODAL --- */}
      <AnimatePresence>
        {activeCouponPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setActiveCouponPopup(null)}
            />

            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                transition: { type: 'spring', damping: 20, stiffness: 200 }
              }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-gradient-to-br from-[#1c0817] via-[#0b0103] to-[#12040b] rounded-[36px] overflow-hidden shadow-[0_0_50px_rgba(225,29,72,0.25)] border-2 border-rose-500/40 text-center p-8 z-30"
            >
              <div className="absolute top-4 right-4 flex p-1">
                 <button 
                  onClick={() => setActiveCouponPopup(null)}
                  className="bg-zinc-800/50 hover:bg-zinc-700/80 p-2 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mx-auto w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mb-5 border border-rose-500/30">
                <Tag className="w-8 h-8" />
              </div>

              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500 font-display leading-none uppercase tracking-tight mb-3">
                {activeCouponPopup.discountType === 'percentage' ? `${activeCouponPopup.discountValue}% OFF` : `₹${activeCouponPopup.discountValue} OFF`}
              </h2>
              
              <p className="text-xs font-semibold text-rose-200/80 tracking-wide mb-6">
                <span className="opacity-70">Special Offer for</span><br/>
                <span className="font-extrabold text-white text-sm mt-1 block">{activeCouponPopup.occasion}</span>
              </p>

              <div className="bg-black/40 rounded-3xl p-5 border border-rose-500/20 mb-6">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-2">Use Promo Code</p>
                <div className="bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-2 border-dashed border-rose-500/40 rounded-2xl p-3 flex flex-col items-center justify-center">
                  <span className="font-mono text-xl font-black text-rose-400 tracking-[0.1em] select-all">
                    {activeCouponPopup.code}
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(activeCouponPopup.code);
                      addInAppToast("Coupon Copied", "Discount code ready to paste at checkout.");
                    }}
                    className="text-[9px] font-black text-rose-300 hover:text-white uppercase tracking-widest mt-2 bg-rose-500/20 hover:bg-rose-500/40 px-3 py-1.5 rounded-md transition-all active:scale-95"
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveCouponPopup(null)}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-600/30 transition-all duration-300 cursor-pointer"
              >
                Claim Now
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FOOTER DOCUMENTS MODAL --- */}
      <AnimatePresence>
        {activeDocModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDocModal(null)}
              className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed inset-4 md:inset-10 max-w-2xl mx-auto my-auto h-fit max-h-[85vh] z-[10001] bg-white dark:bg-[#120709] border border-gray-150 dark:border-[#291316] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 md:p-6 border-b border-gray-100 dark:border-[#291316] flex justify-between items-center bg-gray-50 dark:bg-[#1a0d0f]/50">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-[#FCECEF] dark:bg-rose-500/10 text-[#E23744] rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-base md:text-lg font-black font-display text-gray-950 dark:text-white leading-none">
                      {activeDocModal === 'terms' && 'Terms of Service'}
                      {activeDocModal === 'privacy' && 'Dorm Privacy Policy'}
                      {activeDocModal === 'refund' && 'Refund Policy'}
                    </h3>
                    <p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1.5 md:mt-2">
                      Campus Cakes Standard Guidelines
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDocModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-[#1a0d0f]/80 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Document Content View */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-4 text-[11px] md:text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">
                {activeDocModal === 'terms' && (
                  <>
                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5">
                        <span className="text-[#E23744]">1.</span> Custom Cake Culinary Mandate
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">All pre-entered, themed custom decorations or customized letter layers require at least 24 hours of advance kitchen prep time. Emergency expedited modifications must be coordinated with student reps at the Dorm HQ Hub.</p>
                    </div>

                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5 mt-4">
                        <span className="text-[#E23744]">2.</span> Dorm Delivery & Coordinates
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">Delivery drop-offs occur strictly within designated student residential towers, library foyers, or academic wings. Complete coordinate accuracy reduces drop-off time. Delivery handlers wait a maximum of 10 minutes at towers.</p>
                    </div>

                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5 mt-4">
                        <span className="text-[#E23744]">3.</span> VIP XP Loyalty Tiers
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">VIP status XP tier privileges guarantee active custom preorder priority, exclusive seasonal flavors, and discounted delivery fee structures. VIP points are non-transferable and tied to student authentication logins.</p>
                    </div>
                  </>
                )}

                {activeDocModal === 'privacy' && (
                  <>
                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5">
                        <span className="text-pink-500">1.</span> Contact Data Protection
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">Student mobile identifiers, block-room positions, and checkout history remain stored securely using industry-standard local storage models or encrypted cloud data collections. We do not distribute credentials to outer third parties.</p>
                    </div>

                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5 mt-4">
                        <span className="text-pink-500">2.</span> Custom Inscription Secrecy
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">Any personalized message strings, themed decorations, or customized lettering applied onto custom cake layers are kept strictly secure and confidential within our baker group to respect campus privacy bounds.</p>
                    </div>

                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5 mt-4">
                        <span className="text-pink-500">3.</span> Local Preference Memory
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">In-app settings, chosen campus campuses, active orders cache, and UI preferences are localized to your web browser client to maintain speedy app loading and state tracking across campus activities.</p>
                    </div>
                  </>
                )}

                {activeDocModal === 'refund' && (
                  <>
                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5">
                        <span className="text-amber-500">1.</span> Delivery Quality Compensation
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">If physical transportation compromises the cake decoration, letters, or cream layers, you are eligible for 100% cash-back or refund compensations. Simply log the damage with dormitory reps or dial +91 99887 76655.</p>
                    </div>

                    <div>
                      <h4 className="text-gray-950 dark:text-white font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-1.5 mt-4">
                        <span className="text-amber-500">2.</span> Custom Orders Cancellation Void
                      </h4>
                      <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium">Because custom items are decorated individually, user-initiated cancellations of order tickets within 10 hours of delivery target times are ineligible for full cash-back due to raw bakery material loss.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer action bar */}
              <div className="p-4 bg-gray-50 dark:bg-[#1a0d0f]/50 border-t border-gray-100 dark:border-[#291316] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveDocModal(null)}
                  className="px-5 py-2.5 bg-[#E23744] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow transition-all cursor-pointer active:scale-95"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
