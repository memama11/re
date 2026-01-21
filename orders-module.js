/**
 * โมดูลจัดการคำสั่งซื้อ
 * ดึงข้อมูลและจัดการคำสั่งซื้อจาก Firebase สำหรับระบบครัว
 */

class OrdersModule {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.orders = [];
        this.currentShop = '';
        this.currentFilter = 'pending';
    }

    /**
     * ตั้งค่าร้านปัจจุบัน
     * @param {string} shopName - ชื่อร้าน
     */
    setCurrentShop(shopName) {
        this.currentShop = shopName;
    }

    /**
     * ตั้งค่าตัวกรองสถานะ
     * @param {string} status - สถานะ (pending, preparing, completed)
     */
    setFilter(status) {
        this.currentFilter = status;
    }

    /**
     * โหลดข้อมูลคำสั่งซื้อทั้งหมดจากร้านปัจจุบัน
     * @returns {Promise<Array>} ข้อมูลคำสั่งซื้อ
     */
    async loadOrders() {
        try {
            console.log(`🔄 Loading orders for shop: ${this.currentShop}`);
            
            // ตัวอย่าง: ดึงคำสั่งซื้อจาก Firebase
            // this.orders = await this.firebaseService.getOrdersByShop(this.currentShop);
            
            // ใช้ข้อมูลตัวอย่างชั่วคราว
            this.orders = this.getSampleOrders();
            
            console.log(`✅ Loaded ${this.orders.length} orders`);
            return this.orders;
            
        } catch (error) {
            console.error('❌ Error loading orders:', error);
            return [];
        }
    }

    /**
     * อัปเดตสถานะคำสั่งซื้อ
     * @param {string} orderId - ID คำสั่งซื้อ
     * @param {string} status - สถานะใหม่
     * @returns {Promise<boolean>} สำเร็จหรือไม่
     */
    async updateOrderStatus(orderId, status) {
        try {
            const order = this.getOrderById(orderId);
            
            if (order) {
                order.status = status;
                order.updatedAt = new Date().toISOString();
                
                console.log(`✅ Order ${orderId} status updated to ${status}`);
                
                // ตัวอย่าง: อัปเดตใน Firebase
                // await this.firebaseService.updateOrderStatus(orderId, status);
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูลคำสั่งซื้อที่ถูกกรองแล้ว
     * @returns {Array} คำสั่งซื้อที่ถูกกรอง
     */
    getFilteredOrders() {
        if (this.currentFilter === 'all') {
            return this.orders;
        }
        
        return this.orders.filter(order => order.status === this.currentFilter);
    }

    /**
     * ดึงข้อมูลคำสั่งซื้อทั้งหมด
     * @returns {Array} ข้อมูลคำสั่งซื้อ
     */
    getOrders() {
        return this.orders;
    }

    /**
     * ดึงข้อมูลคำสั่งซื้อตาม ID
     * @param {string} orderId - ID คำสั่งซื้อ
     * @returns {Object|null} ข้อมูลคำสั่งซื้อ
     */
    getOrderById(orderId) {
        return this.orders.find(o => o.id === orderId) || null;
    }

    /**
     * ฟังการเปลี่ยนแปลงคำสั่งซื้อแบบ real-time
     * @param {Function} callback - ฟังก์ชันเรียกกลับ
     * @param {string} shop - ชื่อร้าน
     * @returns {Function} ฟังก์ชันยกเลิกการฟัง
     */
    listenToOrderChanges(callback, shop) {
        console.log(`👂 Listening to order changes for shop: ${shop}`);
        
        // ตัวอย่าง: ฟังการเปลี่ยนแปลงจาก Firebase
        // return this.firebaseService.listenToOrderChanges(callback, shop);
        
        // คืนฟังก์ชันเปล่าเนื่องจากเป็นตัวอย่าง
        return () => {
            console.log('🔇 Stopped listening to order changes');
        };
    }

    /**
     * ข้อมูลคำสั่งซื้อตัวอย่าง
     * @returns {Array} ข้อมูลคำสั่งซื้อตัวอย่าง
     */
    getSampleOrders() {
        return [
            {
                id: 'order_1',
                orderNumber: 'ORD001',
                customerName: 'สมชาย ใจดี',
                tableNumber: '3',
                shop: 'ป้าสี',
                status: 'pending',
                items: [
                    { id: 'prod_1', name: 'ผัดไทย', price: 60, quantity: 2 },
                    { id: 'prod_2', name: 'ข้าวผัดกระเพราไก่', price: 50, quantity: 1 }
                ],
                total: 170,
                createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 นาทีที่แล้ว
                updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            },
            {
                id: 'order_2',
                orderNumber: 'ORD002',
                customerName: 'สุนิตา สวยงาม',
                tableNumber: '5',
                shop: 'ลุงสม',
                status: 'preparing',
                items: [
                    { id: 'prod_3', name: 'ก๋วยเตี๋ยวเรือ', price: 55, quantity: 1 }
                ],
                total: 55,
                createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 นาทีที่แล้ว
                updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
            },
            {
                id: 'order_3',
                orderNumber: 'ORD003',
                customerName: 'อนุชา เก่งมาก',
                tableNumber: '2',
                shop: 'น้าตู่',
                status: 'completed',
                items: [
                    { id: 'prod_4', name: 'บัวลอยไข่หวาน', price: 35, quantity: 3 }
                ],
                total: 105,
                createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 ชั่วโมงที่แล้ว
                updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
            },
            {
                id: 'order_4',
                orderNumber: 'ORD004',
                customerName: 'วิไลลักษณ์ น่ารัก',
                tableNumber: '7',
                shop: 'ป้าสี',
                status: 'pending',
                items: [
                    { id: 'prod_1', name: 'ผัดไทย', price: 60, quantity: 1 },
                    { id: 'prod_2', name: 'ข้าวผัดกระเพราไก่', price: 50, quantity: 2 }
                ],
                total: 160,
                createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 นาทีที่แล้ว
                updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
            }
        ];
    }
}

export default OrdersModule;