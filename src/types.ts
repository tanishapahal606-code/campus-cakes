/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Campus {
  id: string;
  name: string;
  location: string;
  active: boolean;
}

export interface CakeItem {
  id: string;
  name: string;
  description: string;
  price: number; // base price for smallest weight
  rating: number;
  category: string;
  isEggless: boolean;
  isTrending: boolean;
  image: string;
  deliveryTime: string;
  weights: number[]; // e.g. [0.5, 1, 1.5, 2]
  weightPrices?: Record<number, number>; // Maps weight to its specific price
  flavors: string[];
  campusIds?: string[];
}

export interface KioskCake {
  id: string;
  name: string;
  price: number;
  flavor: string;
  remainingStock: number;
  totalStock: number;
  image: string;
  campusIds?: string[];
}

export interface OrderItemCustomization {
  flavor: string;
  weight: number;
  messageOnCake: string;
  photoUrl?: string;
  addCandles: boolean;
  addKnife: boolean;
  pickupTime: string;
  specialInstructions?: string;
}

export interface CartItem {
  id: string; // uniques composite id
  cakeId: string;
  name: string;
  basePrice: number;
  price: number;
  image: string;
  quantity: number;
  customization?: OrderItemCustomization;
  isInstantKiosk?: boolean;
}

export type OrderStatus = 'placed' | 'preparing' | 'delivery' | 'ready' | 'completed';

export interface Order {
  id: string;
  campusId: string;
  items: CartItem[];
  orderType: 'pre-order' | 'instant-pickup';
  status: OrderStatus;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  pointsEarned: number;
  date: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
}

export interface SavedCelebration {
  id: string;
  name: string;
  relation: string;
  date: string; // YYYY-MM-DD
  remindMe: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  campusId: string;
  rewardPoints: number;
  savedCelebrations: SavedCelebration[];
  wishlist: string[]; // cakeIds
  uid?: string;
  walletBalance?: number;
  didWalletReset2026?: boolean;
  didDeploymentReset2026?: boolean;
}

export interface FeedbackReview {
  id: string;
  userName: string;
  userImage: string;
  rating: number;
  comment: string;
  cakeName: string;
  date: string;
  image?: string;
}
