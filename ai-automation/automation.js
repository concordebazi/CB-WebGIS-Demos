// ==========================================
// AI AUTOMATION DEMO
// CB WEB & GIS
// ==========================================

const automationForm =
    document.getElementById("automation-form");

const businessType =
    document.getElementById("business-type");

const customerMessage =
    document.getElementById("customer-message");

const automationButton =
    document.getElementById("automation-btn");

const defaultButtonText =
    automationButton.querySelector(
        ".btn-default-text"
    );

const loadingButtonText =
    automationButton.querySelector(
        ".btn-loading-text"
    );

const processSteps =
    document.querySelectorAll(".process-step");

const automationResult =
    document.getElementById("automation-result");

const resultIntent =
    document.getElementById("result-intent");

const resultPriority =
    document.getElementById("result-priority");

const generatedReplyText =
    document.getElementById("generated-reply-text");

const automaticActionText =
    document.getElementById("automatic-action-text");


// ==========================================
// BUSINESS EXAMPLES AND AI RESULTS
// ==========================================

const automationData = {

    bilverkstad: {

        example:
            "Hej! Jag behöver boka service för min bil nästa vecka. Motorlampan lyser och bilen låter konstigt. Har ni någon ledig tid?",

        intent:
            "Bilservice och felsökning",

        priority:
            "Hög",

        reply:
            "Hej! Tack för din förfrågan. Vi hjälper dig gärna med service och felsökning av motorlampan. Vi har lediga tider nästa vecka. Vänligen skicka bilens registreringsnummer och vilken dag som passar dig bäst, så återkommer vi med en bokning.",

        action:
            "Bokningsförfrågan och serviceärende skapade"

    },


    salong: {

        example:
            "Hej! Jag vill boka klippning och skäggtrimning på fredag eftermiddag. Finns det någon ledig tid?",

        intent:
            "Klippning och skäggtrimning",

        priority:
            "Normal",

        reply:
            "Hej! Tack för ditt meddelande. Vi hjälper dig gärna med klippning och skäggtrimning. Vi kontrollerar våra lediga tider på fredag eftermiddag och återkommer med ett bokningsförslag.",

        action:
            "Bokningsförfrågan skickad till kalendern"

    },


    stadfirma: {

        example:
            "Hej! Jag behöver flyttstädning av en lägenhet på 75 kvadratmeter i Linköping. Kan jag få en offert?",

        intent:
            "Flyttstädning och offert",

        priority:
            "Normal",

        reply:
            "Hej! Tack för din offertförfrågan. Vi hjälper dig gärna med flyttstädning av lägenheten. För att beräkna ett korrekt pris behöver vi önskat datum, adress och information om bostaden är möblerad.",

        action:
            "Offertärende skapat och uppföljning planerad"

    },


    konsult: {

        example:
            "Hej! Vi behöver hjälp med att automatisera vår kundservice och hantering av inkommande förfrågningar. Kan vi boka ett möte?",

        intent:
            "Konsultation om AI-automation",

        priority:
            "Hög",

        reply:
            "Hej! Tack för ert intresse. Vi hjälper gärna till att identifiera vilka delar av kundservicen som kan automatiseras. Vi föreslår ett kort introduktionsmöte där vi går igenom era nuvarande arbetsflöden och behov.",

        action:
            "Kvalificerad kontakt och mötesförfrågan skapade"

    }

};


// ==========================================
// CHANGE EXAMPLE MESSAGE
// ==========================================

businessType.addEventListener(
    "change",
    function () {

        const selectedBusiness =
            automationData[businessType.value];

        customerMessage.value =
            selectedBusiness.example;

        resetAutomation();

    }
);


// ==========================================
// RUN AUTOMATION
// ==========================================

automationForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const message =
            customerMessage.value.trim();

        if (message === "") {

            customerMessage.focus();

            customerMessage.style.borderColor =
                "#ff7a1a";

            return;

        }

        customerMessage.style.borderColor = "";

        runAutomation();

    }
);


// ==========================================
// AUTOMATION SEQUENCE
// ==========================================

function runAutomation() {

    const selectedBusiness =
        automationData[businessType.value];

    resetAutomation();

    automationButton.disabled = true;

    defaultButtonText.hidden = true;
    loadingButtonText.hidden = false;

    processSteps[0].classList.add("active");


    // STEP 1: ANALYSE MESSAGE

    setTimeout(function () {

        processSteps[0].classList.remove("active");
        processSteps[0].classList.add("completed");

        processSteps[1].classList.add("active");

    }, 900);


    // STEP 2: GENERATE REPLY

    setTimeout(function () {

        processSteps[1].classList.remove("active");
        processSteps[1].classList.add("completed");

        processSteps[2].classList.add("active");

    }, 1800);


    // STEP 3: START WORKFLOW

    setTimeout(function () {

        processSteps[2].classList.remove("active");
        processSteps[2].classList.add("completed");

        showAutomationResult(
            selectedBusiness
        );

        automationButton.disabled = false;

        defaultButtonText.hidden = false;
        loadingButtonText.hidden = true;

    }, 2800);

}


// ==========================================
// SHOW RESULT
// ==========================================

function showAutomationResult(data) {

    resultIntent.textContent =
        data.intent;

    resultPriority.textContent =
        data.priority;

    generatedReplyText.textContent =
        data.reply;

    automaticActionText.textContent =
        data.action;

    automationResult.hidden = false;

}


// ==========================================
// RESET AUTOMATION
// ==========================================

function resetAutomation() {

    processSteps.forEach(
        function (step) {

            step.classList.remove(
                "active",
                "completed"
            );

        }
    );

    automationResult.hidden = true;

}
