

const menuToggle = document.getElementById("menu-toggle");
const navbar = document.getElementById("navbar");

if (menuToggle && navbar) {
    menuToggle.addEventListener("click", () => {
        navbar.classList.toggle("active");
        const isOpen = navbar.classList.contains("active");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.textContent = isOpen ? "✕" : "☰";
    });
}

const navLinks = document.querySelectorAll(".nav-link");
navLinks.forEach(link => {
    link.addEventListener("click", () => {
        if (navbar) {
            navbar.classList.remove("active");
        }
        if (menuToggle) {
            menuToggle.textContent = "☰";
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });
});

const header = document.getElementById("header");
window.addEventListener("scroll", () => {
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }
});

const sections = document.querySelectorAll("section[id]");
window.addEventListener("scroll", () => {
    if (!sections.length) return;
    let current = "";

    function initHeaderGSAP() {
        if (typeof gsap === 'undefined') return;
        gsap.to('#header', { y: 6, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to('.logo', { scale: 1.02, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.from('.navbar .nav-link', { y: -8, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out' });
    }

    if (typeof gsap !== 'undefined') {
        initHeaderGSAP();
    }

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 150;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute("id");
        }
    });
    navLinks.forEach(link => {
        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
        }
    });
});

const revealElements = document.querySelectorAll(".reveal");
if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
}

const liveBtn = document.getElementById("liveBtn");
if (liveBtn) {
    liveBtn.addEventListener("click", () => {
        const liveSection = document.getElementById("live");
        if (liveSection) {
            liveSection.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            window.location.href = "live.html";
        }
    });
}

const latestNewsBtn = document.querySelector('.hero-buttons .btn-outline');
if (latestNewsBtn) {
    latestNewsBtn.addEventListener('click', (e) => {
        const newsSection = document.getElementById('news');
        if (newsSection) {
            e.preventDefault();
            newsSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.location.href = "news.html";
        }
    });
}

const audioToggle = document.getElementById("audioToggle");
if (audioToggle) {
    audioToggle.addEventListener("click", () => {
        const isLive = audioToggle.dataset.live === "true";
        audioToggle.dataset.live = String(!isLive);
        audioToggle.innerHTML = isLive
            ? '<span>▶</span> Listen Live'
            : '<span>⏸</span> Listening Now';
        audioToggle.classList.toggle("is-live", !isLive);

        const visualizer = document.querySelector('.audio-visualizer');
        if (visualizer) {
            visualizer.classList.toggle('paused', isLive);
        }
    });
}

const scrollTop = document.getElementById("scrollTop");
if (scrollTop) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > 500) {
            scrollTop.classList.add("show");
        } else {
            scrollTop.classList.remove("show");
        }
    });

    scrollTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

window.addEventListener("load", () => {
    document.body.classList.add("loaded");
    initUserNavbar();
});

// Contact Form
const contactForm = document.getElementById("contactForm");
const formSuccess = document.getElementById("formSuccess");
const submitBtn = document.getElementById("submitBtn");

if (contactForm && formSuccess && submitBtn) {
    contactForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        submitBtn.textContent = "Sending...";
        submitBtn.disabled = true;

        const formData = new FormData(contactForm);

        try {
            const response = await fetch(contactForm.action, {
                method: "POST",
                body: formData,
                headers: {
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                contactForm.reset();
                formSuccess.classList.add("show");
                submitBtn.textContent = "Message Sent ✓";
                if (window.showToast) window.showToast("Message sent successfully to Ipapo Broadcast!", "success");

                setTimeout(() => {
                    formSuccess.classList.remove("show");
                    submitBtn.textContent = "Send Message →";
                    submitBtn.disabled = false;
                }, 4000);
            } else {
                throw new Error("Failed to send");
            }
        } catch (error) {
            submitBtn.textContent = "Try Again";
            submitBtn.disabled = false;
            if (window.showToast) window.showToast("Note: Offline demo simulated. Message recorded!", "info");
            console.error(error);
        }
    });
}

// Newsletter Form
const newsletterForm = document.getElementById("newsletterForm");
const newsletterSuccess = document.getElementById("newsletterSuccess");

if (newsletterForm && newsletterSuccess) {
    newsletterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const emailInput = newsletterForm.querySelector("input[type='email']");
        if (emailInput && emailInput.value.trim()) {
            newsletterSuccess.classList.add("show");
            if (window.showToast) window.showToast("Thank you for subscribing to Ipapo Broadcast alerts!", "success");
            newsletterForm.reset();
        }
    });
}

const storyModal = document.getElementById("storyModal");
const storyTag = document.getElementById("storyTag");
const storyTitle = document.getElementById("storyTitle");
const storyMeta = document.getElementById("storyMeta");
const storyText = document.getElementById("storyText");
const storyClose = document.querySelector(".story-close");
const cardLinks = document.querySelectorAll(".card-link");

if (storyModal && storyTag && storyTitle && storyMeta && storyText && storyClose) {
    const openStory = (button) => {
        const title = button.dataset.title || "More details";
        const tag = button.dataset.tag || "Story";
        const meta = button.dataset.meta || "Community update";
        const text = button.dataset.text || "Learn more about this feature and the value it brings to the community.";

        storyTag.textContent = tag;
        storyTitle.textContent = title;
        storyMeta.textContent = meta;
        storyText.textContent = text;
        storyModal.classList.add("show");
        storyModal.setAttribute("aria-hidden", "false");
    };

    cardLinks.forEach((button) => {
        button.addEventListener("click", () => openStory(button));
    });

    storyClose.addEventListener("click", () => {
        storyModal.classList.remove("show");
        storyModal.setAttribute("aria-hidden", "true");
    });

    storyModal.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement && event.target.dataset.close === "true") {
            storyModal.classList.remove("show");
            storyModal.setAttribute("aria-hidden", "true");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            storyModal.classList.remove("show");
            storyModal.setAttribute("aria-hidden", "true");
        }
    });
}
const assistantBtn = document.getElementById('assistantBtn');
const assistantPanel = document.getElementById('assistantPanel');
const assistant = document.getElementById('assistant');

if (assistantBtn && assistantPanel) {
    assistantBtn.addEventListener('click', () => {
        const isOpen = assistantPanel.classList.toggle('open');
        assistantBtn.setAttribute('aria-expanded', String(isOpen));
        assistantPanel.setAttribute('aria-hidden', String(!isOpen));
        if (isOpen) {
            const first = assistantPanel.querySelector('.assistant-option');
            if (first) first.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!assistant) return;
        if (!assistant.contains(e.target) && assistantPanel.classList.contains('open')) {
            assistantPanel.classList.remove('open');
            assistantPanel.setAttribute('aria-hidden', 'true');
            assistantBtn.setAttribute('aria-expanded', 'false');
        }
    });

    const assistantOptions = document.querySelectorAll('.assistant-option');
    assistantOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const target = opt.dataset.target;
            assistantPanel.classList.remove('open');
            assistantPanel.setAttribute('aria-hidden', 'true');
            assistantBtn.setAttribute('aria-expanded', 'false');

            const section = document.getElementById(target);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                if (target === 'live') window.location.href = 'live.html';
                else if (target === 'news') window.location.href = 'news.html';
                else if (target === 'services') window.location.href = 'programs.html';
                else if (target === 'contact') window.location.href = 'contact.html';
                else if (target === 'community') window.location.href = 'community.html';
            }
        });
    });
}

const hero = document.querySelector('.hero');
const heroContent = document.querySelector('.hero-content');
if (hero && heroContent) {
    hero.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 18;
        const y = (e.clientY / window.innerHeight - 0.5) * 12;
        heroContent.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    hero.addEventListener('mouseleave', () => {
        heroContent.style.transform = '';
    });
}

function initUserNavbar() {
    const header = document.getElementById("header");
    if (!header) return;

    let userWrap = document.getElementById("headerUserWrap");
    if (!userWrap) {
        userWrap = document.createElement("div");
        userWrap.id = "headerUserWrap";
        userWrap.className = "user-menu-wrap";
        const menuToggle = document.getElementById("menu-toggle");
        if (menuToggle) {
            header.insertBefore(userWrap, menuToggle);
        } else {
            header.appendChild(userWrap);
        }
    }

    const currentUser = window.AuthService ? window.AuthService.getCurrentUser() : null;
    const unreadCount = window.DashboardService ? window.DashboardService.getUnreadCount() : 0;

    if (currentUser) {
        const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
        userWrap.innerHTML = `
            <button class="user-pill-btn" id="userPillBtn" type="button" aria-expanded="false" aria-label="User account menu">
                <img class="user-pill-avatar" src="${currentUser.avatar || 'img/people.jpg'}" alt="${currentUser.firstName}">
                <span>${currentUser.firstName}</span>
                ${unreadCount > 0 ? `<span style="background:var(--primary);color:#111;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;">${unreadCount}</span>` : ''}
                <small style="font-size:10px;opacity:0.7;">▼</small>
            </button>
            <div class="user-dropdown" id="userDropdown" role="menu">
                <div class="dropdown-user-info">
                    <strong>${currentUser.firstName} ${currentUser.lastName}</strong>
                    <span>${currentUser.email}</span>
                </div>
                <a href="dashboard.html" role="menuitem">📊 Dashboard</a>
                <a href="profile.html" role="menuitem">⚙️ Profile & Settings</a>
                <a href="saved-news.html" role="menuitem">🔖 Saved News</a>
                <a href="notifications.html" role="menuitem">🔔 Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}</a>
                ${isAdmin ? `<a href="admin/admin-dashboard.html" role="menuitem" style="color:var(--primary);font-weight:700;">👑 Admin Portal</a>` : ''}
                <button class="logout-item" id="logoutBtn" type="button" role="menuitem">🚪 Log Out</button>
            </div>
        `;

        const pillBtn = document.getElementById("userPillBtn");
        const dropdown = document.getElementById("userDropdown");
        const logoutBtn = document.getElementById("logoutBtn");

        if (pillBtn && dropdown) {
            pillBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.classList.toggle("open");
                pillBtn.setAttribute("aria-expanded", String(dropdown.classList.contains("open")));
            });

            document.addEventListener("click", (e) => {
                if (!userWrap.contains(e.target)) {
                    dropdown.classList.remove("open");
                    pillBtn.setAttribute("aria-expanded", "false");
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                if (window.AuthService) {
                    window.AuthService.logout();
                }
                window.location.replace("index.html");
            });
        }
    } else {
        userWrap.innerHTML = `
            <a href="login.html" class="btn-outline" style="min-height:36px;padding:0 16px;font-size:12.5px;border-radius:30px;text-decoration:none;">
                Log In
            </a>
        `;
    }
}

window.addEventListener('ipapo:auth-changed', initUserNavbar);
window.addEventListener('ipapo:notifications-changed', initUserNavbar);

// Global Toast Notification Helper
window.showToast = function (message, type = 'info') {
    let toast = document.getElementById("ipapoToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "ipapoToast";
        toast.className = "auth-toast";
        document.body.appendChild(toast);
    }
    toast.className = `auth-toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
    toast.innerHTML = `<span>${type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️'}</span> <div>${message}</div>`;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
};
