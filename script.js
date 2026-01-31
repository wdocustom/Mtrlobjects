/* ==============================================
   MRTL OBJECTS — INTERACTION LAYER
   Minh Pham-inspired interactions

   Features:
   1. Page loader with timed dismiss
   2. Custom cursor (dot + circle, grows on hover)
   3. Header scroll state
   4. Hover image reveal on product list
   5. Quick-view modal
   6. Cart counter
   7. Scroll-triggered reveal animations
   8. Word-by-word text reveal on scroll
   9. Featured section parallax
   ============================================== */

(function () {
  'use strict';

  /* ------------------------------------------
     1. PAGE LOADER
     Dismiss after bar animation completes
     ------------------------------------------ */
  var loader = document.querySelector('.loader');

  window.addEventListener('load', function () {
    setTimeout(function () {
      loader.classList.add('is-done');
    }, 2200);
  });


  /* ------------------------------------------
     2. CUSTOM CURSOR
     Small dot follows instantly, larger circle
     follows with eased delay (lerp). Grows
     when hovering interactive elements.
     ------------------------------------------ */
  var cursorDot    = document.querySelector('.cursor__dot');
  var cursorCircle = document.querySelector('.cursor__circle');
  var mouseX = 0, mouseY = 0;
  var circleX = 0, circleY = 0;
  var isCursorDevice = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (isCursorDevice && cursorDot && cursorCircle) {
    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Dot follows instantly
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top  = mouseY + 'px';
    });

    // Circle follows with lerp (linear interpolation)
    function animateCursor() {
      circleX += (mouseX - circleX) * 0.12;
      circleY += (mouseY - circleY) * 0.12;
      cursorCircle.style.left = circleX + 'px';
      cursorCircle.style.top  = circleY + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Grow cursor on hoverable elements
    var hoverTargets = document.querySelectorAll('a, button, .work__item');
    hoverTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        document.body.classList.add('cursor-hover');
      });
      el.addEventListener('mouseleave', function () {
        document.body.classList.remove('cursor-hover');
      });
    });
  }


  /* ------------------------------------------
     3. HEADER SCROLL STATE
     Add background blur when scrolled past
     a small threshold
     ------------------------------------------ */
  var header = document.querySelector('.site-header');
  var scrollThreshold = 80;

  function onHeaderScroll() {
    if (window.scrollY > scrollThreshold) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  window.addEventListener('scroll', onHeaderScroll, { passive: true });


  /* ------------------------------------------
     4. HOVER IMAGE REVEAL
     When hovering a work__item, show a floating
     image that tracks the cursor position.
     Minh Pham signature interaction.
     ------------------------------------------ */
  var imageReveal    = document.querySelector('.work__image-reveal');
  var imageRevealImg = document.querySelector('.work__image-reveal-img');
  var workItems      = document.querySelectorAll('.work__item');
  var revealX = 0, revealY = 0;
  var targetRevealX = 0, targetRevealY = 0;
  var isRevealing = false;

  // Smooth follow for the image reveal container
  function animateReveal() {
    if (isRevealing) {
      revealX += (targetRevealX - revealX) * 0.1;
      revealY += (targetRevealY - revealY) * 0.1;
      imageReveal.style.left = revealX + 'px';
      imageReveal.style.top  = revealY + 'px';
    }
    requestAnimationFrame(animateReveal);
  }

  if (imageReveal && isCursorDevice) {
    animateReveal();

    workItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        var imgSrc = item.getAttribute('data-img');
        if (imgSrc) {
          imageRevealImg.src = imgSrc;
          imageReveal.classList.add('is-visible');
          isRevealing = true;
        }
      });

      item.addEventListener('mousemove', function (e) {
        // Offset from cursor so image doesn't overlap text
        targetRevealX = e.clientX - 175;
        targetRevealY = e.clientY - 215;
      });

      item.addEventListener('mouseleave', function () {
        imageReveal.classList.remove('is-visible');
        isRevealing = false;
      });
    });
  }


  /* ------------------------------------------
     5. QUICK-VIEW MODAL
     Click a work item to open the modal.
     Close via backdrop, X button, or Escape.
     ------------------------------------------ */
  var modal        = document.getElementById('modal');
  var modalImage   = document.getElementById('modal-image');
  var modalName    = document.getElementById('modal-name');
  var modalIndex   = document.getElementById('modal-index');
  var modalSpec    = document.getElementById('modal-spec');
  var modalPrice   = document.getElementById('modal-price');
  var modalClose   = modal.querySelector('.modal__close');
  var modalBackdrop = modal.querySelector('.modal__backdrop');
  var modalAddBtn  = modal.querySelector('.modal__add-btn');

  function openModal(item) {
    modalImage.src          = item.getAttribute('data-img');
    modalImage.alt          = item.getAttribute('data-name');
    modalName.textContent   = item.getAttribute('data-name');
    modalIndex.textContent  = item.getAttribute('data-index');
    modalSpec.textContent   = item.getAttribute('data-spec');
    modalPrice.textContent  = item.getAttribute('data-price');

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  workItems.forEach(function (item) {
    item.addEventListener('click', function () {
      openModal(item);
    });

    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(item);
      }
    });
  });

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });


  /* ------------------------------------------
     6. CART COUNTER
     ------------------------------------------ */
  var cart = 0;
  var cartCountEl = document.querySelector('.cart-count');
  var cartBtn = document.querySelector('.cart-btn');

  modalAddBtn.addEventListener('click', function () {
    cart++;
    cartCountEl.textContent = cart;
    cartBtn.setAttribute('aria-label', 'Shopping cart, ' + cart + ' items');

    // Accent flash feedback
    cartCountEl.style.transform = 'scale(1.4)';
    cartCountEl.style.transition = 'transform 0.3s cubic-bezier(0.16,1,0.3,1)';
    setTimeout(function () {
      cartCountEl.style.transform = 'scale(1)';
    }, 300);

    closeModal();
  });


  /* ------------------------------------------
     7. SCROLL REVEAL
     IntersectionObserver-based. Elements with
     [data-reveal] fade up when visible.
     ------------------------------------------ */
  var revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: show everything
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }


  /* ------------------------------------------
     8. WORD-BY-WORD TEXT REVEAL
     The about paragraph text reveals word by
     word as user scrolls through it.
     Minh Pham-style progressive text highlight.
     ------------------------------------------ */
  var aboutText = document.querySelector('[data-reveal-lines]');

  if (aboutText) {
    // Wrap each word in a span
    var rawText = aboutText.textContent.trim();
    var words = rawText.split(/\s+/);
    aboutText.innerHTML = words.map(function (word) {
      return '<span class="word">' + word + '</span>';
    }).join(' ');

    var wordSpans = aboutText.querySelectorAll('.word');

    function updateWordReveal() {
      var rect = aboutText.getBoundingClientRect();
      var windowH = window.innerHeight;

      // Progress: 0 when element enters bottom, 1 when top reaches center
      var progress = 1 - (rect.top / (windowH * 0.7));
      progress = Math.max(0, Math.min(1, progress));

      var wordsToReveal = Math.floor(progress * wordSpans.length);

      wordSpans.forEach(function (span, i) {
        if (i < wordsToReveal) {
          span.classList.add('is-visible');
        } else {
          span.classList.remove('is-visible');
        }
      });
    }

    window.addEventListener('scroll', updateWordReveal, { passive: true });
    updateWordReveal(); // Initial check
  }


  /* ------------------------------------------
     9. FEATURED PARALLAX
     Subtle vertical offset on the featured
     background image tied to scroll.
     ------------------------------------------ */
  var featuredImage = document.querySelector('.featured__image-wrap');

  if (featuredImage) {
    function updateParallax() {
      var rect = featuredImage.getBoundingClientRect();
      var windowH = window.innerHeight;

      if (rect.bottom > 0 && rect.top < windowH) {
        var progress = (windowH - rect.top) / (windowH + rect.height);
        var offset = (progress - 0.5) * 60; // +-30px
        featuredImage.style.transform = 'translateY(' + offset + 'px)';
      }
    }

    window.addEventListener('scroll', updateParallax, { passive: true });
  }


  /* ------------------------------------------
     10. SMOOTH ANCHOR SCROLLING
     Override default jump behavior for # links
     ------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
