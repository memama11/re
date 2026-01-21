
/**
 * โมดูลการยืนยันตัวตน
 * จัดการการเข้าถึงระบบครัวและพื้นที่เฉพาะ
 */

class AuthModule {
    constructor() {
        this.defaultPassword = '123'; // รหัสผ่านเริ่มต้น
        this.maxAttempts = 3;
        this.attempts = 0;
        this.lockTime = null;
        this.lockDuration = 5 * 60 * 1000; // 5 นาที
    }

    /**
     * ตรวจสอบรหัสผ่าน
     * @param {string} inputPassword - รหัสผ่านที่กรอก
     * @returns {Object} ผลลัพธ์การตรวจสอบ
     */
    verifyPassword(inputPassword) {
        // ตรวจสอบว่าถูกล็อกหรือไม่
        if (this.lockTime) {
            const now = new Date();
            if (now.getTime() - this.lockTime.getTime() < this.lockDuration) {
                const remainingTime = Math.ceil((this.lockDuration - (now.getTime() - this.lockTime.getTime())) / 1000);
                return {
                    success: false,
                    message: `ระบบถูกล็อก กรุณารอ ${remainingTime} วินาที`,
                    locked: true
                };
            } else {
                // ถ้าหมดเวลาล็อก รีเซ็ต
                this.lockTime = null;
                this.attempts = 0;
            }
        }

        // ตรวจสอบรหัสผ่าน
        if (inputPassword === this.defaultPassword) {
            // รีเซ็ตจำนวนครั้งที่พยายาม
            this.attempts = 0;
            this.lockTime = null;
            
            // บันทึกข้อมูลใน sessionStorage
            sessionStorage.setItem('kitchenAccess', 'granted');
            sessionStorage.setItem('accessTime', new Date().toISOString());
            
            return {
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ'
            };
        } else {
            this.attempts++;
            
            // ตรวจสอบว่าพยายามเกินกำหนดหรือไม่
            if (this.attempts >= this.maxAttempts) {
                this.lockTime = new Date();
                return {
                    success: false,
                    message: 'พยายามเกินจำนวนที่กำหนด ระบบถูกล็อกเป็นเวลา 5 นาที',
                    locked: true
                };
            }
            
            const remainingAttempts = this.maxAttempts - this.attempts;
            return {
                success: false,
                message: `รหัสผ่านไม่ถูกต้อง (เหลืออีก ${remainingAttempts} ครั้ง)`,
                remainingAttempts: remainingAttempts
            };
        }
    }

    /**
     * ตรวจสอบว่ามีสิทธิ์เข้าถึงครัวหรือไม่
     * @returns {boolean} มีสิทธิ์หรือไม่
     */
    hasKitchenAccess() {
        const access = sessionStorage.getItem('kitchenAccess');
        const accessTime = sessionStorage.getItem('accessTime');
        
        if (!access || access !== 'granted' || !accessTime) {
            return false;
        }
        
        // ตรวจสอบว่าการเข้าถึงหมดอายุหรือไม่ (8 ชั่วโมง)
        const now = new Date();
        const accessDate = new Date(accessTime);
        const hoursDiff = (now.getTime() - accessDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 8) {
            // ล้างข้อมูลการเข้าถึงที่หมดอายุ
            sessionStorage.removeItem('kitchenAccess');
            sessionStorage.removeItem('accessTime');
            return false;
        }
        
        return true;
    }

    /**
     * ออกจากระบบครัว
     */
    logoutKitchen() {
        sessionStorage.removeItem('kitchenAccess');
        sessionStorage.removeItem('accessTime');
        this.attempts = 0;
        this.lockTime = null;
    }

    /**
     * เปลี่ยนรหัสผ่าน
     * @param {string} oldPassword - รหัสผ่านเก่า
     * @param {string} newPassword - รหัสผ่านใหม่
     * @returns {Object} ผลลัพธ์การเปลี่ยนรหัสผ่าน
     */
    changePassword(oldPassword, newPassword) {
        if (oldPassword !== this.defaultPassword) {
            return {
                success: false,
                message: 'รหัสผ่านเก่าไม่ถูกต้อง'
            };
        }
        
        if (newPassword.length < 3) {
            return {
                success: false,
                message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 3 ตัวอักษร'
            };
        }
        
        this.defaultPassword = newPassword;
        
        // บันทึกใน localStorage (ในกรณีจริงควรเก็บในเซิร์ฟเวอร์)
        try {
            localStorage.setItem('kitchenPassword', newPassword);
            return {
                success: true,
                message: 'เปลี่ยนรหัสผ่านสำเร็จ'
            };
        } catch (e) {
            console.warn('⚠️ ไม่สามารถบันทึกรหัสผ่านใน localStorage ได้');
            return {
                success: false,
                message: 'ไม่สามารถบันทึกรหัสผ่านได้'
            };
        }
    }

    /**
     * โหลดรหัสผ่านที่บันทึกไว้
     */
    loadSavedPassword() {
        try {
            const savedPassword = localStorage.getItem('kitchenPassword');
            if (savedPassword) {
                this.defaultPassword = savedPassword;
                console.log('✅ Loaded saved password');
            }
        } catch (e) {
            console.warn('⚠️ ไม่สามารถโหลดรหัสผ่านจาก localStorage ได้');
        }
    }

    /**
     * เปิด modal รหัสผ่าน
     */
    openPasswordModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.classList.add('active');
            
            // เคลียร์ input และ focus
            const passwordInput = document.getElementById('kitchenPassword');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            
            // เคลียร์ error message
            const errorElement = document.getElementById('passwordError');
            if (errorElement) {
                errorElement.textContent = '';
            }
            
            console.log('🔐 Password modal opened');
        }
    }

    /**
     * ปิด modal รหัสผ่าน
     */
    closePasswordModal() {
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.classList.remove('active');
            
            // เคลียร์ input
            const passwordInput = document.getElementById('kitchenPassword');
            if (passwordInput) {
                passwordInput.value = '';
            }
            
            // เคลียร์ error message
            const errorElement = document.getElementById('passwordError');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    }

    /**
     * ตรวจสอบการเข้าถึงและเปลี่ยนหน้า
     * @param {string} targetPage - หน้าที่ต้องการไป
     */
    checkAccessAndRedirect(targetPage = 'kitchen.html') {
        if (this.hasKitchenAccess()) {
            window.location.href = targetPage;
        } else {
            this.openPasswordModal();
        }
    }
}

export default AuthModule;