/**
 * ไฟล์หลักแอปพลิเคชัน
 * รวมฟังก์ชันทั้งหมดเข้าด้วยกัน
 */

import firebaseService from './firebase-service.js';


// เก็บข้อมูลแอปพลิเคชัน
const app = {
    // ข้อมูลตะกร้า
    cart: [],
    
    // ข้อมูลเมนู
    menuItems: [],
    
    // ข้อมูลร้านค้า
    shops: [],
    
    // สถานะแอปพลิเคชัน
    currentFilter: 'all',
    currentShop: 'ป้าสี',
    currentPayment: null,
    isLoading: false,
    
    // ฟังก์ชันเริ่มต้น
    init: function() {
        console.log('🚀 กำลังเริ่มต้นแอปพลิเคชัน...');
        
        try {
            this.bindEvents();
            this.loadShops();
            this.updateCartCount();
            
            console.log('✅ เริ่มต้นแอปพลิเคชันสำเร็จ');
            
            // แสดงข้อความเริ่มต้น
            this.showNotification('ยินดีต้อนรับสู่ร้านอาหารออนไลน์', 'success');
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการเริ่มต้นแอปพลิเคชัน:', error);
            this.showNotification('เกิดข้อผิดพลาดในการโหลดแอปพลิเคชัน', 'error');
        }
    },
    
    // ผูกเหตุการณ์ต่างๆ
    bindEvents: function() {
        console.log('🔗 กำลังผูกเหตุการณ์...');
        
        // เปิด/ปิดตะกร้า
        this.addEvent('#cartIcon', 'click', () => this.openCartModal());
        this.addEvent('#closeCart', 'click', () => this.closeCartModal());
        this.addEvent('#continueShopping', 'click', () => this.closeCartModal());
        
        // ยืนยันคำสั่งซื้อ
        this.addEvent('#confirmOrder', 'click', () => this.confirmOrder());
        
        // เข้าสู่ระบบครัว
        this.addEvent('#accessKitchen', 'click', () => this.openPasswordModal());
        this.addEvent('#cancelPassword', 'click', () => this.closePasswordModal());
        this.addEvent('#submitPassword', 'click', () => this.submitPassword());
        
        // การชำระเงิน
        this.addEvent('#closePayment', 'click', () => this.closePaymentModal());
        this.addEvent('#backToMenuFromPayment', 'click', () => this.closePaymentModal());
        
        // ตัวกรองหมวดหมู่
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.category;
                this.loadMenuItems();
            });
        });
        
        // เปลี่ยนร้านค้า
        this.addEvent('#shopSelector', 'change', (e) => {
            this.changeShop(e.target.value);
        });
        
        // ปิด modal เมื่อคลิกนอกพื้นที่
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        console.log('✅ ผูกเหตุการณ์สำเร็จ');
    },
    
    // ฟังก์ชันช่วยเพิ่ม event listener
    addEvent: function(selector, event, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        } else {
            console.warn(`⚠️ ไม่พบ element: ${selector}`);
            return false;
        }
    },
    
    // โหลดร้านค้าทั้งหมด
    async loadShops() {
        try {
            console.log('📡 กำลังโหลดข้อมูลร้านค้า...');
            this.showLoading(true, 'กำลังโหลดร้านค้า...');
            
            this.shops = await firebaseService.getShops();
            this.renderShopSelector();
            
            // ตั้งค่าร้านเริ่มต้นจาก localStorage หรือร้านแรก
            const savedShop = localStorage.getItem('selectedShop');
            if (savedShop && this.shops.find(shop => shop.name === savedShop)) {
                this.currentShop = savedShop;
            } else if (this.shops.length > 0) {
                this.currentShop = this.shops[0].name;
            }
            
            firebaseService.setCurrentShop(this.currentShop);
            
            // อัพเดทข้อมูลร้านปัจจุบัน
            this.updateCurrentShopInfo();
            
            // โหลดเมนู
            await this.loadMenuItems();
            
            console.log(`✅ โหลดข้อมูลร้านค้าสำเร็จ: ${this.shops.length} ร้าน`);
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการโหลดร้านค้า:', error);
            this.showNotification('ไม่สามารถโหลดข้อมูลร้านค้าได้', 'error');
            
        } finally {
            this.showLoading(false);
        }
    },
    
    // แสดงตัวเลือกร้าน
    renderShopSelector: function() {
        const shopSelector = document.getElementById('shopSelector');
        if (!shopSelector) return;
        
        const activeShops = this.shops.filter(shop => shop.isActive);
        
        if (activeShops.length === 0) {
            shopSelector.innerHTML = '<option value="">ไม่มีร้านค้าที่ใช้งานได้</option>';
            return;
        }
        
        shopSelector.innerHTML = activeShops.map(shop => `
            <option value="${shop.name}" ${shop.name === this.currentShop ? 'selected' : ''}>
                ${shop.name} - ${shop.description}
            </option>
        `).join('');
    },
    
    // อัพเดทข้อมูลร้านปัจจุบัน
    updateCurrentShopInfo: function() {
        const currentShopInfo = document.getElementById('currentShopInfo');
        if (!currentShopInfo) return;
        
        const shop = this.shops.find(s => s.name === this.currentShop);
        if (shop) {
            currentShopInfo.innerHTML = `
                <div class="current-shop-content">
                    <i class="fas fa-store"></i>
                    <div class="shop-details">
                        <span class="shop-name">${shop.name}</span>
                        <span class="shop-description">${shop.description}</span>
                    </div>
                </div>
            `;
        }
    },
    
    // เปลี่ยนร้านค้า
    async changeShop(shopName) {
        if (!shopName) return;
        
        console.log(`🔄 กำลังเปลี่ยนร้านเป็น: ${shopName}`);
        this.showLoading(true, 'กำลังเปลี่ยนร้าน...');
        
        try {
            this.currentShop = shopName;
            firebaseService.setCurrentShop(shopName);
            
            // บันทึกร้านที่เลือก
            localStorage.setItem('selectedShop', shopName);
            
            // เคลียร์ตะกร้า
            this.cart = [];
            this.updateCartCount();
            
            // อัพเดทข้อมูลร้าน
            this.updateCurrentShopInfo();
            
            // โหลดเมนูใหม่
            await this.loadMenuItems();
            
            // แสดงการแจ้งเตือน
            this.showNotification(`เปลี่ยนเป็นร้าน: ${shopName}`, 'success');
            
            console.log(`✅ เปลี่ยนร้านเป็น ${shopName} สำเร็จ`);
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการเปลี่ยนร้าน:', error);
            this.showNotification('เกิดข้อผิดพลาดในการเปลี่ยนร้าน', 'error');
            
        } finally {
            this.showLoading(false);
        }
    },
    
    // โหลดเมนูอาหาร
    async loadMenuItems() {
        try {
            console.log(`📡 กำลังโหลดเมนูสำหรับร้าน: ${this.currentShop}, หมวดหมู่: ${this.currentFilter}`);
            this.showLoading(true, 'กำลังโหลดเมนู...');
            
            this.menuItems = await firebaseService.getMenuItemsByCategory(
                this.currentFilter, 
                this.currentShop
            );
            
            this.renderMenuItems();
            
            console.log(`✅ โหลดเมนูสำเร็จ: ${this.menuItems.length} รายการ`);
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการโหลดเมนู:', error);
            this.showNotification('ไม่สามารถโหลดเมนูได้', 'error');
            
        } finally {
            this.showLoading(false);
        }
    },
    
    // แสดงเมนูอาหาร
    renderMenuItems: function() {
        const menuGrid = document.getElementById('menuGrid');
        if (!menuGrid) return;
        
        let filteredItems = this.menuItems;
        if (this.currentFilter !== 'all') {
            filteredItems = this.menuItems.filter(item => item.category === this.currentFilter);
        }
        
        if (filteredItems.length === 0) {
            menuGrid.innerHTML = `
                <div class="no-items-message">
                    <i class="fas fa-utensils"></i>
                    <h3>ไม่มีเมนูในร้าน ${this.currentShop}</h3>
                    <p>กรุณาเลือกร้านอื่นหรือหมวดหมู่อื่น</p>
                </div>
            `;
            return;
        }
        
        menuGrid.innerHTML = filteredItems.map(item => {
            const cartItem = this.cart.find(ci => ci.id === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;
            
            return `
                <div class="product-card">
                    <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'}" 
                         alt="${item.name}" 
                         class="product-image"
                         onerror="this.src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'">
                    <div class="product-info">
                        <div class="product-header">
                            <div class="product-name">${item.name}</div>
                            <div class="product-price">${item.price.toFixed(2)} บาท</div>
                        </div>
                        <p class="product-description">${item.description || ''}</p>
                        <div class="product-category">${this.getCategoryName(item.category)}</div>
                        <div class="shop-badge">${item.shop || this.currentShop}</div>
                        <div class="product-controls">
                            <div class="quantity-controls">
                                <button class="quantity-btn minus" data-id="${item.id}">-</button>
                                <span class="quantity-display">${quantity}</span>
                                <button class="quantity-btn plus" data-id="${item.id}">+</button>
                            </div>
                            <button class="add-to-cart-btn" data-id="${item.id}">
                                ${quantity > 0 ? 'อัปเดต' : 'เพิ่ม'} ในตะกร้า
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // ผูกเหตุการณ์สำหรับปุ่มในแต่ละการ์ด
        this.bindProductEvents();
    },
    
    // ผูกเหตุการณ์สินค้า
    bindProductEvents: function() {
        // ปุ่มลบจำนวน
        document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.updateCartItem(id, -1);
            });
        });
        
        // ปุ่มเพิ่มจำนวน
        document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.updateCartItem(id, 1);
            });
        });
        
        // ปุ่มเพิ่มในตะกร้า
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const item = this.menuItems.find(item => item.id === id);
                if (item) {
                    const cartItem = this.cart.find(ci => ci.id === id);
                    const quantity = cartItem ? cartItem.quantity + 1 : 1;
                    this.addToCart(item, quantity);
                }
            });
        });
    },
    
    // ฟังก์ชันแปลงชื่อหมวดหมู่
    getCategoryName: function(category) {
        const categories = {
            'food': 'อาหารตามสั่ง',
            'noodle': 'ก๋วยเตี๋ยว',
           'dessert': 'ของหวาน', 
            'drink': 'เครื่องดื่ม',
            'isan': 'อาหารอีสาน',
            'all': 'ทั้งหมด'
        };
        return categories[category] || category;
    },
    
    // อัพเดทสินค้าในตะกร้า
    updateCartItem: function(id, change) {
        const item = this.menuItems.find(item => item.id === id);
        if (!item) return;
        
        const cartItemIndex = this.cart.findIndex(ci => ci.id === id);
        
        if (cartItemIndex >= 0) {
            const newQuantity = this.cart[cartItemIndex].quantity + change;
            
            if (newQuantity <= 0) {
                this.cart.splice(cartItemIndex, 1);
                this.showNotification(`ลบ ${item.name} ออกจากตะกร้า`, 'info');
            } else {
                this.cart[cartItemIndex].quantity = newQuantity;
                this.showNotification(`อัพเดท ${item.name} เป็น ${newQuantity} ชิ้น`, 'success');
            }
        } else if (change > 0) {
            this.cart.push({
                ...item,
                quantity: 1
            });
            this.showNotification(`เพิ่ม ${item.name} ลงตะกร้า`, 'success');
        }
        
        this.updateCartCount();
        this.renderMenuItems();
        
        // อัพเดทตะกร้าถ้าเปิดอยู่
        if (document.getElementById('cartModal').classList.contains('active')) {
            this.renderCartItems();
        }
    },
    
    // เพิ่มสินค้าในตะกร้า
    addToCart: function(item, quantity) {
        const cartItemIndex = this.cart.findIndex(ci => ci.id === item.id);
        
        if (cartItemIndex >= 0) {
            this.cart[cartItemIndex].quantity = quantity;
        } else {
            this.cart.push({
                ...item,
                quantity: quantity
            });
        }
        
        this.updateCartCount();
        this.renderMenuItems();
        this.showNotification(`เพิ่ม ${item.name} ลงตะกร้า`, 'success');
    },
    
    // อัพเดทจำนวนสินค้าในตะกร้า
    updateCartCount: function() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'block' : 'none';
        }
    },
    
    // เปิด modal ตะกร้า
    openCartModal: function() {
        console.log('🛒 กำลังเปิดตะกร้า...');
        this.renderCartItems();
        document.getElementById('cartModal').classList.add('active');
    },
    
    // ปิด modal ตะกร้า
    closeCartModal: function() {
        document.getElementById('cartModal').classList.remove('active');
    },
    
    // แสดงรายการในตะกร้า
    renderCartItems: function() {
        const cartItems = document.getElementById('cartItems');
        const totalItems = document.getElementById('totalItems');
        const totalPrice = document.getElementById('totalPrice');
        const shopInfo = document.getElementById('cartShopInfo');
        const emptyCartState = document.getElementById('emptyCartState');
        const cartItemsContainer = document.getElementById('cartItemsContainer');
        
        if (!cartItems || !totalItems || !totalPrice) return;
        
        if (this.cart.length === 0) {
            if (emptyCartState) emptyCartState.style.display = 'block';
            if (cartItemsContainer) cartItemsContainer.style.display = 'none';
            totalItems.textContent = '0';
            totalPrice.textContent = '0.00';
            if (shopInfo) shopInfo.textContent = `ร้าน: ${this.currentShop}`;
            return;
        }
        
        if (emptyCartState) emptyCartState.style.display = 'none';
        if (cartItemsContainer) cartItemsContainer.style.display = 'block';
        
        cartItems.innerHTML = this.cart.map(item => {
            const itemTotal = item.price * item.quantity;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-shop">ร้าน: ${item.shop || this.currentShop}</div>
                        <div class="cart-item-price">${item.price.toFixed(2)} บาท</div>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" data-id="${item.id}">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.id}">+</button>
                    </div>
                    <div class="cart-item-total">${itemTotal.toFixed(2)} บาท</div>
                </div>
            `;
        }).join('');
        
        // ผูกเหตุการณ์ปุ่มในตะกร้า
        cartItems.querySelectorAll('.quantity-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.updateCartItem(id, -1);
                this.renderCartItems();
            });
        });
        
        cartItems.querySelectorAll('.quantity-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.updateCartItem(id, 1);
                this.renderCartItems();
            });
        });
        
        // คำนวณรวม
        const totalItemsCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPriceValue = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        totalItems.textContent = totalItemsCount;
        totalPrice.textContent = totalPriceValue.toFixed(2);
        
        if (shopInfo) {
            shopInfo.textContent = `ร้าน: ${this.currentShop}`;
        }
    },
    
    // ยืนยันคำสั่งซื้อ
    async confirmOrder() {
        if (this.cart.length === 0) {
            this.showNotification('กรุณาเลือกสินค้าก่อนยืนยันคำสั่งซื้อ', 'warning');
            return;
        }
        
        try {
            console.log('🛒 กำลังยืนยันคำสั่งซื้อ...');
            this.showLoading(true, 'กำลังสร้างคำสั่งซื้อ...');
            
            const orderData = {
                items: this.cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    shop: item.shop || this.currentShop
                })),
                total: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                shop: this.currentShop,
                customerName: 'ลูกค้าทั่วไป',
                tableNumber: '1',
                status: 'pending_payment'
            };
            
            const result = await firebaseService.createOrder(orderData, this.currentShop);
            
            if (result.success) {
                // บันทึก paymentId สำหรับติดตามสถานะ
                this.currentPayment = {
                    paymentId: result.paymentId,
                    orderNumber: result.orderNumber,
                    total: orderData.total
                };
                
                // แสดงหน้า QR Code สำหรับชำระเงิน
                await this.showPaymentQRCode(result.paymentId, orderData.total);
                
                // เคลียร์ตะกร้า
                this.cart = [];
                this.updateCartCount();
                this.renderMenuItems();
                this.closeCartModal();
                
                console.log('✅ สร้างคำสั่งซื้อสำเร็จ:', result);
                this.showNotification('สร้างคำสั่งซื้อสำเร็จ!', 'success');
            }
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการสั่งอาหาร:', error);
            this.showNotification('เกิดข้อผิดพลาดในการสั่งอาหาร', 'error');
            
        } finally {
            this.showLoading(false);
        }
    },
    
    // แสดง QR Code สำหรับชำระเงิน
    async showPaymentQRCode(paymentId, amount) {
        try {
            console.log('📱 กำลังสร้าง QR Code...');
            this.showLoading(true, 'กำลังสร้าง QR Code...');
            
            // ดึงข้อมูลการชำระเงิน
            const payment = await firebaseService.getPayment(paymentId);
            
            if (!payment) {
                throw new Error('ไม่พบข้อมูลการชำระเงิน');
            }
            
            // อัพเดทข้อมูลใน modal
            document.getElementById('paymentId').textContent = paymentId;
            document.getElementById('paymentAmount').textContent = amount.toFixed(2);
            document.getElementById('paymentShop').textContent = this.currentShop;
            document.getElementById('paymentTime').textContent = new Date().toLocaleTimeString('th-TH');
            
            // สร้าง QR Code
            const qrCodeUrl = firebaseService.generateQRCodeUrl(paymentId, amount);
            const qrCodeImage = document.getElementById('qrCodeImage');
            const qrCodeOverlay = document.getElementById('qrCodeOverlay');
            
            if (qrCodeImage) {
                qrCodeImage.src = qrCodeUrl;
                qrCodeImage.onload = () => {
                    if (qrCodeOverlay) {
                        qrCodeOverlay.style.display = 'none';
                    }
                    this.showLoading(false);
                };
                
                qrCodeImage.onerror = () => {
                    console.error('❌ เกิดข้อผิดพลาดในการโหลด QR Code');
                    if (qrCodeOverlay) {
                        qrCodeOverlay.innerHTML = '<p>❌ ไม่สามารถสร้าง QR Code ได้</p>';
                    }
                    this.showLoading(false);
                };
            }
            
            // แสดง modal ชำระเงิน
            document.getElementById('paymentModal').classList.add('active');
            
            // เริ่มต้นติดตามสถานะการชำระเงิน
            this.startPaymentTracking(paymentId);
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการแสดง QR Code:', error);
            this.showNotification('เกิดข้อผิดพลาดในการสร้าง QR Code', 'error');
            this.showLoading(false);
        }
    },
    
    // ติดตามสถานะการชำระเงิน
    startPaymentTracking(paymentId) {
        console.log(`🔍 กำลังติดตามสถานะการชำระเงิน: ${paymentId}`);
        
        // ฟังการเปลี่ยนแปลงสถานะการชำระเงิน
        const unsubscribe = firebaseService.listenToPaymentStatus(paymentId, (payment) => {
            if (!payment) return;
            
            console.log(`📊 สถานะการชำระเงินอัพเดท: ${payment.status}`);
            
            if (payment.status === 'paid') {
                // ปิดการติดตาม
                if (unsubscribe) unsubscribe();
                
                // แสดงข้อความสำเร็จ
                this.showPaymentSuccess(paymentId);
                
                // แจ้งเตือน
                this.showNotification('ชำระเงินสำเร็จ! ระบบกำลังเตรียมอาหาร', 'success');
                
            } else if (payment.status === 'failed') {
                // แสดงข้อความล้มเหลว
                this.showPaymentFailed(paymentId);
                
                // แจ้งเตือน
                this.showNotification('ชำระเงินไม่สำเร็จ', 'error');
            }
        });
        
        // ตั้งเวลาให้ปิดการติดตามหลังจาก 30 นาที
        setTimeout(() => {
            if (unsubscribe) unsubscribe();
            
            // ตรวจสอบสถานะปัจจุบัน
            firebaseService.getPayment(paymentId).then(payment => {
                if (payment && payment.status === 'pending') {
                    this.showPaymentTimeout();
                    this.showNotification('QR Code หมดอายุแล้ว', 'warning');
                }
            });
        }, 30 * 60 * 1000); // 30 นาที
    },
    
    // แสดงผลสำเร็จการชำระเงิน
    showPaymentSuccess(paymentId) {
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            paymentStatus.innerHTML = `
                <div class="payment-success">
                    <div class="status-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>ชำระเงินสำเร็จ</h3>
                    <p>หมายเลขการชำระเงิน: ${paymentId}</p>
                    <p>ระบบกำลังเตรียมอาหารของคุณ</p>
                    <p>ขอบคุณที่ใช้บริการ</p>
                </div>
            `;
        }
    },
    
    // แสดงผลล้มเหลวการชำระเงิน
    showPaymentFailed(paymentId) {
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            paymentStatus.innerHTML = `
                <div class="payment-failed">
                    <div class="status-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <h3>ชำระเงินไม่สำเร็จ</h3>
                    <p>หมายเลขการชำระเงิน: ${paymentId}</p>
                    <p>กรุณาลองใหม่อีกครั้ง</p>
                    <button class="btn btn-primary" onclick="app.retryPayment('${paymentId}')">
                        ลองชำระเงินใหม่
                    </button>
                </div>
            `;
        }
    },
    
    // แสดงหมดเวลาชำระเงิน
    showPaymentTimeout() {
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            paymentStatus.innerHTML = `
                <div class="payment-timeout">
                    <div class="status-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <h3>หมดเวลาชำระเงิน</h3>
                    <p>QR Code นี้หมดอายุแล้ว</p>
                    <p>กรุณาสั่งอาหารใหม่</p>
                    <button class="btn btn-primary" onclick="app.closePaymentModal()">
                        ปิด
                    </button>
                </div>
            `;
        }
    },
    
    // ปิด modal ชำระเงิน
    closePaymentModal: function() {
        document.getElementById('paymentModal').classList.remove('active');
        
        // รีเซ็ตสถานะการชำระเงิน
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            paymentStatus.innerHTML = `
                <div class="payment-pending">
                    <div class="status-icon">
                        <i class="fas fa-qrcode"></i>
                    </div>
                    <h3>รอการชำระเงิน</h3>
                    <p>กรุณาสแกน QR Code ด้านล่างเพื่อชำระเงิน</p>
                </div>
            `;
        }
        
        // รีเซ็ต QR Code
        const qrCodeImage = document.getElementById('qrCodeImage');
        const qrCodeOverlay = document.getElementById('qrCodeOverlay');
        if (qrCodeImage) qrCodeImage.src = '';
        if (qrCodeOverlay) qrCodeOverlay.style.display = 'flex';
    },
    
    // ลองชำระเงินใหม่
    async retryPayment(paymentId) {
        try {
            console.log(`🔄 กำลังลองชำระเงินใหม่: ${paymentId}`);
            this.showLoading(true, 'กำลังเตรียมการชำระเงินใหม่...');
            
            const success = await firebaseService.updatePaymentStatus(paymentId, 'pending');
            
            if (success) {
                // ดึงข้อมูลใหม่
                const payment = await firebaseService.getPayment(paymentId);
                if (payment) {
                    // อัพเดท QR Code
                    const qrCodeUrl = firebaseService.generateQRCodeUrl(paymentId, payment.amount);
                    document.getElementById('qrCodeImage').src = qrCodeUrl;
                    
                    // รีเซ็ตสถานะ
                    const paymentStatus = document.getElementById('paymentStatus');
                    if (paymentStatus) {
                        paymentStatus.innerHTML = `
                            <div class="payment-pending">
                                <div class="status-icon">
                                    <i class="fas fa-qrcode"></i>
                                </div>
                                <h3>รอการชำระเงิน</h3>
                                <p>กรุณาสแกน QR Code ด้านล่างเพื่อชำระเงิน</p>
                            </div>
                        `;
                    }
                    
                    this.showNotification('เริ่มต้นการชำระเงินใหม่', 'success');
                }
            }
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการลองชำระเงินใหม่:', error);
            this.showNotification('เกิดข้อผิดพลาดในการเริ่มต้นใหม่', 'error');
            
        } finally {
            this.showLoading(false);
        }
    },
    
    // ตรวจสอบสถานะการชำระเงิน
    async checkPaymentStatus() {
        if (!this.currentPayment) {
            this.showNotification('ไม่มีการชำระเงินที่กำลังดำเนินการ', 'warning');
            return;
        }
        
        try {
            console.log(`🔍 กำลังตรวจสอบสถานะการชำระเงิน: ${this.currentPayment.paymentId}`);
            this.showLoading(true, 'กำลังตรวจสอบสถานะ...');
            
            const payment = await firebaseService.getPayment(this.currentPayment.paymentId);
            
            if (payment) {
                let message = '';
                let type = 'info';
                
                switch (payment.status) {
                    case 'paid':
                        message = 'ชำระเงินสำเร็จแล้ว';
                        type = 'success';
                        break;
                    case 'failed':
                        message = 'ชำระเงินไม่สำเร็จ';
                        type = 'error';
                        break;
                    case 'pending':
                        message = 'กำลังรอการชำระเงิน';
                        type = 'info';
                        break;
                    default:
                        message = `สถานะ: ${payment.status}`;
                }
                
                this.showNotification(message, type);
                
            } else {
                this.showNotification('ไม่พบข้อมูลการชำระเงิน', 'warning');
            }
            
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบสถานะ:', error);
            this.showNotification('เกิดข้อผิดพลาดในการตรวจสอบสถานะ', 'error');
            
        } finally {
            this.showLoading(false);
        }
    },
    
    // แสดง loading
    showLoading: function(show, message = 'กำลังโหลด...') {
        const loadingElement = document.getElementById('global-loading');
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingElement && loadingText) {
            if (show) {
                loadingText.textContent = message;
                loadingElement.style.display = 'flex';
                this.isLoading = true;
            } else {
                loadingElement.style.display = 'none';
                this.isLoading = false;
            }
        }
    },
    
    // แสดง notification
    showNotification: function(message, type = 'info') {
        console.log(`📢 Notification [${type}]: ${message}`);
        
        // สร้าง element notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // กำหนดไอคอนตามประเภท
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icons[type] || 'info-circle'}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // สไตล์ notification
        const colors = {
            'success': { bg: '#2ecc71', border: '#27ae60' },
            'error': { bg: '#e74c3c', border: '#c0392b' },
            'warning': { bg: '#f39c12', border: '#d68910' },
            'info': { bg: '#3498db', border: '#2980b9' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            border-left: 4px solid ${color.border};
            color: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // ปิด notification เมื่อคลิกปุ่มปิด
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            });
        }
        
        // ปิด notification อัตโนมัติหลังจาก 5 วินาที
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    },
    
    // เปิด modal รหัสผ่าน
    openPasswordModal: function() {
        console.log('🔐 กำลังเปิดหน้าต่างรหัสผ่านครัว');
        document.getElementById('passwordModal').classList.add('active');
        
        const passwordInput = document.getElementById('kitchenPassword');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    },
    
    // ปิด modal รหัสผ่าน
    closePasswordModal: function() {
        document.getElementById('passwordModal').classList.remove('active');
        
        const passwordInput = document.getElementById('kitchenPassword');
        const errorElement = document.getElementById('passwordError');
        
        if (passwordInput) passwordInput.value = '';
        if (errorElement) errorElement.textContent = '';
    },
    
    // ตรวจสอบรหัสผ่าน
    submitPassword: function() {
        const passwordInput = document.getElementById('kitchenPassword');
        const errorElement = document.getElementById('passwordError');
        
        if (!passwordInput || !errorElement) {
            console.error('❌ ไม่พบ input รหัสผ่านหรือ error element');
            return;
        }
        
        const password = passwordInput.value;
        
        // รหัสผ่านสำหรับเข้าสู่ระบบครัว
        const correctPassword = '123';
        
        if (password === correctPassword) {
            // บันทึกรหัสผ่านใน sessionStorage
            sessionStorage.setItem('kitchenAccess', 'granted');
            sessionStorage.setItem('accessTime', new Date().toISOString());
            
            console.log('✅ รหัสผ่านถูกต้อง กำลังเปลี่ยนไปหน้าระบบครัว...');
            
            // เปลี่ยนไปหน้าระบบครัว
            window.location.href = 'kitchen.html';
            
        } else {
            errorElement.textContent = 'รหัสผ่านไม่ถูกต้อง';
            passwordInput.value = '';
            passwordInput.focus();
            
            console.warn('❌ รหัสผ่านไม่ถูกต้อง');
        }
    }
};

// ทำให้ app ถูกเรียกจาก HTML ได้
window.app = app;

// เริ่มต้นแอพพลิเคชันเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM โหลดเสร็จแล้ว กำลังเริ่มต้นแอปพลิเคชัน...');
    app.init();
});

// สำหรับ debug: ตรวจสอบว่ามีข้อผิดพลาดใน console หรือไม่
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('❌ เกิดข้อผิดพลาด:', {
        message: msg,
        url: url,
        line: lineNo,
        column: columnNo,
        error: error
    });
    return false;
};

// ฟังก์ชันสำหรับเปิดใช้งานการแสดง/ซ่อนรหัสผ่าน
document.addEventListener('DOMContentLoaded', function() {
    const passwordToggle = document.getElementById('passwordToggle');
    const kitchenPassword = document.getElementById('kitchenPassword');
    
    if (passwordToggle && kitchenPassword) {
        passwordToggle.addEventListener('click', function() {
            const type = kitchenPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            kitchenPassword.setAttribute('type', type);
            
            // เปลี่ยนไอคอน
            const icon = this.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }
});