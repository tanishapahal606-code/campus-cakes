/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  getFirestore, doc, getDoc, getDocFromServer, getDocs, setDoc, updateDoc, 
  deleteDoc, collection, query, where, onSnapshot 
} from 'firebase/firestore';
import { db, auth, isRealFirebase } from '../firebase';
import { Campus, CakeItem, KioskCake, Order, UserProfile, FeedbackReview } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Mandatory Error Handler meeting Firestore Isolation constraints
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Triggered:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively removes all keys that have a value of undefined.
 * This is crucial to prevent Firestore setDoc/updateDoc crashes due to unsupported undefined values.
 */
function sanitizeFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) {
    return data.map(v => sanitizeFirestoreData(v));
  }
  if (typeof data === 'object') {
    const fresh: any = {};
    Object.keys(data).forEach(k => {
      if (data[k] !== undefined) {
        fresh[k] = sanitizeFirestoreData(data[k]);
      }
    });
    return fresh;
  }
  return data;
}


// Ensure remote connectivity test on init
export async function testFirestoreConnection() {
  if (!isRealFirebase) return;
  try {
    const testDocPath = 'test/connection';
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    }
  }
}

// ==========================================
// 1. CAMPUSES COLLECTION OPERATIONS
// ==========================================
export async function getCampuses(): Promise<Campus[]> {
  if (!isRealFirebase) return [];
  const colPath = 'campuses';
  try {
    const q = collection(db, colPath);
    const snap = await getDocs(q);
    const items: Campus[] = [];
    snap.forEach((d) => {
      items.push(d.data() as Campus);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }
}

export async function writeCampus(campus: Campus): Promise<void> {
  if (!isRealFirebase) return;
  const path = `campuses/${campus.id}`;
  try {
    await setDoc(doc(db, 'campuses', campus.id), sanitizeFirestoreData(campus));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function removeCampus(campusId: string): Promise<void> {
  if (!isRealFirebase) return;
  const path = `campuses/${campusId}`;
  try {
    await deleteDoc(doc(db, 'campuses', campusId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}


// ==========================================
// 2. PRODUCTS (DELIVERY CAKES) COLLECTION OPERATIONS
// ==========================================
export async function getProducts(): Promise<CakeItem[]> {
  if (!isRealFirebase) return [];
  const colPath = 'products';
  try {
    const q = collection(db, colPath);
    const snap = await getDocs(q);
    const items: CakeItem[] = [];
    snap.forEach((d) => {
      items.push(d.data() as CakeItem);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }
}

export async function writeProduct(product: CakeItem): Promise<void> {
  if (!isRealFirebase) return;
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), sanitizeFirestoreData(product));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function removeProduct(productId: string): Promise<void> {
  if (!isRealFirebase) return;
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}


// ==========================================
// 3. KIOSK PRODUCTS COLLECTION OPERATIONS
// ==========================================
export async function getKioskProducts(): Promise<KioskCake[]> {
  if (!isRealFirebase) return [];
  const colPath = 'kiosk_products';
  try {
    const q = collection(db, colPath);
    const snap = await getDocs(q);
    const items: KioskCake[] = [];
    snap.forEach((d) => {
      items.push(d.data() as KioskCake);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }
}

export async function writeKioskProduct(kioskItem: KioskCake): Promise<void> {
  if (!isRealFirebase) return;
  const path = `kiosk_products/${kioskItem.id}`;
  try {
    await setDoc(doc(db, 'kiosk_products', kioskItem.id), sanitizeFirestoreData(kioskItem));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function removeKioskProduct(kioskId: string): Promise<void> {
  if (!isRealFirebase) return;
  const path = `kiosk_products/${kioskId}`;
  try {
    await deleteDoc(doc(db, 'kiosk_products', kioskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}


// ==========================================
// 4. USER PROFILES COLLECTION OPERATIONS
// ==========================================
export function subscribeToUserProfile(userId: string, onUpdate: (profile: UserProfile | null) => void) {
  if (!isRealFirebase) return () => {};
  const docRef = doc(db, 'users', userId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as UserProfile);
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.error("Error listening to user profile:", err);
  });
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isRealFirebase) return null;
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function writeUserProfile(profile: UserProfile): Promise<void> {
  if (!isRealFirebase) return;
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), sanitizeFirestoreData(profile));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ==========================================
// 5. ORDERS COLLECTION OPERATIONS
// ==========================================
export function subscribeToUserOrders(userId: string, onUpdate: (orders: Order[]) => void) {
  if (!isRealFirebase) return () => {};
  const q = query(collection(db, 'orders'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const orders: Order[] = [];
    snap.forEach((d) => orders.push({ id: d.id, ...(d.data() as any) } as Order));
    onUpdate(orders);
  }, (err) => {
    console.error("Error listening to user orders:", err);
  });
}

export function subscribeToAllOrders(onUpdate: (orders: Order[]) => void) {
  if (!isRealFirebase) return () => {};
  const q = collection(db, 'orders');
  return onSnapshot(q, (snap) => {
    const orders: Order[] = [];
    snap.forEach((d) => orders.push({ id: d.id, ...(d.data() as any) } as Order));
    onUpdate(orders);
  }, (err) => {
    console.error("Error listening to all orders:", err);
  });
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  if (!isRealFirebase) return [];
  const colPath = 'orders';
  try {
    const q = query(collection(db, colPath), where('userId', '==', userId));
    const snap = await getDocs(q);
    const items: Order[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...(d.data() as any) } as Order);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }
}

export async function writeOrder(order: Order): Promise<void> {
  if (!isRealFirebase) return;
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), sanitizeFirestoreData(order));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getAllOrders(): Promise<Order[]> {
  if (!isRealFirebase) return [];
  const colPath = 'orders';
  try {
    const snap = await getDocs(collection(db, colPath));
    const items: Order[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...(d.data() as any) } as Order);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
    return [];
  }
}


// ==========================================
// 6. CAKE IMAGES CATALOG OPERATIONS
// ==========================================
export interface CakeImageRecord {
  id: string;
  cakeId?: string;
  name?: string;
  imageUrl: string;
  uploadedBy?: string;
  createdAt: string;
}

export async function getCakeImages(): Promise<CakeImageRecord[]> {
  if (!isRealFirebase) return [];
  const colPath = 'cake_images';
  try {
    const q = collection(db, colPath);
    const snap = await getDocs(q);
    const items: CakeImageRecord[] = [];
    snap.forEach((d) => {
      items.push(d.data() as CakeImageRecord);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }
}

export async function writeCakeImage(imageRecord: CakeImageRecord): Promise<void> {
  if (!isRealFirebase) return;
  const path = `cake_images/${imageRecord.id}`;
  try {
    await setDoc(doc(db, 'cake_images', imageRecord.id), sanitizeFirestoreData(imageRecord));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function removeOrder(orderId: string): Promise<void> {
  if (!isRealFirebase) return;
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
