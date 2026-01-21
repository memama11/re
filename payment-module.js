
/**
 * โมดูลจัดการการชำระเงิน
 * สร้าง QR Code และติดตามสถานะการชำระเงิน
 */

class PaymentModule {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.currentPayment = null;
        this.paymentTrackers = new Map(); // เก็บข้อมูลการติดตามการชำระเงิน
    }

    /**
     * สร้างคำสั่งซื้อและ QR Code สำหรับชำระเงิน
     * @param {Array} cartItems - สินค้าในตะกร้า
     * @param {number} totalAmount - จำนวนเงินรวม
     * @param {string} shopName - ชื่อร้าน
     * @returns {Promise<Object>} ข้อมูลการชำระเงิน
     */
    async createOrder(cartItems, totalAmount, shopName) {
        try {
            const orderData = {
                items: cartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    shop: item.shop || shopName
                })),
                total: totalAmount,
                shop: shopName,
                customerName: 'ลูกค้าทั่วไป',
                tableNumber: '1',
                createdAt: new Date().toISOString()
            };

            const result = await this.firebaseService.createOrder(orderData, shopName);
            
            if (result.success) {
                this.currentPayment = {
                    paymentId: result.paymentId,
                    orderNumber: result.orderNumber,
                    total: totalAmount,
                    shop: shopName
                };
                
                return {
                    success: true,
                    ...result
                };
            }
            
            throw new Error('Failed to create order');
        } catch (error) {
            console.error('❌ Error creating order:', error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูล QR Code สำหรับชำระเงิน
     * @param {string} paymentId - ID การชำระเงิน
     * @returns {Promise<Object>} ข้อมูล QR Code
     */
    async getPaymentQRCode(paymentId) {
        try {
            const payment = await this.firebaseService.getPayment(paymentId);
            
            if (payment) {
                return {
                    paymentId: paymentId,
                    qrCodeUrl: payment.qrCodeUrl || this.generateQRCodeUrl(paymentId, payment.amount),
                    amount: payment.amount,
                    shop: payment.shop,
                    status: payment.status || 'pending'
                };
            }
            
            // ถ้าไม่พบข้อมูล ให้สร้าง QR Code ชั่วคราว
            return {
                paymentId: paymentId,
                qrCodeUrl: this.generateQRCodeUrl(paymentId, 0),
                amount: 0,
                shop: 'ร้าน',
                status: 'pending'
            };
        } catch (error) {
            console.error('❌ Error getting payment QR code:', error);
            
            // สร้าง QR Code ชั่วคราว
            return {
                paymentId: paymentId,
                qrCodeUrl: this.generateQRCodeUrl(paymentId, 0),
                amount: 0,
                shop: 'ร้าน',
                status: 'pending'
            };
        }
    }

    /**
     * สร้าง URL สำหรับ QR Code
     * @param {string} paymentId - ID การชำระเงิน
     * @param {number} amount - จำนวนเงิน
     * @returns {string} URL QR Code
     */
    generateQRCodeUrl(paymentId, amount) {
        // ใช้ QR Code API ออนไลน์
        const data = JSON.stringify({
            type: 'payment',
            id: paymentId,
            amount: amount,
            timestamp: new Date().toISOString()
        });
        
        const encodedData = encodeURIComponent(data);
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedData}`;
    }

    /**
     * เริ่มติดตามสถานะการชำระเงิน
     * @param {string} paymentId - ID การชำระเงิน
     * @param {Function} onStatusChange - ฟังก์ชันเรียกกลับเมื่อสถานะเปลี่ยน
     * @returns {Function} ฟังก์ชันยกเลิกการติดตาม
     */
    startPaymentTracking(paymentId, onStatusChange) {
        // เริ่มฟังสถานะการชำระเงินจาก Firebase
        const unsubscribe = this.firebaseService.listenToPaymentStatus(
            paymentId, 
            (payment) => {
                if (payment && payment.status) {
                    onStatusChange(payment.status, payment);
                    
                    // ถ้าชำระเงินสำเร็จหรือล้มเหลว หยุดการติดตาม
                    if (payment.status === 'paid' || payment.status === 'failed') {
                        this.stopPaymentTracking(paymentId);
                    }
                }
            }
        );

        // เก็บข้อมูล tracker
        this.paymentTrackers.set(paymentId, {
            unsubscribe,
            onStatusChange,
            startedAt: new Date()
        });

        // ตั้งเวลาให้หยุดติดตามหลังจาก 30 นาที
        const timeoutId = setTimeout(() => {
            onStatusChange('timeout');
            this.stopPaymentTracking(paymentId);
        }, 30 * 60 * 1000); // 30 นาที

        // เก็บ timeout ID
        this.paymentTrackers.get(paymentId).timeoutId = timeoutId;

        // คืนฟังก์ชันยกเลิกการติดตาม
        return () => this.stopPaymentTracking(paymentId);
    }

    /**
     * หยุดติดตามสถานะการชำระเงิน
     * @param {string} paymentId - ID การชำระเงิน
     */
    stopPaymentTracking(paymentId) {
        const tracker = this.paymentTrackers.get(paymentId);
        
        if (tracker) {
            // ยกเลิกการฟังจาก Firebase
            if (tracker.unsubscribe) {
                tracker.unsubscribe();
            }
            
            // เคลียร์ timeout
            if (tracker.timeoutId) {
                clearTimeout(tracker.timeoutId);
            }
            
            // ลบออกจาก Map
            this.paymentTrackers.delete(paymentId);
        }
    }

    /**
     * ลองชำระเงินใหม่
     * @param {string} paymentId - ID การชำระเงิน
     * @returns {Promise<boolean>} สำเร็จหรือไม่
     */
    async retryPayment(paymentId) {
        try {
            const success = await this.firebaseService.updatePaymentStatus(paymentId, 'pending');
            if (success) {
                // ดึงข้อมูล QR Code ใหม่
                const paymentData = await this.getPaymentQRCode(paymentId);
                return paymentData;
            }
            return false;
        } catch (error) {
            console.error('❌ Error retrying payment:', error);
            return false;
        }
    }

    /**
     * ดึงข้อมูลการชำระเงินปัจจุบัน
     * @returns {Object|null} ข้อมูลการชำระเงิน
     */
    getCurrentPayment() {
        return this.currentPayment;
    }

    /**
     * ตรวจสอบสถานะการชำระเงิน
     * @param {string} paymentId - ID การชำระเงิน
     * @returns {Promise<Object|null>} สถานะการชำระเงิน
     */
    async checkPaymentStatus(paymentId) {
        try {
            const payment = await this.firebaseService.getPayment(paymentId);
            return payment;
        } catch (error) {
            console.error('❌ Error checking payment status:', error);
            return null;
        }
    }
}

export default PaymentModule;