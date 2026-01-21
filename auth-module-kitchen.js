
/**
 * โมดูลการยืนยันตัวตนสำหรับระบบครัว
 * จัดการการเข้าถึงระบบครัวและพื้นที่เฉพาะ
 */

class AuthModuleKitchen {
    constructor() {
        this.defaultPassword = '123'; // รหัสผ่านเริ่มต้น
    }

    /**
     * ตรวจสอบสิทธิ์การเข้าถึงครัว
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
        console.log('👋 Logged out from kitchen');
    }

    /**
     * ตรวจสอบรหัสผ่าน
     * @param {string} inputPassword - รหัสผ่านที่กรอก
     * @returns {Object} ผลลัพธ์การตรวจสอบ
     */
    verifyPassword(inputPassword) {
        if (inputPassword === this.defaultPassword) {
            // บันทึกข้อมูลใน sessionStorage
            sessionStorage.setItem('kitchenAccess', 'granted');
            sessionStorage.setItem('accessTime', new Date().toISOString());
            
            return {
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ'
            };
        }
        
        return {
            success: false,
            message: 'รหัสผ่านไม่ถูกต้อง'
        };
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
        
        // บันทึกใน localStorage
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
                console.log('✅ Loaded saved kitchen password');
            }
        } catch (e) {
            console.warn('⚠️ ไม่สามารถโหลดรหัสผ่านจาก localStorage ได้');
        }
    }
}

export default AuthModuleKitchen;