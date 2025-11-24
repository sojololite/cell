/**
 * Sojolo Cell - Plataforma de transferencia de saldo móvil en Cuba
 * @version 2.0.0
 * @author Sojolo Lite
 */

// Configuración global de la aplicación
const CONFIG = {
    APP_NAME: 'Sojolo Cell',
    VERSION: '2.0.0',
    CONTACT: {
        email: 'sojololite@gmail.com',
        facebook: 'https://www.facebook.com/profile.php?id=61583488733031',
        business: 'https://sojololite.github.io/business/'
    },
    PRICING: {
        basePrices: {
            '120': 500,
            '240': 1000,
            '360': 1500,
            '500': 2000,
            '1000': 3800
        },
        markupPercentage: 35
    },
    VALIDATION: {
        cubanPhoneRegex: /^(53)?5\d{7}$/,
        nameRegex: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,}$/,
        minNameLength: 3
    },
    STORAGE_KEYS: {
        STATE: 'sojoloCellState',
        HISTORY: 'sojoloCellHistory',
        PROMOTION: 'promotionShown',
        MARKET_DATA: 'sojoloMarketData'
    }
};

// Estado de la aplicación
class AppState {
    constructor() {
        this.clientName = '';
        this.clientPhone = '';
        this.amount = null;
        this.provider = null;
        this.step = 1;
        this.captchaCode = '';
        this.promotionShown = localStorage.getItem(CONFIG.STORAGE_KEYS.PROMOTION) !== 'true';
        this.notifications = [
            { message: "¡Bienvenido a Sojolo Cell!", type: "info", icon: "👋" },
            { message: "Recuerda verificar los precios antes de realizar tu pedido", type: "info", icon: "💡" },
            { message: "Asegúrate de que tu número de teléfono sea correcto", type: "info", icon: "📱" },
            { message: "Los proveedores pueden cambiar sin previo aviso", type: "info", icon: "⚠️" }
        ];
        this.intervals = {
            notification: null,
            autoSave: null
        };
    }
}

// Sistema de utilidades
class Utils {
    static sanitizePhone(str) {
        return str.replace(/[^\d+]/g, '');
    }

    static validateCubanPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return CONFIG.VALIDATION.cubanPhoneRegex.test(cleanPhone);
    }

    static validateName(name) {
        return name.trim().length >= CONFIG.VALIDATION.minNameLength && 
               CONFIG.VALIDATION.nameRegex.test(name.trim());
    }

    static showNotification(message, type = 'success', icon = '✓', duration = 4000) {
        const notification = document.getElementById('notification');
        const notificationIcon = document.querySelector('.notification-icon');
        const notificationText = document.querySelector('.notification-text');

        if (!notification || !notificationIcon || !notificationText) return;

        notificationIcon.textContent = icon;
        notificationText.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    static generateCaptcha() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let captcha = '';
        for (let i = 0; i < 6; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return captcha;
    }

    static calculatePriceWithMarkup(basePrice) {
        return Math.round(basePrice * (1 + CONFIG.PRICING.markupPercentage / 100));
    }

    static calculateCustomPrice(amount) {
        if (!amount || isNaN(amount) || amount <= 0) return 0;

        let basePrice = 0;
        if (amount <= 120) {
            basePrice = CONFIG.PRICING.basePrices['120'];
        } else if (amount <= 240) {
            basePrice = CONFIG.PRICING.basePrices['240'];
        } else if (amount <= 360) {
            basePrice = CONFIG.PRICING.basePrices['360'];
        } else if (amount <= 500) {
            basePrice = CONFIG.PRICING.basePrices['500'];
        } else if (amount <= 1000) {
            basePrice = CONFIG.PRICING.basePrices['1000'];
        } else {
            basePrice = Math.round((amount / 1000) * CONFIG.PRICING.basePrices['1000']);
        }

        return this.calculatePriceWithMarkup(basePrice);
    }
}

// Gestor de estado de la aplicación
class StateManager {
    static saveState(state) {
        try {
            const stateToSave = {
                clientName: state.clientName,
                clientPhone: state.clientPhone,
                amount: state.amount,
                provider: state.provider,
                step: state.step,
                lastSaved: new Date().toISOString(),
                version: CONFIG.VERSION
            };
            localStorage.setItem(CONFIG.STORAGE_KEYS.STATE, JSON.stringify(stateToSave));
            return true;
        } catch (e) {
            console.warn('No se pudo guardar el estado:', e);
            return false;
        }
    }

    static loadState() {
        try {
            const savedState = localStorage.getItem(CONFIG.STORAGE_KEYS.STATE);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                
                if (parsed.version !== CONFIG.VERSION) {
                    console.log('Versión de estado incompatible, reiniciando...');
                    this.clearState();
                    return null;
                }
                
                return parsed;
            }
        } catch (e) {
            console.warn('No se pudo cargar el estado guardado:', e);
            this.clearState();
        }
        return null;
    }

    static clearState() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.STATE);
    }

    static saveToHistory(request) {
        try {
            const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY) || '[]');
            history.unshift({
                ...request,
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            });
            
            if (history.length > 10) {
                history.splice(10);
            }
            
            localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
            return true;
        } catch (e) {
            console.warn('No se pudo guardar en el historial:', e);
            return false;
        }
    }
}

// Gestor de la interfaz de usuario
class UIManager {
    constructor() {
        this.elements = this.cacheElements();
        this.state = new AppState();
        this.market = new InformalMarket();
        this.syncManager = new MarketSyncManager(this.market);
        this.syncStatus = {
            lastMarketUpdate: null,
            pendingUpdates: false,
            autoSync: true
        };
    }

    cacheElements() {
        return {
            loginSection: document.getElementById('loginSection'),
            loginForm: document.getElementById('loginForm'),
            clientInfo: document.getElementById('clientInfo'),
            amountSection: document.getElementById('amountSection'),
            providerSection: document.getElementById('providerSection'),
            
            clientName: document.getElementById('clientName'),
            clientPhone: document.getElementById('clientPhone'),
            captchaText: document.getElementById('captchaText'),
            captchaInput: document.getElementById('captchaInput'),
            customInputDiv: document.getElementById('customInputDiv'),
            customAmountInput: document.getElementById('customAmountInput'),
            customAmountResult: document.getElementById('customAmountResult'),
            customAmountPrice: document.getElementById('customAmountPrice'),
            
            loginBtn: document.getElementById('loginBtn'),
            refreshCaptcha: document.getElementById('refreshCaptcha'),
            newCaptcha: document.getElementById('newCaptcha'),
            whatsappBtn: document.getElementById('whatsappBtn'),
            openPricesBtn: document.getElementById('openPricesBtn'),
            downloadAppBtn: document.getElementById('downloadAppBtn'),
            openPrivacyBtn: document.getElementById('openPrivacyBtn'),
            closePromotion: document.getElementById('closePromotion'),
            
            pricesModal: document.getElementById('pricesModal'),
            privacyModal: document.getElementById('privacyModal'),
            closePricesModal: document.getElementById('closePricesModal'),
            closePrivacyModal: document.getElementById('closePrivacyModal'),
            
            amountOptions: document.getElementById('amountOptions'),
            providerList: document.getElementById('providerList'),
            priceList: document.getElementById('priceList'),
            privacyContent: document.getElementById('privacyContent'),
            
            progressSteps: document.querySelectorAll('.progress-step'),
            displayClientName: document.getElementById('displayClientName'),
            displayClientPhone: document.getElementById('displayClientPhone'),
            promotionBanner: document.getElementById('promotionBanner'),
            notification: document.getElementById('notification')
        };
    }

    updateStep(step) {
        this.state.step = step;
        this.elements.progressSteps.forEach((stepEl, index) => {
            const stepNumber = parseInt(stepEl.dataset.step);
            if (stepNumber <= step) {
                stepEl.classList.add('active');
                stepEl.setAttribute('aria-current', stepNumber === step ? 'step' : 'false');
            } else {
                stepEl.classList.remove('active');
                stepEl.removeAttribute('aria-current');
            }
        });
    }

    showSection(section, show = true) {
        if (this.elements[section]) {
            this.elements[section].style.display = show ? 'block' : 'none';
        }
    }

    updateClientInfo() {
        this.elements.displayClientName.textContent = this.state.clientName;
        this.elements.displayClientPhone.textContent = this.state.clientPhone;
    }

    async loadProviders() {
        try {
            const response = await fetch('providers.json');
            if (!response.ok) throw new Error('No se pudieron cargar los proveedores');
            
            const data = await response.json();
            this.renderProviders(data.providers);
        } catch (error) {
            console.error('Error cargando proveedores:', error);
            Utils.showNotification('Error cargando proveedores', 'error', '❌');
            this.renderProviders([
                { id: 1, name: "Proveedor 1", phone: "+53 5 6584673", available: true },
                { id: 2, name: "Proveedor 2", phone: "+53 5 0728907", available: true },
                { id: 3, name: "Proveedor 3", phone: "+53 5 5384257", available: true },
                { id: 4, name: "Proveedor 4", phone: "+53 63175552", available: true }
            ]);
        }
    }

    renderProviders(providers) {
        if (!this.elements.providerList) return;

        this.elements.providerList.innerHTML = providers.map(provider => `
            <div class="option provider-item" 
                 data-provider="${provider.phone}" 
                 data-available="${provider.available}"
                 role="button" 
                 tabindex="0"
                 aria-label="${provider.name} - ${provider.available ? 'Disponible' : 'No disponible'}">
                <div class="provider-info">
                    <span class="provider-name">${provider.name}</span>
                    <span class="status ${provider.available ? 'available' : 'unavailable'}">
                        ${provider.available ? 'Disponible' : 'No disponible'}
                    </span>
                </div>
            </div>
        `).join('');

        this.attachProviderEvents();
    }

    renderAmountOptions() {
        if (!this.elements.amountOptions) return;

        const options = this.market.getPriceList().map(item => {
            const trendIcon = item.marketTrend === 'rising' ? '📈' : 
                            item.marketTrend === 'falling' ? '📉' : '➡️';
            
            const bestDealBadge = item.bestDeal ? '<span class="best-deal-badge">💎 MEJOR</span>' : '';
            
            return `
                <div class="option" data-amount="${item.amount}" role="button" tabindex="0">
                    <div class="option-header">
                        <span>${item.amount} CUP</span>
                        ${bestDealBadge}
                    </div>
                    <span class="option-subtitle">≈ ${item.finalPrice} CUP ${trendIcon}</span>
                </div>
            `;
        }).join('') + `
            <div class="option" id="customOption" role="button" tabindex="0">
                <span>Otra cantidad</span>
            </div>
        `;

        this.elements.amountOptions.innerHTML = options;
    }

    renderPriceList() {
        if (!this.elements.priceList) return;

        const priceItems = this.market.getPriceList().map(item => {
            const trendIcon = item.marketTrend === 'rising' ? '📈' : 
                            item.marketTrend === 'falling' ? '📉' : '➡️';
            
            const bestDealBadge = item.bestDeal ? '<span class="best-deal-badge">💎 MEJOR</span>' : '';
            
            return `
                <li class="price-item">
                    <div class="price-header">
                        <span>${item.amount} CUP</span>
                        ${bestDealBadge}
                    </div>
                    <div class="price-details">
                        <span class="price-value">= ${item.finalPrice} CUP</span>
                        <span class="price-trend">${trendIcon}</span>
                    </div>
                    <div class="price-confidence">
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${item.confidence * 100}%"></div>
                        </div>
                        <span class="confidence-text">${Math.round(item.confidence * 100)}% confianza</span>
                    </div>
                </li>
            `;
        }).join('');

        this.elements.priceList.innerHTML = priceItems;
    }

    async loadPrivacyPolicy() {
        try {
            const response = await fetch('privacy-policy.html');
            if (!response.ok) throw new Error('No se pudo cargar la política de privacidad');
            
            const content = await response.text();
            if (this.elements.privacyContent) {
                this.elements.privacyContent.innerHTML = content;
            }
        } catch (error) {
            console.error('Error cargando política de privacidad:', error);
            if (this.elements.privacyContent) {
                this.elements.privacyContent.innerHTML = `
                    <p>Sojolo Cell es una plataforma de contacto entre usuarios y proveedores de saldo móvil.</p>
                    <p><strong>No almacenamos</strong> información personal de nadie.</p>
                    <p><strong>No participamos</strong> en las transacciones ni nos hacemos responsables de los acuerdos entre usuarios y proveedores.</p>
                    <p>El uso de esta plataforma es verificado y claro.</p>
                `;
            }
        }
    }

    attachProviderEvents() {
        const providerItems = this.elements.providerList?.querySelectorAll('.provider-item');
        if (providerItems) {
            providerItems.forEach(provider => {
                provider.addEventListener('click', () => this.selectProvider(provider));
                provider.addEventListener('keydown', (e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && provider.dataset.available === 'true') {
                        e.preventDefault();
                        this.selectProvider(provider);
                    }
                });
            });
        }
    }

    selectProvider(providerElement) {
        if (providerElement.dataset.available !== 'true') return;

        document.querySelectorAll('.provider-item').forEach(item => {
            item.classList.remove('selected');
        });

        providerElement.classList.add('selected');
        this.state.provider = providerElement.dataset.provider;
        
        this.updateStep(4);
        this.updateUI();
        Utils.showNotification('Proveedor seleccionado', 'success', '✅');
        StateManager.saveState(this.state);
    }

    updateUI() {
        this.elements.whatsappBtn.disabled = !(this.state.amount && this.state.provider);

        this.showSection('providerSection', !!this.state.amount);
        this.showSection('clientInfo', !!this.state.clientName);

        if (this.state.amount && this.state.provider) {
            this.updateStep(4);
        } else if (this.state.amount) {
            this.updateStep(3);
        } else if (this.state.clientName) {
            this.updateStep(2);
        }

        StateManager.saveState(this.state);

        if (this.state.amount && this.state.provider) {
            setTimeout(() => this.showPromotion(), 2000);
        }
    }

    showPromotion() {
        if (this.state.promotionShown && this.elements.promotionBanner) {
            this.elements.promotionBanner.classList.add('show');
        }
    }

    hidePromotion() {
        if (this.elements.promotionBanner) {
            this.elements.promotionBanner.classList.remove('show');
            localStorage.setItem(CONFIG.STORAGE_KEYS.PROMOTION, 'true');
            this.state.promotionShown = false;
        }
    }

    startRecurrentNotifications() {
        let notificationIndex = 0;

        setTimeout(() => {
            if (this.state.notifications.length > 0) {
                const notification = this.state.notifications[0];
                Utils.showNotification(notification.message, notification.type, notification.icon, 5000);
                notificationIndex = 1;
            }
        }, 5000);

        this.state.intervals.notification = setInterval(() => {
            if (notificationIndex < this.state.notifications.length) {
                const notification = this.state.notifications[notificationIndex];
                Utils.showNotification(notification.message, notification.type, notification.icon, 5000);
                notificationIndex = (notificationIndex + 1) % this.state.notifications.length;
            }
        }, 30000);
    }

    stopRecurrentNotifications() {
        if (this.state.intervals.notification) {
            clearInterval(this.state.intervals.notification);
            this.state.intervals.notification = null;
        }
    }

    startAutoSave() {
        this.state.intervals.autoSave = setInterval(() => {
            StateManager.saveState(this.state);
        }, 10000);
    }

    stopAutoSave() {
        if (this.state.intervals.autoSave) {
            clearInterval(this.state.intervals.autoSave);
            this.state.intervals.autoSave = null;
        }
    }

    startMarketSync() {
        this.syncManager.startAutoSync();
        
        setInterval(() => {
            this.updateSyncStatus();
        }, 60000);
    }

    updateSyncStatus() {
        const status = this.syncManager.getSyncStatus();
        this.syncStatus.lastMarketUpdate = status.lastSync;
        this.syncStatus.pendingUpdates = !status.lastSync || 
            (new Date() - new Date(status.lastSync)) > 3600000;
        
        if (this.syncStatus.pendingUpdates && this.syncStatus.autoSync) {
            this.syncManager.syncMarketData();
        }
    }

    forceMarketSync() {
        Utils.showNotification('Sincronizando datos del mercado...', 'info', '🔄');
        this.syncManager.syncMarketData().then(() => {
            Utils.showNotification('Datos del mercado actualizados', 'success', '✅');
            this.renderPriceList();
            this.renderAmountOptions();
        }).catch(() => {
            Utils.showNotification('Error sincronizando datos', 'error', '❌');
        });
    }

    checkNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Permisos de notificación concedidos');
                }
            });
        }
    }

    handleLogin(event) {
        if (event) event.preventDefault();

        const name = this.elements.clientName.value.trim();
        const phone = Utils.sanitizePhone(this.elements.clientPhone.value);
        const captchaInput = this.elements.captchaInput.value;

        if (!Utils.validateName(name)) {
            Utils.showNotification('Por favor, ingresa un nombre válido (mínimo 3 caracteres, solo letras)', 'error', '❌');
            this.elements.clientName.focus();
            return false;
        }

        if (!Utils.validateCubanPhone(phone)) {
            Utils.showNotification('Formato de teléfono incorrecto. Ej: +53 51234567', 'error', '❌', 3000);
            this.elements.clientPhone.focus();
            return false;
        }

        if (captchaInput.toUpperCase() !== this.state.captchaCode.toUpperCase()) {
            Utils.showNotification('El código de verificación es incorrecto', 'error', '❌');
            this.elements.captchaInput.focus();
            this.refreshCaptcha();
            return false;
        }

        this.state.clientName = name;
        this.state.clientPhone = phone;

        this.showSection('loginSection', false);
        this.showSection('clientInfo', true);
        this.showSection('amountSection', true);
        this.showSection('whatsappBtn', true);
        
        this.updateClientInfo();
        this.updateStep(2);
        
        Utils.showNotification('¡Login exitoso! Tus datos se guardarán automáticamente', 'success', '✅');
        StateManager.saveState(this.state);
        
        return true;
    }

    refreshCaptcha() {
        this.state.captchaCode = Utils.generateCaptcha();
        this.elements.captchaText.textContent = this.state.captchaCode;
        this.elements.captchaInput.value = '';
        this.elements.captchaInput.focus();
    }

    handleAmountSelection(amountElement) {
        document.querySelectorAll('.option[data-amount]').forEach(opt => {
            opt.classList.remove('selected');
        });

        amountElement.classList.add('selected');
        this.state.amount = `${amountElement.dataset.amount} CUP`;
        
        this.showSection('providerSection', true);
        this.updateStep(3);
        this.updateUI();
        
        Utils.showNotification(`Cantidad seleccionada: ${this.state.amount}`, 'success', '✅');
        StateManager.saveState(this.state);
    }

    handleCustomAmount() {
        const isActive = this.elements.customInputDiv.style.display === 'block';
        
        document.querySelectorAll('.option[data-amount]').forEach(opt => {
            opt.classList.remove('selected');
        });

        const customOption = document.getElementById('customOption');
        customOption.classList.toggle('selected', !isActive);
        
        this.elements.customInputDiv.style.display = isActive ? 'none' : 'block';
        this.state.amount = isActive ? null : '';
        
        this.showSection('providerSection', !isActive);
        this.updateStep(isActive ? 2 : 3);
        this.updateUI();
        StateManager.saveState(this.state);

        if (!isActive) {
            this.elements.customAmountInput.focus();
            Utils.showNotification('Ingresa la cantidad deseada', 'info', '💡');
        }
    }

    handleCustomAmountInput() {
        const value = this.elements.customAmountInput.value.trim();
        const amount = parseInt(value);
        
        if (value && !isNaN(amount) && amount > 0) {
            const priceInfo = this.market.getPriceForDisplay(amount);
            this.state.amount = `${amount} CUP`;
            this.elements.customAmountPrice.textContent = priceInfo.price;
            this.elements.customAmountResult.style.display = 'block';
            
            if (priceInfo.confidence < 0.7) {
                this.elements.customAmountResult.innerHTML = 
                    `Precio aproximado: <span id="customAmountPrice">${priceInfo.price}</span> CUP
                     <div class="price-warning">⚠️ Precio estimado - puede variar</div>`;
            }
        } else {
            this.state.amount = null;
            this.elements.customAmountResult.style.display = 'none';
        }
        
        this.showSection('providerSection', !!this.state.amount);
        this.updateStep(this.state.amount ? 3 : 2);
        this.updateUI();
        StateManager.saveState(this.state);
    }

    handleWhatsAppRequest() {
        if (!this.state.amount || !this.state.provider) return;

        const providerNumber = this.state.provider.replace(/\D/g, '');
        const amountValue = this.state.amount.split(' ')[0];
        
        let finalPrice = 0;
        if (CONFIG.PRICING.basePrices[amountValue]) {
            finalPrice = Utils.calculatePriceWithMarkup(CONFIG.PRICING.basePrices[amountValue]);
        } else {
            finalPrice = Utils.calculateCustomPrice(parseInt(amountValue));
        }

        const providerId = this.getProviderId(this.state.provider);
        
        const message = `¡Hola! Me comunico a través de la plataforma Sojolo Cell.

INFORMACIÓN DEL CLIENTE:
• Nombre: ${this.state.clientName}
• Teléfono: ${this.state.clientPhone}

SOLICITUD DE TRANSFERENCIA:
• Monto solicitado: ${this.state.amount}
• Precio aproximado: ${finalPrice} CUP
• Proveedor seleccionado: ${providerId}

Por favor, indíqueme:
- Confirmación de disponibilidad
- Tiempo estimado de entrega
- Método de pago aceptado

Quedo atento a su respuesta. ¡Gracias!`;

        const url = `https://wa.me/${providerNumber}?text=${encodeURIComponent(message)}`;
        
        window.open(url, '_blank', 'noopener,noreferrer');
        Utils.showNotification('Redirigiendo a WhatsApp...', 'success', '💬');

        StateManager.saveToHistory({
            clientName: this.state.clientName,
            clientPhone: this.state.clientPhone,
            amount: this.state.amount,
            price: finalPrice,
            provider: this.state.provider
        });
    }

    getProviderId(providerPhone) {
        const providerItems = this.elements.providerList?.querySelectorAll('.provider-item');
        if (providerItems) {
            for (let item of providerItems) {
                if (item.dataset.provider === providerPhone) {
                    return item.querySelector('.provider-name').textContent;
                }
            }
        }
        return 'Proveedor seleccionado';
    }

    openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    loadSavedState() {
        const savedState = StateManager.loadState();
        if (savedState && savedState.clientName && savedState.clientPhone) {
            this.state.clientName = savedState.clientName;
            this.state.clientPhone = savedState.clientPhone;
            
            this.elements.clientName.value = savedState.clientName;
            this.elements.clientPhone.value = savedState.clientPhone;
            
            this.showSection('loginSection', false);
            this.showSection('clientInfo', true);
            this.showSection('amountSection', true);
            this.showSection('whatsappBtn', true);
            
            this.updateClientInfo();
            this.updateStep(savedState.step || 2);
            
            if (savedState.amount) {
                this.state.amount = savedState.amount;
                document.querySelectorAll('.option[data-amount]').forEach(opt => {
                    if (opt.dataset.amount === savedState.amount.split(' ')[0]) {
                        opt.classList.add('selected');
                    }
                });
            }
            
            if (savedState.provider) {
                this.state.provider = savedState.provider;
                this.showSection('providerSection', true);
                document.querySelectorAll('.provider-item').forEach(provider => {
                    if (provider.dataset.provider === savedState.provider) {
                        provider.classList.add('selected');
                    }
                });
            }
            
            Utils.showNotification('Datos cargados automáticamente', 'info', '🔄', 3000);
        }
    }

    initEventListeners() {
        this.elements.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));

        this.elements.refreshCaptcha?.addEventListener('click', () => this.refreshCaptcha());
        this.elements.newCaptcha?.addEventListener('click', () => this.refreshCaptcha());

        this.elements.amountOptions?.addEventListener('click', (e) => {
            const option = e.target.closest('.option[data-amount]');
            if (option) this.handleAmountSelection(option);
        });

        const customOption = document.getElementById('customOption');
        customOption?.addEventListener('click', () => this.handleCustomAmount());

        this.elements.customAmountInput?.addEventListener('input', () => this.handleCustomAmountInput());

        this.elements.whatsappBtn?.addEventListener('click', () => this.handleWhatsAppRequest());

        this.elements.openPricesBtn?.addEventListener('click', () => {
            this.openModal(this.elements.pricesModal);
            this.forceMarketSync();
        });
        this.elements.openPrivacyBtn?.addEventListener('click', () => this.openModal(this.elements.privacyModal));
        this.elements.closePricesModal?.addEventListener('click', () => this.closeModal(this.elements.pricesModal));
        this.elements.closePrivacyModal?.addEventListener('click', () => this.closeModal(this.elements.privacyModal));

        [this.elements.pricesModal, this.elements.privacyModal].forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });

        this.elements.closePromotion?.addEventListener('click', () => this.hidePromotion());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                [this.elements.pricesModal, this.elements.privacyModal].forEach(modal => {
                    if (modal?.classList.contains('active')) this.closeModal(modal);
                });
            }
        });

        window.addEventListener('beforeunload', () => {
            this.stopRecurrentNotifications();
            this.stopAutoSave();
            StateManager.saveState(this.state);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                StateManager.saveState(this.state);
            }
        });
    }

    async initialize() {
        try {
            this.loadSavedState();
            
            this.refreshCaptcha();
            
            await Promise.all([
                this.loadProviders(),
                this.loadPrivacyPolicy()
            ]);
            
            this.renderAmountOptions();
            this.renderPriceList();
            
            this.initEventListeners();
            
            this.checkNotificationPermission();
            this.startRecurrentNotifications();
            this.startAutoSave();
            this.startMarketSync();
            
            setTimeout(() => {
                if (Math.random() < 0.8 && this.state.clientName) {
                    this.showPromotion();
                }
            }, 8000);
            
            this.elements.downloadAppBtn?.addEventListener('click', () => {
                window.open('https://github.com/sojololite/cell/raw/refs/heads/main/Sojolo%20Cell.apk', '_blank');
                Utils.showNotification('Descargando aplicación...', 'success', '📥');
            });
            
            console.log('Sojolo Cell inicializado correctamente');
            
        } catch (error) {
            console.error('Error inicializando la aplicación:', error);
            Utils.showNotification('Error inicializando la aplicación', 'error', '❌');
        }
    }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    const app = new UIManager();
    app.initialize();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager, Utils, StateManager, CONFIG };
}