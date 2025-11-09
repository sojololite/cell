(function () {
  'use strict';

  // Estado de la aplicación
  const state = {
    amount: null,
    provider: null,
    userPhone: '',
    step: 1,
    promotionShown: localStorage.getItem('promotionShown') !== 'true',
    providers: [],
    notifications: [
      "¡Bienvenido a Sojolo Cell!",
      "Recuerda verificar los precios antes de realizar tu pedido",
      "Asegúrate de que tu número de teléfono sea correcto",
      "Los proveedores pueden cambiar sin previo aviso"
    ],
    notificationInterval: null
  };

  // Cache de elementos DOM
  const el = {
    amountOpts: document.querySelectorAll('.option[data-amount]'),
    customOpt: document.getElementById('customOption'),
    customDiv: document.getElementById('customInputDiv'),
    customInp: document.getElementById('customAmountInput'),
    provSec: document.getElementById('providerSection'),
    provList: document.querySelector('.provider-list'),
    phoneSec: document.getElementById('phoneInputSection'),
    phoneInp: document.getElementById('userPhone'),
    btn: document.getElementById('whatsappBtn'),
    summary: document.getElementById('summaryBox'),
    sumAmt: document.getElementById('summaryAmount'),
    sumPrv: document.getElementById('summaryProvider'),
    sumPhn: document.getElementById('summaryUserPhone'),
    openPrices: document.getElementById('openPricesBtn'),
    downloadApp: document.getElementById('downloadAppBtn'),
    openPrivacy: document.getElementById('openPrivacyBtn'),
    pricesModal: document.getElementById('pricesModal'),
    privacyModal: document.getElementById('privacyModal'),
    closePrices: document.getElementById('closePricesModal'),
    closePrivacy: document.getElementById('closePrivacyModal'),
    progressSteps: document.querySelectorAll('.progress-step'),
    notification: document.getElementById('notification'),
    promotionBanner: document.getElementById('promotionBanner'),
    closePromotion: document.getElementById('closePromotion')
  };

  // Utilidades
  const utils = {
    sanitizePhone: (str) => str.replace(/[^\d+]/g, ''),
    
    validateCubanPhone: (phone) => {
      const cleanPhone = phone.replace(/\D/g, '');
      return /^(53)?5\d{7}$/.test(cleanPhone);
    },
    
    showNotification: (message, type = 'success', duration = 4000) => {
      el.notification.textContent = message;
      el.notification.className = `notification ${type} show`;
      
      setTimeout(() => {
        el.notification.classList.remove('show');
      }, duration);
    },
    
    updateStep: (step) => {
      state.step = step;
      el.progressSteps.forEach((stepEl, index) => {
        if (index + 1 <= step) {
          stepEl.classList.add('active');
        } else {
          stepEl.classList.remove('active');
        }
      });
    },
    
    saveState: () => {
      try {
        localStorage.setItem('sojoloState', JSON.stringify({
          amount: state.amount,
          userPhone: state.userPhone
        }));
      } catch (e) {
        console.warn('No se pudo guardar el estado:', e);
      }
    },
    
    loadState: () => {
      try {
        const savedState = localStorage.getItem('sojoloState');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.amount) {
            state.amount = parsed.amount;
            el.sumAmt.textContent = state.amount;
          }
          if (parsed.userPhone) {
            state.userPhone = parsed.userPhone;
            el.phoneInp.value = parsed.userPhone;
            el.sumPhn.textContent = state.userPhone;
          }
        }
      } catch (e) {
        console.warn('No se pudo cargar el estado guardado:', e);
      }
    },

    showPromotion: () => {
      if (state.promotionShown) {
        el.promotionBanner.classList.add('show');
      }
    },

    hidePromotion: () => {
      el.promotionBanner.classList.remove('show');
      localStorage.setItem('promotionShown', 'true');
      state.promotionShown = false;
    },

    // API para obtener proveedores
    fetchProviders: async () => {
      try {
        // En una implementación real, esto sería una llamada a tu API
        // Por ahora simulamos una respuesta con algunos proveedores no disponibles
        const mockProviders = [
          { id: 1, name: "Proveedor 1", phone: "+53 5 6584673", available: true },
          { id: 2, name: "Proveedor 2", phone: "+53 5 0728907", available: true },
          { id: 3, name: "Proveedor 3", phone: "+53 5 5384257", available: true },
          { id: 4, name: "Proveedor 4", phone: "+53 63175552", available: true },
          { id: 5, name: "Proveedor 5", phone: "+53 50369270", available: false }
        ];
        
        // Simular más proveedores para demostrar la funcionalidad de scroll
        for (let i = 6; i <= 100; i++) {
          mockProviders.push({
            id: i,
            name: `Proveedor ${i}`,
            phone: `+53 5${Math.floor(1000000 + Math.random() * 9000000)}`,
            available: Math.random() > 100 // 70% de disponibilidad
          });
        }
        
        return mockProviders;
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
        return [];
      }
    },

    // Renderizar lista de proveedores
    renderProviders: (providers) => {
      el.provList.innerHTML = '';
      
      providers.forEach(provider => {
        const providerEl = document.createElement('div');
        providerEl.className = `option provider-item ${provider.available ? '' : 'disabled'}`;
        providerEl.dataset.provider = provider.phone;
        providerEl.dataset.available = provider.available;
        
        providerEl.innerHTML = `
          <div class="provider-info">
            <span class="provider-name">${provider.name}</span>
            <span class="status ${provider.available ? 'available' : 'unavailable'}">
              ${provider.available ? 'Disponible' : 'No disponible'}
            </span>
          </div>
        `;
        
        if (provider.available) {
          providerEl.addEventListener('click', () => selectProvider(provider));
          providerEl.setAttribute('role', 'button');
          providerEl.setAttribute('tabindex', '0');
          
          providerEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              providerEl.click();
            }
          });
        }
        
        el.provList.appendChild(providerEl);
      });
    },

    // Iniciar notificaciones recurrentes
    startRecurrentNotifications: () => {
      let notificationIndex = 0;
      
      // Mostrar primera notificación después de 5 segundos
      setTimeout(() => {
        utils.showNotification(state.notifications[0], 'info', 5000);
        notificationIndex = 1;
      }, 5000);
      
      // Configurar intervalo para notificaciones recurrentes
      state.notificationInterval = setInterval(() => {
        if (notificationIndex < state.notifications.length) {
          utils.showNotification(state.notifications[notificationIndex], 'info', 5000);
          notificationIndex = (notificationIndex + 1) % state.notifications.length;
        }
      }, 30000); // Cada 30 segundos
    },

    // Detener notificaciones
    stopRecurrentNotifications: () => {
      if (state.notificationInterval) {
        clearInterval(state.notificationInterval);
        state.notificationInterval = null;
      }
    },

    // Verificar si las notificaciones están permitidas
    checkNotificationPermission: () => {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    },

    // Mostrar notificación del sistema
    showSystemNotification: (title, body) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    }
  };

  // Funciones de selección
  const selectProvider = (provider) => {
    if (!provider.available) return;
    
    document.querySelectorAll('.provider-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedEl = Array.from(document.querySelectorAll('.provider-item'))
      .find(el => el.dataset.provider === provider.phone);
    
    if (selectedEl) {
      selectedEl.classList.add('selected');
    }
    
    state.provider = provider.phone;
    el.phoneSec.style.display = 'block';
    el.phoneInp.focus();
    utils.updateStep(3);
    updateUI();
    utils.showNotification('Proveedor seleccionado', 'success');
  };

  // Actualizar UI
  const updateUI = () => {
    el.sumAmt.textContent = state.amount || '—';
    el.sumPrv.textContent = state.provider ? `Proveedor ${state.provider.split(' ')[2]}` : '—';
    el.sumPhn.textContent = state.userPhone || '—';
    
    el.summary.classList.toggle('show', !!state.amount && !!state.provider);
    
    const isPhoneValid = utils.validateCubanPhone(state.userPhone);
    el.btn.disabled = !(state.amount && state.provider && isPhoneValid);
    
    if (state.amount && !state.provider) {
      utils.updateStep(2);
    } else if (state.amount && state.provider && !state.userPhone) {
      utils.updateStep(3);
    } else if (state.amount && state.provider && state.userPhone) {
      utils.updateStep(4);
    }
    
    utils.saveState();

    if (state.amount && state.provider && state.userPhone) {
      setTimeout(utils.showPromotion, 2000);
    }
  };

  // Inicialización
  const init = async () => {
    utils.loadState();
    utils.checkNotificationPermission();
    
    // Cargar proveedores
    state.providers = await utils.fetchProviders();
    utils.renderProviders(state.providers);
    
    // Iniciar notificaciones recurrentes
    utils.startRecurrentNotifications();
    
    // Mostrar banner promocional después de 8 segundos
    setTimeout(() => {
      if (Math.random() < 0.8) {
        utils.showPromotion();
      }
    }, 8000);
    
    // Event Listeners
    el.downloadApp.addEventListener('click', () => {
      window.open('https://github.com/sojololite/cell/raw/refs/heads/main/Sojolo%20Cell.apk', '_blank');
      utils.showNotification('Descargando aplicación...', 'success');
    });

    el.amountOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        el.amountOpts.forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        state.amount = `${opt.dataset.amount} CUP`;
        el.provSec.style.display = 'block';
        utils.updateStep(2);
        updateUI();
        utils.showNotification(`Cantidad seleccionada: ${state.amount}`, 'success');
      });
      
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          opt.click();
        }
      });
    });

    el.customOpt.addEventListener('click', () => {
      const isActive = el.customDiv.style.display === 'block';
      el.amountOpts.forEach((o) => o.classList.remove('selected'));
      el.customOpt.classList.toggle('selected', !isActive);
      el.customDiv.style.display = isActive ? 'none' : 'block';
      if (!isActive) el.customInp.focus();
      state.amount = isActive ? null : '';
      el.provSec.style.display = isActive ? 'none' : 'none';
      utils.updateStep(isActive ? 1 : 2);
      updateUI();
      
      if (!isActive) {
        utils.showNotification('Ingresa la cantidad deseada', 'info');
      }
    });

    el.customInp.addEventListener('input', () => {
      const val = el.customInp.value.trim();
      state.amount = val && !isNaN(val) && Number(val) > 0 ? `${val} CUP` : null;
      el.provSec.style.display = state.amount ? 'block' : 'none';
      utils.updateStep(state.amount ? 2 : 1);
      updateUI();
    });

    el.phoneInp.addEventListener('input', () => {
      state.userPhone = utils.sanitizePhone(el.phoneInp.value);
      
      if (state.userPhone && !utils.validateCubanPhone(state.userPhone)) {
        el.phoneInp.style.borderColor = 'var(--error)';
        utils.showNotification('Formato de teléfono incorrecto', 'error', 3000);
      } else {
        el.phoneInp.style.borderColor = 'var(--border)';
      }
      
      updateUI();
    });

    el.btn.addEventListener('click', () => {
      if (!state.amount || !state.provider || !state.userPhone) return;
      
      if (!utils.validateCubanPhone(state.userPhone)) {
        utils.showNotification('Por favor, ingresa un número de teléfono válido', 'error');
        el.phoneInp.focus();
        return;
      }
      
      const msg = `Hola, lo contacte atravez de la plataforma Sojolo Cell, necesito una transferencia de saldo, mi número es: ${state.userPhone} por un monto de ${state.amount}. ¡dígame cómo sería el pago!`;
      const providerNumber = state.provider.replace(/\D/g, '');
      const url = `https://wa.me/${providerNumber}?text=${encodeURIComponent(msg)}`;
      
      window.open(url, '_blank', 'noopener,noreferrer');
      utils.showNotification('Redirigiendo a WhatsApp...', 'success');
    });

    const openModal = (modal) => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = (modal) => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };

    el.openPrices.addEventListener('click', () => openModal(el.pricesModal));
    el.openPrivacy.addEventListener('click', () => openModal(el.privacyModal));
    el.closePrices.addEventListener('click', () => closeModal(el.pricesModal));
    el.closePrivacy.addEventListener('click', () => closeModal(el.privacyModal));

    [el.pricesModal, el.privacyModal].forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    el.closePromotion.addEventListener('click', utils.hidePromotion);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        [el.pricesModal, el.privacyModal].forEach(closeModal);
      }
    });

    // Limpiar recursos al salir
    window.addEventListener('beforeunload', () => {
      utils.stopRecurrentNotifications();
    });

    updateUI();
    utils.updateStep(1);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();