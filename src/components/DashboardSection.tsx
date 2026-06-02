/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile, Order, CakeItem, KioskCake, SavedCelebration } from '../types';
import { 
  User, Award, Calendar, Gift, RefreshCw, Eye, Sparkles, MapPin, 
  ArrowRight, Coins, Share2, Plus, Trash2, Shield, Settings,
  TrendingUp, Clock, ShoppingBag, BarChart2, IndianRupee, Users, CheckCircle, Package,
  Truck, Phone, Mail, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardSectionProps {
  user: UserProfile;
  orders: Order[];
  allCakes: CakeItem[];
  kioskInventory: KioskCake[];
  onRepeatOrder: (orderId: string) => void;
  onUpdateKioskStock: (id: string, newStock: number) => void;
  onUpdateOrderStatus: (orderId: string, status: any) => void;
  onAddCelebration: (celebration: SavedCelebration) => void;
  onDeleteCelebration: (id: string) => void;
  onAddCustomCake: (newCake: CakeItem) => void;
  onAddCampus?: (name: string, location: string) => void;
  onAddKioskProduct?: (newProduct: KioskCake) => void;
  onDeleteCustomCake?: (cakeId: string) => void;
  onEditCustomCake?: (updatedCake: CakeItem) => void;
  onDeleteKioskProduct?: (kioskId: string) => void;
  onEditKioskProduct?: (updatedKioskProduct: KioskCake) => void;
  campuses?: { id: string; name: string; location: string; active: boolean }[];
  onDeleteCampus?: (id: string) => void;
  isAdmin?: boolean;
}

export default function DashboardSection({
  user,
  orders,
  allCakes,
  kioskInventory,
  onRepeatOrder,
  onUpdateKioskStock,
  onUpdateOrderStatus,
  onAddCelebration,
  onDeleteCelebration,
  onAddCustomCake,
  onAddCampus,
  onAddKioskProduct,
  onDeleteCustomCake,
  onEditCustomCake,
  onDeleteKioskProduct,
  onEditKioskProduct,
  campuses = [],
  onDeleteCampus,
  isAdmin = false,
}: DashboardSectionProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [addressInput, setAddressInput] = useState(user.address);
  const [isSavedAddress, setIsSavedAddress] = useState(true);

  // New celebration state
  const [newCelebName, setNewCelebName] = useState('');
  const [newCelebRelation, setNewCelebRelation] = useState('Dorm Roommate');
  const [newCelebDate, setNewCelebDate] = useState('2026-05-24');

  // Admin section: new product state
  const [newCakeName, setNewCakeName] = useState('');
  const [newCakePrice, setNewCakePrice] = useState('499');
  const [newCakeCategory, setNewCakeCategory] = useState('Birthday Cakes');
  const [newCakeDesc, setNewCakeDesc] = useState('');
  const [newCakeImage, setNewCakeImage] = useState<string>('');
  const [newCakeWeights, setNewCakeWeights] = useState<number[]>([0.5, 1.0, 1.5, 2.0]);
  const [newCakeWeightPrices, setNewCakeWeightPrices] = useState<Record<number, number>>({});

  // Admin section: editing product state
  const [editingCakeId, setEditingCakeId] = useState<string | null>(null);
  const [editingCakeName, setEditingCakeName] = useState('');
  const [editingCakePrice, setEditingCakePrice] = useState('');
  const [editingCakeCategory, setEditingCakeCategory] = useState('');
  const [editingCakeDesc, setEditingCakeDesc] = useState('');
  const [editingCakeImage, setEditingCakeImage] = useState('');
  const [editingCakeWeights, setEditingCakeWeights] = useState<number[]>([]);
  const [editingCakeWeightPrices, setEditingCakeWeightPrices] = useState<Record<number, number>>({});

  // Admin section: new kiosk product state
  const [newKioskName, setNewKioskName] = useState('');
  const [newKioskPrice, setNewKioskPrice] = useState('99');
  const [newKioskFlavor, setNewKioskFlavor] = useState('Chocolate');
  const [newKioskStock, setNewKioskStock] = useState('20');
  const [newKioskImage, setNewKioskImage] = useState('');

  // Admin section: editing kiosk product state
  const [editingKioskId, setEditingKioskId] = useState<string | null>(null);
  const [editingKioskName, setEditingKioskName] = useState('');
  const [editingKioskPrice, setEditingKioskPrice] = useState('');
  const [editingKioskFlavor, setEditingKioskFlavor] = useState('');
  const [editingKioskStock, setEditingKioskStock] = useState('');
  const [editingKioskImage, setEditingKioskImage] = useState('');

  // Admin section: new campus state
  const [newCampusName, setNewCampusName] = useState('');
  const [newCampusLocation, setNewCampusLocation] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'analytics' | 'orders' | 'kiosk' | 'catalog' | 'campus'>('analytics');
  const [adminOrderFilter, setAdminOrderFilter] = useState<'all' | 'placed' | 'preparing' | 'delivery' | 'ready'>('all');

  // Real-time dynamic business startup calculations
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate today's revenue (sum total of orders placed today)
  const todayOrders = orders.filter(o => o.timestamp && o.timestamp.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  // Calculate yesterday's stats to show dynamic comparison trends
  const yesterdaysDate = new Date();
  yesterdaysDate.setDate(yesterdaysDate.getDate() - 1);
  const yesterdayStr = yesterdaysDate.toISOString().split('T')[0];
  const yesterdayOrders = orders.filter(o => o.timestamp && o.timestamp.startsWith(yesterdayStr));
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  const revenueTrendPercent = yesterdayRevenue > 0
    ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
    : null;

  // Active / Total Orders counts
  const totalOrdersCount = orders.length;
  const instantPickupCount = orders.filter(o => o.orderType === 'instant-pickup' || o.items?.some(i => i.isInstantKiosk)).length;
  const preOrdersCount = orders.filter(o => o.orderType === 'pre-order' && !o.items?.some(i => i.isInstantKiosk)).length;

  // Returning Customer Retention rates
  const customersMap: Record<string, number> = {};
  let anonymousCount = 0;
  orders.forEach(o => {
    const key = o.userId && o.userId !== 'anonymous-user'
      ? o.userId
      : (o.userEmail && o.userEmail !== 'unverified@campus-cakes.com'
          ? o.userEmail
          : (o.customerName || `anon-${anonymousCount++}`));
    customersMap[key] = (customersMap[key] || 0) + 1;
  });
  const uniqueCustomers = Object.keys(customersMap).length;
  const repeatCustomers = Object.values(customersMap).filter(count => count > 1).length;
  const returningRate = uniqueCustomers > 0 
    ? ((repeatCustomers / uniqueCustomers) * 100).toFixed(1)
    : '0.0';

  // Popular Flavor
  const flavorCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items?.forEach(item => {
      const flavorOption = item.customization?.flavor || item.name;
      if (flavorOption) {
        flavorCounts[flavorOption] = (flavorCounts[flavorOption] || 0) + item.quantity;
      }
    });
  });
  let popularFlavor = 'None yet';
  let maxFlavorCount = 0;
  Object.entries(flavorCounts).forEach(([flavor, count]) => {
    if (count > maxFlavorCount) {
      maxFlavorCount = count;
      popularFlavor = flavor;
    }
  });

  // Hourly Peak Orders indicator (live counts grouped dynamically)
  const hourlyDistribution: Record<string, number> = {
    '12 PM': 0, '2 PM': 0, '4 PM': 0, '6 PM': 0, '8 PM': 0, '10 PM': 0, '12 AM': 0
  };
  orders.forEach(o => {
    if (!o.timestamp) return;
    const hour = new Date(o.timestamp).getHours(); // 0-23
    if (hour >= 11 && hour < 13) hourlyDistribution['12 PM']++;
    else if (hour >= 13 && hour < 15) hourlyDistribution['2 PM']++;
    else if (hour >= 15 && hour < 17) hourlyDistribution['4 PM']++;
    else if (hour >= 17 && hour < 19) hourlyDistribution['6 PM']++;
    else if (hour >= 19 && hour < 21) hourlyDistribution['8 PM']++;
    else if (hour >= 21 && hour < 23) hourlyDistribution['10 PM']++;
    else if (hour >= 23 || hour < 1) hourlyDistribution['12 AM']++;
  });
  const maxHourValue = Math.max(...Object.values(hourlyDistribution), 1);

  // Segment yields
  let totalItemsCount = 0;
  let kioskItemsCount = 0;
  let customItemsCount = 0;
  let regularPreOrderCount = 0;

  orders.forEach(o => {
    o.items?.forEach(item => {
      totalItemsCount += item.quantity;
      if (o.orderType === 'instant-pickup' || item.isInstantKiosk) {
        kioskItemsCount += item.quantity;
      } else if (item.customization) {
        customItemsCount += item.quantity;
      } else {
        regularPreOrderCount += item.quantity;
      }
    });
  });

  const kioskPct = totalItemsCount > 0 ? Math.round((kioskItemsCount / totalItemsCount) * 100) : 0;
  const customPct = totalItemsCount > 0 ? Math.round((customItemsCount / totalItemsCount) * 100) : 0;
  const preOrderPct = totalItemsCount > 0 ? Math.round((regularPreOrderCount / totalItemsCount) * 100) : 0;

  const handleAddCelebSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCelebName || !newCelebDate) return;
    onAddCelebration({
      id: 'celeb-' + Date.now(),
      name: newCelebName,
      relation: newCelebRelation,
      date: newCelebDate,
      remindMe: true,
    });
    setNewCelebName('');
  };

  const handleAddNewCakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCakeName || !newCakePrice) return;
    onAddCustomCake({
      id: 'custom-' + Date.now(),
      name: newCakeName,
      description: newCakeDesc || 'Artisan campus custom specialty cake.',
      price: parseFloat(newCakePrice),
      rating: 5.0,
      category: newCakeCategory,
      isEggless: true,
      isTrending: true,
      image: newCakeImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
      deliveryTime: '24 Hours',
      weights: newCakeWeights.length > 0 ? newCakeWeights : [0.5, 1.0, 1.5, 2.0],
      weightPrices: newCakeWeightPrices,
      flavors: ['Vanilla Cream', 'Dark Ganache Swirl'],
    });
    setNewCakeName('');
    setNewCakePrice('499');
    setNewCakeDesc('');
    setNewCakeImage('');
    setNewCakeWeights([0.5, 1.0, 1.5, 2.0]);
    setNewCakeWeightPrices({});
    alert('Artisan cake added to pre-order menu successfully!');
  };

  const handleAddNewCampusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampusName || !newCampusLocation) return;
    if (onAddCampus) {
      onAddCampus(newCampusName, newCampusLocation);
      setNewCampusName('');
      setNewCampusLocation('');
      alert('New campus added successfully!');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCakeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKioskImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewKioskImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewKioskProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKioskName || !newKioskPrice) return;
    if (onAddKioskProduct) {
      onAddKioskProduct({
        id: 'kiosk-prod-' + Date.now(),
        name: newKioskName,
        price: parseFloat(newKioskPrice),
        flavor: newKioskFlavor,
        remainingStock: parseInt(newKioskStock),
        totalStock: parseInt(newKioskStock),
        image: newKioskImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
      });
      setNewKioskName('');
      setNewKioskPrice('99');
      setNewKioskFlavor('Chocolate');
      setNewKioskStock('20');
      setNewKioskImage('');
      alert('Kiosk product added successfully!');
    }
  };

  const handleEditCakeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingCakeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditKioskImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingKioskImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCakeEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCakeId) return;
    if (onEditCustomCake) {
      onEditCustomCake({
        id: editingCakeId,
        name: editingCakeName,
        description: editingCakeDesc,
        price: parseFloat(editingCakePrice) || 0,
        rating: 4.8,
        category: editingCakeCategory,
        isEggless: true,
        isTrending: true,
        image: editingCakeImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
        deliveryTime: '24 Hours',
        weights: editingCakeWeights.length > 0 ? [...editingCakeWeights].sort() : [0.5, 1.0, 1.5, 2.0],
        weightPrices: editingCakeWeightPrices,
        flavors: ['Vanilla Cream', 'Dark Ganache Swirl'],
      });
      setEditingCakeId(null);
      alert('Advance product details updated successfully!');
    }
  };

  const handleSaveKioskEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKioskId) return;
    if (onEditKioskProduct) {
      onEditKioskProduct({
        id: editingKioskId,
        name: editingKioskName,
        price: parseFloat(editingKioskPrice) || 0,
        flavor: editingKioskFlavor,
        remainingStock: parseInt(editingKioskStock) || 0,
        totalStock: parseInt(editingKioskStock) || 0,
        image: editingKioskImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
      });
      setEditingKioskId(null);
      alert('Kiosk product details updated successfully!');
    }
  };

  return (
    <div id="dashboard-section" className="bg-white dark:bg-[#120709] rounded-3xl border border-gray-100 dark:border-[#291316] shadow-xl overflow-hidden mb-14">
      
      {/* Tab bar header */}
      <div className="bg-gray-50 dark:bg-[#1a0d0f]/80/80 px-4 md:px-6 py-4 border-b border-gray-100 dark:border-[#291316] flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-100 rounded-xl text-pink-600 dark:text-pink-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black font-display text-gray-900 dark:text-white tracking-tight">Hi, {user.name}</h2>
            <p className="text-[10px] text-gray-500 dark:text-[#a1a1aa] font-medium">Logged in as {user.name}</p>
          </div>
        </div>

        <div className="flex gap-1.5 mt-2 sm:mt-0 p-1 bg-gray-200 dark:bg-[#1a0d0f]/50 rounded-2xl text-xs font-bold text-gray-600 dark:text-[#d4d4d8]">
          <button
            onClick={() => setActiveTab('student')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              activeTab === 'student' ? 'bg-white dark:bg-[#120709] text-pink-600 dark:text-pink-400 shadow-sm dark:shadow-none' : 'hover:text-gray-900 hover:dark:text-white'
            }`}
          >
            👤 Student Hub
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                activeTab === 'admin' ? 'bg-white dark:bg-[#120709] text-purple-600 shadow-sm dark:shadow-none' : 'hover:text-gray-900 hover:dark:text-white'
              }`}
            >
              🛠️ Team Desk
            </button>
          )}
        </div>
      </div>

      {/* Tabs Content */}
      <div className="p-5 md:p-6">
        <AnimatePresence mode="wait">
          
          {/* 1. STUDENT DASHBOARD */}
          {activeTab === 'student' && (
            <motion.div
              key="student-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Rewards Points & Loyalty Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-3xl p-5 text-white flex items-center justify-between relative overflow-hidden group">
                  <span className="absolute -right-6 -bottom-6 w-24 h-24 bg-white dark:bg-[#120709]/10 rounded-full group-hover:scale-125 transition-transform duration-500" />
                  <div>
                    <span className="text-[10px] font-bold bg-white dark:bg-[#120709]/20 px-2.5 py-0.5 rounded-full uppercase text-pink-50">
                      Loyalty Points
                    </span>
                    <p className="text-3xl font-black mt-2">{user.rewardPoints} XP</p>
                    <p className="text-[10px] text-pink-100 mt-1">Unlock free cupcake boxes at 500 XP</p>
                  </div>
                  <Coins className="w-10 h-10 text-white/40" />
                </div>

                <div className="bg-purple-50 dark:bg-purple-500/10 rounded-3xl p-5 border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold bg-purple-200 text-purple-800 px-2.5 py-0.5 rounded-full uppercase">
                      Celebration Calendar
                    </span>
                    <p className="text-2xl font-black text-purple-900 dark:text-purple-300 mt-2">
                      {user.savedCelebrations.length} Active
                    </p>
                    <p className="text-[10px] text-purple-600 mt-1">Receive SMS reminder 2 days before</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-400" />
                </div>

                {/* Dorm Delivery Address */}
                <div className="bg-amber-50 rounded-3xl p-4 border border-amber-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full uppercase">
                        Dorm Room Address
                      </span>
                      <button 
                        type="button"
                        onClick={() => setIsSavedAddress(!isSavedAddress)}
                        className="text-[10px] text-pink-600 dark:text-pink-400 font-extrabold hover:underline"
                      >
                        {isSavedAddress ? "Edit" : "Save"}
                      </button>
                    </div>
                    {isSavedAddress ? (
                      <p className="text-xs text-gray-700 dark:text-[#e4e4e7] font-semibold mt-1 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-pink-500 flex-shrink-0 mt-0.5" />
                        <span>{addressInput}</span>
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        className="w-full text-xs font-semibold p-1.5 bg-white dark:bg-[#120709] border rounded-lg focus:outline-none"
                      />
                    )}
                  </div>
                  <p className="text-[9px] text-amber-700 mt-1">Deliveries will route automatically here unless toggled.</p>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-xs font-black text-gray-800 dark:text-[#fafafa] uppercase tracking-widest mb-3.5 flex items-center gap-1">
                  <ShoppingBag className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Recent Campus Orders
                </h3>

                {orders.length === 0 ? (
                  <div className="p-8 bg-gray-50 dark:bg-[#1a0d0f]/80/40 rounded-3xl border border-dashed dark:border-[#3c1a1e] border-gray-200 dark:border-[#3c1a1e]/80 text-center text-gray-500 dark:text-[#a1a1aa]">
                    <p className="text-xs font-bold">No active cake orders yet.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Pre-order something premium or visit Kiosk to start celebrating!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const currentStatusColor = 
                        order.status === 'placed' ? 'bg-indigo-100 text-indigo-700' :
                        order.status === 'preparing' ? 'bg-amber-100 text-amber-700' :
                        order.status === 'delivery' ? 'bg-pink-100 text-pink-700 font-bold animate-pulse' :
                        'bg-green-100 text-green-700';

                      return (
                        <div key={order.id} className="p-4 rounded-3xl border border-gray-100 dark:border-[#291316]/85 hover:border-gray-200 hover:dark:border-[#3c1a1e] bg-white dark:bg-[#120709] shadow-sm dark:shadow-none flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-pink-50 dark:bg-pink-500/10 rounded-2xl text-pink-600 dark:text-pink-400">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-exrabold text-xs text-gray-800 dark:text-[#fafafa] font-bold">Order #{order.id}</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${currentStatusColor}`}>
                                  {order.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">{order.date} @ ABC University</p>
                              
                              <div className="mt-2 space-y-1">
                                {order.items.map((it, idx) => (
                                  <p key={idx} className="text-xs font-semibold text-gray-700 dark:text-[#e4e4e7] flex items-center gap-1.5">
                                    <span className="w-1 h-1 bg-pink-400 rounded-full" />
                                    {it.name} <span className="text-[10px] text-gray-400">({it.quantity}x)</span>
                                    {it.customization && (
                                      <span className="text-[9px] bg-amber-50 text-amber-600 px-1 py-0.5 rounded border border-amber-100 font-bold">
                                        Custom: "{it.customization.messageOnCake}"
                                      </span>
                                    )}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 dark:border-[#291316]">
                            <div>
                              <p className="text-[10px] text-gray-400 text-right">Points Earned</p>
                              <p className="text-xs font-bold text-pink-600 dark:text-pink-400 text-right">+{order.pointsEarned} XP</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 text-right">Total Charges</p>
                              <p className="text-sm font-black text-gray-900 dark:text-white text-right">₹{Math.round(order.total)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRepeatOrder(order.id)}
                              className="px-3.5 py-2 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 rounded-xl text-pink-700 font-black text-[11px] transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Quick Repeat
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Saved Celebrations Calendar Component */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-dashed dark:border-[#3c1a1e] border-gray-100 dark:border-[#291316] pt-5">
                <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-[#fafafa] uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-purple-600" /> Active Celebrations
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mb-3 leading-snug">
                     Store upcoming birthday dates. We will automatically shoot you a custom recommendation and 
                     promo code 48 hours beforehand to ensure you order hassle-free.
                  </p>

                  <div className="space-y-2">
                    {user.savedCelebrations.map((celeb) => (
                      <div key={celeb.id} className="p-3 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl border border-gray-100 dark:border-[#291316] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white dark:bg-[#120709] text-purple-600 border rounded-xl">
                            <Gift className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 dark:text-[#fafafa]">{celeb.name}</p>
                            <p className="text-[10px] text-gray-400">{celeb.relation} • {celeb.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                            Reminder Active
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteCelebration(celeb.id)}
                            className="text-gray-400 hover:text-red-500 text-xs transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add new celebration */}
                <form onSubmit={handleAddCelebSubmit} className="p-4 bg-purple-50 dark:bg-purple-500/10/40 rounded-3xl border border-purple-200/55 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-purple-950 dark:text-pink-300 dark:text-purple-300 flex items-center gap-1 mb-1">
                      <Plus className="w-4 h-4" /> Add Event Reminder
                    </h5>
                    <p className="text-[10px] text-purple-900 dark:text-purple-300/50 mb-3">Save classmate milestones easily</p>
                    
                    <div className="space-y-2 mb-3">
                      <input
                        type="text"
                        placeholder="Friend's Name (e.g. Rohini)"
                        value={newCelebName}
                        onChange={(e) => setNewCelebName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-400"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newCelebRelation}
                          onChange={(e) => setNewCelebRelation(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl focus:outline-none"
                        >
                          <option value="Dorm Roommate">Roommate</option>
                          <option value="Hostel Wingmate">Wingmate</option>
                          <option value="Class Rep">Class CR</option>
                          <option value="Professor Birthday">Professor</option>
                        </select>
                        <input
                          type="date"
                          value={newCelebDate}
                          onChange={(e) => setNewCelebDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md dark:shadow-none transition-colors"
                  >
                    Quick Add Reminder
                  </button>
                </form>
              </div>

            </motion.div>
          )}



          {/* 3. CAMPUS TEAM ADMIN PANEL */}
          {activeTab === 'admin' && isAdmin && (
            <motion.div
              key="admin-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="p-4 bg-purple-50 dark:bg-purple-500/10 text-purple-950 dark:text-pink-300 dark:text-purple-300 border border-purple-100 rounded-3xl flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-700" />
                <div className="text-xs">
                  <p className="font-extrabold uppercase tracking-wide">Campus Owners Administrative Workspace</p>
                  <p className="text-[11px] text-purple-800">
                    Use these control keys to change order stages, update kiosk inventories, and monitor live startup statistics.
                  </p>
                </div>
              </div>

              {/* Admin Sidebar Layout */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64 shrink-0 px-2 md:border-r border-gray-100 dark:border-[#291316] flex flex-col gap-1.5 md:pr-4">
                  <h4 className="font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-widest pl-3 mb-2 pt-2">Admin Panel</h4>
                  
                  <button 
                    onClick={() => setActiveAdminTab('analytics')}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeAdminTab === 'analytics' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700' : 'text-gray-600 dark:text-[#d4d4d8] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'}`}
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Startup Analytics</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveAdminTab('orders')}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeAdminTab === 'orders' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700' : 'text-gray-600 dark:text-[#d4d4d8] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'}`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Order Central</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveAdminTab('kiosk')}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeAdminTab === 'kiosk' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700' : 'text-gray-600 dark:text-[#d4d4d8] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'}`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Kiosk Inventory</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveAdminTab('catalog')}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeAdminTab === 'catalog' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700' : 'text-gray-600 dark:text-[#d4d4d8] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'}`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Catalog Publisher</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveAdminTab('campus')}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeAdminTab === 'campus' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700' : 'text-gray-600 dark:text-[#d4d4d8] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'}`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="text-[11px] font-bold">Campus Expansion</span>
                  </button>
                </div>

                {/* Main Admin Content */}
                <div className="flex-1 min-w-0 space-y-6">

              {/* Startup Analytics Section */}
              {activeAdminTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#120709] p-4 rounded-2xl border border-gray-150 dark:border-[#291316]">
                      <div className="flex justify-between items-center text-gray-400">
                        <span className="text-[10px] font-bold uppercase">Today Revenue</span>
                        <IndianRupee className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-xl font-black text-gray-800 dark:text-[#fafafa] mt-1.5">₹{todayRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[9px] mt-0.5 flex items-center gap-1">
                        {revenueTrendPercent !== null ? (
                          <>
                            <TrendingUp className={`w-3 h-3 ${Number(revenueTrendPercent) >= 0 ? "text-green-600" : "text-red-500"}`} />
                            <span className={Number(revenueTrendPercent) >= 0 ? "text-green-600 text-xs" : "text-red-500 text-xs"}>
                              {Number(revenueTrendPercent) >= 0 ? `+${revenueTrendPercent}%` : `${revenueTrendPercent}%`} from yesterday
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-[#a1a1aa]">First sales day of this week</span>
                        )}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#120709] p-4 rounded-2xl border border-gray-150 dark:border-[#291316]">
                      <div className="flex justify-between items-center text-gray-400">
                        <span className="text-[10px] font-bold uppercase">Total Orders</span>
                        <ShoppingBag className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-xl font-black text-gray-800 dark:text-[#fafafa] mt-1.5">{totalOrdersCount} Total</p>
                      <p className="text-[9px] text-purple-500 mt-0.5">
                        {instantPickupCount} instant / {preOrdersCount} pre-ordered
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#120709] p-4 rounded-2xl border border-gray-150 dark:border-[#291316]">
                      <div className="flex justify-between items-center text-gray-400">
                        <span className="text-[10px] font-bold uppercase">Returning Rate</span>
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-xl font-black text-gray-800 dark:text-[#fafafa] mt-1.5">{returningRate}%</p>
                      <p className="text-[9px] text-gray-500 dark:text-[#a1a1aa] mt-0.5">
                        {uniqueCustomers > 0 ? `${repeatCustomers} repeat of ${uniqueCustomers} unique buyers` : 'Waiting for real buyers'}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#120709] p-4 rounded-xl border border-gray-150 dark:border-[#291316]">
                      <div className="flex justify-between items-center text-gray-400 font-bold">
                        <span className="text-[10px] uppercase">Popular Flavor</span>
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-sm font-black text-gray-800 dark:text-[#fafafa] mt-1.5 truncate" title={popularFlavor}>{popularFlavor}</p>
                      <p className="text-[9px] text-pink-600 dark:text-pink-400 font-bold mt-0.5">Based on ordered quantity</p>
                    </div>
                  </div>

                  {/* Graphical Custom charts simulating metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Simulated Peak Hours bar chart */}
                    <div className="p-4 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl border border-gray-200 dark:border-[#3c1a1e]">
                      <h5 className="text-[11px] font-black text-gray-700 dark:text-[#e4e4e7] uppercase tracking-widest mb-3 flex items-center gap-1">
                        <BarChart2 className="w-3.5 h-3.5 text-purple-600" /> Hourly Peak Orders Indicator
                      </h5>
                      <div className="h-28 flex items-end justify-between p-2 pt-4 bg-white dark:bg-[#120709] rounded-xl border border-gray-100 dark:border-[#291316]">
                        {Object.entries(hourlyDistribution).map(([h, count], id) => {
                          const percentHeight = maxHourValue > 0 ? (count / maxHourValue) * 100 : 0;
                          return (
                            <div key={id} className="flex-1 flex flex-col items-center">
                              <div className="w-5 bg-purple-600 hover:bg-pink-500 transition-colors rounded-t-sm relative group" style={{ height: `${Math.max(4, percentHeight * 0.6)}px` }}>
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-bold p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {count} order{count !== 1 ? 's' : ''} ({Math.round(percentHeight)}%)
                                </span>
                              </div>
                              <span className="text-[8px] text-gray-400 font-black mt-1">{h}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Simulated Revenue Sources Pie Chart Representation */}
                    <div className="p-4 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl border border-gray-200 dark:border-[#3c1a1e] text-xs">
                      <h5 className="text-[11px] font-black text-gray-700 dark:text-[#e4e4e7] uppercase tracking-widest mb-3 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Order Segment Yields
                      </h5>
                      <div className="flex items-center justify-around bg-white dark:bg-[#120709] p-3 rounded-xl border border-gray-100 dark:border-[#291316] h-28">
                        {/* Interactive horizontal custom percent graph */}
                        <div className="space-y-2.5 w-full">
                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1 text-gray-600 dark:text-[#d4d4d8]">
                              <span className="font-bold text-indigo-700">🎂 Custom celebration designs</span>
                              <span className="font-extrabold text-gray-900 dark:text-white">{customPct}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-[#1a0d0f] rounded-full">
                              <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${customPct}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1 text-gray-600 dark:text-[#d4d4d8]">
                              <span className="font-bold text-amber-700">⚡ Emergency Kiosk slice orders</span>
                              <span className="font-extrabold text-gray-900 dark:text-white">{kioskPct}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-[#1a0d0f] rounded-full">
                              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${kioskPct}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1 text-gray-600 dark:text-[#d4d4d8]">
                              <span className="font-bold text-pink-700">🎉 Standard Dorm pre-orders</span>
                              <span className="font-extrabold text-gray-900 dark:text-white">{preOrderPct}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-[#1a0d0f] rounded-full">
                              <div className="h-full bg-pink-500 rounded-full transition-all duration-500" style={{ width: `${preOrderPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Tracking Controller */}
              {activeAdminTab === 'orders' && (() => {
                const countAll = orders.length;
                const countPending = orders.filter(o => o.status === 'placed').length;
                const countPacked = orders.filter(o => o.status === 'preparing').length;
                const countDelivery = orders.filter(o => o.status === 'delivery').length;
                const countDelivered = orders.filter(o => o.status === 'ready' || o.status === 'completed').length;

                const filteredOrdersByFilter = orders.filter(o => {
                  if (adminOrderFilter === 'all') return true;
                  if (adminOrderFilter === 'ready') return o.status === 'ready' || o.status === 'completed';
                  return o.status === adminOrderFilter;
                });

                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#120709] p-5 rounded-3xl border border-gray-150 dark:border-[#291316] shadow-sm dark:shadow-none">
                      <div>
                        <h4 className="font-black text-sm text-purple-950 dark:text-pink-300 dark:text-purple-300 uppercase tracking-wider">📦 Start-up Order Central</h4>
                        <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mt-0.5">
                          Manage real-time order states and dispatched hostel runner directions.
                        </p>
                      </div>

                      {/* Filter Badges / Tabs */}
                      <div className="flex flex-wrap gap-1.5 p-1 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl border border-gray-100 dark:border-[#291316]">
                        <button
                          onClick={() => setAdminOrderFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminOrderFilter === 'all'
                              ? 'bg-purple-900 text-white shadow-sm dark:shadow-none'
                              : 'text-gray-500 dark:text-[#a1a1aa] hover:text-gray-900 hover:dark:text-white hover:bg-gray-100 hover:dark:bg-slate-800/50'
                          }`}
                        >
                          All ({countAll})
                        </button>
                        <button
                          onClick={() => setAdminOrderFilter('placed')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                            adminOrderFilter === 'placed'
                              ? 'bg-amber-500 text-white shadow-sm dark:shadow-none'
                              : 'text-amber-600 hover:text-amber-900 hover:bg-amber-50/50'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                          Pending ({countPending})
                        </button>
                        <button
                          onClick={() => setAdminOrderFilter('preparing')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminOrderFilter === 'preparing'
                              ? 'bg-blue-600 text-white shadow-sm dark:shadow-none'
                              : 'text-blue-600 hover:text-blue-950 hover:bg-blue-50 hover:dark:bg-blue-500/10/50'
                          }`}
                        >
                          Packed ({countPacked})
                        </button>
                        <button
                          onClick={() => setAdminOrderFilter('delivery')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminOrderFilter === 'delivery'
                              ? 'bg-pink-600 text-white shadow-sm dark:shadow-none'
                              : 'text-pink-600 dark:text-pink-400 hover:text-pink-950 hover:bg-pink-50 hover:dark:bg-pink-500/10/50'
                          }`}
                        >
                          Runner Out ({countDelivery})
                        </button>
                        <button
                          onClick={() => setAdminOrderFilter('ready')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            adminOrderFilter === 'ready'
                              ? 'bg-emerald-600 text-white shadow-sm dark:shadow-none'
                              : 'text-emerald-600 hover:text-emerald-950 hover:bg-emerald-50 hover:dark:bg-emerald-500/10/50'
                          }`}
                        >
                          Delivered ({countDelivered})
                        </button>
                      </div>
                    </div>

                    {/* Orders Render Block */}
                    {filteredOrdersByFilter.length === 0 ? (
                      <div className="p-12 text-center bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-3xl border border-dashed dark:border-[#3c1a1e] border-gray-200 dark:border-[#3c1a1e]">
                        <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <h4 className="font-extrabold text-xs text-gray-500 dark:text-[#a1a1aa] uppercase tracking-widest">No matching orders found</h4>
                        <p className="text-[10px] text-gray-400 mt-1">There are currently no orders under this workflow status tab.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {filteredOrdersByFilter.map(or => {
                          // Determine style variables based on current status
                          let badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                          let leftBorder = "border-l-4 border-l-amber-500";
                          let statusLabel = "Pending Arrival";
                          if (or.status === 'preparing') {
                            badgeBg = "bg-blue-50 dark:bg-blue-500/10 text-blue-700 border-blue-200";
                            leftBorder = "border-l-4 border-l-blue-500";
                            statusLabel = "Packed & Ready";
                          } else if (or.status === 'delivery') {
                            badgeBg = "bg-pink-50 dark:bg-pink-500/10 text-pink-700 border-pink-200";
                            leftBorder = "border-l-4 border-l-pink-500";
                            statusLabel = "Out with Runner";
                          } else if (or.status === 'ready' || or.status === 'completed') {
                            badgeBg = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 border-emerald-200";
                            leftBorder = "border-l-4 border-l-emerald-500";
                            statusLabel = "Delivered";
                          }

                          return (
                            <motion.div
                              key={or.id}
                              layoutId={`admin-order-${or.id}`}
                              className={`bg-white dark:bg-[#120709] rounded-3xl border border-gray-200 dark:border-[#3c1a1e] p-5 shadow-sm dark:shadow-none transition-all hover:shadow-md dark:shadow-none ${leftBorder} flex flex-col gap-5`}
                            >
                              {/* Card Header row */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#291316] pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-sm text-purple-950 dark:text-pink-300 dark:text-purple-300">Order #{or.id}</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                      {statusLabel}
                                    </span>
                                    <span className="text-[9px] font-bold bg-gray-100 dark:bg-[#1a0d0f] text-gray-600 dark:text-[#d4d4d8] px-2 py-0.5 rounded-full border border-gray-200 dark:border-[#3c1a1e] capitalize">
                                      {or.orderType === 'instant-pickup' ? '⚡ Instant Kiosk' : '📅 Pre-Order'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-400" /> Received: {or.timestamp ? new Date(or.timestamp).toLocaleString() : or.date}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#1a0d0f]/80 p-1.5 rounded-2xl border border-gray-100 dark:border-[#291316]">
                                  <span className="text-[10px] font-black text-gray-500 dark:text-[#a1a1aa] uppercase tracking-widest pl-1.5 mr-1">Update State</span>
                                  <select
                                    value={or.status}
                                    onChange={(e) => onUpdateOrderStatus(or.id, e.target.value)}
                                    className="bg-white dark:bg-[#120709] border text-[11px] font-black py-1 px-2.5 rounded-xl border-purple-200 text-purple-800 focus:outline-none cursor-pointer"
                                  >
                                    <option value="placed">Pending (Placed)</option>
                                    <option value="preparing">Packed (Preparing)</option>
                                    <option value="delivery">Out for Delivery</option>
                                    <option value="ready">Delivered (Completed)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Card Body Grid (Recipient on Left, Cake info on Right) */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                                
                                {/* CUSTOMER & DELIVERY DIRECTION DETAILS */}
                                <div className="space-y-3.5 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100 max-h-72 overflow-y-auto">
                                  <h5 className="font-black text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-200 dark:border-[#3c1a1e]/50 pb-1.5">
                                    <User className="w-3.5 h-3.5 text-purple-600" /> Courier & Recipient Details
                                  </h5>

                                  <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#120709] flex items-center justify-center border text-gray-400">
                                        <User className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Student Name</p>
                                        <p className="font-extrabold text-gray-800 dark:text-[#fafafa] leading-tight">{or.customerName || 'Campus Student'}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#120709] flex items-center justify-center border text-gray-400">
                                        <Mail className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Email Address</p>
                                        <p className="font-bold text-gray-700 dark:text-[#e4e4e7] leading-tight select-all">{or.userEmail || 'No Email Provided'}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#120709] flex items-center justify-center border text-gray-400">
                                        <Phone className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Contact Number</p>
                                        <p className="font-bold text-gray-700 dark:text-[#e4e4e7] leading-tight select-all">{or.customerPhone || 'Not specified'}</p>
                                      </div>
                                    </div>

                                    {/* HIGHLIGHTED DELIVERY LOCATION BLOCK */}
                                    <div className="p-3 bg-red-50 dark:bg-red-500/10/50 rounded-xl border border-red-100 flex gap-2.5 mt-2">
                                      <div className="w-8 h-8 shrink-0 rounded-lg bg-white dark:bg-[#120709] flex items-center justify-center border border-red-200 text-[#E23744]">
                                        <MapPin className="w-4 h-4 animate-pulse" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-[9px] text-[#E23744] font-black uppercase tracking-widest">Hostel Delivery Address</p>
                                        <p className="font-extrabold text-neutral-800 dark:text-[#fafafa] leading-normal mt-0.5">
                                          {or.deliveryAddress || 'Campus Ground Delivery (No delivery address provided)'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* INDIVIDUAL CAKE SPECS & IMAGES */}
                                <div className="space-y-3.5">
                                  <h5 className="font-black text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 dark:border-[#291316] pb-1.5">
                                    <ShoppingBag className="w-3.5 h-3.5 text-purple-600" /> Ordered Items List ({or.items.length})
                                  </h5>

                                  <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                                    {or.items.map((item, idx) => (
                                      <div key={idx} className="flex gap-3 bg-gray-50 dark:bg-[#1a0d0f]/80 p-2.5 rounded-2xl border border-gray-100 dark:border-[#291316]/50 hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80 transition-colors">
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          className="w-14 h-14 object-cover rounded-xl border border-gray-250 dark:border-[#3c1a1e] shrink-0"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="flex-1">
                                          <div className="flex justify-between">
                                            <h6 className="font-extrabold text-gray-900 dark:text-white leading-snug">{item.name}</h6>
                                            <span className="font-mono text-purple-950 dark:text-pink-300 dark:text-purple-300 font-bold shrink-0 ml-2">₹{item.price} × {item.quantity}</span>
                                          </div>
                                          
                                          {item.customization && (
                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 bg-white dark:bg-[#120709] p-2 rounded-xl text-[10px] text-gray-600 dark:text-[#d4d4d8] border border-gray-100 dark:border-[#291316]">
                                              {item.customization.flavor && (
                                                <p>✨ <strong>Flavor:</strong> {item.customization.flavor}</p>
                                              )}
                                              {item.customization.weight && (
                                                <p>⚖️ <strong>Weight:</strong> {item.customization.weight} kg</p>
                                              )}
                                              {item.customization.messageOnCake && (
                                                <p className="sm:col-span-2 text-pink-600 dark:text-pink-400 font-bold bg-pink-50 dark:bg-pink-500/10/30 px-1.5 py-0.5 rounded border border-pink-100/35">
                                                  🎂 <strong>Message:</strong> "{item.customization.messageOnCake}"
                                                </p>
                                              )}
                                              {item.customization.addCandles && <p>🕯️ <strong>Candles:</strong> Included</p>}
                                              {item.customization.addKnife && <p>🪓 <strong>Knife:</strong> Included</p>}
                                              {item.customization.pickupTime && (
                                                <p className="sm:col-span-2 text-purple-700 font-semibold bg-purple-50 dark:bg-purple-500/10/30 px-1.5 py-0.5 rounded border border-purple-100/35 mt-0.5">
                                                  ⏰ <strong>Scheduled:</strong> {item.customization.pickupTime}
                                                </p>
                                              )}
                                              
                                              {/* Custom Reference Image Uploaded preview */}
                                              {item.customization.photoUrl && (
                                                <div className="sm:col-span-2 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-[#291316]">
                                                  <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Uploaded Custom Reference Photo</p>
                                                  <a
                                                    href={item.customization.photoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 dark:text-purple-300 font-bold hover:underline bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-lg"
                                                  >
                                                    <Eye className="w-3 h-3" /> View Photo Design File
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Card Footer: Summary of Fees + Single click transition button */}
                              <div className="border-t border-gray-100 dark:border-[#291316] pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                                <div className="text-[10px] text-gray-500 dark:text-[#a1a1aa] font-semibold">
                                  <span className="mr-3 text-neutral-800 dark:text-[#fafafa]">Payment: <strong>{or.paymentMethod || 'UPI/Card'}</strong></span>
                                  <span>Subtotal: ₹{or.subtotal}</span> | <span>Delivery: ₹{or.deliveryFee}</span> | <span>Taxes: ₹{or.tax}</span>
                                  <div className="mt-1 text-xs text-gray-900 dark:text-white">
                                    Total Paid Amount: <strong className="font-mono text-pink-600 dark:text-pink-400 text-sm">₹{or.total}</strong>
                                  </div>
                                </div>

                                {/* Step Promotion Buttons */}
                                <div className="flex gap-2">
                                  {or.status === 'placed' && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateOrderStatus(or.id, 'preparing')}
                                      className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md dark:shadow-none shadow-blue-500/10 cursor-pointer text-center select-none"
                                    >
                                      👨‍🍳 Mark Ready & Packed
                                    </button>
                                  )}
                                  
                                  {or.status === 'preparing' && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateOrderStatus(or.id, 'delivery')}
                                      className="py-2 px-3.5 bg-pink-600 hover:bg-pink-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md dark:shadow-none shadow-pink-500/10 cursor-pointer text-center select-none"
                                    >
                                      🚴 Out for Delivery
                                    </button>
                                  )}

                                  {or.status === 'delivery' && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateOrderStatus(or.id, 'ready')}
                                      className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md dark:shadow-none shadow-emerald-500/10 cursor-pointer text-center select-none"
                                    >
                                      ✅ Complete & Delivered
                                    </button>
                                  )}

                                  {(or.status === 'ready' || or.status === 'completed') && (
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-200">
                                      <CheckCircle className="w-3.5 h-3.5" /> Order Completed
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Kiosk Stock level changer */}
              {activeAdminTab === 'kiosk' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Form (Add or Edit) */}
                  <div className="col-span-12 lg:col-span-5 space-y-5">
                    {editingKioskId ? (
                      <div className="p-5 bg-purple-50 dark:bg-purple-500/10/50 rounded-3xl border border-purple-200/60 shadow-md dark:shadow-none flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-extrabold text-xs text-purple-950 dark:text-pink-300 dark:text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5 text-purple-700 animate-spin" /> Edit Kiosk Item
                          </h4>
                          <button
                            type="button"
                            onClick={() => setEditingKioskId(null)}
                            className="text-[10px] text-gray-400 hover:text-gray-600 hover:dark:text-[#d4d4d8] uppercase font-black tracking-wider"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-[11px] text-purple-900 dark:text-purple-300/80 mb-4 leading-normal font-medium">
                          Modify price, base options, maximum stock levels, or images for the live self-serve kiosk.
                        </p>
                        <form onSubmit={handleSaveKioskEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Product Name</label>
                            <input
                              type="text"
                              value={editingKioskName}
                              onChange={(e) => setEditingKioskName(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Price (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingKioskPrice}
                              onChange={(e) => setEditingKioskPrice(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Flavor / Base</label>
                            <input
                              type="text"
                              value={editingKioskFlavor}
                              onChange={(e) => setEditingKioskFlavor(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Total Stock</label>
                            <input
                              type="number"
                              value={editingKioskStock}
                              onChange={(e) => setEditingKioskStock(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                              required
                            />
                          </div>
                          <div className="sm:col-span-2 bg-white dark:bg-[#120709] rounded-xl border border-dashed dark:border-[#3c1a1e] border-purple-200 p-3 flex flex-col gap-2">
                            <label className="block text-[10px] font-bold text-purple-700 uppercase">Product Image Override</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditKioskImageUpload}
                              className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer font-medium"
                            />
                            {editingKioskImage && (
                              <div className="mt-1">
                                <img src={editingKioskImage} alt="Preview" className="h-14 w-14 object-cover rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-[#3c1a1e]" />
                              </div>
                            )}
                          </div>
                          <button
                            type="submit"
                            className="sm:col-span-2 mt-3 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
                          >
                            Save Kiosk Product Updates
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="p-5 bg-white dark:bg-[#120709] rounded-3xl border border-gray-200 dark:border-[#3c1a1e] shadow-sm dark:shadow-none flex flex-col">
                        <h4 className="font-extrabold text-xs text-purple-950 dark:text-pink-300 dark:text-purple-300 uppercase tracking-widest mb-3 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-purple-600" /> Add to Kiosk Inventory
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mb-4 leading-normal font-medium">
                          Quickly add new instant-pickup items directly to the kiosk inventory.
                        </p>
                        <form onSubmit={handleAddNewKioskProductSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                          <input
                            type="text"
                            placeholder="Product Name"
                            value={newKioskName}
                            onChange={(e) => setNewKioskName(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium"
                            required
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={newKioskPrice}
                            onChange={(e) => setNewKioskPrice(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Flavor"
                            value={newKioskFlavor}
                            onChange={(e) => setNewKioskFlavor(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium"
                            required
                          />
                          <input
                            type="number"
                            placeholder="Initial Stock"
                            value={newKioskStock}
                            onChange={(e) => setNewKioskStock(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium"
                            required
                          />
                          <div className="sm:col-span-2 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-xl border border-dashed dark:border-[#3c1a1e] border-gray-300 dark:border-slate-600 p-3 flex flex-col gap-2">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase">Product Image</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleKioskImageUpload}
                              className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer font-medium"
                            />
                            {newKioskImage && (
                              <div className="mt-1">
                                <img src={newKioskImage} alt="Preview" className="h-14 w-14 object-cover rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-[#3c1a1e]" />
                              </div>
                            )}
                          </div>
                          <button
                            type="submit"
                            className="sm:col-span-2 mt-auto py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
                          >
                            Add Kiosk Item
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Right Column: List & Inventory Manager */}
                  <div className="col-span-12 lg:col-span-7 p-5 bg-white dark:bg-[#120709] border border-gray-200 dark:border-[#3c1a1e] rounded-3xl shadow-sm dark:shadow-none">
                    <h4 className="font-extrabold text-xs text-purple-950 dark:text-pink-300 dark:text-purple-300 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-purple-600" /> Live Inventory Adjustments
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mb-4 leading-normal">
                      Configure details, adjust stock, or purge products from immediate kiosk availability.
                    </p>

                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                      {kioskInventory.map(item => (
                        <div key={item.id} className="p-3 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl border border-gray-100 dark:border-[#291316] hover:border-purple-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <img src={item.image} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-[#3c1a1e] shadow-sm dark:shadow-none" referrerPolicy="no-referrer" />
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white block">{item.name}</span>
                              <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">{item.flavor}</span>
                              <span className="text-[10px] text-gray-500 dark:text-[#a1a1aa] block">Base Price: ₹{item.price}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                            {/* Stock Adjuster */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Stock:</span>
                              <button
                                type="button"
                                onClick={() => onUpdateKioskStock(item.id, Math.max(0, item.remainingStock - 1))}
                                className="w-6 h-6 bg-white dark:bg-[#120709] hover:bg-red-50 hover:dark:bg-red-500/10 text-red-600 font-extrabold rounded-lg border border-gray-200 dark:border-[#3c1a1e] hover:border-red-200 transition-colors text-center text-xs flex items-center justify-center active:scale-95"
                              >
                                -
                              </button>
                              <span className="min-w-[40px] text-center font-black text-xs text-gray-900 dark:text-white">
                                {item.remainingStock} <span className="text-gray-400 font-normal">/ {item.totalStock}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateKioskStock(item.id, Math.min(item.totalStock + 10, item.remainingStock + 1))}
                                className="w-6 h-6 bg-white dark:bg-[#120709] hover:bg-green-50 text-green-600 font-extrabold rounded-lg border border-gray-200 dark:border-[#3c1a1e] hover:border-green-200 transition-colors text-center text-xs flex items-center justify-center active:scale-95"
                              >
                                +
                              </button>
                            </div>

                            {/* Editing & Deletion */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Edit Product details"
                                onClick={() => {
                                  setEditingKioskId(item.id);
                                  setEditingKioskName(item.name);
                                  setEditingKioskPrice(item.price.toString());
                                  setEditingKioskFlavor(item.flavor);
                                  setEditingKioskStock(item.totalStock.toString());
                                  setEditingKioskImage(item.image);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="p-1.5 bg-white dark:bg-[#120709] text-gray-500 dark:text-[#a1a1aa] hover:text-purple-700 hover:bg-purple-50 hover:dark:bg-purple-500/10 rounded-lg border border-gray-250 dark:border-[#3c1a1e] hover:border-purple-200 transition-colors active:scale-95"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                type="button"
                                title="Delete from Kiosk"
                                onClick={() => {
                                  if (onDeleteKioskProduct) {
                                    onDeleteKioskProduct(item.id);
                                  }
                                }}
                                className="p-1.5 bg-white dark:bg-[#120709] text-gray-400 hover:text-red-600 hover:bg-red-50 hover:dark:bg-red-500/10 rounded-lg border border-gray-250 dark:border-[#3c1a1e] hover:border-red-200 transition-colors active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Catalog Publisher section */}
              {activeAdminTab === 'catalog' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Form (Add or Edit) */}
                  <div className="col-span-12 lg:col-span-5 space-y-5">
                    {editingCakeId ? (
                      <div className="p-5 bg-purple-50 dark:bg-purple-500/10/50 rounded-3xl border border-purple-200/60 shadow-md dark:shadow-none flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-extrabold text-xs text-purple-950 dark:text-pink-300 dark:text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5 text-purple-700 animate-spin" /> Edit Catalog Product
                          </h4>
                          <button
                            type="button"
                            onClick={() => setEditingCakeId(null)}
                            className="text-[10px] text-gray-400 hover:text-gray-600 hover:dark:text-[#d4d4d8] uppercase font-black tracking-wider"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-[11px] text-purple-900 dark:text-purple-300/80 mb-4 leading-normal font-medium">
                          Modify prices, culinary description, categories, and photographs for the live campus store menu.
                        </p>
                        <form onSubmit={handleSaveCakeEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Cake Title</label>
                            <input
                              type="text"
                              value={editingCakeName}
                              onChange={(e) => setEditingCakeName(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                              required
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Base Price (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingCakePrice}
                              onChange={(e) => setEditingCakePrice(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Category</label>
                            <select
                              value={editingCakeCategory}
                              onChange={(e) => setEditingCakeCategory(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                            >
                              <option value="Birthday Cakes">Birthday Cakes</option>
                              <option value="Chocolate Cakes">Chocolate Cakes</option>
                              <option value="Red Velvet">Red Velvet</option>
                              <option value="Bento Cakes">Bento Cakes</option>
                              <option value="Photo Cakes">Photo Cakes</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Description</label>
                            <input
                              type="text"
                              value={editingCakeDesc}
                              onChange={(e) => setEditingCakeDesc(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-[#120709] text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:outline-none focus:ring-2 focus:ring-purple-150 transition-colors font-bold text-gray-800 dark:text-[#fafafa]"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase px-1">Available Weights (kg)</label>
                            <div className="flex flex-wrap gap-2">
                              {[0.5, 1.0, 1.5, 2.0, 3.0].map((w) => (
                                <div key={w} className="flex flex-col gap-1">
                                  <label className="flex items-center gap-1.5 cursor-pointer bg-white dark:bg-[#120709] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#3c1a1e] text-xs text-gray-700 dark:text-[#e4e4e7] font-medium hover:bg-purple-50 hover:dark:bg-purple-500/10 transition-colors">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-600 focus:ring-1 w-3.5 h-3.5"
                                      checked={editingCakeWeights.includes(w)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditingCakeWeights(prev => [...prev, w].sort());
                                        } else {
                                          setEditingCakeWeights(prev => prev.filter(weight => weight !== w));
                                          setEditingCakeWeightPrices(prev => {
                                            const newPrices = { ...prev };
                                            delete newPrices[w];
                                            return newPrices;
                                          });
                                        }
                                      }}
                                    />
                                    <span>{w} kg</span>
                                  </label>
                                  {editingCakeWeights.includes(w) && (
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Price"
                                      value={editingCakeWeightPrices[w] || ''}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setEditingCakeWeightPrices(prev => {
                                          if (isNaN(val) || val <= 0) {
                                            const newPrices = { ...prev };
                                            delete newPrices[w];
                                            return newPrices;
                                          }
                                          return { ...prev, [w]: val };
                                        });
                                      }}
                                      className="px-2 py-1 bg-white dark:bg-[#120709] text-[10px] rounded border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-1 focus:ring-purple-150 transition-colors w-16"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                            {editingCakeWeights.length === 0 && <p className="text-[9px] text-red-500 mt-1 font-medium px-1">Please select at least one weight option.</p>}
                          </div>

                          <div className="sm:col-span-2 bg-white dark:bg-[#120709] rounded-xl border border-dashed dark:border-[#3c1a1e] border-purple-200 p-3 flex flex-col gap-2">
                            <label className="block text-[10px] font-bold text-purple-700 uppercase">Artwork Override</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditCakeImageUpload}
                              className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer font-medium"
                            />
                            {editingCakeImage && (
                              <div className="mt-1">
                                <img src={editingCakeImage} alt="Preview" className="h-14 w-14 object-cover rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-[#3c1a1e]" />
                              </div>
                            )}
                          </div>

                          <button
                            type="submit"
                            className="sm:col-span-2 mt-3 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
                          >
                            Save Product Updates
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="p-5 bg-white dark:bg-[#120709] rounded-3xl border border-gray-200 dark:border-[#3c1a1e] shadow-sm dark:shadow-none flex flex-col">
                        <h4 className="font-extrabold text-xs text-purple-950 dark:text-pink-300 dark:text-purple-300 uppercase tracking-widest mb-3 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5 text-purple-600" /> Catalog Publisher
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mb-4 leading-normal font-medium font-sans">
                          Quickly add new specialty cakes or seasonal features directly to the live campus store menu.
                        </p>
                        <form onSubmit={handleAddNewCakeSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                          <input
                            type="text"
                            placeholder="Cake Title (e.g., Midnight Fudge)"
                            value={newCakeName}
                            onChange={(e) => setNewCakeName(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium"
                            required
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price (e.g., 499)"
                            value={newCakePrice}
                            onChange={(e) => setNewCakePrice(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium"
                            required
                          />
                          <select
                            value={newCakeCategory}
                            onChange={(e) => setNewCakeCategory(e.target.value)}
                            className="px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium sm:col-span-2"
                          >
                            <option value="Birthday Cakes">Birthday Cakes</option>
                            <option value="Chocolate Cakes">Chocolate Cakes</option>
                            <option value="Red Velvet">Red Velvet</option>
                            <option value="Bento Cakes">Bento Cakes</option>
                            <option value="Photo Cakes">Photo Cakes</option>
                          </select>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Brief culinary highlights description..."
                              value={newCakeDesc}
                              onChange={(e) => setNewCakeDesc(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-purple-100 transition-colors text-gray-800 dark:text-[#fafafa] font-medium"
                            />
                          </div>
                          
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase mb-2">Available Weights (kg)</label>
                            <div className="flex flex-wrap gap-2">
                              {[0.5, 1.0, 1.5, 2.0, 3.0].map((w) => (
                                <div key={w} className="flex flex-col gap-1">
                                  <label className="flex items-center gap-1.5 cursor-pointer bg-white dark:bg-[#120709] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#3c1a1e] text-xs text-gray-700 dark:text-[#e4e4e7] font-medium hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80 transition-colors">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-600 focus:ring-1 w-3.5 h-3.5"
                                      checked={newCakeWeights.includes(w)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewCakeWeights(prev => [...prev, w].sort());
                                        } else {
                                          setNewCakeWeights(prev => prev.filter(weight => weight !== w));
                                          setNewCakeWeightPrices(prev => {
                                            const newPrices = { ...prev };
                                            delete newPrices[w];
                                            return newPrices;
                                          });
                                        }
                                      }}
                                    />
                                    <span>{w} kg</span>
                                  </label>
                                  {newCakeWeights.includes(w) && (
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Price"
                                      value={newCakeWeightPrices[w] || ''}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setNewCakeWeightPrices(prev => {
                                          if (isNaN(val) || val <= 0) {
                                            const newPrices = { ...prev };
                                            delete newPrices[w];
                                            return newPrices;
                                          }
                                          return { ...prev, [w]: val };
                                        });
                                      }}
                                      className="px-2 py-1 bg-gray-50 dark:bg-[#1a0d0f]/80 text-[10px] rounded border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-1 focus:ring-purple-100 transition-colors w-16"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                            {newCakeWeights.length === 0 && <p className="text-[9px] text-red-500 mt-1 font-medium">Please select at least one weight option.</p>}
                          </div>

                          <div className="sm:col-span-2 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-xl border border-dashed dark:border-[#3c1a1e] border-gray-300 dark:border-slate-600 p-3 flex flex-col gap-2">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase">Featured Artwork</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer font-medium"
                            />
                            {newCakeImage && (
                              <div className="mt-1">
                                <img src={newCakeImage} alt="Preview" className="h-14 w-14 object-cover rounded-xl shadow-sm dark:shadow-none border border-gray-100 dark:border-[#291316]" />
                              </div>
                            )}
                          </div>
                          <button
                            type="submit"
                            className="sm:col-span-2 mt-auto py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
                          >
                            Publish to Marketplace
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Right Column: List & Catalog Menu Organizer */}
                  <div className="col-span-12 lg:col-span-7 p-5 bg-white dark:bg-[#120709] border border-gray-200 dark:border-[#3c1a1e] rounded-3xl shadow-sm dark:shadow-none">
                    <h4 className="font-extrabold text-xs text-purple-950 dark:text-pink-300 dark:text-purple-300 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-purple-600" /> Advance Order Catalog Menu
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mb-4 leading-normal">
                      Listed pre-order cakes currently available across campuses. Adjust descriptions, pricing, or delete old specialties.
                    </p>

                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                      {allCakes.map(item => (
                        <div key={item.id} className="p-3 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-2xl border border-gray-100 dark:border-[#291316] hover:border-purple-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <img src={item.image} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-[#3c1a1e] shadow-sm dark:shadow-none" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                              <span className="font-bold text-gray-900 dark:text-white block truncate max-w-[190px]">{item.name}</span>
                              <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">{item.category}</span>
                              <span className="text-[10px] text-gray-500 dark:text-[#a1a1aa] block">Base Price: ₹{item.price}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                            <button
                              type="button"
                              title="Edit product info"
                              onClick={() => {
                                setEditingCakeId(item.id);
                                setEditingCakeName(item.name);
                                setEditingCakePrice(item.price.toString());
                                setEditingCakeCategory(item.category);
                                setEditingCakeDesc(item.description);
                                setEditingCakeImage(item.image);
                                setEditingCakeWeights(item.weights || []);
                                setEditingCakeWeightPrices(item.weightPrices || {});
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1.5 bg-white dark:bg-[#120709] text-gray-500 dark:text-[#a1a1aa] hover:text-purple-700 hover:bg-purple-50 hover:dark:bg-purple-500/10 rounded-lg border border-gray-250 dark:border-[#3c1a1e] hover:border-purple-200 transition-colors text-[10px] font-bold flex items-center gap-1 active:scale-95"
                            >
                              <Settings className="w-3.5 h-3.5" /> Edit Info
                            </button>
                            
                            <button
                              type="button"
                              title="Delete product"
                              onClick={() => {
                                if (onDeleteCustomCake) {
                                  onDeleteCustomCake(item.id);
                                }
                              }}
                              className="p-1.5 bg-white dark:bg-[#120709] text-gray-400 hover:text-red-600 hover:bg-red-50 hover:dark:bg-red-500/10 rounded-lg border border-gray-250 dark:border-[#3c1a1e] hover:border-red-200 transition-colors active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Add Campus Control */}
              {activeAdminTab === 'campus' && (
                <div className="grid grid-cols-1 gap-5">
                  <div className="p-5 bg-white dark:bg-[#120709] rounded-3xl border border-gray-200 dark:border-[#3c1a1e] shadow-sm dark:shadow-none flex flex-col">
                  <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Campus Expansion Hub
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mb-4 leading-normal">
                    Provision new campus zones to unlock deliveries and custom kiosks for new student bodies.
                  </p>
                  <form onSubmit={handleAddNewCampusSubmit} className="grid grid-cols-1 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="pl-1 text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase">Institution Name</label>
                      <input
                        type="text"
                        placeholder="e.g. SRCC North Campus"
                        value={newCampusName}
                        onChange={(e) => setNewCampusName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="pl-1 text-[10px] font-bold text-gray-500 dark:text-[#a1a1aa] uppercase">Primary Drop-off Hub</label>
                      <input
                        type="text"
                        placeholder="e.g. Activity Center, Block D"
                        value={newCampusLocation}
                        onChange={(e) => setNewCampusLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 text-xs rounded-xl border border-gray-200 dark:border-[#3c1a1e] focus:bg-white focus:dark:bg-[#120709] focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
                        required
                      />
                    </div>
                    
                    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-[10px] font-medium leading-relaxed">
                      <strong>Note:</strong> Newly added campuses become instantly visible on the student login portal. Make sure your local ambassadors are ready before adding.
                    </div>

                    <button
                      type="submit"
                      className="mt-auto py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                    >
                      Provision New Campus
                    </button>
                  </form>
                </div>
                
                {/* List of Active Campuses for Deletion */}
                <div className="bg-white dark:bg-[#120709] rounded-3xl border border-gray-200 dark:border-[#3c1a1e] shadow-sm dark:shadow-none overflow-hidden flex flex-col">
                    <div className="border-b border-gray-100 dark:border-[#291316] p-4">
                      <h4 className="font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-widest flex items-center justify-between">
                        <span>Active Campus Hubs</span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-[#1a0d0f]/80 px-2.5 py-1 rounded-full">{campuses.length} Hubs</span>
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-100 p-3 space-y-2">
                       {campuses.map(campus => (
                         <div key={campus.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-xl">
                            <div>
                              <h5 className="font-bold text-xs text-gray-900 dark:text-white">{campus.name}</h5>
                              <p className="text-[10px] text-gray-500 dark:text-[#a1a1aa] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/> {campus.location}</p>
                            </div>
                            <button
                              onClick={() => onDeleteCampus?.(campus.id)}
                              className="p-2 text-rose-500 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                              title="Delete Campus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                       {campuses.length === 0 && (
                         <div className="p-4 text-center text-xs text-gray-500 dark:text-[#a1a1aa] font-medium">No campuses active.</div>
                       )}
                    </div>
                </div>
                </div>
              )}

                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
