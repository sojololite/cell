/**
 * Sistema de Verificación CAPTCHA mejorado
 */

class VerificationSystem {
    constructor() {
        this.charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        this.length = 6;
        this.currentCode = '';
        this.attempts = 0;
        this.maxAttempts = 5;
        this.timeoutDuration = 30000; // 30 segundos
    }

    generate() {
        let captcha = '';
        for (let i = 0; i < this.length; i++) {
            captcha += this.charset.charAt(Math.floor(Math.random() * this.charset.length));
        }
        this.currentCode = captcha;
        this.attempts = 0;
        return captcha;
    }

    validate(input) {
        if (this.attempts >= this.maxAttempts) {
            throw new Error('Demasiados intentos fallidos. Por favor, espera 30 segundos.');
        }

        const isValid = input.toUpperCase() === this.currentCode.toUpperCase();
        
        if (!isValid) {
            this.attempts++;
            const remainingAttempts = this.maxAttempts - this.attempts;
            
            if (remainingAttempts > 0) {
                throw new Error(`Código incorrecto. Te quedan ${remainingAttempts} intentos.`);
            } else {
                setTimeout(() => {
                    this.attempts = 0;
                }, this.timeoutDuration);
                throw new Error('Demasiados intentos fallidos. Por favor, espera 30 segundos.');
            }
        }

        // Resetear intentos en caso de éxito
        this.attempts = 0;
        return true;
    }

    refresh() {
        return this.generate();
    }

    getAttemptsInfo() {
        return {
            currentAttempts: this.attempts,
            maxAttempts: this.maxAttempts,
            remainingAttempts: this.maxAttempts - this.attempts,
            isLocked: this.attempts >= this.maxAttempts
        };
    }

    createVisualCaptcha() {
        const captcha = this.generate();
        
        // Simular efectos visuales (en una implementación real, esto sería más complejo)
        const visualEffects = [
            'rotate(2deg)',
            'rotate(-1deg)',
            'skewX(2deg)',
            'skewY(-1deg)'
        ];
        
        const randomEffect = visualEffects[Math.floor(Math.random() * visualEffects.length)];
        
        return {
            code: captcha,
            visualStyle: {
                transform: randomEffect,
                letterSpacing: '3px',
                filter: 'blur(0.3px)'
            }
        };
    }

    // Método para verificar fortaleza del CAPTCHA
    getStrength() {
        const uniqueChars = new Set(this.currentCode).size;
        const hasUpper = /[A-Z]/.test(this.currentCode);
        const hasLower = /[a-z]/.test(this.currentCode);
        const hasNumbers = /[0-9]/.test(this.currentCode);

        let strength = 0;
        if (uniqueChars >= 4) strength++;
        if (hasUpper && hasLower) strength++;
        if (hasNumbers) strength++;
        if (this.currentCode.length >= 6) strength++;

        return {
            score: strength,
            maxScore: 4,
            level: strength >= 3 ? 'fuerte' : strength >= 2 ? 'medio' : 'débil'
        };
    }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VerificationSystem;
} else {
    window.VerificationSystem = VerificationSystem;
}