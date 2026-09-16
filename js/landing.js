

(function () {
    'use strict';
    const urlParams = new URLSearchParams(window.location.search);
    const allowStay = urlParams.has('stay') || urlParams.has('preview');

    if (window.AuthService && window.AuthService.isAuthenticated() && !allowStay) {
        window.location.replace('home.html');
        return;
    }
    const IPAPO_SLIDES = [
        {
            image: 'img/ipapo_gateway.jpg',
            tag: 'Town Monument',
            location: 'Town Entrance, Ipapo',
            title: 'Welcome to Ipapo: The Home of Art & Culture',
            desc: 'The historic gateway welcoming all residents, visitors, and descendants to the peaceful town of Ipapo, Oyo State.'
        },
        {
            image: 'img/ippao.jpg',
            tag: 'Royal Heritage',
            location: 'Royal Palace, Ipapo',
            title: 'Kabiyesi Oba of Ipapo in Traditional Regalia',
            desc: 'The revered monarch seated in full beaded crown, embodying centuries of Yoruba tradition, royal dignity, and cultural leadership.'
        },
        {
            image: 'img/ipapo_aerial.jpg',
            tag: 'Town Panorama',
            location: 'Itesiwaju LGA Horizon',
            title: 'Panoramic Sunset Vista Over Ipapo',
            desc: 'Warm golden sunlight sweeping across green rolling hills, peaceful community centers, and the heartbeat of the town.'
        },
        {
            image: 'img/abuwe.jpg',
            tag: 'Indigenous Craft',
            location: 'Isale Baale Quarters',
            title: 'Historic Abuwe Black Soap Crafting',
            desc: 'Local women diligently continuing the age-old artisanal soap-making process that made Ipapo famous across Yorubaland.'
        },
        {
            image: 'img/building.jpg',
            tag: 'Civic Development',
            location: 'College of Education Axis',
            title: 'Ipapo Educational & Civic Institutions',
            desc: 'Modern multistory academic faculties and public halls expanding learning horizons for our youth.'
        },
        {
            image: 'img/school.jpg',
            tag: 'Youth & Sports',
            location: 'Muslim High School Stadium',
            title: 'Community Athletics & Inter-House Sports Meet',
            desc: 'Ipapo students in spirited competition, celebrating camaraderie, grassroots athletics, and community pride.'
        },
        {
            image: 'img/sport.jpg',
            tag: 'Local Champions',
            location: 'Community Pitch, Ipapo',
            title: 'Ipapo Grassroots Sports Laurels & Champions',
            desc: 'Honoring youth soccer champions and tournament standouts bringing glory to our community teams.'
        },
        {
            image: 'img/field.jpg',
            tag: 'Community Unity',
            location: 'Town Field, Ipapo',
            title: 'Ipapo Community Football Festival',
            desc: 'Spectators and teams gathering in unison on matchday, celebrating the unifying power of local football.'
        },
        {
            image: 'img/group.jpg',
            tag: 'Empowerment',
            location: 'FLDG Ipapo Center',
            title: 'FLDG Ipapo Scholarship Initiative',
            desc: 'Fostering academic excellence, tuition support, and student mentorship for higher education aspirations.'
        },
        {
            image: 'img/fipsupro.jpg',
            tag: 'Youth Leadership',
            location: 'Civic Assembly Hall',
            title: 'Federation of Ipapo Students’ Union (FIPSU)',
            desc: 'Empowering student leaders and civic ambassadors driving positive change and community development.'
        }
    ];
    let currentSlide = 0;
    let slideTimer = null;
    let progressTimer = null;
    const SLIDE_DURATION = 6000; 
    let progressStartTime = 0;
    let isPaused = false;
    const carouselContainer = document.getElementById('carouselContainer');
    const captionCard = document.getElementById('carouselCaptionCard');
    const thumbsContainer = document.getElementById('carouselThumbs');
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    const statusBar = document.getElementById('carouselStatusBar');
    const lpMenuBtn = document.getElementById('lpMenuBtn');
    const lpMobileMenu = document.getElementById('lpMobileMenu');
    if (lpMenuBtn && lpMobileMenu) {
        lpMenuBtn.addEventListener('click', () => {
            const isOpen = lpMobileMenu.classList.toggle('is-open');
            lpMenuBtn.setAttribute('aria-expanded', String(isOpen));
            lpMobileMenu.setAttribute('aria-hidden', String(!isOpen));
            lpMenuBtn.textContent = isOpen ? '✕' : '☰';
        });
        lpMobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
            lpMobileMenu.classList.remove('is-open');
            lpMenuBtn.setAttribute('aria-expanded', 'false');
            lpMobileMenu.setAttribute('aria-hidden', 'true');
            lpMenuBtn.textContent = '☰';
        }));
    }
    function initCarousel() {
        if (!carouselContainer) return;
        carouselContainer.innerHTML = '';
        IPAPO_SLIDES.forEach((slide, index) => {
            const slideEl = document.createElement('div');
            slideEl.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
            slideEl.setAttribute('data-index', index);
            slideEl.innerHTML = `
                <img class="carousel-slide-img" src="${slide.image}" alt="${slide.title}" loading="${index < 2 ? 'eager' : 'lazy'}">
            `;
            carouselContainer.appendChild(slideEl);
        });
        if (thumbsContainer) {
            thumbsContainer.innerHTML = '';
            IPAPO_SLIDES.forEach((slide, index) => {
                const thumbBtn = document.createElement('button');
                thumbBtn.type = 'button';
                thumbBtn.className = `thumb-btn ${index === 0 ? 'active' : ''}`;
                thumbBtn.title = slide.title;
                thumbBtn.setAttribute('aria-label', `View ${slide.title}`);
                thumbBtn.innerHTML = `<img src="${slide.image}" alt="${slide.title}">`;
                thumbBtn.addEventListener('click', () => {
                    goToSlide(index);
                });
                thumbsContainer.appendChild(thumbBtn);
            });
        }

        updateCaption(0);
        startSlideShow();
        const landingViewport = document.getElementById('landingViewport');
        if (landingViewport) {
            landingViewport.addEventListener('mouseenter', () => { isPaused = true; });
            landingViewport.addEventListener('mouseleave', () => { isPaused = false; });
        }
    }
    function updateCaption(index) {
        if (!captionCard) return;
        const slide = IPAPO_SLIDES[index];
        if (!slide) return;

        captionCard.style.animation = 'none';
        captionCard.offsetHeight; 
        captionCard.style.animation = 'fadeInSlideUp 0.5s ease-out';

        captionCard.innerHTML = `
            <div class="caption-meta">
                <span class="caption-tag">${slide.tag}</span>
                <span class="caption-location">📍 ${slide.location}</span>
            </div>
            <h4 class="caption-title">${slide.title}</h4>
            <p class="caption-desc">${slide.desc}</p>
        `;
    }
    function goToSlide(index) {
        if (index === currentSlide) return;

        const slides = document.querySelectorAll('.carousel-slide');
        const thumbs = document.querySelectorAll('.thumb-btn');

        if (slides[currentSlide]) slides[currentSlide].classList.remove('active');
        if (thumbs[currentSlide]) thumbs[currentSlide].classList.remove('active');

        currentSlide = (index + IPAPO_SLIDES.length) % IPAPO_SLIDES.length;

        if (slides[currentSlide]) slides[currentSlide].classList.add('active');
        if (thumbs[currentSlide]) {
            thumbs[currentSlide].classList.add('active');
            thumbs[currentSlide].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        updateCaption(currentSlide);
        resetTimer();
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }
    function startSlideShow() {
        progressStartTime = performance.now();
        clearInterval(slideTimer);
        cancelAnimationFrame(progressTimer);

        function updateProgress(now) {
            if (!isPaused) {
                const elapsed = now - progressStartTime;
                const pct = Math.min(100, (elapsed / SLIDE_DURATION) * 100);
                if (statusBar) statusBar.style.width = `${pct}%`;

                if (elapsed >= SLIDE_DURATION) {
                    nextSlide();
                    return;
                }
            } else {
                progressStartTime = performance.now();
            }
            progressTimer = requestAnimationFrame(updateProgress);
        }

        progressTimer = requestAnimationFrame(updateProgress);
    }

    function resetTimer() {
        progressStartTime = performance.now();
        if (statusBar) statusBar.style.width = '0%';
        cancelAnimationFrame(progressTimer);
        startSlideShow();
    }
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
    });
    const authModalOverlay = document.getElementById('authModalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const loginSection = document.getElementById('modalLoginSection');
    const registerSection = document.getElementById('modalRegisterSection');
    const modalTitle = document.getElementById('modalTitle');
    const modalSub = document.getElementById('modalSub');

    function openAuthModal(mode = 'login') {
        if (!authModalOverlay) return;
        authModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        isPaused = true;
        switchAuthTab(mode);
    }

    function closeAuthModal() {
        if (!authModalOverlay) return;
        authModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        isPaused = false;
        clearModalAlerts();
    }

    function switchAuthTab(mode) {
        clearModalAlerts();
        if (mode === 'register') {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            loginSection.style.display = 'none';
            registerSection.style.display = 'block';
            modalTitle.textContent = 'Create Resident Account';
            modalSub.textContent = 'Join Ipapo Broadcast community network for news, radio & civic updates.';
            const regFirstName = document.getElementById('regFirstName');
            if (regFirstName) regFirstName.focus();
        } else {
            tabLoginBtn.classList.add('active');
            tabRegisterBtn.classList.remove('active');
            loginSection.style.display = 'block';
            registerSection.style.display = 'none';
            modalTitle.textContent = 'Welcome to Ipapo Broadcast';
            modalSub.textContent = 'Log in to access your local news stream, radio & community portal.';
            const loginEmail = document.getElementById('modalLoginEmail');
            if (loginEmail) loginEmail.focus();
        }
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAuthModal);
    if (authModalOverlay) {
        authModalOverlay.addEventListener('click', (e) => {
            if (e.target === authModalOverlay) closeAuthModal();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModalOverlay && authModalOverlay.classList.contains('active')) {
            closeAuthModal();
        }
    });

    if (tabLoginBtn) tabLoginBtn.addEventListener('click', () => switchAuthTab('login'));
    if (tabRegisterBtn) tabRegisterBtn.addEventListener('click', () => switchAuthTab('register'));
    document.querySelectorAll('[data-auth-action="login"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
        });
    });

    document.querySelectorAll('[data-auth-action="register"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('register');
        });
    });
    function setupPasswordToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.textContent = isPassword ? '🙈' : '👁️';
            });
        }
    }

    setupPasswordToggle('toggleModalLoginPwd', 'modalLoginPwd');
    setupPasswordToggle('toggleRegPwd', 'regPassword');
    const demoResidentBtn = document.getElementById('demoResidentBtn');
    const demoAdminBtn = document.getElementById('demoAdminBtn');
    const modalLoginEmail = document.getElementById('modalLoginEmail');
    const modalLoginPwd = document.getElementById('modalLoginPwd');

    if (demoResidentBtn && modalLoginEmail && modalLoginPwd) {
        demoResidentBtn.addEventListener('click', () => {
            modalLoginEmail.value = 'resident@ipapo.ng';
            modalLoginPwd.value = 'Ipapo@2026!';
            clearModalAlerts();
        });
    }

    if (demoAdminBtn && modalLoginEmail && modalLoginPwd) {
        demoAdminBtn.addEventListener('click', () => {
            modalLoginEmail.value = 'admin@ipapo.ng';
            modalLoginPwd.value = 'Admin@2026!';
            clearModalAlerts();
        });
    }

    function clearModalAlerts() {
        const loginAlert = document.getElementById('modalLoginAlert');
        const regAlert = document.getElementById('modalRegAlert');
        if (loginAlert) { loginAlert.className = 'm-global-alert'; loginAlert.textContent = ''; }
        if (regAlert) { regAlert.className = 'm-global-alert'; regAlert.textContent = ''; }
    }
    const modalLoginForm = document.getElementById('modalLoginForm');
    const modalLoginSubmitBtn = document.getElementById('modalLoginSubmitBtn');
    const modalLoginAlert = document.getElementById('modalLoginAlert');

    if (modalLoginForm) {
        modalLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearModalAlerts();

            const identifier = modalLoginEmail.value.trim();
            const password = modalLoginPwd.value;
            const rememberMe = document.getElementById('modalRememberMe')?.checked || false;

            if (!identifier || !password) {
                if (modalLoginAlert) {
                    modalLoginAlert.className = 'm-global-alert error';
                    modalLoginAlert.textContent = 'Please enter both your email/username and password.';
                }
                return;
            }

            modalLoginSubmitBtn.disabled = true;
            modalLoginSubmitBtn.innerHTML = '<span>Verifying credentials...</span>';

            try {
                if (!window.AuthService) {
                    throw new Error('Authentication service unavailable.');
                }

                const user = await window.AuthService.login(identifier, password, rememberMe);

                if (modalLoginAlert) {
                    modalLoginAlert.className = 'm-global-alert success';
                    modalLoginAlert.textContent = `✓ Welcome back, ${user.firstName}! Directing to your Home Page...`;
                }
                setTimeout(() => {
                    window.location.replace('home.html');
                }, 600);

            } catch (err) {
                modalLoginSubmitBtn.disabled = false;
                modalLoginSubmitBtn.innerHTML = '<span>Sign In to Home Page →</span>';
                if (modalLoginAlert) {
                    modalLoginAlert.className = 'm-global-alert error';
                    modalLoginAlert.textContent = err.message || 'Login failed. Please verify credentials.';
                }
            }
        });
    }

    const modalRegisterForm = document.getElementById('modalRegisterForm');
    const modalRegSubmitBtn = document.getElementById('modalRegSubmitBtn');
    const modalRegAlert = document.getElementById('modalRegAlert');

    if (modalRegisterForm) {
        modalRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearModalAlerts();

            const firstName = document.getElementById('regFirstName')?.value.trim();
            const lastName = document.getElementById('regLastName')?.value.trim();
            const username = document.getElementById('regUsername')?.value.trim();
            const email = document.getElementById('regEmail')?.value.trim();
            const phone = document.getElementById('regPhone')?.value.trim();
            const location = document.getElementById('regLocation')?.value || 'Ipapo, Oyo State';
            const password = document.getElementById('regPassword')?.value;
            const confirmPassword = document.getElementById('regConfirmPassword')?.value;

            if (!firstName || !lastName || !username || !email || !password) {
                modalRegAlert.className = 'm-global-alert error';
                modalRegAlert.textContent = 'Please complete all required fields.';
                return;
            }

            if (password !== confirmPassword) {
                modalRegAlert.className = 'm-global-alert error';
                modalRegAlert.textContent = 'Passwords do not match. Please verify.';
                return;
            }

            modalRegSubmitBtn.disabled = true;
            modalRegSubmitBtn.innerHTML = '<span>Creating your account...</span>';

            try {
                if (!window.AuthService) {
                    throw new Error('Authentication service unavailable.');
                }

                const newUser = await window.AuthService.register({
                    firstName,
                    lastName,
                    username,
                    email,
                    phone,
                    location,
                    password
                });
                await window.AuthService.login(newUser.email, password, true);

                modalRegAlert.className = 'm-global-alert success';
                modalRegAlert.textContent = `✓ Account created! Welcome to Ipapo, ${newUser.firstName}! Taking you to Home...`;

                setTimeout(() => {
                    window.location.replace('home.html');
                }, 750);

            } catch (err) {
                modalRegSubmitBtn.disabled = false;
                modalRegSubmitBtn.innerHTML = '<span>Complete Sign Up & Enter →</span>';
                modalRegAlert.className = 'm-global-alert error';
                modalRegAlert.textContent = err.message || 'Registration failed.';
            }
        });
    }
    const lpHeader = document.getElementById('lpHeader');
    window.addEventListener('scroll', () => {
        if (lpHeader) {
            if (window.scrollY > 40) {
                lpHeader.classList.add('scrolled');
            } else {
                lpHeader.classList.remove('scrolled');
            }
        }
    });
    document.querySelectorAll('.photo-card[data-slide-target]').forEach(card => {
        card.addEventListener('click', () => {
            const targetIdx = parseInt(card.getAttribute('data-slide-target'), 10);
            if (!isNaN(targetIdx)) {
                goToSlide(targetIdx);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
    document.addEventListener('DOMContentLoaded', () => {
        initCarousel();
    });

})();

const locationInput = document.getElementById("regLocation");
const suggestionsBox = document.getElementById("locationSuggestions");
const locationOptions = document.querySelectorAll(".location-option");

locationInput.addEventListener("focus", () => {
    suggestionsBox.classList.add("show");
});

locationInput.addEventListener("input", () => {

    const searchValue = locationInput.value.toLowerCase().trim();

    let hasResults = false;

    locationOptions.forEach(option => {

        const text = option.textContent.toLowerCase();

        if (text.includes(searchValue)) {
            option.style.display = "block";
            hasResults = true;
        } else {
            option.style.display = "none";
        }

    });

    suggestionsBox.classList.toggle("show", hasResults);
});


locationOptions.forEach(option => {

    option.addEventListener("click", () => {

        const selectedLocation = option.dataset.value;

        locationInput.value = selectedLocation;

        suggestionsBox.classList.remove("show");

    });

});


document.addEventListener("click", (event) => {

    if (!event.target.closest(".location-search-group")) {
        suggestionsBox.classList.remove("show");
    }

});
