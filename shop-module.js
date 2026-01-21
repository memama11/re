
/**
 * โมดูลจัดการร้านค้า
 * ดึงข้อมูลและจัดการร้านค้าจาก Firebase
 */

class ShopModule {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.shops = [];
        this.currentShop = '';
        this.shopTabsActive = false; // ใช้แท็บร้านหรือไม่
    }

    /**
     * โหลดข้อมูลร้านค้าทั้งหมด
     * @returns {Promise<Array>} ข้อมูลร้านค้า
     */
    async loadShops() {
        try {
            this.shops = await this.firebaseService.getShops();
            
            // ตั้งค่าร้านเริ่มต้นจาก localStorage หรือร้านแรก
            const savedShop = localStorage.getItem('selectedShop');
            if (savedShop && this.shops.find(shop => shop.name === savedShop)) {
                this.currentShop = savedShop;
            } else if (this.shops.length > 0) {
                this.currentShop = this.shops[0].name;
            }
            
            // ตั้งค่าร้านใน Firebase Service
            this.firebaseService.setCurrentShop(this.currentShop);
            
            return this.shops;
        } catch (error) {
            console.error('❌ Error loading shops:', error);
            return [];
        }
    }

    /**
     * เปลี่ยนร้านค้าปัจจุบัน
     * @param {string} shopName - ชื่อร้าน
     */
    changeShop(shopName) {
        if (this.shops.find(shop => shop.name === shopName)) {
            this.currentShop = shopName;
            this.firebaseService.setCurrentShop(shopName);
            
            // บันทึกร้านที่เลือกใน localStorage
            localStorage.setItem('selectedShop', shopName);
            
            console.log(`🛍️ Changed shop to: ${shopName}`);
            return true;
        }
        return false;
    }

    /**
     * ดึงข้อมูลร้านค้าปัจจุบัน
     * @returns {Object|null} ข้อมูลร้านค้า
     */
    getCurrentShop() {
        return this.shops.find(shop => shop.name === this.currentShop) || null;
    }

    /**
     * ดึงร้านค้าที่ใช้งานได้ทั้งหมด
     * @returns {Array} ร้านค้าที่ใช้งานได้
     */
    getActiveShops() {
        return this.shops.filter(shop => shop.isActive !== false);
    }

    /**
     * สร้างตัวเลือกร้านค้าในรูปแบบ dropdown
     * @returns {string} HTML สำหรับ dropdown
     */
    renderShopSelector() {
        const activeShops = this.getActiveShops();
        
        if (activeShops.length === 0) {
            return '<option value="">ไม่มีร้านค้าที่ใช้งานได้</option>';
        }

        return activeShops.map(shop => `
            <option value="${shop.name}" ${shop.name === this.currentShop ? 'selected' : ''}>
                ${shop.name} - ${shop.description}
            </option>
        `).join('');
    }

    /**
     * สร้างแท็บร้านค้า
     * @returns {string} HTML สำหรับแท็บร้านค้า
     */
    renderShopTabs() {
        const activeShops = this.getActiveShops();
        
        if (activeShops.length === 0) {
            return '<div class="no-shops">ไม่มีร้านค้าที่ใช้งานได้</div>';
        }

        return activeShops.map(shop => `
            <button class="shop-tab ${shop.name === this.currentShop ? 'active' : ''}" 
                    data-shop="${shop.name}">
                <i class="fas fa-store"></i>
                <span class="shop-name">${shop.name}</span>
                <span class="shop-desc">${shop.description}</span>
            </button>
        `).join('');
    }

    /**
     * แสดงข้อมูลร้านค้าปัจจุบัน
     * @returns {string} HTML สำหรับแสดงข้อมูลร้าน
     */
    renderCurrentShopInfo() {
        const shop = this.getCurrentShop();
        if (!shop) return '';
        
        return `
            <div class="current-shop-info">
                <i class="fas fa-store"></i>
                <div class="shop-details">
                    <h3>${shop.name}</h3>
                    <p>${shop.description}</p>
                </div>
            </div>
        `;
    }

    /**
     * ตั้งค่าให้ใช้แท็บร้านค้าหรือ dropdown
     * @param {boolean} useTabs - ใช้แท็บหรือไม่
     */
    setUseTabs(useTabs) {
        this.shopTabsActive = useTabs;
    }

    /**
     * ฟังการเปลี่ยนแปลงร้านค้าแบบ real-time
     * @param {Function} callback - ฟังก์ชันเรียกกลับ
     * @returns {Function} ฟังก์ชันยกเลิกการฟัง
     */
    listenToShopChanges(callback) {
        // หมายเหตุ: ฟังก์ชันนี้ต้องการการ implement ใน Firebase Service
        console.log('⚠️ Shop changes listener not implemented');
        return () => {}; // คืนฟังก์ชันเปล่า
    }
}

export default ShopModule;