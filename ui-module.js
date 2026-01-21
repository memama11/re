
/**
 * โมดูลจัดการส่วนแสดงผล (UI)
 * ดูแลการแสดงผลและการโต้ตอบกับผู้ใช้
 */

class UIModule {
    constructor() {
        this.activeModals = new Set();
        this.notifications = [];
    }

    /**
     * เพิ่ม event listener
     * @param {string} selector - CSS selector
     * @param {string} event - ชื่อ event
     * @param {Function} handler - ฟังก์ชันจัดการ event
     * @returns {boolean} สำเร็จหรือไม่
     */
    addEvent(selector, event, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        }
        console.warn(`⚠️ Element ${selector} not found for event ${event}`);
        return false;
    }

    /**
     * เปิด modal
     * @param {string} modalId - ID ของ modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.activeModals.add(modalId);
            
            // ป้องกันการ scroll หน้าเว็บ
            document.body.style.overflow = 'hidden';
            
            console.log(`✅ Modal opened: ${modalId}`);
        } else {
            console.error(`❌ Modal not found: ${modalId}`);
        }
    }

    /**
     * ปิด modal
     * @param {string} modalId - ID ของ modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            this.activeModals.delete(modalId);
            
            // คืนการ scroll หน้าเว็บ
            if (this.activeModals.size === 0) {
                document.body.style.overflow = '';
            }
            
            console.log(`✅ Modal closed: ${modalId}`);
        }
    }

    /**
     * ปิด modal ทั้งหมด
     */
    closeAllModals() {
        this.activeModals.forEach(modalId => {
            this.closeModal(modalId);
        });
    }

    /**
     * แสดง notification
     * @param {string} message - ข้อความ
     * @param {string} type - ประเภท (success, error, info, warning)
     * @param {number} duration - เวลาแสดงผล (มิลลิวินาที)
     * @returns {string} ID ของ notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notificationId = 'notification-' + Date.now();
        
        // สร้าง element notification
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `notification notification-${type}`;
        
        // กำหนดสไตล์
        const colors = {
            'success': { bg: '#d4edda', border: '#28a745', icon: 'check-circle' },
            'error': { bg: '#f8d7da', border: '#dc3545', icon: 'exclamation-circle' },
            'warning': { bg: '#fff3cd', border: '#ffc107', icon: 'exclamation-triangle' },
            'info': { bg: '#d1ecf1', border: '#17a2b8', icon: 'info-circle' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${color.icon}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // สไตล์ inline
        notification.style.cssText = `
            position: fixed;
            top: ${20 + (this.notifications.length * 70)}px;
            right: 20px;
            background: ${color.bg};
            border-left: 4px solid ${color.border};
            color: ${this.getTextColor(color.bg)};
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            transition: top 0.3s ease;
        `;
        
        // เพิ่มลงใน DOM
        document.body.appendChild(notification);
        this.notifications.push(notificationId);
        
        // ผูก event สำหรับปุ่มปิด
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeNotification(notificationId);
            });
        }
        
        // ปิดอัตโนมัติหลังจากเวลาที่กำหนด
        if (duration > 0) {
            setTimeout(() => {
                this.closeNotification(notificationId);
            }, duration);
        }
        
        return notificationId;
    }

    /**
     * ปิด notification
     * @param {string} notificationId - ID ของ notification
     */
    closeNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                    
                    // ลบออกจากอาร์เรย์
                    const index = this.notifications.indexOf(notificationId);
                    if (index > -1) {
                        this.notifications.splice(index, 1);
                    }
                    
                    // อัพเดทตำแหน่ง notification อื่นๆ
                    this.updateNotificationPositions();
                }
            }, 300);
        }
    }

    /**
     * อัพเดทตำแหน่ง notification
     */
    updateNotificationPositions() {
        this.notifications.forEach((id, index) => {
            const notification = document.getElementById(id);
            if (notification) {
                notification.style.top = `${20 + (index * 70)}px`;
            }
        });
    }

    /**
     * กำหนดสีข้อความตามสีพื้นหลัง
     * @param {string} bgColor - สีพื้นหลัง
     * @returns {string} สีข้อความที่เหมาะสม
     */
    getTextColor(bgColor) {
        // แปลงสี HEX เป็น RGB
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // คำนวณความสว่าง
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // สีดำหรือสีขาวตามความสว่าง
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    /**
     * แสดง loading spinner
     * @param {boolean} show - แสดงหรือซ่อน
     * @param {string} message - ข้อความ loading
     */
    showLoading(show = true, message = 'กำลังโหลด...') {
        let loadingEl = document.getElementById('global-loading');
        
        if (show) {
            if (!loadingEl) {
                loadingEl = document.createElement('div');
                loadingEl.id = 'global-loading';
                loadingEl.innerHTML = `
                    <div class="loading-overlay">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">${message}</div>
                    </div>
                `;
                
                // สไตล์ loading
                loadingEl.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 9998;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                `;
                
                document.body.appendChild(loadingEl);
            }
            loadingEl.style.display = 'flex';
        } else if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    /**
     * แสดงข้อความว่างเปล่า
     * @param {string} message - ข้อความ
     * @param {string} icon - ไอคอน FontAwesome
     * @returns {string} HTML สำหรับข้อความว่างเปล่า
     */
    renderEmptyMessage(message = 'ไม่มีข้อมูล', icon = 'fa-inbox') {
        return `
            <div class="empty-state">
                <i class="fas ${icon}"></i>
                <h3>${message}</h3>
                <p>กรุณาลองใหม่อีกครั้งหรือเลือกหมวดหมู่อื่น</p>
            </div>
        `;
    }

    /**
     * แสดงข้อผิดพลาด
     * @param {string} message - ข้อความผิดพลาด
     * @param {string} details - รายละเอียดเพิ่มเติม
     * @returns {string} HTML สำหรับแสดงข้อผิดพลาด
     */
    renderError(message = 'เกิดข้อผิดพลาด', details = '') {
        return `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${message}</h3>
                ${details ? `<p>${details}</p>` : ''}
                <button class="btn btn-primary retry-btn">ลองอีกครั้ง</button>
            </div>
        `;
    }
}

export default UIModule;