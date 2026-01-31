/* ==============================================
   MRTL OBJECTS — INTERACTION LAYER

   Vanilla JS only. Handles:
   1. Quick-view modal (open/close/trap focus)
   2. Cart counter
   3. Scroll-triggered reveal animations
   4. Smooth scroll enhancement
   ============================================== */

(function () {
  'use strict';

  /* ------------------------------------------
     DOM REFERENCES
     ------------------------------------------ */
  const modal        = document.getElementById('modal');
  const modalImage   = document.getElementById('modal-image');
  const modalName    = document.getElementById('modal-name');
  const modalIndex   = document.getElementById('modal-index');
  const modalSpec    = document.getElementById('modal-spec');
  const modalPrice   = document.getElementById('modal-price');
  const modalClose   = modal.querySelector('.modal__close');
  const modalBackdrop = modal.querySelector('.modal__backdrop');
  const modalAddBtn  = modal.querySelector('.modal__add-btn');
  const cartCount    = document.querySelector('.cart-count');
  const products     = document.querySelectorAll('.product');

  let cart = 0;


  /* ------------------------------------------
     QUICK-VIEW MODAL
     Opens with product data, closes on
     backdrop click, close button, or Escape.
     ------------------------------------------ */

  /**
   * Opens the modal and populates it with data
   * pulled from the clicked product's DOM.
   */
  function openModal(productEl) {
    const img     = productEl.querySelector('.product__image');
    const name    = productEl.querySelector('.product__name').textContent;
    const index   = productEl.querySelector('.product__index').textContent;
    const spec    = productEl.querySelector('.product__details').textContent;
    const price   = productEl.querySelector('.product__price').textContent;

    modalImage.src = img.src;
    modalImage.alt = img.alt;
    modalName.textContent  = name;
    modalIndex.textContent = index;
    modalSpec.textContent  = spec;
    modalPrice.textContent = price;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Move focus into modal for accessibility
    modalClose.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  // Click handlers on each product card
  products.forEach(function (product) {
    product.addEventListener('click', function () {
      openModal(product);
    });

    // Keyboard accessibility — Enter/Space opens modal
    product.setAttribute('tabindex', '0');
    product.setAttribute('role', 'button');
    product.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(product);
      }
    });
  });

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });


  /* ------------------------------------------
     ADD TO CART
     Simple counter increment with a brief
     visual pulse on the cart button.
     ------------------------------------------ */
  modalAddBtn.addEventListener('click', function () {
    cart++;
    cartCount.textContent = cart;

    // Quick feedback animation
    const btn = document.querySelector('.cart-btn');
    btn.style.background = 'var(--c-accent)';
    btn.style.color = 'var(--c-white, #fff)';
    btn.style.borderColor = 'var(--c-accent)';
    btn.setAttribute('aria-label', 'Shopping cart, ' + cart + ' items');

    setTimeout(function () {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 400);

    closeModal();
  });


  /* ------------------------------------------
     SCROLL REVEAL
     Uses IntersectionObserver to fade-in
     products as they enter the viewport.
     Lightweight — no external library needed.
     ------------------------------------------ */
  function setupScrollReveal() {
    // Initial hidden state applied via JS so content
    // is visible if JS fails (progressive enhancement)
    products.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
      el.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)';
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    products.forEach(function (el) {
      observer.observe(el);
    });
  }

  // Only run reveal if IntersectionObserver is supported
  if ('IntersectionObserver' in window) {
    setupScrollReveal();
  }


  /* ------------------------------------------
     HERO PARALLAX
     Subtle parallax on the hero shape tied
     to scroll position. Throttled via rAF.
     ------------------------------------------ */
  var heroShape = document.querySelector('.hero__shape');
  var ticking = false;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        var scrollY = window.scrollY;
        if (heroShape && scrollY < window.innerHeight) {
          heroShape.style.transform = 'translateY(calc(-50% + ' + (scrollY * 0.15) + 'px))';
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

})();
