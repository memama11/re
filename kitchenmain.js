
/**
 * ไฟล์หลักระบบครัว
 * รวมโมดูลทั้งหมดเข้าด้วยกันและจัดการการทำงานหลักของระบบครัว
 */

import firebaseService from './firebase-service-v2.js';


class KitchenApp {
    constructor() {
        // Initialize modules
        this.firebaseService = firebaseService;
        this.products = new ProductsModule(firebaseService);
        this.orders = new OrdersModule(firebaseService);
        this.ui = new UIModuleKitchen();
        this.auth = new AuthModuleKitchen();
        
        // App state
        this.isInitialized = false;
        this.currentSection = 'products';
        this.currentShop = '';
        this.realtimeListeners = [];
    }

    /**
     * เริ่มต้นแอปพลิเคชันครัว
     */
    async init() {
        if (this.isInitialized) {
            console.warn('⚠️ Kitchen app is already initialized');
            return;
        }

        console.log('👨‍🍳 Kitchen App Initializing...');
        
        try {
            // ตรวจสอบสิทธิ์การเข้าถึงครัว
            if (!this.auth.hasKitchenAccess()) {
                // ถ้าไม่มีสิทธิ์ ให้กลับไปหน้าลูกค้า
                this.ui.showNotification('กรุณาเข้าสู่ระบบครัวก่อน', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }
            
            // โหลดร้านปัจจุบัน
            const savedShop = localStorage.getItem('selectedShop');
            if (savedShop) {
                this.currentShop = savedShop;
                this.firebaseService.setCurrentShop(savedShop);
                this.products.setCurrentShop(savedShop);
                this.orders.setCurrentShop(savedShop);
            }
            
            // ผูกเหตุการณ์ต่างๆ
            this.bindEvents();
            
            // โหลดข้อมูลเริ่มต้น
            await this.loadInitialData();
            
            // ตั้งค่า real-time listeners
            this.setupRealtimeListeners();
            
            this.isInitialized = true;
            console.log('✅ Kitchen app initialized successfully');
            
            // แจ้งเตือนการเริ่มต้น
            this.ui.showNotification('ระบบครัวพร้อมใช้งานแล้ว', 'success');
            
        } catch (error) {
            console.error('❌ Error initializing kitchen app:', error);
            this.ui.showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลครัว', 'error');
        }
    }

    /**
     * โหลดข้อมูลเริ่มต้น
     */
    async loadInitialData() {
        try {
            this.ui.showLoading(true, 'กำลังโหลดข้อมูลครัว...');
            
            // โหลดสินค้า
            await this.products.loadProducts();
            this.renderProducts();
            
            // โหลดบิล
            await this.orders.loadOrders();
            this.renderOrders();
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            throw error;
        } finally {
            this.ui.showLoading(false);
        }
    }

    /**
     * ผูกเหตุการณ์ต่างๆ
     */
    bindEvents() {
        // ปุ่มเปลี่ยนส่วน
        this.ui.addEvent('#productsBtn', 'click', () => this.switchSection('products'));
        this.ui.addEvent('#billsBtn', 'click', () => this.switchSection('bills'));
        
        // ปุ่มออกจากระบบ
        this.ui.addEvent('#logoutBtn', 'click', () => this.logout());
        
        // ปุ่มเพิ่มสินค้า
        this.ui.addEvent('#addProductBtn', 'click', () => this.openProductModal());
        
        // ปุ่มในฟอร์มสินค้า
        this.ui.addEvent('#closeProductModal', 'click', () => this.closeProductModal());
        this.ui.addEvent('#cancelProduct', 'click', () => this.closeProductModal());
        this.ui.addEvent('#saveProduct', 'click', (e) => this.saveProduct(e));
        
        // ปุ่มกรองบิล
        document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.target.dataset.status;
                this.filterOrders(status, e.target);
            });
        });
        
        // ปุ่มยืนยันเสร็จสิ้น
        this.ui.addEvent('#cancelCompletion', 'click', () => this.closeCompletionModal());
        this.ui.addEvent('#confirmCompletion', 'click', () => this.confirmOrderCompletion());
        this.ui.addEvent('#closeCompletionModal', 'click', () => this.closeCompletionModal());
        
        // ปุ่มกลับไปหน้าลูกค้า
        this.ui.addEvent('#backToCustomer', 'click', () => this.backToCustomer());
        
        // การจัดการรูปภาพสินค้า
        this.ui.addEvent('#productImage', 'change', (e) => this.handleImageUpload(e));
        
        // ปิด modal เมื่อคลิกนอกพื้นที่
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.ui.closeAllModals();
            }
        });
        
        // ปิด modal ด้วยปุ่ม ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.ui.closeAllModals();
            }
        });
    }

    /**
     * เปลี่ยนส่วนแสดงผล
     * @param {string} section - ชื่อส่วน (products, bills)
     */
    switchSection(section) {
        this.currentSection = section;
        
        // อัพเดตปุ่มนำทาง
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (section === 'products') {
            document.getElementById('productsBtn').classList.add('active');
            document.getElementById('productsSection').classList.add('active');
            document.getElementById('billsSection').classList.remove('active');
        } else if (section === 'bills') {
            document.getElementById('billsBtn').classList.add('active');
            document.getElementById('billsSection').classList.add('active');
            document.getElementById('productsSection').classList.remove('active');
        }
    }

    /**
     * เปิด modal เพิ่ม/แก้ไขสินค้า
     * @param {string} productId - ID สินค้า (ถ้าเป็นการแก้ไข)
     */
    openProductModal(productId = null) {
        if (productId) {
            // แก้ไขสินค้า
            const product = this.products.getProductById(productId);
            if (product) {
                document.getElementById('modalTitle').textContent = 'แก้ไขสินค้า';
                document.getElementById('productId').value = productId;
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price || 0;
                document.getElementById('productCategory').value = product.category || 'food';
                document.getElementById('productAvailable').checked = product.available !== false;
                
                // แสดงรูปภาพถ้ามี
                const preview = document.getElementById('imagePreview');
                if (product.imageUrl) {
                    preview.innerHTML = `<img src="${product.imageUrl}" alt="${product.name}" class="preview-image">`;
                } else {
                    preview.innerHTML = '<p>ยังไม่มีรูปภาพ</p>';
                }
            }
        } else {
            // เพิ่มสินค้าใหม่
            document.getElementById('modalTitle').textContent = 'เพิ่มสินค้าใหม่';
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            document.getElementById('imagePreview').innerHTML = '';
        }
        
        this.ui.openModal('productModal');
    }

    /**
     * ปิด modal สินค้า
     */
    closeProductModal() {
        this.ui.closeModal('productModal');
        document.getElementById('productForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
    }

    /**
     * บันทึกสินค้า
     * @param {Event} e - Event object
     */
    async saveProduct(e) {
        e.preventDefault();
        
        try {
            this.ui.showLoading(true, 'กำลังบันทึกสินค้า...');
            
            const productId = document.getElementById('productId').value;
            const productData = {
                name: document.getElementById('productName').value,
                description: document.getElementById('productDescription').value,
                price: parseFloat(document.getElementById('productPrice').value),
                category: document.getElementById('productCategory').value,
                available: document.getElementById('productAvailable').checked,
                shop: this.currentShop,
                updatedAt: new Date().toISOString()
            };
            
            // ตรวจสอบรูปภาพ
            const imageInput = document.getElementById('productImage');
            let imageUrl = '';
            
            if (imageInput.files && imageInput.files[0]) {
                // อัปโหลดรูปภาพ
                imageUrl = await this.uploadProductImage(imageInput.files[0], productId || 'new');
                productData.imageUrl = imageUrl;
            }
            
            if (productId) {
                // แก้ไขสินค้าที่มีอยู่
                await this.products.updateProduct(productId, productData);
                this.ui.showNotification('แก้ไขสินค้าสำเร็จ!', 'success');
            } else {
                // เพิ่มสินค้าใหม่
                await this.products.addProduct(productData);
                this.ui.showNotification('เพิ่มสินค้าสำเร็จ!', 'success');
            }
            
            this.closeProductModal();
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Error saving product:', error);
            this.ui.showNotification('เกิดข้อผิดพลาดในการบันทึกสินค้า', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }

    /**
     * อัปโหลดรูปภาพสินค้า
     * @param {File} file - ไฟล์รูปภาพ
     * @param {string} productId - ID สินค้า
     * @returns {Promise<string>} URL ของรูปภาพ
     */
    async uploadProductImage(file, productId) {
        try {
            // สร้างชื่อไฟล์ที่ไม่ซ้ำ
            const fileName = `product_${Date.now()}_${productId}_${file.name}`;
            
            // ในกรณีจริงควรใช้ Firebase Storage
            // ตัวอย่างเท่านั้น: สร้าง URL จาก Blob
            const imageUrl = URL.createObjectURL(file);
            
            console.log('📸 Product image uploaded:', fileName);
            return imageUrl;
            
        } catch (error) {
            console.error('❌ Error uploading product image:', error);
            throw error;
        }
    }

    /**
     * จัดการอัปโหลดรูปภาพ
     * @param {Event} e - Event object
     */
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const preview = document.getElementById('imagePreview');
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-image">`;
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * แสดงรายการสินค้า
     */
    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        const allProducts = this.products.getProducts();
        
        if (allProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <h3>ยังไม่มีสินค้า</h3>
                    <p>เพิ่มสินค้าแรกของคุณโดยคลิกปุ่ม "เพิ่มสินค้า"</p>
                </div>
            `;
            return;
        }
        
        productsGrid.innerHTML = allProducts.map(product => {
            const statusClass = product.available ? 'status-available' : 'status-unavailable';
            const statusText = product.available ? 'พร้อมจำหน่าย' : 'ไม่มีในสต็อก';
            
            return `
                <div class="kitchen-product-card">
                    <div class="kitchen-product-image-container">
                        <img src="${product.imageUrl || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'}" 
                             alt="${product.name}" 
                             class="kitchen-product-image"
                             onerror="this.src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'">
                        <div class="kitchen-product-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="kitchen-product-info">
                        <div class="kitchen-product-header">
                            <h3 class="kitchen-product-name">${product.name}</h3>
                            <span class="kitchen-product-price">${product.price.toFixed(2)} บาท</span>
                        </div>
                        <p class="kitchen-product-description">${product.description || '-'}</p>
                        <div class="kitchen-product-meta">
                            <span class="kitchen-product-category">${this.getCategoryName(product.category)}</span>
                            <span class="kitchen-product-shop">${product.shop || this.currentShop}</span>
                        </div>
                        <div class="kitchen-product-actions">
                            <button class="action-btn edit-btn" data-id="${product.id}">
                                <i class="fas fa-edit"></i> แก้ไข
                            </button>
                            <button class="action-btn delete-btn" data-id="${product.id}">
                                <i class="fas fa-trash"></i> ลบ
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // ผูกเหตุการณ์ปุ่มแก้ไขและลบ
        this.bindProductActions();
    }

    /**
     * ผูกเหตุการณ์ปุ่มสินค้า
     */
    bindProductActions() {
        // ปุ่มแก้ไข
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.edit-btn').dataset.id;
                this.openProductModal(productId);
            });
        });
        
        // ปุ่มลบ
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.delete-btn').dataset.id;
                this.confirmDeleteProduct(productId);
            });
        });
    }

    /**
     * ยืนยันการลบสินค้า
     * @param {string} productId - ID สินค้า
     */
    async confirmDeleteProduct(productId) {
        if (!confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?')) return;
        
        try {
            this.ui.showLoading(true, 'กำลังลบสินค้า...');
            await this.products.deleteProduct(productId);
            this.ui.showNotification('ลบสินค้าสำเร็จ!', 'success');
            this.renderProducts();
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            this.ui.showNotification('เกิดข้อผิดพลาดในการลบสินค้า', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }

    /**
     * กรองบิลตามสถานะ
     * @param {string} status - สถานะ (pending, preparing, completed)
     * @param {HTMLElement} clickedButton - ปุ่มที่ถูกคลิก
     */
    filterOrders(status, clickedButton) {
        // อัพเดตปุ่มกรอง
        document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
        
        // กรองและแสดงบิล
        this.orders.setFilter(status);
        this.renderOrders();
    }

    /**
     * แสดงรายการบิล
     */
    renderOrders() {
        const billsContainer = document.getElementById('billsContainer');
        if (!billsContainer) return;
        
        const filteredOrders = this.orders.getFilteredOrders();
        
        if (filteredOrders.length === 0) {
            billsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>ไม่มีบิลในสถานะนี้</h3>
                    <p>ไม่พบบิลที่ตรงกับสถานะที่เลือก</p>
                </div>
            `;
            return;
        }
        
        billsContainer.innerHTML = filteredOrders.map(order => {
            const statusClass = `status-${order.status || 'pending'}`;
            const statusText = this.getOrderStatusText(order.status);
            
            // คำนวณยอดรวม
            const subtotal = order.items?.reduce((sum, item) => 
                sum + (item.price * item.quantity), 0) || 0;
            
            return `
                <div class="bill-card" data-order-id="${order.id}">
                    <div class="bill-header">
                        <div class="bill-info">
                            <div class="bill-number">บิล #${order.orderNumber || order.id.substr(0, 8)}</div>
                            <div class="bill-shop">ร้าน: ${order.shop || this.currentShop}</div>
                        </div>
                        <div class="bill-status ${statusClass}">${statusText}</div>
                    </div>
                    
                    <div class="bill-details">
                        <div class="customer-info">
                            <div class="info-row">
                                <i class="fas fa-user"></i>
                                <span>ลูกค้า: ${order.customerName || 'ลูกค้าทั่วไป'}</span>
                            </div>
                            <div class="info-row">
                                <i class="fas fa-table"></i>
                                <span>โต๊ะ: ${order.tableNumber || '1'}</span>
                            </div>
                            <div class="info-row">
                                <i class="fas fa-clock"></i>
                                <span>เวลา: ${this.formatTime(order.createdAt)}</span>
                            </div>
                        </div>
                        
                        <div class="bill-items">
                            <h4><i class="fas fa-list"></i> รายการอาหาร</h4>
                            ${order.items?.map(item => `
                                <div class="bill-item">
                                    <span class="item-name">${item.quantity}x ${item.name}</span>
                                    <span class="item-price">${(item.price * item.quantity).toFixed(2)} บาท</span>
                                </div>
                            `).join('') || '<p>ไม่มีรายการ</p>'}
                        </div>
                        
                        <div class="bill-total">
                            <span>ยอดรวม:</span>
                            <span class="total-amount">${subtotal.toFixed(2)} บาท</span>
                        </div>
                    </div>
                    
                    <div class="bill-actions">
                        ${order.status === 'pending' ? `
                            <button class="action-btn prepare-btn" data-order-id="${order.id}">
                                <i class="fas fa-clock"></i> เริ่มเตรียม
                            </button>
                        ` : ''}
                        
                        ${order.status === 'preparing' ? `
                            <button class="action-btn complete-btn" data-order-id="${order.id}">
                                <i class="fas fa-check"></i> เสร็จสิ้น
                            </button>
                        ` : ''}
                        
                        <button class="action-btn view-btn" data-order-id="${order.id}">
                            <i class="fas fa-eye"></i> ดูรายละเอียด
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // ผูกเหตุการณ์ปุ่มบิล
        this.bindOrderActions();
    }

    /**
     * ผูกเหตุการณ์ปุ่มบิล
     */
    bindOrderActions() {
        // ปุ่มเริ่มเตรียม
        document.querySelectorAll('.prepare-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.closest('.prepare-btn').dataset.orderId;
                this.updateOrderStatus(orderId, 'preparing');
            });
        });
        
        // ปุ่มเสร็จสิ้น
        document.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.closest('.complete-btn').dataset.orderId;
                this.showCompletionModal(orderId);
            });
        });
        
        // ปุ่มดูรายละเอียด
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.closest('.view-btn').dataset.orderId;
                this.viewOrderDetails(orderId);
            });
        });
    }

    /**
     * อัพเดทสถานะคำสั่งซื้อ
     * @param {string} orderId - ID คำสั่งซื้อ
     * @param {string} status - สถานะใหม่
     */
    async updateOrderStatus(orderId, status) {
        try {
            this.ui.showLoading(true, 'กำลังอัพเดทสถานะ...');
            
            await this.orders.updateOrderStatus(orderId, status);
            this.ui.showNotification('อัพเดทสถานะสำเร็จ!', 'success');
            
            // อัพเดทการแสดงผล
            this.renderOrders();
            
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            this.ui.showNotification('เกิดข้อผิดพลาดในการอัพเดทสถานะ', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }

    /**
     * แสดง modal ยืนยันเสร็จสิ้น
     * @param {string} orderId - ID คำสั่งซื้อ
     */
    showCompletionModal(orderId) {
        const order = this.orders.getOrderById(orderId);
        if (!order) return;
        
        document.getElementById('billNumber').textContent = order.orderNumber || order.id.substr(0, 8);
        document.getElementById('confirmCompletion').dataset.orderId = orderId;
        
        this.ui.openModal('completionModal');
    }

    /**
     * ปิด modal ยืนยันเสร็จสิ้น
     */
    closeCompletionModal() {
        this.ui.closeModal('completionModal');
        document.getElementById('confirmCompletion').dataset.orderId = '';
    }

    /**
     * ยืนยันการเสร็จสิ้นคำสั่งซื้อ
     */
    async confirmOrderCompletion() {
        const orderId = document.getElementById('confirmCompletion').dataset.orderId;
        if (!orderId) return;
        
        try {
            this.ui.showLoading(true, 'กำลังยืนยันเสร็จสิ้น...');
            
            await this.orders.updateOrderStatus(orderId, 'completed');
            this.ui.showNotification('ยืนยันเสร็จสิ้นสำเร็จ!', 'success');
            
            this.closeCompletionModal();
            this.renderOrders();
            
        } catch (error) {
            console.error('❌ Error confirming order completion:', error);
            this.ui.showNotification('เกิดข้อผิดพลาดในการยืนยันเสร็จสิ้น', 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }

    /**
     * ดูรายละเอียดคำสั่งซื้อ
     * @param {string} orderId - ID คำสั่งซื้อ
     */
    viewOrderDetails(orderId) {
        const order = this.orders.getOrderById(orderId);
        if (!order) return;
        
        // ในกรณีจริงอาจเปิด modal แสดงรายละเอียดเพิ่มเติม
        alert(`รายละเอียดคำสั่งซื้อ #${order.orderNumber || order.id.substr(0, 8)}\n\n` +
              `ลูกค้า: ${order.customerName}\n` +
              `สถานะ: ${this.getOrderStatusText(order.status)}\n` +
              `เวลา: ${this.formatTime(order.createdAt)}\n\n` +
              `สามารถดูข้อมูลเพิ่มเติมใน Firebase Console ได้`);
    }

    /**
     * ออกจากระบบ
     */
    logout() {
        this.auth.logoutKitchen();
        this.ui.showNotification('ออกจากระบบครัวสำเร็จ', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    /**
     * กลับไปหน้าลูกค้า
     */
    backToCustomer() {
        window.location.href = 'index.html';
    }

    /**
     * ตั้งค่า real-time listeners
     */
    setupRealtimeListeners() {
        // ฟังการเปลี่ยนแปลงสินค้า
        const productsListener = this.products.listenToProductChanges((products) => {
            this.renderProducts();
        }, this.currentShop);
        
        this.realtimeListeners.push(productsListener);
        
        // ฟังการเปลี่ยนแปลงคำสั่งซื้อ
        const ordersListener = this.orders.listenToOrderChanges((orders) => {
            this.renderOrders();
        }, this.currentShop);
        
        this.realtimeListeners.push(ordersListener);
    }

    /**
     * ฟังก์ชันช่วยแปลงชื่อหมวดหมู่
     * @param {string} category - หมวดหมู่ภาษาอังกฤษ
     * @returns {string} หมวดหมู่ภาษาไทย
     */
    getCategoryName(category) {
        const categories = {
            'food': 'อาหารจานหลัก',
            'appetizer': 'อาหารว่าง',
            'dessert': 'ของหวาน',
            'drink': 'เครื่องดื่ม'
        };
        return categories[category] || category;
    }

    /**
     * ฟังก์ชันช่วยแปลงสถานะคำสั่งซื้อ
     * @param {string} status - สถานะภาษาอังกฤษ
     * @returns {string} สถานะภาษาไทย
     */
    getOrderStatusText(status) {
        const statuses = {
            'pending': 'รอดำเนินการ',
            'preparing': 'กำลังจัดเตรียม',
            'completed': 'เสร็จสิ้น',
            'paid': 'ชำระเงินแล้ว',
            'cancelled': 'ยกเลิก'
        };
        return statuses[status] || status;
    }

    /**
     * ฟังก์ชันช่วยจัดรูปแบบเวลา
     * @param {string|Date} timestamp - Timestamp
     * @returns {string} เวลาที่จัดรูปแบบแล้ว
     */
    formatTime(timestamp) {
        if (!timestamp) return '-';
        
        try {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            return date.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (error) {
            return '-';
        }
    }

    /**
     * ทำความสะอาดเมื่อปิดแอป
     */
    cleanup() {
        // ยกเลิก real-time listeners ทั้งหมด
        this.realtimeListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        this.realtimeListeners = [];
        this.isInitialized = false;
    }
}

// สร้าง instance ของแอปครัว
const kitchenApp = new KitchenApp();

// ทำให้สามารถเข้าถึงได้จาก window
window.kitchenApp = kitchenApp;

// เริ่มต้นแอปเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    kitchenApp.init();
});

// ทำความสะอาดเมื่อปิดหรือรีเฟรชหน้าเว็บ
window.addEventListener('beforeunload', () => {
    kitchenApp.cleanup();
});

export default kitchenApp;