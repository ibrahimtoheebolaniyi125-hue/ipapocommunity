document.addEventListener("DOMContentLoaded", () => {

const menuButton = document.querySelector(".advertise-menu-btn");
const mobileMenu = document.querySelector(".advertise-mobile-menu");

if (menuButton && mobileMenu) {

    menuButton.addEventListener("click", (event) => {
        event.stopPropagation();

        const isOpen = mobileMenu.classList.toggle("active");

        menuButton.classList.toggle("active", isOpen);
        menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    // Close mobile menu when a link is clicked
    mobileMenu.querySelectorAll("a").forEach((link) => {

        link.addEventListener("click", () => {
            mobileMenu.classList.remove("active");
            menuButton.classList.remove("active");
            menuButton.setAttribute("aria-expanded", "false");
        });

    });
}


/* =====================================================
   HEADER SCROLL EFFECT
===================================================== */

const header = document.querySelector(".advertise-header");

function handleHeaderScroll() {

    if (!header) return;

    if (window.scrollY > 40) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
}

window.addEventListener("scroll", handleHeaderScroll, {
    passive: true
});

handleHeaderScroll();


/* =====================================================
   REVEAL ELEMENTS ON SCROLL
===================================================== */

const revealElements = document.querySelectorAll(".reveal-ad");

if ("IntersectionObserver" in window) {

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("show");

                    observer.unobserve(entry.target);
                }
            });

        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    revealElements.forEach((element) => {
        revealObserver.observe(element);
    });

} else {

    // Fallback for older browsers
    revealElements.forEach((element) => {
        element.classList.add("show");
    });
}


/* =====================================================
   SMOOTH SCROLL
===================================================== */

document.querySelectorAll('a[href^="#"]').forEach((link) => {

    link.addEventListener("click", (event) => {

        const targetId = link.getAttribute("href");

        // Ignore empty # links
        if (!targetId || targetId === "#") {
            return;
        }

        const target = document.querySelector(targetId);

        if (target) {

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });

});


/* =====================================================
   SCROLL TO TOP BUTTON
===================================================== */

const scrollTopButton = document.querySelector(
    ".advertise-scroll-top"
);

if (scrollTopButton) {

    function updateScrollTopButton() {

        if (window.scrollY > 500) {
            scrollTopButton.classList.add("show");
        } else {
            scrollTopButton.classList.remove("show");
        }
    }

    window.addEventListener(
        "scroll",
        updateScrollTopButton,
        {
            passive: true
        }
    );

    updateScrollTopButton();

    scrollTopButton.addEventListener("click", () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });
}


/* =====================================================
   CLOSE MOBILE MENU WHEN CLICKING OUTSIDE
===================================================== */

document.addEventListener("click", (event) => {

    if (!menuButton || !mobileMenu) return;

    const clickedInsideMenu =
        mobileMenu.contains(event.target);

    const clickedButton =
        menuButton.contains(event.target);

    if (!clickedInsideMenu && !clickedButton) {

        mobileMenu.classList.remove("active");

        menuButton.classList.remove("active");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }
});


/* =====================================================
   ESCAPE KEY CLOSES MOBILE MENU
===================================================== */

document.addEventListener("keydown", (event) => {

    if (event.key !== "Escape") return;

    if (menuButton && mobileMenu) {

        mobileMenu.classList.remove("active");

        menuButton.classList.remove("active");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }
});


/* =====================================================
   ADVERTISING CARD HOVER EFFECT
===================================================== */

const cards = document.querySelectorAll(
    ".advertising-card"
);

cards.forEach((card) => {

    card.addEventListener("mouseenter", () => {
        card.classList.add("is-hovered");
    });

    card.addEventListener("mouseleave", () => {
        card.classList.remove("is-hovered");
    });

});


/* =====================================================
   EMPTY HASH LINKS
   Prevent links with href="#" from jumping to top.
===================================================== */

document.querySelectorAll('a[href="#"]').forEach((link) => {

    link.addEventListener("click", (event) => {
        event.preventDefault();
    });

});


/* =====================================================
   WHATSAPP
   
   WhatsApp is intentionally NOT handled with JavaScript.

   The WhatsApp button in advertise.html should contain
   the direct WhatsApp URL, for example:

   https://wa.me/2348070426269

   This prevents JavaScript from interfering with the
   WhatsApp link.
===================================================== */


/* =====================================================
   CURRENT YEAR
===================================================== */

const yearElements =
    document.querySelectorAll("[data-year]");

yearElements.forEach((element) => {

    element.textContent =
        new Date().getFullYear();

});


/* =====================================================
   PAGE READY
===================================================== */

document.body.classList.add(
    "advertise-page-ready"
);


});
