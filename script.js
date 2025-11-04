(function () {
  'use strict';

  // Estado de la aplicación
  const state = {
    amount: null,
    provider: null,
    userPhone: '',
    step: 1,
    promotionShown: localStorage.getItem('promotionShown') !== 'true'
  };

  // Referencias a elementos DOM
  const el = {
    // Elementos principales
    amountOpts: document.querySelectorAll('.option[data-amount]'),
    customOpt: document.getElementById('customOption'),
    customDiv: document.getElementById('customInputDiv'),
    customInp: document.getElementById('customAmountInput'),
    provSec: document.getElementById('providerSection'),
    provOpts: document.querySelectorAll('.provider-item'),
    phoneSec: document.getElementById('phoneInputSection'),
    phoneInp: document.getElementById('userPhone'),
    btn: document.getElementById('whatsappBtn'),
    summary: document.getElementById('summaryBox'),
    sumAmt: document.getElementById('summaryAmount'),
    sumPrv: document.getElementById('summaryProvider'),
    sumPhn: document.getElementById('summaryUserPhone'),
    
    // Modales
    openPrices: document.getElementById('openPricesBtn'),
    openPrivacy: document.getElementById('openPrivacyBtn'),
    pricesModal: document.getElementById('pricesModal'),
    privacyModal: document.getElementById('privacyModal'),
    closePrices: document.getElementById('closePricesModal'),
    closePrivacy: document.getElementById('closePrivacyModal'),
    
    // Nuevos elementos
    progressIndicator: document.getElementById('progressIndicator'),
    progressSteps: document.querySelectorAll('.progress-step'),
    notification: document.getElementById('notification'),
    promotionBanner: document.getElementById('promotionBanner'),
    closePromotion: document.getElementById('closePromotion')
  };

  // Utilidades
  const utils = {
    // Sanitizar número de teléfono
    sanitizePhone: (str) => str.replace(/[^\d+]/g, ''),
    
    // Validar número de teléfono cubano
    validateCubanPhone: (phone) => {
      const cleanPhone = phone.replace(/\D/g, '');
      return /^(53)?5\d{7}$/.test(cleanPhone);
    },
    
    // Mostrar notificación
    showNotification: (message, type = 'success', duration = 4000) => {
      el.notification.textContent = message;
      el.notification.className = `notification ${type} show`;
      
      setTimeout(() => {
        el.notification.classList.remove('show');
      }, duration);
    },
    
    // Actualizar paso actual
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
    
    // Guardar estado en localStorage
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
    
    // Cargar estado desde localStorage
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
    }
  };

  // Actualizar UI
  const updateUI = () => {
    // Actualizar resumen
    el.sumAmt.textContent = state.amount || '—';
    el.sumPrv.textContent = state.provider ? `Proveedor ${state.provider.split(' ')[2]}` : '—';
    el.sumPhn.textContent = state.userPhone || '—';
    
    // Mostrar/ocultar resumen
    el.summary.classList.toggle('show', !!state.amount && !!state.provider);
    
    // Habilitar/deshabilitar botón
    const isPhoneValid = utils.validateCubanPhone(state.userPhone);
    el.btn.disabled = !(state.amount && state.provider && isPhoneValid);
    
    // Actualizar paso actual
    if (state.amount && !state.provider) {
      utils.updateStep(2);
    } else if (state.amount && state.provider && !state.userPhone) {
      utils.updateStep(3);
    } else if (state.amount && state.provider && state.userPhone) {
      utils.updateStep(4);
    }
    
    // Guardar estado
    utils.saveState();
  };

  // Inicialización
  const init = () => {
    // Cargar estado guardado
    utils.loadState();
    
    // Configurar promoción inteligente
    if (state.promotionShown) {
      // Mostrar promoción después de 10 segundos o al completar una transacción
      setTimeout(() => {
        if (Math.random() < 0.7) { // 70% de probabilidad de mostrar
          el.promotionBanner.style.display = 'flex';
        }
      }, 10000);
    }
    
    // Selección de cantidad
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
      
      // Soporte para teclado
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          opt.click();
        }
      });
    });

    // Opción personalizada
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

    // Input de cantidad personalizada
    el.customInp.addEventListener('input', () => {
      const val = el.customInp.value.trim();
      state.amount = val && !isNaN(val) && Number(val) > 0 ? `${val} CUP` : null;
      el.provSec.style.display = state.amount ? 'block' : 'none';
      utils.updateStep(state.amount ? 2 : 1);
      updateUI();
    });

    // Selección de proveedor
    el.provOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        el.provOpts.forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        state.provider = opt.dataset.provider;
        el.phoneSec.style.display = 'block';
        el.phoneInp.focus();
        utils.updateStep(3);
        updateUI();
        utils.showNotification('Proveedor seleccionado', 'success');
      });
      
      // Soporte para teclado
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          opt.click();
        }
      });
    });

    // Input de teléfono del usuario
    el.phoneInp.addEventListener('input', () => {
      state.userPhone = utils.sanitizePhone(el.phoneInp.value);
      
      // Validación en tiempo real
      if (state.userPhone && !utils.validateCubanPhone(state.userPhone)) {
        el.phoneInp.style.borderColor = 'var(--error)';
        utils.showNotification('Formato de teléfono incorrecto', 'error', 3000);
      } else {
        el.phoneInp.style.borderColor = 'var(--border)';
      }
      
      updateUI();
    });

    // Acción de WhatsApp
    el.btn.addEventListener('click', () => {
      if (!state.amount || !state.provider || !state.userPhone) return;
      
      // Validación final
      if (!utils.validateCubanPhone(state.userPhone)) {
        utils.showNotification('Por favor, ingresa un número de teléfono válido', 'error');
        el.phoneInp.focus();
        return;
      }
      
      const msg = `Hola, solicito una transferencia de saldo a mi número ${state.userPhone} por un monto de ${state.amount}. ¡Gracias!`;
      const providerNumber = state.provider.replace(/\D/g, '');
      const url = `https://wa.me/${providerNumber}?text=${encodeURIComponent(msg)}`;
      
      // Registrar evento de conversión para la promoción inteligente
      if (Math.random() < 0.3) { // 30% de probabilidad después de una conversión
        el.promotionBanner.style.display = 'flex';
      }
      
      window.open(url, '_blank', 'noopener,noreferrer');
      utils.showNotification('Redirigiendo a WhatsApp...', 'success');
    });

    // Modales
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

    // Cerrar modal al hacer clic fuera
    [el.pricesModal, el.privacyModal].forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    // Cerrar promoción
    el.closePromotion.addEventListener('click', () => {
      el.promotionBanner.style.display = 'none';
      localStorage.setItem('promotionShown', 'true');
      state.promotionShown = false;
    });

    // Soporte para navegación por teclado
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        [el.pricesModal, el.privacyModal].forEach(closeModal);
      }
    });

    // Manejo de errores global
    window.addEventListener('error', (e) => {
      console.error('Error capturado:', e.error);
      utils.showNotification('Ha ocurrido un error inesperado', 'error');
    });

    // Prevenir navegación accidental
    window.addEventListener('beforeunload', (e) => {
      if (state.amount || state.provider || state.userPhone) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Inicializar UI
    updateUI();
    utils.updateStep(1);
  };

  // Iniciar aplicación cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();