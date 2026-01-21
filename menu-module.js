
/**
 * โมดูลจัดการเมนูอาหาร
 * ดึงข้อมูลและจัดการแสดงผลเมนูจาก Firebase
 */

class MenuModule {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.menuItems = [];
        this.currentFilter = 'all';
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
     * ตั้งค่าตัวกรองหมวดหมู่
     * @param {string} category - หมวดหมู่
     */
    setFilter(category) {
        this.currentFilter = category;
    }

    /**
     * โหลดเมนูจาก Firebase
     * @returns {Promise<Array>} ข้อมูลเมนู
     */
    async loadMenuItems() {
        try {
            this.menuItems = await this.firebaseService.getMenuItemsByCategory(
                this.currentFilter, 
                this.currentShop
            );
            return this.menuItems;
        } catch (error) {
            console.error('❌ Error loading menu items:', error);
            return [];
        }
    }

    /**
     * ดึงเมนูที่ถูกกรองแล้ว
     * @returns {Array} เมนูที่ถูกกรอง
     */
    getFilteredMenu() {
        if (this.currentFilter === 'all') {
            return this.menuItems;
        }
        return this.menuItems.filter(item => item.category === this.currentFilter);
    }

    /**
     * ค้นหาเมนูด้วยคำค้นหา
     * @param {string} searchTerm - คำค้นหา
     * @returns {Array} ผลลัพธ์การค้นหา
     */
    searchMenu(searchTerm) {
        if (!searchTerm.trim()) {
            return this.getFilteredMenu();
        }
        
        const term = searchTerm.toLowerCase();
        return this.menuItems.filter(item => 
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.description && item.description.toLowerCase().includes(term))
        );
    }

    /**
     * ดึงหมวดหมู่ทั้งหมดที่มีในเมนู
     * @returns {Array} หมวดหมู่ทั้งหมด
     */
    getAllCategories() {
        const categories = new Set();
        this.menuItems.forEach(item => {
            if (item.category) {
                categories.add(item.category);
            }
        });
        return Array.from(categories);
    }

    /**
     * แปลงชื่อหมวดหมู่จากภาษาอังกฤษเป็นไทย
     * @param {string} category - หมวดหมู่ภาษาอังกฤษ
     * @returns {string} หมวดหมู่ภาษาไทย
     */
    getCategoryName(category) {
        const categories = {
            'food': 'อาหารตามสั่ง',
            'noodle': 'ก๋วยเตี๋ยว',
            'dessert': 'ของหวาน',
            'drink': 'เครื่องดื่ม',
            'isan': 'อาหารอีสาน',
            'all': 'ทั้งหมด'
        };
        return categories[category] || category;
    }

    /**
     * ดึงข้อมูลเมนูตาม ID
     * @param {string} itemId - ID สินค้า
     * @returns {Object|null} ข้อมูลสินค้า
     */
    getMenuItemById(itemId) {
        return this.menuItems.find(item => item.id === itemId) || null;
    }

    /**
     * ฟังการเปลี่ยนแปลงเมนูแบบ real-time
     * @param {Function} callback - ฟังก์ชันเรียกกลับ
     * @returns {Function} ฟังก์ชันยกเลิกการฟัง
     */
    listenToMenuChanges(callback) {
        return this.firebaseService.listenToMenuChanges((items) => {
            this.menuItems = items;
            callback(this.menuItems);
        }, this.currentShop);
    }
}

export default MenuModule;