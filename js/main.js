// =====================================================
// TEXAS GOT ROCKS - COMPLETE MAIN.JS
// Last Updated: January 22, 2026
// INCLUDES: Smart truck selection, delivery minimums, 48-ton cap
// NEW: 2-yard minimum per material, tiered margins, value proposition upsell
// NEW: 41 additional ZIP codes (189 total)
// =====================================================

// =====================================================
// CALL/TEXT DROPDOWN TOGGLE FUNCTIONS (Grasshopper Integration)
// =====================================================
function toggleNavCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('navCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function toggleHeroCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('heroCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function toggleCtaCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('ctaCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function toggleFooterCallDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('footerCallMenu');
    closeAllCallDropdowns();
    menu.classList.toggle('show');
}

function closeAllCallDropdowns() {
    document.querySelectorAll('.nav-call-menu, .call-dropdown-menu, .footer-call-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-call-dropdown') && 
        !e.target.closest('.call-dropdown-container') && 
        !e.target.closest('.footer-call-dropdown')) {
        closeAllCallDropdowns();
    }
});

// =====================================================
// NAVIGATION
// =====================================================
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// =====================================================
// CALCULATOR MODAL FUNCTIONS
// =====================================================
function openCalculatorModal() {
    document.getElementById('calculator-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCalculatorModal() {
    document.getElementById('calculator-modal').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('calculator-modal').addEventListener('click', function(e) {
    if (e.target === this) closeCalculatorModal();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCalculatorModal();
        closeModal('exit-modal');
        closeAllCallDropdowns();
    }
});

// =====================================================
// MODAL FUNCTIONS
// =====================================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

const exitForm = document.getElementById('exit-capture-form');
if (exitForm) {
    exitForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('exit-email').value;
        const phone = document.getElementById('exit-phone').value;
        console.log('Lead Captured (Exit Intent):', { email, phone });
        closeModal('exit-modal');
        showToast('success', 'Discount Sent!', 'Check your email for your 10% off code');
    });
}

// =====================================================
// ZIP CODE DATABASE - EXPANDED TO 189 ZIP CODES
// =====================================================
const ZIP_DATA = {
    '77301': { city: 'Conroe', distance: 3, time: 8, zone: 1 },
    '77302': { city: 'Conroe', distance: 7, time: 15, zone: 1 },
    '77303': { city: 'Conroe', distance: 5, time: 12, zone: 1 },
    '77304': { city: 'Conroe', distance: 6, time: 14, zone: 1 },
    '77305': { city: 'Conroe', distance: 4, time: 10, zone: 1 },
    '77306': { city: 'Conroe', distance: 8, time: 18, zone: 1 },
    '77384': { city: 'Conroe', distance: 10, time: 20, zone: 1 },
    '77385': { city: 'Conroe', distance: 2, time: 5, zone: 1 },
    '77316': { city: 'Montgomery', distance: 12, time: 22, zone: 1 },
    '77356': { city: 'Montgomery', distance: 14, time: 25, zone: 1 },
    '77318': { city: 'Willis', distance: 10, time: 18, zone: 1 },
    '77378': { city: 'Willis', distance: 12, time: 20, zone: 1 },
    '77386': { city: 'Oak Ridge North', distance: 14, time: 24, zone: 1 },
    '77381': { city: 'Shenandoah', distance: 12, time: 22, zone: 1 },
    '77380': { city: 'The Woodlands', distance: 18, time: 30, zone: 2 },
    '77382': { city: 'The Woodlands', distance: 17, time: 29, zone: 2 },
    '77387': { city: 'The Woodlands', distance: 19, time: 32, zone: 2 },
    '77389': { city: 'The Woodlands', distance: 22, time: 38, zone: 2 },
    '77354': { city: 'Magnolia', distance: 15, time: 28, zone: 2 },
    '77355': { city: 'Magnolia', distance: 18, time: 32, zone: 2 },
    '77362': { city: 'Pinehurst', distance: 20, time: 35, zone: 2 },
    '77373': { city: 'Spring', distance: 25, time: 40, zone: 2 },
    '77379': { city: 'Spring', distance: 24, time: 42, zone: 2 },
    '77388': { city: 'Spring', distance: 26, time: 45, zone: 2 },
    '77375': { city: 'Tomball', distance: 22, time: 38, zone: 2 },
    '77377': { city: 'Tomball', distance: 25, time: 42, zone: 2 },
    '77372': { city: 'Splendora', distance: 22, time: 35, zone: 2 },
    '77365': { city: 'Porter', distance: 26, time: 40, zone: 2 },
    '77357': { city: 'New Caney', distance: 28, time: 42, zone: 2 },
    '77363': { city: 'Plantersville', distance: 25, time: 40, zone: 2 },
    '77358': { city: 'New Waverly', distance: 20, time: 32, zone: 2 },
    '77320': { city: 'Huntsville', distance: 40, time: 50, zone: 3 },
    '77340': { city: 'Huntsville', distance: 42, time: 52, zone: 3 },
    '77341': { city: 'Huntsville', distance: 42, time: 52, zone: 3 },
    '77344': { city: 'Huntsville', distance: 44, time: 55, zone: 3 },
    '77348': { city: 'Huntsville', distance: 44, time: 55, zone: 3 },
    '77349': { city: 'Huntsville', distance: 44, time: 55, zone: 3 },
    '77327': { city: 'Cleveland', distance: 35, time: 45, zone: 3 },
    '77328': { city: 'Cleveland', distance: 37, time: 48, zone: 3 },
    '77368': { city: 'Romayor', distance: 45, time: 55, zone: 3 },
    '77369': { city: 'Rye', distance: 50, time: 60, zone: 3 },
    '77371': { city: 'Shepherd', distance: 42, time: 52, zone: 3 },
    '77338': { city: 'Humble', distance: 32, time: 50, zone: 3 },
    '77339': { city: 'Kingwood', distance: 30, time: 48, zone: 3 },
    '77345': { city: 'Kingwood', distance: 32, time: 52, zone: 3 },
    '77346': { city: 'Humble', distance: 35, time: 55, zone: 3 },
    '77347': { city: 'Humble', distance: 33, time: 52, zone: 3 },
    '77396': { city: 'Humble', distance: 34, time: 54, zone: 3 },
    '77532': { city: 'Crosby', distance: 42, time: 55, zone: 3 },
    '77336': { city: 'Huffman', distance: 38, time: 50, zone: 3 },
    '77562': { city: 'Highlands', distance: 45, time: 58, zone: 3 },
    '77530': { city: 'Channelview', distance: 48, time: 60, zone: 3 },
    '77520': { city: 'Baytown', distance: 52, time: 65, zone: 3 },
    '77521': { city: 'Baytown', distance: 50, time: 62, zone: 3 },
    '77522': { city: 'Baytown', distance: 51, time: 63, zone: 3 },
    '77523': { city: 'Baytown', distance: 48, time: 60, zone: 3 },
    '77535': { city: 'Dayton', distance: 45, time: 55, zone: 3 },
    '77536': { city: 'Deer Park', distance: 52, time: 65, zone: 3 },
    '77571': { city: 'La Porte', distance: 55, time: 68, zone: 3 },
    '77501': { city: 'Pasadena', distance: 50, time: 65, zone: 3 },
    '77502': { city: 'Pasadena', distance: 52, time: 67, zone: 3 },
    '77503': { city: 'Pasadena', distance: 53, time: 68, zone: 3 },
    '77504': { city: 'Pasadena', distance: 54, time: 70, zone: 3 },
    '77505': { city: 'Pasadena', distance: 55, time: 72, zone: 3 },
    '77506': { city: 'Pasadena', distance: 51, time: 66, zone: 3 },
    '77507': { city: 'Pasadena', distance: 56, time: 72, zone: 3 },
    '77508': { city: 'Pasadena', distance: 52, time: 67, zone: 3 },
    '77581': { city: 'Pearland', distance: 55, time: 70, zone: 3 },
    '77584': { city: 'Pearland', distance: 58, time: 72, zone: 3 },
    '77588': { city: 'Pearland', distance: 56, time: 70, zone: 3 },
    '77546': { city: 'Friendswood', distance: 55, time: 70, zone: 3 },
    '77573': { city: 'League City', distance: 58, time: 75, zone: 3 },
    '77586': { city: 'Seabrook', distance: 55, time: 70, zone: 3 },
    '77565': { city: 'Kemah', distance: 58, time: 72, zone: 3 },
    '77410': { city: 'Cypress', distance: 35, time: 50, zone: 3 },
    '77429': { city: 'Cypress', distance: 35, time: 50, zone: 3 },
    '77433': { city: 'Cypress', distance: 38, time: 55, zone: 3 },
    '77449': { city: 'Katy', distance: 50, time: 65, zone: 3 },
    '77450': { city: 'Katy', distance: 52, time: 68, zone: 3 },
    '77491': { city: 'Katy', distance: 50, time: 65, zone: 3 },
    '77492': { city: 'Katy', distance: 50, time: 65, zone: 3 },
    '77493': { city: 'Katy', distance: 48, time: 62, zone: 3 },
    '77494': { city: 'Katy', distance: 52, time: 68, zone: 3 },
    '77423': { city: 'Brookshire', distance: 55, time: 70, zone: 3 },
    '77441': { city: 'Fulshear', distance: 55, time: 70, zone: 3 },
    '77406': { city: 'Richmond', distance: 58, time: 75, zone: 3 },
    '77407': { city: 'Richmond', distance: 55, time: 70, zone: 3 },
    '77469': { city: 'Richmond', distance: 58, time: 75, zone: 3 },
    '77471': { city: 'Rosenberg', distance: 60, time: 78, zone: 3 },
    '77476': { city: 'Simonton', distance: 58, time: 75, zone: 3 },
    '77478': { city: 'Sugar Land', distance: 52, time: 68, zone: 3 },
    '77479': { city: 'Sugar Land', distance: 55, time: 70, zone: 3 },
    '77498': { city: 'Sugar Land', distance: 53, time: 68, zone: 3 },
    '77401': { city: 'Bellaire', distance: 48, time: 65, zone: 3 },
    '77014': { city: 'Houston', distance: 35, time: 55, zone: 3 },
    '77018': { city: 'Houston', distance: 42, time: 64, zone: 3 },
    '77022': { city: 'Houston', distance: 40, time: 60, zone: 3 },
    '77032': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77037': { city: 'Houston', distance: 36, time: 56, zone: 3 },
    '77038': { city: 'Houston', distance: 34, time: 54, zone: 3 },
    '77039': { city: 'Houston', distance: 35, time: 55, zone: 3 },
    '77040': { city: 'Houston', distance: 36, time: 56, zone: 3 },
    '77041': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77043': { city: 'Houston', distance: 40, time: 62, zone: 3 },
    '77044': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77049': { city: 'Houston', distance: 42, time: 55, zone: 3 },
    '77050': { city: 'Houston', distance: 40, time: 60, zone: 3 },
    '77060': { city: 'Houston', distance: 35, time: 55, zone: 3 },
    '77064': { city: 'Houston', distance: 32, time: 52, zone: 3 },
    '77065': { city: 'Houston', distance: 33, time: 54, zone: 3 },
    '77066': { city: 'Houston', distance: 30, time: 48, zone: 3 },
    '77067': { city: 'Houston', distance: 32, time: 50, zone: 3 },
    '77068': { city: 'Houston', distance: 28, time: 45, zone: 3 },
    '77069': { city: 'Houston', distance: 26, time: 42, zone: 3 },
    '77070': { city: 'Houston', distance: 28, time: 46, zone: 3 },
    '77073': { city: 'Houston', distance: 30, time: 48, zone: 3 },
    '77078': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77080': { city: 'Houston', distance: 40, time: 62, zone: 3 },
    '77086': { city: 'Houston', distance: 32, time: 50, zone: 3 },
    '77088': { city: 'Houston', distance: 38, time: 60, zone: 3 },
    '77090': { city: 'Houston', distance: 30, time: 48, zone: 3 },
    '77091': { city: 'Houston', distance: 40, time: 62, zone: 3 },
    '77092': { city: 'Houston', distance: 42, time: 65, zone: 3 },
    '77093': { city: 'Houston', distance: 40, time: 62, zone: 3 },
    '77002': { city: 'Houston', distance: 45, time: 65, zone: 3 },
    '77003': { city: 'Houston', distance: 46, time: 66, zone: 3 },
    '77004': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77005': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77006': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77007': { city: 'Houston', distance: 45, time: 68, zone: 3 },
    '77008': { city: 'Houston', distance: 42, time: 64, zone: 3 },
    '77009': { city: 'Houston', distance: 40, time: 60, zone: 3 },
    '77010': { city: 'Houston', distance: 45, time: 65, zone: 3 },
    '77011': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77012': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77013': { city: 'Houston', distance: 45, time: 68, zone: 3 },
    '77015': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77016': { city: 'Houston', distance: 42, time: 64, zone: 3 },
    '77017': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77019': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77020': { city: 'Houston', distance: 45, time: 68, zone: 3 },
    '77021': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77023': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77024': { city: 'Houston', distance: 45, time: 68, zone: 3 },
    '77025': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77026': { city: 'Houston', distance: 45, time: 68, zone: 3 },
    '77027': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77028': { city: 'Houston', distance: 44, time: 66, zone: 3 },
    '77029': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77030': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77031': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77033': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77034': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77035': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77036': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77042': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77045': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77046': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77047': { city: 'Houston', distance: 58, time: 80, zone: 3 },
    '77048': { city: 'Houston', distance: 58, time: 80, zone: 3 },
    '77051': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77053': { city: 'Houston', distance: 58, time: 80, zone: 3 },
    '77054': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77055': { city: 'Houston', distance: 45, time: 68, zone: 3 },
    '77056': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77057': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77058': { city: 'Houston', distance: 60, time: 85, zone: 3 },
    '77059': { city: 'Houston', distance: 58, time: 82, zone: 3 },
    '77061': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77062': { city: 'Houston', distance: 58, time: 82, zone: 3 },
    '77063': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77071': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77072': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77074': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77075': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77076': { city: 'Houston', distance: 38, time: 58, zone: 3 },
    '77077': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77079': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77081': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77082': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77083': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77084': { city: 'Houston', distance: 42, time: 62, zone: 3 },
    '77085': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77087': { city: 'Houston', distance: 52, time: 75, zone: 3 },
    '77089': { city: 'Houston', distance: 58, time: 82, zone: 3 },
    '77094': { city: 'Houston', distance: 50, time: 72, zone: 3 },
    '77095': { city: 'Houston', distance: 42, time: 62, zone: 3 },
    '77096': { city: 'Houston', distance: 55, time: 78, zone: 3 },
    '77098': { city: 'Houston', distance: 48, time: 70, zone: 3 },
    '77099': { city: 'Houston', distance: 55, time: 78, zone: 3 }
};

// =====================================================
// TRUCK & PRICING CONFIGURATION
// =====================================================
const TRUCK_CONFIG = {
    tandem: { hourlyRate: 100, capacityTons: 15, minimumCharge: 75 },
    endDump: { hourlyRate: 130, capacityTons: 24, minimumCharge: 100 },
    loadTime: 5,
    dumpTime: 5,
    taxRate: 0.0825,
    serviceFeeRate: 0.035,
    maxTons: 48,
    minimumYards: 2,
    smallOrderThreshold: 3,
    smallOrderMargin: 0.30,
    standardMargin: 0.20
};

// =====================================================
// SMART TRUCK SELECTION
// =====================================================
function selectOptimalTrucks(tons) {
    const TANDEM = TRUCK_CONFIG.tandem;
    const END_DUMP = TRUCK_CONFIG.endDump;
    
    if (tons <= 15) {
        return { description: '1 Tandem', trucks: [{ type: 'tandem', tons: tons }], totalHourlyRate: TANDEM.hourlyRate, trips: 1, minimumCharge: TANDEM.minimumCharge };
    } else if (tons <= 24) {
        return { description: '1 End Dump', trucks: [{ type: 'endDump', tons: tons }], totalHourlyRate: END_DUMP.hourlyRate, trips: 1, minimumCharge: END_DUMP.minimumCharge };
    } else if (tons <= 30) {
        return { description: '2 Tandems', trucks: [{ type: 'tandem', tons: 15 }, { type: 'tandem', tons: tons - 15 }], totalHourlyRate: TANDEM.hourlyRate * 2, trips: 2, minimumCharge: TANDEM.minimumCharge * 2 };
    } else if (tons <= 39) {
        return { description: '1 End Dump + 1 Tandem', trucks: [{ type: 'endDump', tons: 24 }, { type: 'tandem', tons: tons - 24 }], totalHourlyRate: END_DUMP.hourlyRate + TANDEM.hourlyRate, trips: 2, minimumCharge: END_DUMP.minimumCharge + TANDEM.minimumCharge };
    } else if (tons <= 48) {
        return { description: '2 End Dumps', trucks: [{ type: 'endDump', tons: 24 }, { type: 'endDump', tons: tons - 24 }], totalHourlyRate: END_DUMP.hourlyRate * 2, trips: 2, minimumCharge: END_DUMP.minimumCharge * 2 };
    }
    return null;
}

// =====================================================
// STATE VARIABLES
// =====================================================
let currentZipData = null;
let currentQuote = null;

function lookupZip(zip) {
    const cleaned = zip.replace(/\D/g, '').substring(0, 5);
    return ZIP_DATA[cleaned] || null;
}

// =====================================================
// HANDLE ZIP INPUT
// =====================================================
function handleQuoteZipInput(e) {
    const zip = e.target.value.replace(/\D/g, '');
    e.target.value = zip;
    
    const statusEl = document.getElementById('quoteZipStatus');
    const deliveryInfo = document.getElementById('quoteDeliveryInfo');
    const outOfArea = document.getElementById('quoteOutOfArea');
    
    if (zip.length < 5) {
        statusEl.classList.add('hidden');
        deliveryInfo.classList.add('hidden');
        outOfArea.classList.add('hidden');
        currentZipData = null;
        recalculateQuote();
        return;
    }
    
    const data = lookupZip(zip);
    
    if (data) {
        currentZipData = data;
        statusEl.textContent = '✓ We deliver here!';
        statusEl.className = 'zip-status valid';
        document.getElementById('quoteCityName').textContent = data.city;
        document.getElementById('quoteDistanceMiles').textContent = data.distance;
        document.getElementById('quoteTravelTime').textContent = data.time;
        deliveryInfo.classList.remove('hidden');
        outOfArea.classList.add('hidden');
        document.getElementById('quoteDeliveryCityBadge').textContent = data.city.toUpperCase();
    } else {
        currentZipData = null;
        statusEl.textContent = 'Outside area';
        statusEl.className = 'zip-status invalid';
        deliveryInfo.classList.add('hidden');
        outOfArea.classList.remove('hidden');
    }
    
    recalculateQuote();
}

function adjustQuoteQuantity(delta) {
    const input = document.getElementById('quoteQuantity');
    let value = parseFloat(input.value) || 1;
    value = Math.max(1, Math.min(100, value + delta));
    input.value = value;
    recalculateQuote();
}

// =====================================================
// CALCULATE FULL PRICE HELPER
// =====================================================
function calculateFullPrice(quantity, pricePerTon, weightPerYard, travelTime, margin) {
    const tons = quantity * weightPerYard;
    const baseMaterialCost = tons * pricePerTon;
    const truckConfig = selectOptimalTrucks(tons);
    const timePerTrip = TRUCK_CONFIG.loadTime + travelTime + TRUCK_CONFIG.dumpTime;
    const totalHours = (timePerTrip * truckConfig.trips) / 60;
    const calculatedDeliveryCost = totalHours * truckConfig.totalHourlyRate;
    const deliveryCost = Math.max(calculatedDeliveryCost, truckConfig.minimumCharge);
    const subtotal = baseMaterialCost + deliveryCost;
    const materialWithMargin = subtotal * (1 + margin);
    const pricePerYard = materialWithMargin / quantity;
    const salesTax = baseMaterialCost * TRUCK_CONFIG.taxRate;
    const serviceFee = (materialWithMargin + salesTax) * TRUCK_CONFIG.serviceFeeRate;
    const total = materialWithMargin + salesTax + serviceFee;
    
    return {
        quantity, tons, baseMaterialCost, deliveryCost, truckConfig, margin, materialWithMargin,
        pricePerYard, pricePerTon: materialWithMargin / tons, salesTax, serviceFee, total
    };
}

// =====================================================
// RECALCULATE QUOTE - MAIN PRICING FORMULA
// =====================================================
function recalculateQuote() {
    const productSelect = document.getElementById('quoteProduct');
    const quantity = parseFloat(document.getElementById('quoteQuantity').value) || 0;
    const ctaButton = document.getElementById('quoteCtaButton');
    const minimumWarning = document.getElementById('quoteMinimumWarning');
    const upsellSection = document.getElementById('quoteUpsellSection');
    
    if (minimumWarning) minimumWarning.classList.add('hidden');
    if (upsellSection) upsellSection.classList.add('hidden');
    
    if (!currentZipData || !productSelect.value || quantity <= 0) {
        document.getElementById('quoteFreeDeliveryBadge').classList.add('hidden');
        document.getElementById('quoteTotalSection').classList.add('hidden');
        document.getElementById('needAProSection').classList.add('hidden');
        
        if (!currentZipData) ctaButton.textContent = 'Enter ZIP Code to Get Quote';
        else if (!productSelect.value) ctaButton.textContent = 'Select a Material';
        else ctaButton.textContent = 'Enter Quantity';
        ctaButton.disabled = true;
        return;
    }
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const pricePerTon = parseFloat(selectedOption.dataset.price);
    const weightPerYard = parseFloat(selectedOption.dataset.weight);
    const materialName = selectedOption.text;
    
    if (quantity < TRUCK_CONFIG.minimumYards) {
        if (minimumWarning) {
            document.getElementById('minWarningMaterialName').textContent = materialName;
            minimumWarning.classList.remove('hidden');
        }
        document.getElementById('quoteFreeDeliveryBadge').classList.add('hidden');
        document.getElementById('quoteTotalSection').classList.add('hidden');
        document.getElementById('needAProSection').classList.add('hidden');
        ctaButton.textContent = '⚠️ 2 Yard Minimum Required';
        ctaButton.disabled = true;
        return;
    }
    
    const tons = quantity * weightPerYard;
    
    if (tons > TRUCK_CONFIG.maxTons) {
        document.getElementById('quoteFreeDeliveryBadge').classList.add('hidden');
        document.getElementById('quoteTotalSection').classList.add('hidden');
        document.getElementById('needAProSection').classList.add('hidden');
        ctaButton.textContent = '📞 Order Over 48 Tons - Get Commercial Quote';
        ctaButton.disabled = false;
        ctaButton.onclick = function() {
            closeCalculatorModal();
            const bulkSection = document.getElementById('bulk-pricing') || document.querySelector('.commercial-cta');
            if (bulkSection) setTimeout(() => bulkSection.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        };
        return;
    }
    
    ctaButton.onclick = function() { addToCartWithCaptcha(); };
    
    const margin = (quantity < TRUCK_CONFIG.smallOrderThreshold) 
        ? TRUCK_CONFIG.smallOrderMargin 
        : TRUCK_CONFIG.standardMargin;
    
    const currentPricing = calculateFullPrice(quantity, pricePerTon, weightPerYard, currentZipData.time, margin);
    
    if (quantity >= TRUCK_CONFIG.minimumYards && quantity < TRUCK_CONFIG.smallOrderThreshold) {
        const upsellPricing = calculateFullPrice(3, pricePerTon, weightPerYard, currentZipData.time, TRUCK_CONFIG.standardMargin);
        const savingsPerYard = currentPricing.pricePerYard - upsellPricing.pricePerYard;
        
        if (upsellSection && savingsPerYard > 0) {
            document.getElementById('upsellCurrentQty').textContent = quantity;
            document.getElementById('upsellCurrentTotal').textContent = currentPricing.total.toFixed(2);
            document.getElementById('upsellCurrentPerYard').textContent = currentPricing.pricePerYard.toFixed(2);
            document.getElementById('upsellUpgradeTotal').textContent = upsellPricing.total.toFixed(2);
            document.getElementById('upsellUpgradePerYard').textContent = upsellPricing.pricePerYard.toFixed(2);
            document.getElementById('upsellSavingsPerYard').textContent = savingsPerYard.toFixed(2);
            upsellSection.classList.remove('hidden');
        }
    }
    
    document.getElementById('quoteYardsAmount').textContent = quantity;
    document.getElementById('quoteTonsAmount').textContent = currentPricing.tons.toFixed(1);
    document.getElementById('quoteMaterialName').textContent = materialName;
    document.getElementById('quoteTonsDisplay').textContent = currentPricing.tons.toFixed(1);
    document.getElementById('quotePerTonPrice').textContent = currentPricing.pricePerTon.toFixed(2);
    document.getElementById('quoteMaterialTotal').textContent = currentPricing.materialWithMargin.toFixed(2);
    document.getElementById('quoteSalesTax').textContent = currentPricing.salesTax.toFixed(2);
    document.getElementById('quoteServiceFee').textContent = currentPricing.serviceFee.toFixed(2);
    document.getElementById('quoteTotalAmount').textContent = currentPricing.total.toFixed(2);
    
    document.getElementById('quoteFreeDeliveryBadge').classList.remove('hidden');
    document.getElementById('quoteTotalSection').classList.remove('hidden');
    document.getElementById('needAProSection').classList.remove('hidden');
    
    if (typeof turnstileStatus !== 'undefined' && turnstileStatus.quote) {
        ctaButton.textContent = '🛒 Add to Cart →';
        ctaButton.disabled = false;
    } else {
        ctaButton.textContent = 'Complete Verification to Continue';
        ctaButton.disabled = true;
    }
    
    currentQuote = {
        zip: document.getElementById('quoteZipCode').value,
        city: currentZipData.city,
        distance: currentZipData.distance,
        travelTime: currentZipData.time,
        product: materialName,
        productId: productSelect.value,
        quantity: quantity,
        tons: currentPricing.tons,
        pricePerTon: currentPricing.pricePerTon,
        pricePerYard: currentPricing.pricePerYard,
        baseMaterialCost: currentPricing.baseMaterialCost,
        deliveryCost: currentPricing.deliveryCost,
        truckConfig: currentPricing.truckConfig.description,
        margin: margin,
        materialWithMargin: currentPricing.materialWithMargin,
        salesTax: currentPricing.salesTax,
        serviceFee: currentPricing.serviceFee,
        total: currentPricing.total.toFixed(2)
    };
}

function upgradeToThreeYards() {
    document.getElementById('quoteQuantity').value = 3;
    recalculateQuote();
    showToast('success', 'Upgraded!', 'Quantity updated to 3 yards for better pricing');
}

const quoteZipInput = document.getElementById('quoteZipCode');
if (quoteZipInput) quoteZipInput.addEventListener('input', handleQuoteZipInput);

const quoteProductSelect = document.getElementById('quoteProduct');
if (quoteProductSelect) quoteProductSelect.addEventListener('change', recalculateQuote);

const quoteQuantityInput = document.getElementById('quoteQuantity');
if (quoteQuantityInput) {
    quoteQuantityInput.addEventListener('input', recalculateQuote);
    quoteQuantityInput.addEventListener('change', recalculateQuote);
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = '<span class="toast-icon">' + icons[type] + '</span><div class="toast-message"><strong>' + title + '</strong><span>' + message + '</span></div>';
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastSlideIn 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 5000);
}

// =====================================================
// FAQ TOGGLE
// =====================================================
function toggleFaq(button) {
    const faqItem = button.parentElement;
    const answer = faqItem.querySelector('.faq-answer');
    const icon = button.querySelector('.faq-icon');
    
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
            const otherAnswer = item.querySelector('.faq-answer');
            const otherIcon = item.querySelector('.faq-icon');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
            if (otherIcon) otherIcon.textContent = '+';
        }
    });
    
    faqItem.classList.toggle('active');
    if (faqItem.classList.contains('active')) { answer.style.maxHeight = answer.scrollHeight + 'px'; icon.textContent = '−'; }
    else { answer.style.maxHeight = null; icon.textContent = '+'; }
}

// =====================================================
// HERO DROPDOWN
// =====================================================
const heroDropdownBtn = document.querySelector('.hero-dropdown-btn');
const heroDropdownMenu = document.querySelector('.hero-dropdown-menu');

if (heroDropdownBtn && heroDropdownMenu) {
    heroDropdownBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); heroDropdownMenu.classList.toggle('show'); });
    document.addEventListener('click', function(e) { if (!e.target.closest('.hero-dropdown')) heroDropdownMenu.classList.remove('show'); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') heroDropdownMenu.classList.remove('show'); });
}

// =====================================================
// SHOPPING CART
// =====================================================
let cart = [];
let cartIdCounter = 1;

function getMinDeliveryDate() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }
function getDefaultDeliveryDate() { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0]; }

function addToCart() {
    if (!currentQuote) return;
    const cartItem = {
        id: cartIdCounter++, product: currentQuote.product, productId: currentQuote.productId,
        quantity: currentQuote.quantity, tons: currentQuote.tons, zip: currentQuote.zip,
        city: currentQuote.city, distance: currentQuote.distance, travelTime: currentQuote.travelTime,
        pricePerTon: currentQuote.pricePerTon, pricePerYard: currentQuote.pricePerYard,
        truckConfig: currentQuote.truckConfig, margin: currentQuote.margin,
        materialWithMargin: currentQuote.materialWithMargin, salesTax: currentQuote.salesTax,
        serviceFee: currentQuote.serviceFee, total: parseFloat(currentQuote.total),
        deliveryDate: getDefaultDeliveryDate()
    };
    cart.push(cartItem);
    updateCartCount();
    updateCartDrawer();
    showToast('success', 'Added to Cart!', cartItem.quantity + ' yd³ ' + cartItem.product + ' - $' + cartItem.total.toFixed(2));
    const cartCount = document.getElementById('navCartCount');
    cartCount.classList.add('pulse');
    setTimeout(() => cartCount.classList.remove('pulse'), 300);
    closeCalculatorModal();
    setTimeout(() => openCartDrawer(), 300);
    resetCalculatorForm();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartCount();
    updateCartDrawer();
    showToast('info', 'Item Removed', 'Item removed from your cart');
}

function updateCartCount() {
    const countEl = document.getElementById('navCartCount');
    if (cart.length > 0) { countEl.textContent = cart.length; countEl.classList.remove('hidden'); }
    else countEl.classList.add('hidden');
}

function updateCartDrawer() {
    const emptyEl = document.getElementById('cartEmpty');
    const itemsContainer = document.getElementById('cartItemsContainer');
    const footerEl = document.getElementById('cartDrawerFooter');
    
    if (cart.length === 0) {
        emptyEl.style.display = 'block';
        itemsContainer.innerHTML = '';
        footerEl.style.display = 'none';
        return;
    }
    
    emptyEl.style.display = 'none';
    footerEl.style.display = 'block';
    
    let itemsHtml = '';
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.total;
        itemsHtml += '<div class="cart-item"><div class="cart-item-header"><div><div class="cart-item-name">' + item.product + '</div><div class="cart-item-location">📍 ' + item.city + ' (' + item.zip + ')</div></div><button class="cart-item-remove" onclick="removeFromCart(' + item.id + ')">✕</button></div><div class="cart-item-details"><span class="cart-item-qty">' + item.quantity + ' yd³ (' + item.tons.toFixed(1) + ' tons)</span><span class="cart-item-price">$' + item.total.toFixed(2) + '</span></div><div class="cart-item-per-unit">$' + item.pricePerYard.toFixed(2) + '/yard delivered</div></div>';
    });
    
    itemsContainer.innerHTML = itemsHtml;
    document.getElementById('cartItemCount').textContent = cart.length;
    document.getElementById('cartSubtotal').textContent = '$' + subtotal.toFixed(2);
    document.getElementById('cartTotal').textContent = '$' + subtotal.toFixed(2);
}

function openCartDrawer() {
    document.getElementById('cartDrawerOverlay').classList.add('active');
    document.getElementById('cartDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    document.getElementById('cartDrawerOverlay').classList.remove('active');
    document.getElementById('cartDrawer').classList.remove('active');
    document.body.style.overflow = '';
}

// =====================================================
// CHECKOUT SYSTEM
// =====================================================
var customerInfo = { name: '', email: '', phone: '', address: '', city: '', zip: '', marketingConsent: false };

function proceedToCheckout() {
    if (cart.length === 0) return;
    closeCartDrawer();
    if (cart.length > 0) {
        document.getElementById('checkoutCity').value = cart[0].city || '';
        document.getElementById('checkoutZipConfirm').value = cart[0].zip || '';
    }
    showCheckoutStep(1);
    document.getElementById('checkoutModal').classList.add('active');
}

function showCheckoutStep(step) {
    document.getElementById('checkoutStep1').style.display = 'none';
    document.getElementById('checkoutStep2').style.display = 'none';
    document.getElementById('checkoutStep3').style.display = 'none';
    document.getElementById('step1indicator').classList.remove('active', 'completed');
    document.getElementById('step2indicator').classList.remove('active', 'completed');
    document.getElementById('step3indicator').classList.remove('active', 'completed');
    
    if (step === 1) {
        document.getElementById('checkoutStep1').style.display = 'block';
        document.getElementById('step1indicator').classList.add('active');
        document.getElementById('checkoutModalTitle').textContent = '📋 Contact Information';
    } else if (step === 2) {
        document.getElementById('checkoutStep2').style.display = 'block';
        document.getElementById('step1indicator').classList.add('completed');
        document.getElementById('step2indicator').classList.add('active');
        document.getElementById('checkoutModalTitle').textContent = '📅 Select Delivery Date';
    } else if (step === 3) {
        document.getElementById('checkoutStep3').style.display = 'block';
        document.getElementById('step1indicator').classList.add('completed');
        document.getElementById('step2indicator').classList.add('completed');
        document.getElementById('step3indicator').classList.add('active');
        document.getElementById('checkoutModalTitle').textContent = '💳 Review & Pay';
    }
}

function goToContactStep() { showCheckoutStep(1); }

function goToDeliveryStep() {
    var name = document.getElementById('checkoutName').value.trim();
    var email = document.getElementById('checkoutEmail').value.trim();
    var phone = document.getElementById('checkoutPhone').value.trim();
    var address = document.getElementById('checkoutAddress').value.trim();
    var city = document.getElementById('checkoutCity').value.trim();
    var zip = document.getElementById('checkoutZipConfirm').value.trim();
    
    if (!name || !email || !phone || !address || !city || !zip) {
        showToast('error', 'Missing Information', 'Please fill in all required fields');
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        showToast('error', 'Invalid Email', 'Please enter a valid email address');
        return;
    }
    
    customerInfo = { name, email, phone, address, city, zip, marketingConsent: document.getElementById('checkoutMarketingConsent').checked };
    
    var deliveryHtml = '';
    cart.forEach(function(item, index) {
        deliveryHtml += '<div class="checkout-delivery-item"><div class="checkout-delivery-item-header"><div><div class="checkout-delivery-item-name">' + item.product + '</div><div class="checkout-delivery-item-details">' + item.quantity + ' yd³ (' + item.tons.toFixed(1) + ' tons) → ' + item.city + '</div></div><div class="checkout-delivery-item-price">$' + item.total.toFixed(2) + '</div></div><label>📅 Preferred Delivery Date</label><input type="date" id="deliveryDate' + index + '" value="' + item.deliveryDate + '" min="' + getMinDeliveryDate() + '"></div>';
    });
    document.getElementById('checkoutDeliveryItems').innerHTML = deliveryHtml;
    showCheckoutStep(2);
}

function goToPaymentStep() {
    cart.forEach(function(item, index) {
        var dateInput = document.getElementById('deliveryDate' + index);
        if (dateInput) item.deliveryDate = dateInput.value;
    });
    
    var summaryHtml = '<div class="checkout-customer-summary"><h4>📍 Delivery To:</h4><p><strong>' + customerInfo.name + '</strong><br>' + customerInfo.address + '<br>' + customerInfo.city + ', TX ' + customerInfo.zip + '<br>📞 ' + customerInfo.phone + '<br>✉️ ' + customerInfo.email + '</p></div>';
    var total = 0;
    cart.forEach(function(item) {
        total += item.total;
        var deliveryDate = new Date(item.deliveryDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        summaryHtml += '<div class="checkout-order-item"><div><strong>' + item.product + '</strong><br><small>' + item.quantity + ' yd³ (' + item.tons.toFixed(1) + ' tons)</small><br><small>📅 ' + deliveryDate + '</small></div><strong>$' + item.total.toFixed(2) + '</strong></div>';
    });
    summaryHtml += '<div class="checkout-order-total"><span>Total (FREE Delivery)</span><span>$' + total.toFixed(2) + '</span></div>';
    document.getElementById('checkoutOrderSummary').innerHTML = summaryHtml;
    showCheckoutStep(3);
}

function closeCheckoutModal() { document.getElementById('checkoutModal').classList.remove('active'); }

function processPayment() {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('checkoutModal').classList.remove('active');
    showToast('success', 'Order Placed!', '$' + total.toFixed(2) + " - We'll contact you to confirm delivery details.");
    
    let orderDetails = 'ORDER CONFIRMED!\n\n';
    cart.forEach((item, index) => {
        const deliveryDate = new Date(item.deliveryDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        orderDetails += 'Item ' + (index + 1) + ': ' + item.quantity + ' yd³ (' + item.tons.toFixed(1) + ' tons) ' + item.product + '\n';
        orderDetails += '  → Delivery to ' + item.city + ' (' + item.zip + ')\n';
        orderDetails += '  → Scheduled: ' + deliveryDate + '\n';
        orderDetails += '  → Truck: ' + item.truckConfig + '\n';
        orderDetails += '  → Price: $' + item.total.toFixed(2) + '\n\n';
    });
    orderDetails += 'TOTAL: $' + total.toFixed(2) + ' (FREE DELIVERY)\n\n';
    orderDetails += "We'll send a confirmation email and text with tracking info!";
    alert(orderDetails);
    cart = [];
    updateCartCount();
    updateCartDrawer();
}

function resetCalculatorForm() {
    document.getElementById('quoteZipCode').value = '';
    document.getElementById('quoteProduct').value = '';
    document.getElementById('quoteQuantity').value = '5';
    document.getElementById('quoteZipStatus').classList.add('hidden');
    document.getElementById('quoteDeliveryInfo').classList.add('hidden');
    document.getElementById('quoteOutOfArea').classList.add('hidden');
    document.getElementById('quoteFreeDeliveryBadge').classList.add('hidden');
    document.getElementById('quoteTotalSection').classList.add('hidden');
    document.getElementById('needAProSection').classList.add('hidden');
    const minimumWarning = document.getElementById('quoteMinimumWarning');
    const upsellSection = document.getElementById('quoteUpsellSection');
    if (minimumWarning) minimumWarning.classList.add('hidden');
    if (upsellSection) upsellSection.classList.add('hidden');
    document.getElementById('quoteCtaButton').disabled = true;
    document.getElementById('quoteCtaButton').textContent = 'Enter ZIP Code to Get Quote';
    currentZipData = null;
    currentQuote = null;
}

// =====================================================
// INLINE MATERIAL CALCULATOR
// =====================================================
let calculatedMaterial = null;

function calculateInlineMaterial() {
    const materialSelect = document.getElementById('inline-calc-material');
    const length = parseFloat(document.getElementById('inline-calc-length').value) || 0;
    const width = parseFloat(document.getElementById('inline-calc-width').value) || 0;
    const depth = parseFloat(document.getElementById('inline-calc-depth').value) || 0;
    
    if (!materialSelect.value) { showToast('error', 'Select Material', 'Please select a material type first'); return; }
    if (length <= 0 || width <= 0 || depth <= 0) { showToast('error', 'Missing Info', 'Please enter length, width, and depth'); return; }
    
    const selectedOption = materialSelect.options[materialSelect.selectedIndex];
    const weightPerYard = parseFloat(selectedOption.dataset.weight) || 1.4;
    const materialName = selectedOption.text;
    
    let cubicYards = (length * width * depth) / 324;
    if (cubicYards < TRUCK_CONFIG.minimumYards) {
        cubicYards = TRUCK_CONFIG.minimumYards;
        showToast('info', '2 Yard Minimum', 'Adjusted to minimum order of ' + TRUCK_CONFIG.minimumYards + ' yards');
    }
    
    const tons = cubicYards * weightPerYard;
    document.getElementById('inline-result-yards').textContent = cubicYards.toFixed(1);
    document.getElementById('inline-result-tons').textContent = tons.toFixed(1);
    
    const noteEl = document.getElementById('result-material-note');
    noteEl.innerHTML = 'Based on <strong>' + materialName + '</strong> (' + weightPerYard + ' tons/yd³)';
    noteEl.style.display = 'block';
    
    calculatedMaterial = { materialValue: materialSelect.value, materialName, cubicYards, tons, weightPerYard };
    document.getElementById('inline-calc-result').style.display = 'block';
    document.getElementById('inline-calc-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getDeliveryPrice() {
    if (!calculatedMaterial) { showToast('error', 'Calculate First', 'Please calculate your material needs first'); return; }
    openCalculatorModal();
    if (calculatedMaterial.materialValue) document.getElementById('quoteProduct').value = calculatedMaterial.materialValue;
    let quantity = Math.ceil(calculatedMaterial.cubicYards * 2) / 2;
    if (quantity < TRUCK_CONFIG.minimumYards) quantity = TRUCK_CONFIG.minimumYards;
    document.getElementById('quoteQuantity').value = quantity;
    showToast('info', 'Material Pre-filled', quantity + ' yd³ of ' + calculatedMaterial.materialName + ' - enter your ZIP for pricing!');
    recalculateQuote();
}

function requestInlineCallback() {
    const name = document.getElementById('inline-callback-name').value;
    const phone = document.getElementById('inline-callback-phone').value;
    if (!name || !phone) { showToast('error', 'Missing Info', 'Please enter your name and phone number'); return; }
    console.log('Callback requested:', { name, phone });
    showToast('success', 'Callback Requested!', "We'll call you during business hours.");
    document.getElementById('inline-callback-name').value = '';
    document.getElementById('inline-callback-phone').value = '';
}

// =====================================================
// CLOUDFLARE TURNSTILE
// =====================================================
let turnstileStatus = { visualizer: false, price: false, quote: false };

function onTurnstileVisualizer(token) { turnstileStatus.visualizer = true; const btn = document.getElementById('visualizerBtn'); if (btn) btn.disabled = false; }
function onTurnstilePrice(token) { turnstileStatus.price = true; const btn = document.getElementById('getPriceBtn'); if (btn) btn.disabled = false; }
function onTurnstileQuote(token) { turnstileStatus.quote = true; if (typeof recalculateQuote === 'function') recalculateQuote(); }
function openVisualizerWithCaptcha() { if (turnstileStatus.visualizer) openVisualizer(); else alert('Please complete the verification first.'); }
function getDeliveryPriceWithCaptcha() { if (turnstileStatus.price) getDeliveryPrice(); else alert('Please complete the verification first.'); }
function addToCartWithCaptcha() { if (turnstileStatus.quote) addToCart(); else alert('Please complete the verification first.'); }

// =====================================================
// MOBILE MENU
// =====================================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', function() { this.classList.toggle('active'); navLinks.classList.toggle('active'); });
    navLinks.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => { mobileMenuBtn.classList.remove('active'); navLinks.classList.remove('active'); }); });
    const navDropdown = document.querySelector('.nav-dropdown > a');
    if (navDropdown) { navDropdown.addEventListener('click', function(e) { if (window.innerWidth <= 968) { e.preventDefault(); this.parentElement.classList.toggle('active'); } }); }
}

document.addEventListener('click', function(e) {
    if (navLinks && mobileMenuBtn && !e.target.closest('.nav-links') && !e.target.closest('.mobile-menu-btn')) {
        mobileMenuBtn.classList.remove('active');
        navLinks.classList.remove('active');
    }
});

// =====================================================
// MATERIAL VISUALIZER
// =====================================================
const vizState = {
    image: null,
    selectedMaterial: { id: 'black-mulch', name: 'Black Mulch', color: '#1a1a1a', price: 25, image: '/images/materials/black-mulch.jpg' },
    points: [],
    isComplete: false,
    showOverlay: true,
    opacity: 0.7,
    materialPattern: null
};

const vizMaterials = [
    { id: 'black-mulch', name: 'Black Mulch', color: '#1a1a1a', price: 25, image: '/images/materials/black-mulch.jpg' },
    { id: 'brown-mulch', name: 'Brown Mulch', color: '#8B4513', price: 25, image: '/images/materials/brown-mulch.jpg' },
    { id: 'blackstar-gravel', name: 'Blackstar Gravel', color: '#2d2d2d', price: 96, image: '/images/materials/black-star.jpg' },
    { id: 'decomposed-granite', name: 'Decomposed Granite', color: '#C9A66B', price: 48, image: '/images/materials/Decomposed-Granite.jpg' },
    { id: 'bull-rock', name: '3x5 Bull Rock', color: '#a08060', price: 41, image: '/images/materials/2x3-bull-rock.jpeg' },
    { id: 'topsoil', name: 'Topsoil', color: '#3d3225', price: 24, image: '/images/materials/top-soil.jpg' }
];

const vizMaterialWeights = { 'black-mulch': 0.5, 'brown-mulch': 0.5, 'blackstar-gravel': 1.4, 'decomposed-granite': 1.4, 'bull-rock': 1.4, 'topsoil': 1.4 };
const vizToQuoteMaterialMapping = { 'black-mulch': 'mulch-black', 'brown-mulch': 'mulch-brown', 'blackstar-gravel': 'blackstar', 'decomposed-granite': 'decomposed-granite', 'bull-rock': 'bull-rock-3x5', 'topsoil': 'topsoil' };

let vizCalculatedQuantity = null;
let vizCalculatedTons = null;
let vizCanvasDimensions = { width: 0, height: 0 };

function openVisualizer() { document.getElementById('visualizerModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeVisualizer() { document.getElementById('visualizerModal').classList.remove('active'); document.body.style.overflow = ''; }

var pendingPhotoFile = null;
var photoConsentGiven = false;

function openPhotoConsent() { document.getElementById('photoConsentModal').classList.add('active'); }
function closePhotoConsent() { document.getElementById('photoConsentModal').classList.remove('active'); }

function handleVisualizerUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    if (photoConsentGiven) processVisualizerFile(file);
    else { pendingPhotoFile = file; openPhotoConsent(); }
}

function acceptPhotoConsent() {
    photoConsentGiven = true;
    closePhotoConsent();
    if (pendingPhotoFile) { processVisualizerFile(pendingPhotoFile); pendingPhotoFile = null; }
}

function declinePhotoConsent() {
    closePhotoConsent();
    document.getElementById('vizFileInput').value = '';
    document.getElementById('vizCameraInput').value = '';
    pendingPhotoFile = null;
}

function processVisualizerFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const maxDim = 800;
            let width = img.width, height = img.height;
            if (width > maxDim || height > maxDim) {
                if (width > height) { height = (height / width) * maxDim; width = maxDim; }
                else { width = (width / height) * maxDim; height = maxDim; }
            }
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width; tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0, width, height);
            vizState.image = tempCanvas.toDataURL('image/jpeg', 0.8);
            vizState.points = []; vizState.isComplete = false;
            vizCanvasDimensions = { width: 0, height: 0 };
            updateVisualizerUI(); drawVisualizerCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleVizDragOver(event) { event.preventDefault(); event.stopPropagation(); document.getElementById('vizCanvasContainer').classList.add('dragging'); }
function handleVizDragLeave(event) { event.preventDefault(); event.stopPropagation(); document.getElementById('vizCanvasContainer').classList.remove('dragging'); }
function handleVizDrop(event) {
    event.preventDefault(); event.stopPropagation();
    document.getElementById('vizCanvasContainer').classList.remove('dragging');
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) { if (photoConsentGiven) processVisualizerFile(file); else { pendingPhotoFile = file; openPhotoConsent(); } }
}

function handleVisualizerClick(event) {
    if (!vizState.image || vizState.isComplete) return;
    const canvas = document.getElementById('vizMainCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    if (vizState.points.length > 2) {
        const first = vizState.points[0];
        const dist = Math.sqrt((x - first.x) ** 2 + (y - first.y) ** 2);
        if (dist < 25) { vizState.isComplete = true; updateVisualizerUI(); drawVisualizerCanvas(); return; }
    }
    vizState.points.push({x, y}); updateVisualizerUI(); drawVisualizerCanvas();
}

function drawVisualizerCanvas() {
    if (!vizState.image) return;
    const canvas = document.getElementById('vizMainCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function() {
        if (vizCanvasDimensions.width === 0) {
            const maxDim = 500; let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) { if (w > h) { h = (h/w) * maxDim; w = maxDim; } else { w = (w/h) * maxDim; h = maxDim; } }
            vizCanvasDimensions.width = Math.floor(w); vizCanvasDimensions.height = Math.floor(h);
        }
        canvas.width = vizCanvasDimensions.width; canvas.height = vizCanvasDimensions.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (vizState.points.length > 0) {
            ctx.strokeStyle = '#E85D04'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(vizState.points[0].x, vizState.points[0].y);
            for (let i = 1; i < vizState.points.length; i++) ctx.lineTo(vizState.points[i].x, vizState.points[i].y);
            if (vizState.isComplete) ctx.closePath();
            ctx.stroke();
            if (!vizState.isComplete) {
                vizState.points.forEach(function(p, i) {
                    ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
                    ctx.fillStyle = (i === 0 && vizState.points.length > 2) ? '#22c55e' : '#E85D04';
                    ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
                });
            }
            if (vizState.isComplete && vizState.showOverlay) {
                ctx.globalAlpha = vizState.opacity;
                ctx.fillStyle = vizState.materialPattern || vizState.selectedMaterial.color;
                ctx.beginPath(); ctx.moveTo(vizState.points[0].x, vizState.points[0].y);
                for (let i = 1; i < vizState.points.length; i++) ctx.lineTo(vizState.points[i].x, vizState.points[i].y);
                ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
            }
        }
    };
    img.src = vizState.image;
}

function updateVisualizerUI() {
    const placeholder = document.getElementById('vizPlaceholder');
    const canvasWrapper = document.getElementById('vizCanvasWrapper');
    const startOverBtn = document.getElementById('vizStartOver');
    const instructionsDiv = document.getElementById('vizInstructions');
    const controlsDiv = document.getElementById('vizControls');
    const step3Title = document.getElementById('vizStep3Title');
    const pointCounter = document.getElementById('vizPointCounter');
    const materialBadge = document.getElementById('vizMaterialBadge');
    const calcSection = document.getElementById('vizCalcSection');
    
    if (!vizState.image) {
        placeholder.style.display = 'block'; canvasWrapper.style.display = 'none'; startOverBtn.style.display = 'none';
        instructionsDiv.innerHTML = '<p class="viz-instruction">Upload a photo to get started</p>';
        instructionsDiv.style.display = 'block'; controlsDiv.style.display = 'none'; calcSection.style.display = 'none';
        return;
    }
    placeholder.style.display = 'none'; canvasWrapper.style.display = 'block'; startOverBtn.style.display = 'block';
    if (vizState.isComplete) {
        step3Title.textContent = '3. Adjust Preview'; instructionsDiv.style.display = 'none'; controlsDiv.style.display = 'block';
        pointCounter.style.display = 'none'; materialBadge.style.display = 'block';
        document.getElementById('vizBadgeName').textContent = vizState.selectedMaterial.name;
        calcSection.style.display = 'block';
        document.getElementById('vizCalcMaterial').innerHTML = 'Calculating for: <strong>' + vizState.selectedMaterial.name + '</strong>';
    } else {
        step3Title.textContent = '3. Outline Area';
        instructionsDiv.innerHTML = '<p class="viz-instruction">Tap to add points. Tap the <span class="green">green point</span> to close the shape.</p>' + (vizState.points.length > 0 ? '<button class="viz-reset-btn" onclick="resetVisualizerPoints()">↺ Reset Points</button>' : '');
        instructionsDiv.style.display = 'block'; controlsDiv.style.display = 'none'; materialBadge.style.display = 'none'; calcSection.style.display = 'none';
        if (vizState.points.length > 0) { pointCounter.style.display = 'block'; pointCounter.innerHTML = vizState.points.length + ' point' + (vizState.points.length !== 1 ? 's' : '') + (vizState.points.length >= 3 ? ' • tap green to close' : ''); }
        else pointCounter.style.display = 'none';
    }
}

function calculateVisualizerMaterial() {
    const length = parseFloat(document.getElementById('vizCalcLength').value) || 0;
    const width = parseFloat(document.getElementById('vizCalcWidth').value) || 0;
    const depth = parseFloat(document.getElementById('vizCalcDepth').value) || 0;
    if (length <= 0 || width <= 0 || depth <= 0) { showToast('error', 'Missing Info', 'Please enter length, width, and depth'); return; }
    const cubicYards = (length * width * depth) / 324;
    const weight = vizMaterialWeights[vizState.selectedMaterial.id] || 1.4;
    const tons = cubicYards * weight;
    document.getElementById('vizCalcYards').textContent = cubicYards.toFixed(1);
    document.getElementById('vizCalcTons').textContent = tons.toFixed(1);
    vizCalculatedQuantity = Math.ceil(cubicYards * 2) / 2;
    if (vizCalculatedQuantity < TRUCK_CONFIG.minimumYards) vizCalculatedQuantity = TRUCK_CONFIG.minimumYards;
    vizCalculatedTons = tons;
    document.getElementById('vizCalcResult').style.display = 'block';
}

function getVisualizerQuoteWithQuantity() {
    closeVisualizer(); openCalculatorModal();
    const mappedMaterial = vizToQuoteMaterialMapping[vizState.selectedMaterial.id] || '';
    if (mappedMaterial) document.getElementById('quoteProduct').value = mappedMaterial;
    if (vizCalculatedQuantity) document.getElementById('quoteQuantity').value = vizCalculatedQuantity;
    recalculateQuote();
    showToast('info', 'Ready for Quote', vizCalculatedQuantity + ' yd³ of ' + vizState.selectedMaterial.name + ' - enter your ZIP!');
}

function getVisualizerQuote() {
    closeVisualizer(); openCalculatorModal();
    const mappedMaterial = vizToQuoteMaterialMapping[vizState.selectedMaterial.id] || '';
    if (mappedMaterial) { document.getElementById('quoteProduct').value = mappedMaterial; recalculateQuote(); }
    showToast('info', 'Material Selected', vizState.selectedMaterial.name + ' - Enter your ZIP and quantity for pricing!');
}

document.addEventListener('DOMContentLoaded', function() {
    const materialGrid = document.getElementById('vizMaterialGrid');
    if (materialGrid) {
        materialGrid.addEventListener('click', function(e) {
            const btn = e.target.closest('.material-btn');
            if (!btn) return;
            document.querySelectorAll('.material-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const materialId = btn.dataset.id;
            vizState.selectedMaterial = vizMaterials.find(m => m.id === materialId);
            if (vizState.selectedMaterial && vizState.selectedMaterial.image) {
                const textureImg = new Image();
                textureImg.onload = function() {
                    const canvas = document.getElementById('vizMainCanvas');
                    if (canvas) { vizState.materialPattern = canvas.getContext('2d').createPattern(textureImg, 'repeat'); drawVisualizerCanvas(); }
                };
                textureImg.src = vizState.selectedMaterial.image;
            }
            document.getElementById('vizMaterialPrice').textContent = '$' + vizState.selectedMaterial.price + '/ton';
            const calcMaterial = document.getElementById('vizCalcMaterial');
            if (calcMaterial) calcMaterial.innerHTML = 'Calculating for: <strong>' + vizState.selectedMaterial.name + '</strong>';
            if (vizState.isComplete) { document.getElementById('vizBadgeName').textContent = vizState.selectedMaterial.name; drawVisualizerCanvas(); }
        });
    }
});

function toggleVisualizerOverlay() { vizState.showOverlay = document.getElementById('vizShowOverlay').checked; drawVisualizerCanvas(); }
function updateVisualizerOpacity() { const slider = document.getElementById('vizOpacitySlider'); vizState.opacity = slider.value / 100; document.getElementById('vizOpacityValue').textContent = slider.value + '%'; drawVisualizerCanvas(); }

function resetVisualizerPoints() {
    vizState.points = []; vizState.isComplete = false; vizCalculatedQuantity = null; vizCalculatedTons = null;
    vizCanvasDimensions = { width: 0, height: 0 };
    document.getElementById('vizCalcLength').value = ''; document.getElementById('vizCalcWidth').value = ''; document.getElementById('vizCalcDepth').value = '';
    document.getElementById('vizCalcResult').style.display = 'none';
    updateVisualizerUI(); drawVisualizerCanvas();
}

function resetVisualizer() {
    vizState.image = null; vizState.points = []; vizState.isComplete = false;
    vizCalculatedQuantity = null; vizCalculatedTons = null; vizCanvasDimensions = { width: 0, height: 0 };
    document.getElementById('vizCalcLength').value = ''; document.getElementById('vizCalcWidth').value = ''; document.getElementById('vizCalcDepth').value = '';
    document.getElementById('vizCalcResult').style.display = 'none';
    document.getElementById('vizFileInput').value = ''; document.getElementById('vizCameraInput').value = '';
    updateVisualizerUI();
}

// =====================================================
// SELF-HOSTED VIDEO PLAYER
// =====================================================
let promoVideo = null;
let videoOverlay = null;
let videoProgress = null;
let videoTime = null;
let playPauseBtn = null;

document.addEventListener('DOMContentLoaded', function() {
    promoVideo = document.getElementById('promoVideo');
    videoOverlay = document.getElementById('videoOverlay');
    videoProgress = document.getElementById('videoProgress');
    videoTime = document.getElementById('videoTime');
    playPauseBtn = document.getElementById('playPauseBtn');
    if (promoVideo) {
        promoVideo.addEventListener('timeupdate', updateVideoProgress);
        promoVideo.addEventListener('loadedmetadata', updateVideoTime);
        promoVideo.addEventListener('ended', onVideoEnded);
        promoVideo.addEventListener('play', onVideoPlay);
        promoVideo.addEventListener('pause', onVideoPause);
    }
});

function togglePromoVideo() { if (!promoVideo) return; if (promoVideo.paused) promoVideo.play(); else promoVideo.pause(); }
function onVideoPlay() { trackVideoPlay(); if (videoOverlay) videoOverlay.classList.add('hidden'); if (playPauseBtn) { playPauseBtn.querySelector('.play-icon').style.display = 'none'; playPauseBtn.querySelector('.pause-icon').style.display = 'inline'; } promoVideo.parentElement.classList.add('playing'); }
function onVideoPause() { if (playPauseBtn) { playPauseBtn.querySelector('.play-icon').style.display = 'inline'; playPauseBtn.querySelector('.pause-icon').style.display = 'none'; } }
function onVideoEnded() { trackVideoComplete(); if (videoOverlay) videoOverlay.classList.remove('hidden'); promoVideo.parentElement.classList.remove('playing'); if (playPauseBtn) { playPauseBtn.querySelector('.play-icon').style.display = 'inline'; playPauseBtn.querySelector('.pause-icon').style.display = 'none'; } }

function updateVideoProgress() {
    if (!promoVideo || !videoProgress) return;
    const percent = (promoVideo.currentTime / promoVideo.duration) * 100;
    videoProgress.style.width = percent + '%';
    updateVideoTime();
}

function updateVideoTime() {
    if (!promoVideo || !videoTime) return;
    videoTime.textContent = formatTime(promoVideo.currentTime) + ' / ' + formatTime(promoVideo.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function seekVideo(event) {
    if (!promoVideo) return;
    const rect = event.currentTarget.getBoundingClientRect();
    promoVideo.currentTime = ((event.clientX - rect.left) / rect.width) * promoVideo.duration;
}

function toggleMute() {
    if (!promoVideo) return;
    promoVideo.muted = !promoVideo.muted;
    const muteIcon = document.getElementById('muteIcon');
    if (muteIcon) muteIcon.textContent = promoVideo.muted ? '🔇' : '🔊';
}

function toggleFullscreen() {
    const container = document.querySelector('.self-hosted-video-container');
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
}

// =====================================================
// GOOGLE ANALYTICS EVENT TRACKING
// =====================================================
function trackEvent(eventName, eventParams) {
    eventParams = eventParams || {};
    eventParams.site_version = typeof SITE_VERSION !== 'undefined' ? SITE_VERSION : 'unknown';
    if (typeof gtag !== 'undefined') gtag('event', eventName, eventParams);
}

function trackCalculatorOpen(source) { trackEvent('calculator_opened', { event_category: 'engagement', trigger_source: source || 'unknown' }); }
function trackQuoteViewed(material, quantity, price, zip) { trackEvent('quote_viewed', { event_category: 'conversion', material: material, quantity: quantity, value: price, zip_code: zip }); }
function trackAddToCart(material, quantity, price) { trackEvent('add_to_cart', { event_category: 'ecommerce', currency: 'USD', value: price, items: [{ item_name: material, quantity: quantity, price: price }] }); }
function trackPhoneClick(location) { trackEvent('phone_click', { event_category: 'conversion', click_location: location || 'unknown' }); }
function trackTextClick(location) { trackEvent('text_click', { event_category: 'conversion', click_location: location || 'unknown' }); }
function trackVideoPlay() { trackEvent('video_play', { event_category: 'engagement', event_label: 'How It Works Video' }); }
function trackVideoComplete() { trackEvent('video_complete', { event_category: 'engagement', event_label: 'How It Works Video' }); }

document.addEventListener('DOMContentLoaded', function() {
    const howItWorks = document.getElementById('how-it-works');
    if (howItWorks) {

// =====================================================
// SCROLL NAVIGATION ARROWS - FIXED
// At top: only down arrow
// Mid page: both arrows  
// At bottom: only up arrow
// =====================================================
(function() {
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    
    if (!scrollUpBtn || !scrollDownBtn) return;
    
    function updateScrollArrows() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const atTop = scrollTop < 100;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 100;
        
        // At top: hide up, show down
        if (atTop) {
            scrollUpBtn.style.cssText = 'display: none !important;';
            scrollDownBtn.style.cssText = 'display: flex !important;';
        }
        // At bottom: show up, hide down
        else if (atBottom) {
            scrollUpBtn.style.cssText = 'display: flex !important;';
            scrollDownBtn.style.cssText = 'display: none !important;';
        }
        // Middle: show both
        else {
            scrollUpBtn.style.cssText = 'display: flex !important;';
            scrollDownBtn.style.cssText = 'display: flex !important;';
        }
    }
    
    scrollUpBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    scrollDownBtn.addEventListener('click', function() {
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    });
    
    window.addEventListener('scroll', updateScrollArrows, { passive: true });
    updateScrollArrows();
})();
