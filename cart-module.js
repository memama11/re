
/**
 * โมดูลจัดการตะกร้าสินค้า
 * ดูแลการเพิ่ม ลบ แก้ไข สินค้าในตะกร้า
 */

class CartModule {
    constructor() {
        this.cart = [];
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
     * อัพเดตสินค้าในตะกร้า
     * @param {string} itemId - ID สินค้า
     * @param {number} change - การเปลี่ยนแปลงจำนวน (+1 หรือ -1)
     */
    updateCartItem(itemId, change) {
        const itemIndex = this.cart.findIndex(item => item.id === itemId);
        
        if (itemIndex >= 0) {
            const newQuantity = this.cart[itemIndex].quantity + change;
            
            if (newQuantity <= 0) {
                // ลบสินค้าออกจากตะกร้า
                this.cart.splice(itemIndex, 1);
            } else {
                // อัพเดตจำนวน
                this.cart[itemIndex].quantity = newQuantity;
            }
        } else if (change > 0) {
            // ถ้าสินค้ายังไม่มีในตะกร้า ต้องเพิ่มจากภายนอกโมดูลนี้
            console.warn('สินค้ายังไม่มีในตะกร้า ต้องเพิ่มผ่าน addToCart');
        }
    }

    /**
     * เพิ่มสินค้าในตะกร้า
     * @param {Object} item - ข้อมูลสินค้า
     * @param {number} quantity - จำนวน
     */
    addToCart(item, quantity) {
        const itemIndex = this.cart.findIndex(cartItem => cartItem.id === item.id);
        
        if (itemIndex >= 0) {
            this.cart[itemIndex].quantity = quantity;
        } else {
            this.cart.push({
                ...item,
                quantity: quantity,
                shop: item.shop || this.currentShop
            });
        }
    }

    /**
     * ลบสินค้าออกจากตะกร้า
     * @param {string} itemId - ID สินค้า
     */
    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
    }

    /**
     * เคลียร์ตะกร้าทั้งหมด
     */
    clearCart() {
        this.cart = [];
    }

    /**
     * นับจำนวนสินค้าทั้งหมดในตะกร้า
     * @returns {number} จำนวนสินค้าทั้งหมด
     */
    getTotalItems() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    /**
     * คำนวณราคารวมทั้งหมด
     * @returns {number} ราคารวม
     */
    getTotalPrice() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    /**
     * ตรวจสอบว่าตะกร้าว่างหรือไม่
     * @returns {boolean} ว่างหรือไม่
     */
    isEmpty() {
        return this.cart.length === 0;
    }

    /**
     * ดึงข้อมูลตะกร้า
     * @returns {Array} ข้อมูลตะกร้า
     */
    getCart() {
        return this.cart;
    }

    /**
     * ดึงข้อมูลสินค้าจากตะกร้าตาม ID
     * @param {string} itemId - ID สินค้า
     * @returns {Object|null} ข้อมูลสินค้า
     */
    getCartItem(itemId) {
        return this.cart.find(item => item.id === itemId) || null;
    }

    /**
     * จัดกลุ่มสินค้าในตะกร้าตามร้าน
     * @returns {Object} สินค้าจัดกลุ่มตามร้าน
     */
    getCartGroupedByShop() {
        const grouped = {};
        
        this.cart.forEach(item => {
            const shop = item.shop || this.currentShop;
            if (!grouped[shop]) {
                grouped[shop] = [];
            }
            grouped[shop].push(item);
        });
        
        return grouped;
    }
}

export default CartModule;