/**
 * บริการจัดการ Firebase
 * ใช้สำหรับติดต่อกับ Firestore และบริการอื่นๆ ของ Firebase
 */

import { db } from './firebase-config.js';

class FirebaseService {
    constructor() {
        this.currentShop = 'ป้าสี';
        this.menuItemsCache = new Map(); // Cache สำหรับเมนู
    }

    /**
     * ดึงข้อมูลร้านค้าทั้งหมดจาก Firestore
     * @returns {Promise<Array>} อาร์เรย์ของข้อมูลร้านค้า
     */
    async getShops() {
        try {
            console.log('📡 กำลังโหลดข้อมูลร้านค้า...');
            const snapshot = await db.collection('shops')
                .where('isActive', '==', true)
                .orderBy('name')
                .get();
            
            const shops = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ โหลดข้อมูลร้านค้าสำเร็จ: ${shops.length} ร้าน`);
            return shops;
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการโหลดร้านค้า:', error);
            
            // กลับไปใช้ข้อมูลตัวอย่างถ้าเกิดข้อผิดพลาด
            return this.getDefaultShops();
        }
    }

    /**
     * ดึงเมนูตามหมวดหมู่และร้าน
     * @param {string} category - หมวดหมู่ (all, food, noodle, etc.)
     * @param {string} shop - ชื่อร้าน
     * @returns {Promise<Array>} อาร์เรย์ของเมนู
     */
    async getMenuItemsByCategory(category, shop) {
        try {
            const cacheKey = `${shop}_${category}`;
            
            // ตรวจสอบ cache
            if (this.menuItemsCache.has(cacheKey)) {
                console.log('📦 ใช้ข้อมูลเมนูจาก cache');
                return this.menuItemsCache.get(cacheKey);
            }
            
            console.log(`📡 กำลังโหลดเมนูสำหรับร้าน: ${shop}, หมวดหมู่: ${category}`);
            
            let query = db.collection('menuItems')
                .where('shop', '==', shop)
                .where('available', '==', true);
            
            if (category !== 'all') {
                query = query.where('category', '==', category);
            }
            
            const snapshot = await query.orderBy('name').get();
            
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // บันทึกลง cache
            this.menuItemsCache.set(cacheKey, items);
            
            console.log(`✅ โหลดเมนูสำเร็จ: ${items.length} รายการ`);
            return items;
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการโหลดเมนู:', error);
            
            // กลับไปใช้ข้อมูลตัวอย่าง
            return this.getSampleMenuItems(shop);
        }
    }

    /**
     * สร้างคำสั่งซื้อใหม่
     * @param {Object} orderData - ข้อมูลคำสั่งซื้อ
     * @param {string} shop - ชื่อร้าน
     * @returns {Promise<Object>} ผลลัพธ์การสร้างคำสั่งซื้อ
     */
    async createOrder(orderData, shop) {
        try {
            console.log('🛒 กำลังสร้างคำสั่งซื้อใหม่...');
            
            const orderWithMetadata = {
                ...orderData,
                shop: shop,
                status: 'pending_payment',
                orderNumber: this.generateOrderNumber(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await db.collection('orders').add(orderWithMetadata);
            
            const paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
            
            const paymentData = {
                orderId: docRef.id,
                orderNumber: orderWithMetadata.orderNumber,
                amount: orderData.total,
                shop: shop,
                status: 'pending',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 นาที
            };

            await db.collection('payments').doc(paymentId).set(paymentData);

            console.log(`✅ สร้างคำสั่งซื้อสำเร็จ! รหัส: ${orderWithMetadata.orderNumber}`);
            
            return {
                success: true,
                orderId: docRef.id,
                paymentId: paymentId,
                orderNumber: orderWithMetadata.orderNumber,
                total: orderData.total
            };
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูลการชำระเงิน
     * @param {string} paymentId - ID การชำระเงิน
     * @returns {Promise<Object|null>} ข้อมูลการชำระเงิน
     */
    async getPayment(paymentId) {
        try {
            const doc = await db.collection('payments').doc(paymentId).get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน:', error);
            return null;
        }
    }

    /**
     * ฟังการเปลี่ยนแปลงเมนูแบบ real-time
     * @param {Function} callback - ฟังก์ชันที่เรียกเมื่อมีเปลี่ยนแปลง
     * @param {string} shop - ชื่อร้าน
     * @returns {Function} ฟังก์ชันยกเลิกการฟัง
     */
    listenToMenuChanges(callback, shop) {
        let query = db.collection('menuItems')
            .where('shop', '==', shop)
            .where('available', '==', true)
            .orderBy('name');
        
        return query.onSnapshot((snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // อัพเดต cache
            const cacheKey = `${shop}_all`;
            this.menuItemsCache.set(cacheKey, items);
            
            callback(items);
            
        }, (error) => {
            console.error('❌ เกิดข้อผิดพลาดในการฟังการเปลี่ยนแปลงเมนู:', error);
        });
    }

    /**
     * ฟังสถานะการชำระเงินแบบ real-time
     * @param {string} paymentId - ID การชำระเงิน
     * @param {Function} callback - ฟังก์ชันที่เรียกเมื่อมีเปลี่ยนแปลง
     * @returns {Function} ฟังก์ชันยกเลิกการฟัง
     */
    listenToPaymentStatus(paymentId, callback) {
        return db.collection('payments').doc(paymentId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    callback({ id: doc.id, ...doc.data() });
                } else {
                    callback(null);
                }
            }, (error) => {
                console.error('❌ เกิดข้อผิดพลาดในการฟังสถานะการชำระเงิน:', error);
            });
    }

    /**
     * อัปเดตสถานะการชำระเงิน
     * @param {string} paymentId - ID การชำระเงิน
     * @param {string} status - สถานะใหม่
     * @returns {Promise<boolean>} สำเร็จหรือไม่
     */
    async updatePaymentStatus(paymentId, status) {
        try {
            await db.collection('payments').doc(paymentId).update({
                status: status,
                updatedAt: new Date().toISOString()
            });
            
            console.log(`✅ อัปเดตสถานะการชำระเงิน ${paymentId} เป็น ${status}`);
            return true;
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะการชำระเงิน:', error);
            return false;
        }
    }

    /**
     * ตั้งค่าร้านปัจจุบัน
     * @param {string} shopName - ชื่อร้าน
     */
    setCurrentShop(shopName) {
        this.currentShop = shopName;
        console.log(`🏪 ตั้งค่าร้านปัจจุบันเป็น: ${shopName}`);
        
        // เคลียร์ cache เมนูเมื่อเปลี่ยนร้าน
        this.clearMenuCache();
    }

    /**
     * เคลียร์ cache เมนู
     */
    clearMenuCache() {
        this.menuItemsCache.clear();
        console.log('🧹 เคลียร์ cache เมนูเรียบร้อย');
    }

    /**
     * สร้างหมายเลขคำสั่งซื้อ
     * @returns {string} หมายเลขคำสั่งซื้อ
     */
    generateOrderNumber() {
        const now = new Date();
        const dateStr = now.getFullYear().toString().substr(-2) + 
                      (now.getMonth() + 1).toString().padStart(2, '0') + 
                      now.getDate().toString().padStart(2, '0');
        const timeStr = now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0');
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        return `ORD${dateStr}${timeStr}${randomNum}`;
    }

    /**
     * ข้อมูลร้านค้าเริ่มต้น (ใช้เมื่อไม่สามารถเชื่อมต่อ Firebase ได้)
     * @returns {Array} ข้อมูลร้านค้าเริ่มต้น
     */
    getDefaultShops() {
        console.log('📋 กำลังใช้ข้อมูลร้านค้าเริ่มต้น');
        
        return [
            {
                id: '1',
                name: 'ป้าเปิ้ลสุดสวย',
                description: 'อาหารตามสั่ง',
                isActive: true,
                categories: ['food', 'noodle', 'isan'],
                imageUrl: '',
                openingHours: '06:00-14:00',
                phone: '081-234-5678'
            },
            {
                id: '2',
                name: 'ป้ามิตรสุดเก๋',
                description: 'ก๋วยเตี๋ยวสูตรเด็ด',
                isActive: true,
                categories: ['noodle'],
                imageUrl: '',
                openingHours: '06:00-13:00',
                phone: '082-345-6789'
            },
            {
                id: '3',
                name: 'ป้าอ้อยสุดแซ่บ',
                description: 'ก๋วยเตี๋ยวน้ำตกน้ำใส',
                isActive: true,
                categories: ['noodle'],
                imageUrl: '',
                openingHours: '06:00-13:00',
                phone: '083-456-7890'
            }
        ];
    }

    /**
     * ข้อมูลเมนูตัวอย่าง
     * @param {string} shop - ชื่อร้าน
     * @returns {Array} ข้อมูลเมนูตัวอย่าง
     */
    getSampleMenuItems(shop) {
        console.log(`📋 กำลังใช้ข้อมูลเมนูตัวอย่างสำหรับร้าน: ${shop}`);
        
        const sampleMenus = {
            'ป้าเปิ้ลสุดสวย': [
                { 
                    id: '1', 
                    name: 'ผัดไทย', 
                    description: 'ผัดไทยสูตรดั้งเดิมใส่กุ้งสด', 
                    price: 60, 
                    category: 'food', 
                    shop: 'ป้าเปิ้ลสุดสวย', 
                    available: true,
                    imageUrl: 'https://images.unsplash.com/photo-1559314809-2b99056a8c4a?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                },
                { 
                    id: '2', 
                    name: 'ข้าวผัดกระเพราไก่', 
                    description: 'ข้าวผัดกระเพราไก่สับ', 
                    price: 50, 
                    category: 'food', 
                    shop: 'ป้าเปิ้ลสุดสวย', 
                    available: true,
                    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                },
                { 
                    id: '3', 
                    name: 'ส้มตำไทย', 
                    description: 'ส้มตำไทยแบบดั้งเดิม', 
                    price: 40, 
                    category: 'isan', 
                    shop: 'ป้าเปิ้ลสุดสวย', 
                    available: true,
                    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                }
            ],
            'ป้ามิตรสุดเก๋': [
                { 
                    id: '4', 
                    name: 'ก๋วยเตี๋ยวเรือ', 
                    description: 'ก๋วยเตี๋ยวเรือน้ำตก', 
                    price: 55, 
                    category: 'noodle', 
                    shop: 'ป้ามิตรสุดเก๋', 
                    available: true,
                    imageUrl: 'https://images.unsplash.com/photo-1552611052-33b04c8c17c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                },
                { 
                    id: '5', 
                    name: 'บะหมี่แห้ง', 
                    description: 'บะหมี่แห้งหมูสับ', 
                    price: 50, 
                    category: 'noodle', 
                    shop: 'ป้ามิตรสุดเก๋', 
                    available: true,
                    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                }
            ],
            'ป้าอ้อยสุดแซ่บ': [
                { 
                    id: '6', 
                    name: 'บัวลอยไข่หวาน', 
                    description: 'บัวลอยไข่หวานน้ำกะทิ', 
                    price: 35, 
                    category: 'noodle', 
                    shop: 'ป้าอ้อยสุดแซ่บ', 
                    available: true,
                    imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                },
                { 
                    id: '7', 
                    name: 'โกปี้นมสด', 
                    description: 'โกปี้นมสดเย็น', 
                    price: 45, 
                    category: 'noodle', 
                    shop: 'ป้าอ้อยสุดแซ่บ', 
                    available: true,
                    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                }
            ]
        };

        return sampleMenus[shop] || [];
    }

    /**
     * ฟังก์ชันช่วยสำหรับสร้าง QR Code URL
     * @param {string} paymentId - ID การชำระเงิน
     * @param {number} amount - จำนวนเงิน
     * @returns {string} URL QR Code
     */
    generateQRCodeUrl(paymentId, amount) {
        // ใช้ QR Code API ออนไลน์
        const data = JSON.stringify({
            type: 'payment',
            id: paymentId,
            amount: amount,
            timestamp: new Date().toISOString(),
            shop: this.currentShop
        });
        
        const encodedData = encodeURIComponent(data);
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedData}&format=png&margin=10&color=0-0-0&bgcolor=255-255-255`;
    }
}

// สร้าง instance เดียวของ FirebaseService
const firebaseService = new FirebaseService();

export default firebaseService;