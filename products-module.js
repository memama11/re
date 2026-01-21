
/**
 * โมดูลจัดการสินค้า
 * ดึงข้อมูลและจัดการสินค้าจาก Firebase สำหรับระบบครัว
 */

class ProductsModule {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.products = [];
        this.currentShop = '';
    }

    /**
     * ตั้งค่าร้านปัจจุบัน
     * @param {string} shopName - ชื่อร้าน
     */
    setCurrentShop(shopName) {
        this.currentShop = shopName;
    }

    /**
     * โหลดข้อมูลสินค้าทั้งหมดจากร้านปัจจุบัน
     * @returns {Promise<Array>} ข้อมูลสินค้า
     */
    async loadProducts() {
        try {
            // ใช้ฟังก์ชันที่มีอยู่ใน firebase service
            // ในกรณีจริงควรสร้างฟังก์ชัน getProductsByShop ใน firebase service
            console.log(`🔄 Loading products for shop: ${this.currentShop}`);
            
            // ตัวอย่าง: ดึงสินค้าทั้งหมดจากร้านนี้
            // this.products = await this.firebaseService.getProductsByShop(this.currentShop);
            
            // ใช้ข้อมูลตัวอย่างชั่วคราว
            this.products = this.getSampleProducts();
            
            console.log(`✅ Loaded ${this.products.length} products`);
            return this.products;
            
        } catch (error) {
            console.error('❌ Error loading products:', error);
            return [];
        }
    }

    /**
     * เพิ่มสินค้าใหม่
     * @param {Object} productData - ข้อมูลสินค้า
     * @returns {Promise<string>} ID สินค้าที่เพิ่ม
     */
    async addProduct(productData) {
        try {
            // ในกรณีจริงควรเรียก firebaseService.addProduct
            const newProduct = {
                id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...productData,
                createdAt: new Date().toISOString()
            };
            
            this.products.push(newProduct);
            console.log('✅ Product added:', newProduct.id);
            
            // ตัวอย่าง: บันทึกลง Firebase
            // await this.firebaseService.addProduct(newProduct, this.currentShop);
            
            return newProduct.id;
            
        } catch (error) {
            console.error('❌ Error adding product:', error);
            throw error;
        }
    }

    /**
     * อัปเดตข้อมูลสินค้า
     * @param {string} productId - ID สินค้า
     * @param {Object} updates - ข้อมูลที่ต้องการอัปเดต
     * @returns {Promise<boolean>} สำเร็จหรือไม่
     */
    async updateProduct(productId, updates) {
        try {
            const index = this.products.findIndex(p => p.id === productId);
            
            if (index !== -1) {
                this.products[index] = {
                    ...this.products[index],
                    ...updates
                };
                
                console.log('✅ Product updated:', productId);
                
                // ตัวอย่าง: อัปเดตใน Firebase
                // await this.firebaseService.updateProduct(productId, updates);
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error updating product:', error);
            throw error;
        }
    }

    /**
     * ลบสินค้า
     * @param {string} productId - ID สินค้า
     * @returns {Promise<boolean>} สำเร็จหรือไม่
     */
    async deleteProduct(productId) {
        try {
            const initialLength = this.products.length;
            this.products = this.products.filter(p => p.id !== productId);
            
            if (this.products.length < initialLength) {
                console.log('✅ Product deleted:', productId);
                
                // ตัวอย่าง: ลบจาก Firebase
                // await this.firebaseService.deleteProduct(productId);
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูลสินค้าทั้งหมด
     * @returns {Array} ข้อมูลสินค้า
     */
    getProducts() {
        return this.products;
    }

    /**
     * ดึงข้อมูลสินค้าตาม ID
     * @param {string} productId - ID สินค้า
     * @returns {Object|null} ข้อมูลสินค้า
     */
    getProductById(productId) {
        return this.products.find(p => p.id === productId) || null;
    }

    /**
     * ฟังการเปลี่ยนแปลงสินค้าแบบ real-time
     * @param {Function} callback - ฟังก์ชันเรียกกลับ
     * @param {string} shop - ชื่อร้าน
     * @returns {Function} ฟังก์ชันยกเลิกการฟัง
     */
    listenToProductChanges(callback, shop) {
        console.log(`👂 Listening to product changes for shop: ${shop}`);
        
        // ตัวอย่าง: ฟังการเปลี่ยนแปลงจาก Firebase
        // return this.firebaseService.listenToProductChanges(callback, shop);
        
        // คืนฟังก์ชันเปล่าเนื่องจากเป็นตัวอย่าง
        return () => {
            console.log('🔇 Stopped listening to product changes');
        };
    }

    /**
     * ข้อมูลสินค้าตัวอย่าง
     * @returns {Array} ข้อมูลสินค้าตัวอย่าง
     */
    getSampleProducts() {
        return [
            {
                id: 'prod_1',
                name: 'ผัดไทย',
                description: 'ผัดไทยสูตรดั้งเดิมใส่กุ้งสด',
                price: 60,
                category: 'food',
                available: true,
                shop: this.currentShop || 'ป้าสี',
                imageUrl: 'https://images.unsplash.com/photo-1559314809-2b99056a8c4a?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                createdAt: '2024-01-01T10:00:00Z'
            },
            {
                id: 'prod_2',
                name: 'ข้าวผัดกระเพราไก่',
                description: 'ข้าวผัดกระเพราไก่สับ',
                price: 50,
                category: 'food',
                available: true,
                shop: this.currentShop || 'ป้าสี',
                imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                createdAt: '2024-01-01T10:05:00Z'
            },
            {
                id: 'prod_3',
                name: 'ก๋วยเตี๋ยวเรือ',
                description: 'ก๋วยเตี๋ยวเรือน้ำตก',
                price: 55,
                category: 'food',
                available: true,
                shop: this.currentShop || 'ลุงสม',
                imageUrl: 'https://images.unsplash.com/photo-1552611052-33b04c8c17c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                createdAt: '2024-01-01T10:10:00Z'
            },
            {
                id: 'prod_4',
                name: 'บัวลอยไข่หวาน',
                description: 'บัวลอยไข่หวานน้ำกะทิ',
                price: 35,
                category: 'dessert',
                available: true,
                shop: this.currentShop || 'น้าตู่',
                imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
                createdAt: '2024-01-01T10:15:00Z'
            }
        ];
    }
}

export default ProductsModule;