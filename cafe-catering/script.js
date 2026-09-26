"use strict";


/* =====================================================
   BACKGROUND SLIDESHOW
===================================================== */

const heroSlides =
    document.querySelectorAll(".hero-slide");

let currentHeroSlide = 0;

function showNextHeroSlide() {

    if (heroSlides.length < 2) {
        return;
    }

    heroSlides[currentHeroSlide]
        .classList.remove("active");

    currentHeroSlide++;

    if (currentHeroSlide >= heroSlides.length) {
        currentHeroSlide = 0;
    }

    heroSlides[currentHeroSlide]
        .classList.add("active");
}

if (heroSlides.length > 1) {

    window.setInterval(
        showNextHeroSlide,
        6000
    );
}


/* =====================================================
   ANIMATED STATISTICS
===================================================== */

const metricValues =
    document.querySelectorAll("[data-value]");

function animateMetric(element) {

    const target =
        Number(element.dataset.value);

    const duration = 1500;

    const startTime =
        performance.now();

    function updateMetric(currentTime) {

        const elapsed =
            currentTime - startTime;

        const progress =
            Math.min(elapsed / duration, 1);

        const easedProgress =
            1 - Math.pow(1 - progress, 3);

        const currentValue =
            Math.round(target * easedProgress);

        element.textContent =
            currentValue.toString();

        if (progress < 1) {
            requestAnimationFrame(updateMetric);
        }
    }

    requestAnimationFrame(updateMetric);
}

window.setTimeout(() => {

    metricValues.forEach(animateMetric);

}, 450);


/* =====================================================
   BOOKING DRAWER
===================================================== */

const openDemoButton =
    document.getElementById("open-demo-btn");

const demoDrawer =
    document.getElementById("demo-drawer");

const drawerCloseButton =
    document.getElementById("drawer-close");

const drawerBackdrop =
    document.getElementById("drawer-backdrop");

const customerNameInput =
    document.getElementById("customer-name");

let elementBeforeDrawer = null;


function openDemoDrawer() {

    if (!demoDrawer) {
        return;
    }

    elementBeforeDrawer =
        document.activeElement;

    demoDrawer.classList.add("is-open");

    demoDrawer.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "drawer-open"
    );

    window.setTimeout(() => {

        if (customerNameInput) {
            customerNameInput.focus();
        }

    }, 550);
}


function closeDemoDrawer() {

    if (!demoDrawer) {
        return;
    }

    demoDrawer.classList.remove("is-open");

    demoDrawer.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "drawer-open"
    );

    if (
        elementBeforeDrawer &&
        typeof elementBeforeDrawer.focus === "function"
    ) {
        elementBeforeDrawer.focus();
    }
}


if (openDemoButton) {

    openDemoButton.addEventListener(
        "click",
        openDemoDrawer
    );
}


if (drawerCloseButton) {

    drawerCloseButton.addEventListener(
        "click",
        closeDemoDrawer
    );
}


if (drawerBackdrop) {

    drawerBackdrop.addEventListener(
        "click",
        closeDemoDrawer
    );
}


document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            demoDrawer &&
            demoDrawer.classList.contains("is-open")
        ) {
            closeDemoDrawer();
        }
    }
);


/* =====================================================
   ORDER PREVIEW ANIMATION
===================================================== */

const showProcessButton =
    document.getElementById("show-process-btn");

const orderRows =
    document.querySelectorAll(".order-row");

let processAnimationTimer = null;


function demonstratePlanningProcess() {

    if (!orderRows.length) {
        return;
    }

    if (processAnimationTimer) {
        window.clearInterval(
            processAnimationTimer
        );
    }

    let activeOrderIndex = 0;

    orderRows.forEach(order => {
        order.classList.remove(
            "order-row--active"
        );
    });

    orderRows[0].classList.add(
        "order-row--active"
    );

    processAnimationTimer =
        window.setInterval(() => {

            orderRows[activeOrderIndex]
                .classList.remove(
                    "order-row--active"
                );

            activeOrderIndex++;

            if (
                activeOrderIndex >=
                orderRows.length
            ) {
                activeOrderIndex = 0;
            }

            orderRows[activeOrderIndex]
                .classList.add(
                    "order-row--active"
                );

        }, 850);

    window.setTimeout(() => {

        if (processAnimationTimer) {

            window.clearInterval(
                processAnimationTimer
            );

            processAnimationTimer = null;
        }

        orderRows.forEach(order => {
            order.classList.remove(
                "order-row--active"
            );
        });

        orderRows[0].classList.add(
            "order-row--active"
        );

        openDemoDrawer();

    }, 3300);
}


if (showProcessButton) {

    showProcessButton.addEventListener(
        "click",
        demonstratePlanningProcess
    );
}


/* =====================================================
   CATERING BOOKING SIMULATION
===================================================== */

const cateringForm =
    document.getElementById("catering-form");

const bookingResult =
    document.getElementById("booking-result");

const eventTypeSelect =
    document.getElementById("event-type");

const guestCountInput =
    document.getElementById("guest-count");

const deliveryAreaSelect =
    document.getElementById("delivery-area");


const cateringPrices = {

    "Frukostmöte": 129,
    "Företagslunch": 189,
    "Eftermiddagsfika": 99,
    "Fest och evenemang": 249

};


const areaDeliveryTimes = {

    "Norrköping City": 18,
    "Industrilandskapet": 14,
    "Ingelsta": 24,
    "Hageby": 22,
    "Åby": 31

};


function formatSwedishCurrency(value) {

    return new Intl.NumberFormat(
        "sv-SE",
        {
            style: "currency",
            currency: "SEK",
            maximumFractionDigits: 0
        }
    ).format(value);
}


function createBookingResult(event) {

    event.preventDefault();

    if (
        !cateringForm ||
        !bookingResult
    ) {
        return;
    }

    const customerName =
        customerNameInput.value.trim();

    const eventType =
        eventTypeSelect.value;

    const guestCount =
        Math.max(
            Number(guestCountInput.value),
            5
        );

    const deliveryArea =
        deliveryAreaSelect.value;

    const pricePerPerson =
        cateringPrices[eventType] || 149;

    const estimatedTotal =
        pricePerPerson * guestCount;

    const deliveryTime =
        areaDeliveryTimes[deliveryArea] || 25;

    bookingResult.classList.remove("show");

    bookingResult.innerHTML = `
        <strong style="
            display:block;
            color:#77d5a4;
            margin-bottom:8px;
            font-size:0.82rem;
        ">
            ✓ Beställningen är planerad
        </strong>

        <span>
            <b>${customerName}</b> har bokat
            <b>${eventType.toLowerCase()}</b>
            för <b>${guestCount} personer</b>.
        </span>

        <span style="
            display:block;
            margin-top:8px;
        ">
            Leveransområde:
            <b>${deliveryArea}</b><br>

            Beräknad leveranstid:
            <b>${deliveryTime} minuter</b><br>

            Preliminärt pris:
            <b>${formatSwedishCurrency(
                estimatedTotal
            )}</b>
        </span>

        <span style="
            display:block;
            margin-top:10px;
            color:rgba(255,255,255,0.48);
            font-size:0.64rem;
        ">
            Detta är en simulerad beställning.
            Ingen riktig bokning har skickats.
        </span>
    `;

    window.requestAnimationFrame(() => {

        bookingResult.classList.add("show");

    });

    bookingResult.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


if (cateringForm) {

    cateringForm.addEventListener(
        "submit",
        createBookingResult
    );
}


/* =====================================================
   SUBTLE POINTER EFFECT
===================================================== */

const experience =
    document.querySelector(".experience");

const heroLight =
    document.querySelector(".hero-light");


function moveHeroLight(event) {

    if (
        !experience ||
        !heroLight ||
        window.innerWidth < 821
    ) {
        return;
    }

    const horizontalPosition =
        event.clientX / window.innerWidth;

    const verticalPosition =
        event.clientY / window.innerHeight;

    const moveX =
        (horizontalPosition - 0.5) * 22;

    const moveY =
        (verticalPosition - 0.5) * 16;

    heroLight.style.transform =
        `translate3d(${moveX}px, ${moveY}px, 0)`;
}


if (experience) {

    experience.addEventListener(
        "pointermove",
        moveHeroLight
    );
}


/* =====================================================
   PAUSE SLIDESHOW WHEN PAGE IS HIDDEN
===================================================== */

document.addEventListener(
    "visibilitychange",
    function () {

        if (document.hidden) {

            document.documentElement
                .classList.add("page-hidden");

        } else {

            document.documentElement
                .classList.remove("page-hidden");
        }
    }
);
