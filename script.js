(function () {
  'use strict';

  const state = {
    amount: null,
    provider: null,
    userPhone: '',
  };

  const el = {
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
    openPrices: document.getElementById('openPricesBtn'),
    openPrivacy: document.getElementById('openPrivacyBtn'),
    pricesModal: document.getElementById('pricesModal'),
    privacyModal: document.getElementById('privacyModal'),
    closePrices: document.getElementById('closePricesModal'),
    closePrivacy: document.getElementById('closePrivacyModal'),
  };

  // Utils
  const sanitizePhone = (str) => str.replace(/[^\d+]/g, '');

  const updateUI = () => {
    el.sumAmt.textContent = state.amount || '—';
    el.sumPrv.textContent = state.provider || '—';
    el.sumPhn.textContent = state.userPhone || '—';
    el.summary.classList.toggle('show', !!state.amount && !!state.provider);
    el.btn.disabled = !(state.amount && state.provider && state.userPhone);
  };

  // Amount selection
  el.amountOpts.forEach((opt) => {
    opt.addEventListener('click', () => {
      el.amountOpts.forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      state.amount = `${opt.dataset.amount} CUP`;
      el.provSec.style.display = 'block';
      updateUI();
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
    updateUI();
  });

  el.customInp.addEventListener('input', () => {
    const val = el.customInp.value.trim();
    state.amount = val && !isNaN(val) && Number(val) > 0 ? `${val} CUP` : null;
    el.provSec.style.display = state.amount ? 'block' : 'none';
    updateUI();
  });

  // Provider selection
  el.provOpts.forEach((opt) => {
    opt.addEventListener('click', () => {
      el.provOpts.forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      state.provider = opt.dataset.provider;
      el.phoneSec.style.display = 'block';
      el.phoneInp.focus();
      updateUI();
    });
  });

  // User phone
  el.phoneInp.addEventListener('input', () => {
    state.userPhone = sanitizePhone(el.phoneInp.value);
    updateUI();
  });

  // WhatsApp action
  el.btn.addEventListener('click', () => {
    if (!state.amount || !state.provider || !state.userPhone) return;
    const msg = `Hola, solicito una transferencia de saldo a mi número ${state.userPhone} por un monto de ${state.amount}. ¡Gracias!`;
    const url = `https://wa.me/${state.provider.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  // Modales
  const openModal = (modal) => modal.classList.add('active');
  const closeModal = (modal) => modal.classList.remove('active');

  el.openPrices.addEventListener('click', () => openModal(el.pricesModal));
  el.openPrivacy.addEventListener('click', () => openModal(el.privacyModal));
  el.closePrices.addEventListener('click', () => closeModal(el.pricesModal));
  el.closePrivacy.addEventListener('click', () => closeModal(el.privacyModal));

  [el.pricesModal, el.privacyModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
})();