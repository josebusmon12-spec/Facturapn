// Core JavaScript for Panificadora Rodríguez Facturación & Inventario

// ==========================================
// 1. INITIAL DATA STATE MANAGEMENT
// ==========================================
const DEFAULT_PRODUCTS = [
    { id: "p1", code: "PROD-001", name: "Semita de Yema", category: "Pan", price: 8.00, price2: 7.50, price3: 7.00, cost: 3.50, stock: 120, minStock: 20, tax: "Exento" },
    { id: "p2", code: "PROD-002", name: "Semita Pelona", category: "Pan", price: 7.00, price2: 6.50, price3: 6.00, cost: 3.00, stock: 95, minStock: 15, tax: "Exento" },
    { id: "p3", code: "PROD-003", name: "Pan Blanco de Harina", category: "Pan", price: 12.00, price2: 11.00, price3: 10.00, cost: 5.00, stock: 200, minStock: 30, tax: "Exento" },
    { id: "p4", code: "PROD-004", name: "Pan de Yema Familiar", category: "Pan", price: 25.00, price2: 23.00, price3: 22.00, cost: 11.00, stock: 45, minStock: 10, tax: "Exento" },
    { id: "p5", code: "PROD-005", name: "Pastel de Tres Leches Chico", category: "Pan", price: 350.00, price2: 320.00, price3: 300.00, cost: 150.00, stock: 12, minStock: 3, tax: "Exento" },
    { id: "p6", code: "PROD-006", name: "Jugo de Naranja Natural 500ml", category: "Jugos", price: 25.00, price2: 22.00, price3: 20.00, cost: 12.00, stock: 50, minStock: 10, tax: "Exento" }
];

const DEFAULT_RAW_MATERIALS = [
    { id: "rm1", code: "RM-001", name: "Harina de Trigo", unit: "kg", cost: 15.00, stock: 100, minStock: 20 },
    { id: "rm2", code: "RM-002", name: "Azúcar Blanca", unit: "kg", cost: 12.00, stock: 80, minStock: 15 },
    { id: "rm3", code: "RM-003", name: "Huevos", unit: "docena", cost: 18.00, stock: 30, minStock: 5 },
    { id: "rm4", code: "RM-004", name: "Mantequilla", unit: "kg", cost: 40.00, stock: 25, minStock: 5 },
    { id: "rm5", code: "RM-005", name: "Levadura", unit: "kg", cost: 25.00, stock: 15, minStock: 3 }
];

const DEFAULT_CHURROS = [
    { id: "ch1", code: "CH-001", name: "Churro Clásico", category: "Churro", price: 5.00, price2: 4.50, price3: 4.00, cost: 2.00, stock: 200, minStock: 30, tax: "Exento" },
    { id: "ch2", code: "CH-002", name: "Churro Relleno Chocolate", category: "Churro", price: 8.00, price2: 7.00, price3: 6.50, cost: 3.50, stock: 100, minStock: 20, tax: "Exento" },
    { id: "ch3", code: "CH-003", name: "Churro Relleno Cajeta", category: "Churro", price: 9.00, price2: 8.00, price3: 7.50, cost: 3.50, stock: 100, minStock: 20, tax: "Exento" }
];

const DEFAULT_ORDERS = [
    { id: "o1", customer: "Marbella Fonseca", phone: "9988-7766", date: "2026-05-22", time: "15:30", details: "2 Pasteles de chocolate con decoración personalizada.", total: 900.00, advance: 400.00, status: "pendiente" }
];

let products = JSON.parse(localStorage.getItem("pr_products")) || DEFAULT_PRODUCTS;
let rawMaterials = JSON.parse(localStorage.getItem("pr_raw_materials")) || DEFAULT_RAW_MATERIALS;
let churros = JSON.parse(localStorage.getItem("pr_churros")) || DEFAULT_CHURROS;
let invoices = JSON.parse(localStorage.getItem("pr_invoices")) || [];
let orders = JSON.parse(localStorage.getItem("pr_orders")) || DEFAULT_ORDERS;
let closures = JSON.parse(localStorage.getItem("pr_closures")) || [];
let config = JSON.parse(localStorage.getItem("pr_config")) || {
    companyName: "Panificadora Rodríguez",
    companyRtn: "07031992001425",
    companyAddress: "Barrio El Centro, El Paraíso, El Paraíso, Honduras",
    companyPhone: "+504 2793-XXXX",
    companyEmail: "info@panificadorarodriguez.com",
    cai: "3A4F6D-7B8C2E-91011A-BCDEFF",
    rangeStart: "000-001-01-00001001",
    rangeEnd: "000-001-01-00005000",
    deadline: "2027-12-31",
    nextInvoiceNum: 1001,
    defaultPrinter: "ticket80"
};
config.companyPhone = config.companyPhone || "+504 2793-XXXX";
config.companyEmail = config.companyEmail || "info@panificadorarodriguez.com";

// Migration script to adapt old categories and invoices
let migrated = false;
const todayStr = new Date().toISOString().split('T')[0];
products.forEach(p => {
    if (["Semitas", "Pan Blanco", "Pan Dulce", "Repostería"].includes(p.category)) {
        p.category = "Pan";
        migrated = true;
    }
});
churros.forEach(c => {
    if (!c.category) {
        c.category = "Churro";
        migrated = true;
    }
});
invoices.forEach(inv => {
    if (inv.items) {
        inv.items.forEach(it => {
            if (!it.category) {
                if (it.name.toLowerCase().includes("churro")) it.category = "Churro";
                else if (it.name.toLowerCase().includes("jugo") || it.name.toLowerCase().includes("naranja")) it.category = "Jugos";
                else it.category = "Pan";
                migrated = true;
            }
        });
    }
    if (inv.closed === undefined) {
        inv.closed = (inv.date !== todayStr);
        inv.closureId = null;
        migrated = true;
    }
});
if (migrated) {
    localStorage.setItem("pr_products", JSON.stringify(products));
    localStorage.setItem("pr_churros", JSON.stringify(churros));
    localStorage.setItem("pr_invoices", JSON.stringify(invoices));
}

// Firebase Cloud Sync Configuration
let db = null;
let isSyncActive = false;
let firebaseUnsubscribers = [];

function updateSyncStatus(status, text) {
    const syncStatusEl = document.getElementById("sync-status");
    const syncTextEl = document.getElementById("sync-text");
    if (!syncStatusEl || !syncTextEl) return;
    
    syncStatusEl.classList.remove("online", "connecting", "offline", "error");
    syncStatusEl.classList.add(status);
    syncTextEl.textContent = text;

    // Update the sync button in settings form
    const fbSubmitBtn = document.querySelector("#firebase-config-form button[type='submit']");
    if (fbSubmitBtn) {
        if (status === "online") {
            fbSubmitBtn.className = "btn btn-success";
            fbSubmitBtn.innerHTML = '<i data-lucide="check-circle"></i> Sincronizado (Conectado)';
        } else if (status === "connecting") {
            fbSubmitBtn.className = "btn btn-outline";
            fbSubmitBtn.innerHTML = '<i data-lucide="refresh-cw" class="spin"></i> Conectando...';
        } else if (status === "error") {
            fbSubmitBtn.className = "btn btn-danger";
            fbSubmitBtn.innerHTML = '<i data-lucide="alert-triangle"></i> Error de Conexión';
        } else {
            fbSubmitBtn.className = "btn btn-primary";
            fbSubmitBtn.innerHTML = '<i data-lucide="cloud-lightning"></i> Conectar y Sincronizar';
        }
        safeCreateIcons();
    }
}

function initFirebase() {
    if (typeof firebase === "undefined") {
        console.warn("Firebase SDK compat libraries not loaded or blocked.");
        updateSyncStatus("offline", "Modo Local (Offline)");
        return;
    }

    try {
        if (firebase.apps.length > 0) {
            firebaseUnsubscribers.forEach(unsub => unsub());
            firebaseUnsubscribers = [];
            db = null;
            isSyncActive = false;
            
            firebase.app().delete().then(() => doInit()).catch(err => {
                console.error("Error resetting Firebase app:", err);
                doInit();
            });
        } else {
            doInit();
        }
    } catch (e) {
        console.error("Firebase reset error:", e);
        updateSyncStatus("error", "Error Inicialización");
    }

    function doInit() {
        let fbConfig = JSON.parse(localStorage.getItem("pr_firebase_config"));
        if (!fbConfig || !fbConfig.apiKey || fbConfig.projectId !== "produccion-y-pago-pn") {
            // Configuración por defecto del proyecto Firebase
            fbConfig = {
                apiKey: "AIzaSyDMPCQgP2C43SXMm74Zt9HG4Da9wqI9zFE",
                authDomain: "produccion-y-pago-pn.firebaseapp.com",
                projectId: "produccion-y-pago-pn",
                appId: "1:367967109708:web:77d71531b449135344aae9"
            };
            localStorage.setItem("pr_firebase_config", JSON.stringify(fbConfig));
        }

        try {
            updateSyncStatus("connecting", "Conectando...");
            firebase.initializeApp(fbConfig);
            db = firebase.firestore();
            isSyncActive = true;
            updateSyncStatus("online", "Conectado (Cloud)");
            startFirebaseSync();
        } catch (e) {
            console.error("Firebase init connection error:", e);
            updateSyncStatus("error", "Error de Conexión");
        }
    }
}

function startFirebaseSync() {
    if (!db) return;

    syncCollection("products", "pr_products", (data) => {
        products = data;
        renderPOSProducts();
        renderInventoryTable();
    }, DEFAULT_PRODUCTS);

    syncCollection("raw_materials", "pr_raw_materials", (data) => {
        rawMaterials = data;
        renderRawMaterials();
    }, DEFAULT_RAW_MATERIALS);

    syncCollection("churros", "pr_churros", (data) => {
        churros = data;
        renderPOSProducts();
        renderChurros();
    }, DEFAULT_CHURROS);

    syncCollection("invoices", "pr_invoices", (data) => {
        invoices = data;
        renderInvoicesTable();
        updateDashboardStats();
    }, []);

    syncCollection("orders", "pr_orders", (data) => {
        orders = data;
        renderKanbanOrders();
    }, DEFAULT_ORDERS);

    syncCollection("closures", "pr_closures", (data) => {
        closures = data;
        renderClosuresTable();
    }, []);

    const configUnsub = db.collection("config").doc("sar_config").onSnapshot(doc => {
        if (doc.exists) {
            config = doc.data();
            saveToStorage("pr_config", config);
            loadSettingsFormValues();
        } else {
            db.collection("config").doc("sar_config").set(config);
        }
    }, err => {
        console.error("Config synchronization error:", err);
    });
    firebaseUnsubscribers.push(configUnsub);
}

function syncCollection(collectionName, localStorageKey, updateLocalStateCallback, defaultSeed) {
    if (!db) return;

    const unsub = db.collection(collectionName).onSnapshot(snapshot => {
        if (snapshot.empty) {
            const localData = JSON.parse(localStorage.getItem(localStorageKey)) || defaultSeed;
            if (localData && localData.length > 0) {
                console.log(`Seeding cloud collection: ${collectionName}`);
                localData.forEach(item => {
                    db.collection(collectionName).doc(item.id).set(item);
                });
            }
        } else {
            const cloudItems = [];
            snapshot.forEach(doc => {
                cloudItems.push(doc.data());
            });
            localStorage.setItem(localStorageKey, JSON.stringify(cloudItems));
            updateLocalStateCallback(cloudItems);
        }
    }, err => {
        console.error(`Sync error on collection ${collectionName}:`, err);
        updateSyncStatus("error", "Error Sinc.");
    });
    firebaseUnsubscribers.push(unsub);
}

function cloudSave(collectionName, docId, data) {
    if (isSyncActive && db) {
        db.collection(collectionName).doc(docId).set(data)
            .catch(err => {
                console.error(`Error saving to cloud: ${collectionName}/${docId}`, err);
                updateSyncStatus("error", "Error Escritura");
            });
    }
}

function cloudDelete(collectionName, docId) {
    if (isSyncActive && db) {
        db.collection(collectionName).doc(docId).delete()
            .catch(err => {
                console.error(`Error deleting from cloud: ${collectionName}/${docId}`, err);
                updateSyncStatus("error", "Error Borrado");
            });
    }
}

let cart = [];
let weeklySalesChart = null;
let categoriesPieChart = null;

// ==========================================
// 2. DOM PROTECTION AND MAP OVERLAYS
// ==========================================
const DOM = {
    navItems: document.querySelectorAll(".nav-item"),
    contentSections: document.querySelectorAll(".content-section"),
    appClock: document.getElementById("app-clock"),
    btnToggleTheme: document.getElementById("btn-toggle-theme"),

    sectionDashboard: document.getElementById("section-dashboard"),
    dashDaySales: document.getElementById("dash-day-sales"),
    dashDayOrders: document.getElementById("dash-day-orders"),
    dashInvValue: document.getElementById("dash-inv-value"),
    dashLowStock: document.getElementById("dash-low-stock"),
    dashLatestInvoices: document.getElementById("dash-latest-invoices"),
    dashLowStockTable: document.getElementById("dash-low-stock-table"),
    btnShowMonthlyStats: document.getElementById("btn-show-monthly-stats"),

    sectionPos: document.getElementById("section-pos"),
    posSearchInput: document.getElementById("pos-search-input"),
    posCategoryFilter: document.getElementById("pos-category-filter"),
    posProductsGrid: document.getElementById("pos-products-grid"),
    posCustomerRtn: document.getElementById("pos-customer-rtn"),
    posCustomerName: document.getElementById("pos-customer-name"),
    posPriceType: document.getElementById("pos-price-type"),
    cartItemsTbody: document.getElementById("cart-items-tbody"),
    cartSubtotal: document.getElementById("cart-subtotal"),
    cartDiscount: document.getElementById("cart-discount"),
    cartIsv: document.getElementById("cart-isv"),
    cartTotal: document.getElementById("cart-total"),
    btnClearCart: document.getElementById("btn-clear-cart"),
    btnCheckout: document.getElementById("btn-checkout"),

    btnAddRaw: document.getElementById("btn-add-raw-material"),
    rawSearchInput: document.getElementById("raw-search-input"),
    rawMaterialsTbody: document.getElementById("raw-materials-tbody"),
    btnAddChurro: document.getElementById("btn-add-churro"),
    churroSearchInput: document.getElementById("churro-search-input"),
    churrosTbody: document.getElementById("churros-tbody"),

    btnAddProduct: document.getElementById("btn-add-product"),
    btnExportExcel: document.getElementById("btn-export-excel"),
    invSearchInput: document.getElementById("inv-search-input"),
    inventoryTableTbody: document.getElementById("inventory-table-tbody"),
    invoicesTableTbody: document.getElementById("invoices-table-tbody"),
    invoiceSearchInput: document.getElementById("invoice-search-input"),
    invoiceDateFilter: document.getElementById("invoice-date-filter"),
    btnClearInvoiceFilters: document.getElementById("btn-clear-invoice-filters"),

    btnAddOrder: document.getElementById("btn-add-order"),
    ordersPending: document.getElementById("orders-pending-container"),
    ordersProduction: document.getElementById("orders-production-container"),
    ordersReady: document.getElementById("orders-ready-container"),
    ordersDelivered: document.getElementById("orders-delivered-container"),

    btnPrintCierre: document.getElementById("btn-print-cierre"),
    settingsForm: document.getElementById("settings-form"),
    setCompanyName: document.getElementById("set-company-name"),
    setCompanyRtn: document.getElementById("set-company-rtn"),
    setCompanyAddress: document.getElementById("set-company-address"),
    setCompanyPhone: document.getElementById("set-company-phone"),
    setCompanyEmail: document.getElementById("set-company-email"),
    setCai: document.getElementById("set-cai"),
    setRangeStart: document.getElementById("set-range-start"),
    setRangeEnd: document.getElementById("set-range-end"),
    setDeadline: document.getElementById("set-deadline"),
    setDefaultPrinter: document.getElementById("set-default-printer"),

    modalPayment: document.getElementById("modal-payment"),
    modalProduct: document.getElementById("modal-product"),
    modalRaw: document.getElementById("modal-raw-material"),
    modalChurro: document.getElementById("modal-churro"),
    modalOrder: document.getElementById("modal-order"),
    modalInvoiceView: document.getElementById("modal-invoice-view"),
    modalMonthlyStats: document.getElementById("modal-monthly-stats"),

    btnClosePayment: document.getElementById("btn-close-payment"),
    btnCancelPayment: document.getElementById("btn-cancel-payment"),
    btnSubmitInvoice: document.getElementById("btn-submit-invoice"),
    btnCloseProductModal: document.getElementById("btn-close-product-modal"),
    btnCancelProductModal: document.getElementById("btn-cancel-product-modal"),
    productForm: document.getElementById("product-form"),
    productModalTitle: document.getElementById("product-modal-title"),
    btnCloseOrderModal: document.getElementById("btn-close-order-modal"),
    btnCancelOrderModal: document.getElementById("btn-cancel-order-modal"),
    orderForm: document.getElementById("order-form"),
    orderModalTitle: document.getElementById("order-modal-title"),
    btnCloseInvoiceView: document.getElementById("btn-close-invoice-view"),
    btnPrintInvoicePdf: document.getElementById("btn-print-invoice-pdf"),
    btnCloseMonthlyStats: document.getElementById("btn-close-monthly-stats"),
    btnCloseMonthlyStatsFooter: document.getElementById("btn-close-monthly-stats-footer"),
    monthlyStatsSelect: document.getElementById("monthly-stats-select"),
    monthlyStatTotal: document.getElementById("monthly-stat-total"),
    monthlyStatCount: document.getElementById("monthly-stat-count"),

    payModalTotalLabel: document.getElementById("pay-modal-total-label"),
    payMethod: document.getElementById("pay-method"),
    paymentCashFields: document.getElementById("payment-cash-fields"),
    payCashReceived: document.getElementById("pay-cash-received"),
    payCashChange: document.getElementById("pay-cash-change"),

    prodId: document.getElementById("prod-id"),
    prodCode: document.getElementById("prod-code"),
    prodName: document.getElementById("prod-name"),
    prodCategory: document.getElementById("prod-category"),
    prodCost: document.getElementById("prod-cost"),
    prodPrice: document.getElementById("prod-price"),
    prodPrice2: document.getElementById("prod-price2"),
    prodPrice3: document.getElementById("prod-price3"),
    prodTax: document.getElementById("prod-tax"),
    prodStock: document.getElementById("prod-stock"),
    prodMinstock: document.getElementById("prod-minstock"),

    rawId: document.getElementById("raw-id"),
    rawCode: document.getElementById("raw-code"),
    rawName: document.getElementById("raw-name"),
    rawUnit: document.getElementById("raw-unit"),
    rawCost: document.getElementById("raw-cost"),
    rawStock: document.getElementById("raw-stock"),
    rawMinstock: document.getElementById("raw-minstock"),
    rawForm: document.getElementById("raw-material-form"),
    rawModalTitle: document.getElementById("raw-modal-title"),
    btnCloseRaw: document.getElementById("btn-close-raw-modal"),
    btnCancelRaw: document.getElementById("btn-cancel-raw-modal"),

    churroId: document.getElementById("churro-id"),
    churroCode: document.getElementById("churro-code"),
    churroName: document.getElementById("churro-name"),
    churroPrice: document.getElementById("churro-price"),
    churroPrice2: document.getElementById("churro-price2"),
    churroPrice3: document.getElementById("churro-price3"),
    churroCost: document.getElementById("churro-cost"),
    churroTax: document.getElementById("churro-tax"),
    churroStock: document.getElementById("churro-stock"),
    churroMinstock: document.getElementById("churro-minstock"),
    churroForm: document.getElementById("churro-form"),
    churroModalTitle: document.getElementById("churro-modal-title"),
    btnCloseChurro: document.getElementById("btn-close-churro-modal"),
    btnCancelChurro: document.getElementById("btn-cancel-churro-modal"),

    orderId: document.getElementById("order-id"),
    orderCustomer: document.getElementById("order-customer"),
    orderPhone: document.getElementById("order-phone"),
    orderDate: document.getElementById("order-date"),
    orderTime: document.getElementById("order-time"),
    orderDetails: document.getElementById("order-details"),
    orderTotal: document.getElementById("order-total"),
    orderAdvance: document.getElementById("order-advance"),
    orderStatus: document.getElementById("order-status"),

    pCompanyName: document.getElementById("p-company-name"),
    pCompanyRtn: document.getElementById("p-company-rtn"),
    pCompanyAddress: document.getElementById("p-company-address"),
    pInvoiceNum: document.getElementById("p-invoice-num"),
    pInvoiceDate: document.getElementById("p-invoice-date"),
    pCai: document.getElementById("p-cai"),
    pRanges: document.getElementById("p-ranges"),
    pDeadline: document.getElementById("p-deadline"),
    pCustomerName: document.getElementById("p-customer-name"),
    pCustomerRtn: document.getElementById("p-customer-rtn"),
    pInvoiceItems: document.getElementById("p-invoice-items"),
    pSubtotal: document.getElementById("p-subtotal"),
    pDiscount: document.getElementById("p-discount"),
    pExento: document.getElementById("p-exento"),
    pGravado: document.getElementById("p-gravado"),
    pIsv: document.getElementById("p-isv"),
    pTotal: document.getElementById("p-total"),
    pPaymentMethod: document.getElementById("p-payment-method"),
    pCashReceived: document.getElementById("p-cash-received"),
    pCashChange: document.getElementById("p-cash-change"),
    printInvoiceArea: document.getElementById("print-invoice-area"),

    sectionCreditInvoices: document.getElementById("section-credit-invoices"),
    creditSearchInput: document.getElementById("credit-search-input"),
    creditStatusFilter: document.getElementById("credit-status-filter"),
    creditTableTbody: document.getElementById("credit-table-tbody"),
    btnClearCreditFilters: document.getElementById("btn-clear-credit-filters"),
    creditPendingTotal: document.getElementById("credit-pending-total"),
    creditShiftRecovered: document.getElementById("credit-shift-recovered"),
    modalCollectCredit: document.getElementById("modal-collect-credit"),
    collectCreditForm: document.getElementById("collect-credit-form"),
    collectCreditInvoiceId: document.getElementById("collect-credit-invoice-id"),
    collectInvoiceLabel: document.getElementById("collect-invoice-label"),
    collectCustomerLabel: document.getElementById("collect-customer-label"),
    collectAmountLabel: document.getElementById("collect-amount-label"),
    collectTotalInvoiceLabel: document.getElementById("collect-total-invoice-label"),
    collectTotalPaidLabel: document.getElementById("collect-total-paid-label"),
    collectRemainingBalanceLabel: document.getElementById("collect-remaining-balance-label"),
    collectPaymentsHistoryTbody: document.getElementById("collect-payments-history-tbody"),
    collectAmountToPay: document.getElementById("collect-amount-to-pay"),
    collectMethod: document.getElementById("collect-method"),
    collectCashFields: document.getElementById("collect-cash-fields"),
    collectCashReceived: document.getElementById("collect-cash-received"),
    collectCashChange: document.getElementById("collect-cash-change"),
    btnCloseCollectCredit: document.getElementById("btn-close-collect-credit"),
    btnCancelCollectCredit: document.getElementById("btn-cancel-collect-credit")
};

function safeCreateIcons() {
    if (typeof lucide !== "undefined" && lucide.createIcons) {
        lucide.createIcons();
    }
}

function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ==========================================
// 3. THEME MANAGEMENT (PROTECTED FROM FAILS)
// ==========================================
if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
}
if (DOM.btnToggleTheme) {
    DOM.btnToggleTheme.addEventListener("click", () => {
        document.documentElement.classList.toggle("dark");
        const isDark = document.documentElement.classList.contains("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        if (DOM.sectionDashboard && DOM.sectionDashboard.classList.contains("active")) {
            initCharts();
        }
    });
}

// ==========================================
// 4. CORE ROUTING NAVIGATION HANDLER
// ==========================================
function switchSection(targetSectionId) {
    DOM.contentSections.forEach(section => section.classList.remove("active"));
    DOM.navItems.forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-section") === targetSectionId) {
            item.classList.add("active");
        }
    });

    const activeSection = document.getElementById(`section-${targetSectionId}`);
    if (activeSection) activeSection.classList.add("active");

    if (targetSectionId === "dashboard") {
        updateDashboardStats();
        initCharts();
    } else if (targetSectionId === "pos") {
        renderPOSProducts();
        populatePOSCategories();
    } else if (targetSectionId === "raw-materials") {
        renderRawMaterials();
    } else if (targetSectionId === "inventory") {
        renderInventoryTable();
    } else if (targetSectionId === "churros") {
        renderChurros();
    } else if (targetSectionId === "invoices") {
        renderInvoicesTable();
    } else if (targetSectionId === "special-orders") {
        renderKanbanOrders();
    } else if (targetSectionId === "settings") {
        loadSettingsFormValues();
    } else if (targetSectionId === "reports") {
        updateActiveShiftDisplay();
        renderClosuresTable();
    } else if (targetSectionId === "credit-invoices") {
        renderCreditInvoicesTable();
    }
}

DOM.navItems.forEach(item => {
    item.addEventListener("click", () => {
        switchSection(item.getAttribute("data-section"));
    });
});

function updateClock() {
    if (DOM.appClock) {
        const now = new Date();
        DOM.appClock.textContent = now.toLocaleTimeString("es-HN", { hour12: false });
    }
}
setInterval(updateClock, 1000);

function getHNDateString() {
    return new Date().toISOString().split('T')[0];
}

// ==========================================
// 5. DASHBOARD ANALYTICS MODULE
// ==========================================
function updateDashboardStats() {
    const activeInvoices = invoices.filter(inv => !inv.closed);

    const totalSalesToday = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);
    if (DOM.dashDaySales) DOM.dashDaySales.textContent = `L ${totalSalesToday.toFixed(2)}`;
    if (DOM.dashDayOrders) DOM.dashDayOrders.textContent = activeInvoices.length;

    const totalInvValue = products.reduce((sum, prod) => sum + (prod.cost * prod.stock), 0);
    if (DOM.dashInvValue) DOM.dashInvValue.textContent = `L ${totalInvValue.toFixed(2)}`;

    const lowStockItems = products.filter(prod => prod.stock <= prod.minStock);
    if (DOM.dashLowStock) DOM.dashLowStock.textContent = lowStockItems.length;

    if (DOM.dashLatestInvoices) {
        DOM.dashLatestInvoices.innerHTML = "";
        const elements = invoices.slice(-5).reverse();
        if (elements.length === 0) {
            DOM.dashLatestInvoices.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">No hay ventas registradas hoy.</td></tr>`;
        } else {
            elements.forEach(inv => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${inv.invoiceNumber}</strong></td>
                    <td>${inv.customerName}</td>
                    <td>L ${inv.total.toFixed(2)}</td>
                    <td><button class="btn btn-sm btn-outline view-inv-btn" data-id="${inv.id}"><i data-lucide="eye"></i></button></td>
                `;
                DOM.dashLatestInvoices.appendChild(tr);
            });
            document.querySelectorAll(".view-inv-btn").forEach(btn => {
                btn.addEventListener("click", () => viewInvoiceTicket(btn.getAttribute("data-id")));
            });
        }
    }

    if (DOM.dashLowStockTable) {
        DOM.dashLowStockTable.innerHTML = "";
        if (lowStockItems.length === 0) {
            DOM.dashLowStockTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--color-success);">Todo el inventario está óptimo.</td></tr>`;
        } else {
            lowStockItems.slice(0, 5).forEach(prod => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${prod.code}</td>
                    <td>${prod.name}</td>
                    <td class="text-danger" style="font-weight:bold;">${prod.stock}</td>
                    <td><span class="badge badge-danger">${prod.minStock}</span></td>
                `;
                DOM.dashLowStockTable.appendChild(tr);
            });
        }
    }
    updateActiveShiftDisplay();
    safeCreateIcons();
}

function initCharts() {
    const isDark = document.documentElement.classList.contains("dark");
    const textThemeColor = isDark ? "#f1f5f9" : "#334155";
    const gridThemeColor = isDark ? "#334155" : "#e2e8f0";

    const ctxWeekly = document.getElementById("chart-sales-weekly");
    if (ctxWeekly) {
        if (weeklySalesChart) weeklySalesChart.destroy();
        const labels = [];
        const dataSales = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(d.toLocaleDateString("es-HN", { month: 'short', day: 'numeric' }));
            dataSales.push(invoices.filter(inv => inv.date === dateStr).reduce((sum, inv) => sum + inv.total, 0));
        }

        weeklySalesChart = new Chart(ctxWeekly.getContext("2d"), {
            type: "line",
            data: {
                labels: labels,
                datasets: [{ label: "Ventas Diarias (L)", data: dataSales, borderColor: "#0284c7", backgroundColor: "rgba(2, 132, 199, 0.1)", fill: true, tension: 0.3 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { ticks: { color: textThemeColor }, grid: { color: gridThemeColor } }, y: { ticks: { color: textThemeColor }, grid: { color: gridThemeColor }, beginAtZero: true } },
                plugins: { legend: { labels: { color: textThemeColor } } }
            }
        });
    }

    const ctxPie = document.getElementById("chart-categories-pie");
    if (ctxPie) {
        if (categoriesPieChart) categoriesPieChart.destroy();
        const catCounts = {};
        products.forEach(p => catCounts[p.category] = (catCounts[p.category] || 0) + p.stock);

        categoriesPieChart = new Chart(ctxPie.getContext("2d"), {
            type: "pie",
            data: {
                labels: Object.keys(catCounts).length ? Object.keys(catCounts) : ["Sin productos"],
                datasets: [{ data: Object.values(catCounts).length ? Object.values(catCounts) : [1], backgroundColor: ["#f59e0b", "#10b981", "#3b82f6", "#ec4899"] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: textThemeColor } } } }
        });
    }
}

function populateMonthlyStatsMonths() {
    if (!DOM.monthlyStatsSelect) return;
    DOM.monthlyStatsSelect.innerHTML = "";
    const monthMap = {};
    invoices.forEach(inv => {
        if (inv.date) {
            const parts = inv.date.split("-");
            if (parts.length >= 2) monthMap[`${parts[0]}-${parts[1]}`] = true;
        }
    });
    monthMap[new Date().toISOString().substring(0, 7)] = true;
    Object.keys(monthMap).sort().reverse().forEach(ym => {
        const option = document.createElement("option");
        option.value = ym;
        const d = new Date(ym + "-02");
        const label = d.toLocaleDateString("es-HN", { month: 'long', year: 'numeric' });
        option.textContent = label.charAt(0).toUpperCase() + label.slice(1);
        DOM.monthlyStatsSelect.appendChild(option);
    });
}

function updateMonthlyStats(yearMonth) {
    if (!DOM.monthlyStatTotal || !DOM.monthlyStatCount) return;
    const filtered = invoices.filter(inv => inv.date && inv.date.startsWith(yearMonth));
    DOM.monthlyStatTotal.textContent = `L ${filtered.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}`;
    DOM.monthlyStatCount.textContent = `${filtered.length} Factura(s)`;
}

// ==========================================
// 6. PUNTO DE VENTA (POS) WORKFLOW LÓGICO
// ==========================================
function populatePOSCategories() {
    if (!DOM.posCategoryFilter) return;
    DOM.posCategoryFilter.innerHTML = `
        <option value="all">Todas las Categorías</option>
        <option value="Pan">Pan</option>
        <option value="Churro">Churro</option>
        <option value="Jugos">Jugos</option>
    `;
}

function renderPOSProducts() {
    if (!DOM.posProductsGrid) return;
    DOM.posProductsGrid.innerHTML = "";
    const keyword = DOM.posSearchInput ? DOM.posSearchInput.value.toLowerCase() : "";
    const category = DOM.posCategoryFilter ? DOM.posCategoryFilter.value : "all";

    const allItems = [
        ...products.map(p => ({ ...p, _type: "product", _catLabel: p.category || "Pan" })),
        ...churros.map(c => ({ ...c, _type: "churro", _catLabel: "Churro" }))
    ];

    const filtered = allItems.filter(item => {
        return (item.name.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword)) && (category === "all" || item._catLabel === category);
    });

    if (filtered.length === 0) {
        DOM.posProductsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#888; padding:40px;">No se encontraron productos.</div>`;
        return;
    }

    filtered.forEach(item => {
        const isLow = item.stock <= item.minStock;
        const taxBadge = item.tax && item.tax !== "Exento" ? `<span class="badge badge-danger" style="font-size:9px;">${item.tax}</span>` : `<span class="badge badge-success" style="font-size:9px;">Exento</span>`;
        const card = document.createElement("div");
        card.className = `product-card ${isLow ? 'low-stock-alert' : ''}`;
        card.innerHTML = `
            <div class="prod-card-info">
                <span class="prod-card-code">${item.code} ${taxBadge}</span>
                <h4 class="prod-card-name">${item.name}</h4>
                <span class="prod-card-cat">${item._catLabel}</span>
            </div>
            <div class="prod-card-footer">
                <span class="prod-card-price">L ${item.price.toFixed(2)}</span>
                <span class="prod-card-stock">Stock: <strong>${item.stock}</strong></span>
            </div>
            <button class="btn btn-primary btn-sm btn-add-cart" data-id="${item.id}" data-type="${item._type}"><i data-lucide="plus-circle"></i> Agregar</button>
        `;
        DOM.posProductsGrid.appendChild(card);
    });

    document.querySelectorAll(".btn-add-cart").forEach(btn => {
        btn.addEventListener("click", () => addToCart(btn.getAttribute("data-id"), btn.getAttribute("data-type")));
    });
    safeCreateIcons();
}

if (DOM.posSearchInput) DOM.posSearchInput.addEventListener("input", renderPOSProducts);
if (DOM.posCategoryFilter) DOM.posCategoryFilter.addEventListener("change", renderPOSProducts);

function addToCart(itemId, type = "product") {
    let item;
    if (type === "product") item = products.find(p => p.id === itemId);
    else item = churros.find(c => c.id === itemId);
    if (!item) return;
    if (item.stock <= 0) {
        alert("¡Alerta! Producto sin stock disponible en bodega.");
        return;
    }
    const cartItem = cart.find(i => i.product.id === itemId && i.type === type);
    if (cartItem) {
        if (cartItem.quantity >= item.stock) {
            alert("Excede la cantidad física existente.");
            return;
        }
        cartItem.quantity++;
    } else {
        const selectedPriceType = DOM.posPriceType ? DOM.posPriceType.value : "price";
        cart.push({ product: item, quantity: 1, type: type, priceType: selectedPriceType });
    }
    renderCart();
}

function updateCartQuantity(productId, newQty) {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    const qty = parseInt(newQty) || 0;
    if (qty <= 0) { removeFromCart(productId); return; }
    if (qty > item.product.stock) {
        alert(`Existencia máxima de: ${item.product.stock}`);
        item.quantity = item.product.stock;
    } else {
        item.quantity = qty;
    }
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product.id !== productId);
    renderCart();
}

function renderCart() {
    if (!DOM.cartItemsTbody) return;
    DOM.cartItemsTbody.innerHTML = "";

    if (cart.length === 0) {
        DOM.cartItemsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888; padding:30px;">Carrito vacío.</td></tr>`;
        calculateCartTotals();
        return;
    }

    cart.forEach(item => {
        const currentPriceType = item.priceType || "price";
        const p1 = item.product.price || 0;
        const p2 = item.product.price2 || p1;
        const p3 = item.product.price3 || p1;
        const itemPrice = item.product[currentPriceType] || p1;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.product.name}</strong><br><small>${item.product.code}</small></td>
            <td>
                <select class="cart-price-select" data-id="${item.product.id}">
                    <option value="price" ${currentPriceType === 'price' ? 'selected' : ''}>Detalle: L ${p1.toFixed(2)}</option>
                    <option value="price2" ${currentPriceType === 'price2' ? 'selected' : ''}>Mayorista: L ${p2.toFixed(2)}</option>
                    <option value="price3" ${currentPriceType === 'price3' ? 'selected' : ''}>Especial: L ${p3.toFixed(2)}</option>
                </select>
            </td>
            <td><input type="number" class="form-control cart-qty-input" value="${item.quantity}" data-id="${item.product.id}"></td>
            <td><strong>L ${(itemPrice * item.quantity).toFixed(2)}</strong></td>
            <td><button class="btn btn-sm btn-danger btn-remove-cart" data-id="${item.product.id}">&times;</button></td>
        `;
        DOM.cartItemsTbody.appendChild(tr);
    });

    document.querySelectorAll(".cart-qty-input").forEach(i => i.addEventListener("change", (e) => updateCartQuantity(i.getAttribute("data-id"), e.target.value)));
    document.querySelectorAll(".btn-remove-cart").forEach(b => b.addEventListener("click", () => removeFromCart(b.getAttribute("data-id"))));
    document.querySelectorAll(".cart-price-select").forEach(s => s.addEventListener("change", (e) => {
        const productId = s.getAttribute("data-id");
        const newPriceType = e.target.value;
        const cartItem = cart.find(i => i.product.id === productId);
        if (cartItem) {
            cartItem.priceType = newPriceType;
            renderCart();
        }
    }));
    calculateCartTotals();
}

if (DOM.posPriceType) {
    DOM.posPriceType.addEventListener("change", (e) => {
        const val = e.target.value;
        cart.forEach(item => {
            item.priceType = val;
        });
        renderCart();
    });
}
if (DOM.cartDiscount) DOM.cartDiscount.addEventListener("input", calculateCartTotals);

function calculateCartTotals() {
    let subtotal = cart.reduce((sum, item) => {
        const pt = item.priceType || "price";
        const price = item.product[pt] || item.product.price;
        return sum + (price * item.quantity);
    }, 0);
    let discount = DOM.cartDiscount ? parseFloat(DOM.cartDiscount.value) || 0 : 0;
    if (discount > subtotal) { discount = subtotal; DOM.cartDiscount.value = subtotal; }

    let gravado15 = 0, gravado18 = 0, exento = 0;
    cart.forEach(item => {
        const pt = item.priceType || "price";
        const price = item.product[pt] || item.product.price;
        const lineTotal = price * item.quantity;
        if (item.product.tax === "15%") gravado15 += lineTotal;
        else if (item.product.tax === "18%") gravado18 += lineTotal;
        else exento += lineTotal;
    });

    let isv15 = gravado15 * 0.15;
    let isv18 = gravado18 * 0.18;
    let totalIsv = isv15 + isv18;
    let total = subtotal - discount + totalIsv;

    if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = `L ${subtotal.toFixed(2)}`;
    if (DOM.cartIsv) DOM.cartIsv.textContent = `L ${totalIsv.toFixed(2)}`;
    if (DOM.cartTotal) DOM.cartTotal.textContent = `L ${total.toFixed(2)}`;

    DOM._cartTaxData = { subtotal, discount, exento, gravado15, gravado18, isv15, isv18, totalIsv, total };
}

if (DOM.btnClearCart) { DOM.btnClearCart.addEventListener("click", () => { cart = []; if (DOM.cartDiscount) DOM.cartDiscount.value = 0; renderCart(); }); }

if (DOM.btnCheckout) {
    DOM.btnCheckout.addEventListener("click", () => {
        if (cart.length === 0) { alert("El detalle de venta está vacío."); return; }
        calculateCartTotals();
        if (DOM.payModalTotalLabel && DOM.cartTotal) DOM.payModalTotalLabel.textContent = DOM.cartTotal.textContent;
        if (DOM.payCashReceived) DOM.payCashReceived.value = "";
        if (DOM.payCashChange) DOM.payCashChange.textContent = "L 0.00";
        if (DOM.modalPayment) DOM.modalPayment.classList.add("active");
    });
}

if (DOM.btnClosePayment) DOM.btnClosePayment.addEventListener("click", () => DOM.modalPayment.classList.remove("active"));
if (DOM.btnCancelPayment) DOM.btnCancelPayment.addEventListener("click", () => DOM.modalPayment.classList.remove("active"));

if (DOM.payMethod) {
    DOM.payMethod.addEventListener("change", (e) => {
        if (DOM.paymentCashFields) DOM.paymentCashFields.style.display = e.target.value === "Efectivo" ? "block" : "none";
    });
}

if (DOM.payCashReceived) {
    DOM.payCashReceived.addEventListener("input", () => {
        const totalAmount = parseFloat(DOM.cartTotal.textContent.replace("L ", "")) || 0;
        const received = parseFloat(DOM.payCashReceived.value) || 0;
        const change = received - totalAmount;
        if (change >= 0) {
            DOM.payCashChange.textContent = `L ${change.toFixed(2)}`; DOM.payCashChange.style.color = "var(--color-success)";
        } else {
            DOM.payCashChange.textContent = `Monto Insuficiente`; DOM.payCashChange.style.color = "var(--color-danger)";
        }
    });
}

if (DOM.btnSubmitInvoice) {
    DOM.btnSubmitInvoice.addEventListener("click", () => {
        calculateCartTotals();
        const td = DOM._cartTaxData || { subtotal: 0, discount: 0, exento: 0, gravado15: 0, gravado18: 0, isv15: 0, isv18: 0, totalIsv: 0, total: 0 };
        const method = DOM.payMethod ? DOM.payMethod.value : "Efectivo";
        const cashRec = DOM.payCashReceived ? parseFloat(DOM.payCashReceived.value) || 0 : 0;

        if (method === "Efectivo" && cashRec < td.total) { alert("Efectivo recibido insuficiente."); return; }

        const fullInvoiceNumber = config.rangeStart.substring(0, 12) + String(config.nextInvoiceNum).padStart(8, '0');
        const newInvoice = {
            id: "inv_" + Date.now(), invoiceNumber: fullInvoiceNumber, date: getHNDateString(),
            time: new Date().toLocaleTimeString("es-HN", { hour12: false }),
            customerName: (DOM.posCustomerName && DOM.posCustomerName.value.trim()) ? DOM.posCustomerName.value.trim() : "Consumidor Final",
            customerRtn: (DOM.posCustomerRtn && DOM.posCustomerRtn.value.trim()) ? DOM.posCustomerRtn.value.trim() : "Opcional",
            items: cart.map(i => {
                const pt = i.priceType || "price";
                return { 
                    name: i.product.name, 
                    price: i.product[pt] || i.product.price, 
                    quantity: i.quantity, 
                    tax: i.product.tax || "Exento",
                    category: i.product.category || (i.type === "churro" ? "Churro" : "Pan"),
                    priceType: pt
                };
            }),
            subtotal: td.subtotal, discount: td.discount, exento: td.exento,
            gravado15: td.gravado15, gravado18: td.gravado18, isv15: td.isv15, isv18: td.isv18, totalIsv: td.totalIsv,
            total: td.total, paymentMethod: method, cashReceived: method === "Crédito" ? 0 : cashRec, cashChange: method === "Efectivo" ? (cashRec - td.total) : 0,
            cai: config.cai, ranges: `${config.rangeStart} a ${config.rangeEnd}`, deadline: config.deadline,
            closed: false, closureId: null,
            creditStatus: method === "Crédito" ? "Pendiente" : null,
            creditPayments: [],
            creditPaidDate: null,
            creditPaidTime: null,
            creditPaidMethod: null,
            creditPaidClosureId: null
        };

        cart.forEach(item => {
            if (item.type === "product") {
                const p = products.find(prod => prod.id === item.product.id);
                if (p) {
                    p.stock -= item.quantity;
                    cloudSave("products", p.id, p);
                }
            } else {
                const c = churros.find(ch => ch.id === item.product.id);
                if (c) {
                    c.stock -= item.quantity;
                    cloudSave("churros", c.id, c);
                }
            }
        });
        invoices.push(newInvoice); config.nextInvoiceNum++;

        saveToStorage("pr_products", products); saveToStorage("pr_churros", churros);
        saveToStorage("pr_invoices", invoices); saveToStorage("pr_config", config);
        
        cloudSave("invoices", newInvoice.id, newInvoice);
        cloudSave("config", "sar_config", config);

        cart = []; if (DOM.cartDiscount) DOM.cartDiscount.value = 0; DOM.posCustomerName.value = ""; DOM.posCustomerRtn.value = "";
        renderCart(); DOM.modalPayment.classList.remove("active"); viewInvoiceTicket(newInvoice.id);
    });
}

window.addEventListener("keydown", (e) => {
    if (e.key === "F8" && DOM.sectionPos.classList.contains("active") && DOM.btnCheckout) { e.preventDefault(); DOM.btnCheckout.click(); }
});

// ==========================================
// 7. INVENTORY AND CORE MASTER DATA
// ==========================================
function renderInventoryTable() {
    if (!DOM.inventoryTableTbody) return;
    DOM.inventoryTableTbody.innerHTML = "";
    const keyword = DOM.invSearchInput ? DOM.invSearchInput.value.toLowerCase() : "";
    const filtered = products.filter(p => p.name.toLowerCase().includes(keyword) || p.code.toLowerCase().includes(keyword));

    if (filtered.length === 0) {
        DOM.inventoryTableTbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#888;">No hay registros.</td></tr>`; return;
    }

    filtered.forEach(p => {
        const isLow = p.stock <= p.minStock;
        const taxBadge = p.tax && p.tax !== "Exento" ? `<span class="badge badge-danger">${p.tax}</span>` : `<span class="badge badge-success">Exento</span>`;
        tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${p.code}</strong></td><td>${p.name}</td><td><span class="badge">${p.category}</span></td>
            <td>L ${p.cost.toFixed(2)}</td><td>L ${p.price.toFixed(2)}</td><td>L ${p.price2.toFixed(2)}</td>
            <td class="${isLow ? 'text-danger' : ''}">${p.stock}</td><td>${taxBadge}</td>
            <td><span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">${isLow ? 'Bajo' : 'OK'}</span></td>
            <td><div class="action-flex"><button class="btn btn-sm btn-outline edit-prod-btn" data-id="${p.id}"><i data-lucide="edit"></i></button><button class="btn btn-sm btn-danger delete-prod-btn" data-id="${p.id}"><i data-lucide="trash"></i></button></div></td>
        `;
        DOM.inventoryTableTbody.appendChild(tr);
    });

    document.querySelectorAll(".edit-prod-btn").forEach(b => b.addEventListener("click", () => openProductModal(b.getAttribute("data-id"))));
    document.querySelectorAll(".delete-prod-btn").forEach(b => b.addEventListener("click", () => deleteProduct(b.getAttribute("data-id"))));
    safeCreateIcons();
}

if (DOM.invSearchInput) DOM.invSearchInput.addEventListener("input", renderInventoryTable);
if (DOM.btnAddProduct) DOM.btnAddProduct.addEventListener("click", () => openProductModal(null));

function openProductModal(productId = null) {
    if (!DOM.productForm || !DOM.modalProduct) return;
    DOM.productForm.reset();
    if (productId) {
        DOM.productModalTitle.textContent = "Modificar Datos de Producto";
        const p = products.find(prod => prod.id === productId);
        if (p) {
            DOM.prodId.value = p.id; DOM.prodCode.value = p.code; DOM.prodName.value = p.name;
            DOM.prodCategory.value = p.category; DOM.prodCost.value = p.cost; DOM.prodPrice.value = p.price;
            DOM.prodPrice2.value = p.price2; DOM.prodPrice3.value = p.price3;
            DOM.prodTax.value = p.tax || "Exento"; DOM.prodStock.value = p.stock; DOM.prodMinstock.value = p.minStock;
        }
    } else {
        DOM.productModalTitle.textContent = "Agregar Nuevo Registro de Producto"; DOM.prodId.value = "";
    }
    DOM.modalProduct.classList.add("active");
}

if (DOM.btnCloseProductModal) DOM.btnCloseProductModal.addEventListener("click", () => DOM.modalProduct.classList.remove("active"));
if (DOM.btnCancelProductModal) DOM.btnCancelProductModal.addEventListener("click", () => DOM.modalProduct.classList.remove("active"));

if (DOM.productForm) {
    DOM.productForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = DOM.prodId.value;
        const prodData = {
            code: DOM.prodCode.value.trim(), name: DOM.prodName.value.trim(), category: DOM.prodCategory.value,
            cost: parseFloat(DOM.prodCost.value) || 0, price: parseFloat(DOM.prodPrice.value) || 0,
            price2: parseFloat(DOM.prodPrice2.value) || 0, price3: parseFloat(DOM.prodPrice3.value) || 0,
            stock: parseInt(DOM.prodStock.value) || 0, minStock: parseInt(DOM.prodMinstock.value) || 0, tax: DOM.prodTax.value
        };

        let finalId = id;
        if (id) {
            const idx = products.findIndex(p => p.id === id); 
            if (idx !== -1) {
                products[idx] = { ...products[idx], ...prodData };
                prodData.id = id;
            }
        } else {
            if (products.some(p => p.code.toLowerCase() === prodData.code.toLowerCase())) { alert("Código duplicado."); return; }
            finalId = "p_" + Date.now();
            prodData.id = finalId;
            products.push(prodData);
        }
        saveToStorage("pr_products", products); 
        cloudSave("products", finalId, prodData);
        DOM.modalProduct.classList.remove("active"); 
        renderInventoryTable();
    });
}

function deleteProduct(productId) {
    if (confirm("¿Desea eliminar este producto?")) { 
        products = products.filter(p => p.id !== productId); 
        saveToStorage("pr_products", products); 
        cloudDelete("products", productId);
        renderInventoryTable(); 
    }
}

if (DOM.btnExportExcel) {
    DOM.btnExportExcel.addEventListener("click", () => {
        const ws = XLSX.utils.json_to_sheet(products); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario"); XLSX.writeFile(wb, `Inventario_${getHNDateString()}.xlsx`);
    });
}

// ==========================================
// 8. MATERIA PRIMA INVENTORY
// ==========================================
function renderRawMaterials() {
    if (!DOM.rawMaterialsTbody) return;
    DOM.rawMaterialsTbody.innerHTML = "";
    const keyword = DOM.rawSearchInput ? DOM.rawSearchInput.value.toLowerCase() : "";
    const filtered = rawMaterials.filter(r => r.name.toLowerCase().includes(keyword) || r.code.toLowerCase().includes(keyword));

    if (filtered.length === 0) {
        DOM.rawMaterialsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">No hay registros.</td></tr>`; return;
    }

    filtered.forEach(r => {
        const isLow = r.stock <= r.minStock;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${r.code}</strong></td><td>${r.name}</td><td>${r.unit}</td>
            <td>L ${r.cost.toFixed(2)}</td><td class="${isLow ? 'text-danger' : ''}">${r.stock}</td>
            <td><span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">${isLow ? 'Bajo' : 'OK'}</span></td>
            <td><div class="action-flex"><button class="btn btn-sm btn-outline edit-raw-btn" data-id="${r.id}"><i data-lucide="edit"></i></button><button class="btn btn-sm btn-danger delete-raw-btn" data-id="${r.id}"><i data-lucide="trash"></i></button></div></td>
        `;
        DOM.rawMaterialsTbody.appendChild(tr);
    });

    document.querySelectorAll(".edit-raw-btn").forEach(b => b.addEventListener("click", () => openRawModal(b.getAttribute("data-id"))));
    document.querySelectorAll(".delete-raw-btn").forEach(b => b.addEventListener("click", () => deleteRawMaterial(b.getAttribute("data-id"))));
    safeCreateIcons();
}

if (DOM.rawSearchInput) DOM.rawSearchInput.addEventListener("input", renderRawMaterials);
if (DOM.btnAddRaw) DOM.btnAddRaw.addEventListener("click", () => openRawModal(null));

function openRawModal(id = null) {
    if (!DOM.rawForm || !DOM.modalRaw) return;
    DOM.rawForm.reset();
    if (id) {
        DOM.rawModalTitle.textContent = "Editar Materia Prima";
        const r = rawMaterials.find(rm => rm.id === id);
        if (r) {
            DOM.rawId.value = r.id; DOM.rawCode.value = r.code; DOM.rawName.value = r.name;
            DOM.rawUnit.value = r.unit; DOM.rawCost.value = r.cost; DOM.rawStock.value = r.stock; DOM.rawMinstock.value = r.minStock;
        }
    } else {
        DOM.rawModalTitle.textContent = "Registrar Nueva Materia Prima"; DOM.rawId.value = "";
    }
    DOM.modalRaw.classList.add("active");
}

if (DOM.btnCloseRaw) DOM.btnCloseRaw.addEventListener("click", () => DOM.modalRaw.classList.remove("active"));
if (DOM.btnCancelRaw) DOM.btnCancelRaw.addEventListener("click", () => DOM.modalRaw.classList.remove("active"));

if (DOM.rawForm) {
    DOM.rawForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = DOM.rawId.value;
        const data = {
            code: DOM.rawCode.value.trim(), name: DOM.rawName.value.trim(), unit: DOM.rawUnit.value,
            cost: parseFloat(DOM.rawCost.value) || 0, stock: parseInt(DOM.rawStock.value) || 0, minStock: parseInt(DOM.rawMinstock.value) || 0
        };
        let finalId = id;
        if (id) {
            const idx = rawMaterials.findIndex(r => r.id === id); 
            if (idx !== -1) {
                rawMaterials[idx] = { ...rawMaterials[idx], ...data };
                data.id = id;
            }
        } else {
            if (rawMaterials.some(r => r.code.toLowerCase() === data.code.toLowerCase())) { alert("Código duplicado."); return; }
            finalId = "rm_" + Date.now();
            data.id = finalId;
            rawMaterials.push(data);
        }
        saveToStorage("pr_raw_materials", rawMaterials); 
        cloudSave("raw_materials", finalId, data);
        DOM.modalRaw.classList.remove("active"); 
        renderRawMaterials();
    });
}

function deleteRawMaterial(id) {
    if (confirm("¿Desea eliminar esta materia prima?")) { 
        rawMaterials = rawMaterials.filter(r => r.id !== id); 
        saveToStorage("pr_raw_materials", rawMaterials); 
        cloudDelete("raw_materials", id);
        renderRawMaterials(); 
    }
}

// ==========================================
// 9. CHURROS INVENTORY
// ==========================================
function renderChurros() {
    if (!DOM.churrosTbody) return;
    DOM.churrosTbody.innerHTML = "";
    const keyword = DOM.churroSearchInput ? DOM.churroSearchInput.value.toLowerCase() : "";
    const filtered = churros.filter(c => c.name.toLowerCase().includes(keyword) || c.code.toLowerCase().includes(keyword));

    if (filtered.length === 0) {
        DOM.churrosTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888;">No hay registros.</td></tr>`; return;
    }

    filtered.forEach(c => {
        const isLow = c.stock <= c.minStock;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${c.code}</strong></td><td>${c.name}</td>
            <td>L ${c.price.toFixed(2)}</td><td>L ${c.price2.toFixed(2)}</td><td>L ${c.price3.toFixed(2)}</td>
            <td class="${isLow ? 'text-danger' : ''}">${c.stock}</td>
            <td><span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">${isLow ? 'Bajo' : 'OK'}</span></td>
            <td><div class="action-flex"><button class="btn btn-sm btn-outline edit-churro-btn" data-id="${c.id}"><i data-lucide="edit"></i></button><button class="btn btn-sm btn-danger delete-churro-btn" data-id="${c.id}"><i data-lucide="trash"></i></button></div></td>
        `;
        DOM.churrosTbody.appendChild(tr);
    });

    document.querySelectorAll(".edit-churro-btn").forEach(b => b.addEventListener("click", () => openChurroModal(b.getAttribute("data-id"))));
    document.querySelectorAll(".delete-churro-btn").forEach(b => b.addEventListener("click", () => deleteChurro(b.getAttribute("data-id"))));
    safeCreateIcons();
}

if (DOM.churroSearchInput) DOM.churroSearchInput.addEventListener("input", renderChurros);
if (DOM.btnAddChurro) DOM.btnAddChurro.addEventListener("click", () => openChurroModal(null));

function openChurroModal(id = null) {
    if (!DOM.churroForm || !DOM.modalChurro) return;
    DOM.churroForm.reset();
    if (id) {
        DOM.churroModalTitle.textContent = "Editar Churro";
        const c = churros.find(ch => ch.id === id);
        if (c) {
            DOM.churroId.value = c.id; DOM.churroCode.value = c.code; DOM.churroName.value = c.name;
            DOM.churroPrice.value = c.price; DOM.churroPrice2.value = c.price2; DOM.churroPrice3.value = c.price3;
            DOM.churroCost.value = c.cost; DOM.churroTax.value = c.tax; DOM.churroStock.value = c.stock; DOM.churroMinstock.value = c.minStock;
        }
    } else {
        DOM.churroModalTitle.textContent = "Registrar Nuevo Churro"; DOM.churroId.value = "";
    }
    DOM.modalChurro.classList.add("active");
}

if (DOM.btnCloseChurro) DOM.btnCloseChurro.addEventListener("click", () => DOM.modalChurro.classList.remove("active"));
if (DOM.btnCancelChurro) DOM.btnCancelChurro.addEventListener("click", () => DOM.modalChurro.classList.remove("active"));

if (DOM.churroForm) {
    DOM.churroForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = DOM.churroId.value;
        const data = {
            code: DOM.churroCode.value.trim(), name: DOM.churroName.value.trim(),
            price: parseFloat(DOM.churroPrice.value) || 0, price2: parseFloat(DOM.churroPrice2.value) || 0, price3: parseFloat(DOM.churroPrice3.value) || 0,
            cost: parseFloat(DOM.churroCost.value) || 0, tax: DOM.churroTax.value,
            stock: parseInt(DOM.churroStock.value) || 0, minStock: parseInt(DOM.churroMinstock.value) || 0
        };
        let finalId = id;
        if (id) {
            const idx = churros.findIndex(c => c.id === id); 
            if (idx !== -1) {
                churros[idx] = { ...churros[idx], ...data };
                data.id = id;
            }
        } else {
            if (churros.some(c => c.code.toLowerCase() === data.code.toLowerCase())) { alert("Código duplicado."); return; }
            finalId = "ch_" + Date.now();
            data.id = finalId;
            churros.push(data);
        }
        saveToStorage("pr_churros", churros); 
        cloudSave("churros", finalId, data);
        DOM.modalChurro.classList.remove("active"); 
        renderChurros();
    });
}

function deleteChurro(id) {
    if (confirm("¿Desea eliminar este churro?")) { 
        churros = churros.filter(c => c.id !== id); 
        saveToStorage("pr_churros", churros); 
        cloudDelete("churros", id);
        renderChurros(); 
    }
}

// ==========================================
// 10. HISTORIAL DE FACTURAS
// ==========================================
function renderInvoicesTable() {
    if (!DOM.invoicesTableTbody) return;
    DOM.invoicesTableTbody.innerHTML = "";

    if (invoices.length === 0) {
        DOM.invoicesTableTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888;">No hay ventas.</td></tr>`;
        return;
    }

    const query = DOM.invoiceSearchInput ? DOM.invoiceSearchInput.value.trim().toLowerCase() : "";
    const dateVal = DOM.invoiceDateFilter ? DOM.invoiceDateFilter.value : "";

    let filtered = invoices.slice().reverse();

    if (query) {
        filtered = filtered.filter(inv => {
            const nameMatch = inv.customerName.toLowerCase().includes(query);
            const numberMatch = inv.invoiceNumber.toLowerCase().includes(query);
            return nameMatch || numberMatch;
        });
    }

    if (dateVal) {
        filtered = filtered.filter(inv => inv.date === dateVal);
    }

    if (filtered.length === 0) {
        DOM.invoicesTableTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888;">No se encontraron facturas con los filtros aplicados.</td></tr>`;
        return;
    }

    filtered.forEach(inv => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${inv.invoiceNumber}</strong></td><td>${inv.date} ${inv.time}</td><td>${inv.customerName}</td>
            <td>${inv.customerRtn}</td><td>L ${inv.subtotal.toFixed(2)}</td><td><strong>L ${inv.total.toFixed(2)}</strong></td>
            <td><span class="badge badge-success">Emitida</span></td><td><button class="btn btn-sm btn-outline table-view-inv-btn" data-id="${inv.id}">Ver</button></td>
        `;
        DOM.invoicesTableTbody.appendChild(tr);
    });
    document.querySelectorAll(".table-view-inv-btn").forEach(b => b.addEventListener("click", () => viewInvoiceTicket(b.getAttribute("data-id"))));
    safeCreateIcons();
}

if (DOM.invoiceSearchInput) DOM.invoiceSearchInput.addEventListener("input", renderInvoicesTable);
if (DOM.invoiceDateFilter) DOM.invoiceDateFilter.addEventListener("change", renderInvoicesTable);
if (DOM.btnClearInvoiceFilters) {
    DOM.btnClearInvoiceFilters.addEventListener("click", () => {
        if (DOM.invoiceSearchInput) DOM.invoiceSearchInput.value = "";
        if (DOM.invoiceDateFilter) DOM.invoiceDateFilter.value = "";
        renderInvoicesTable();
    });
}

// ==========================================
// 10.2 CUENTAS POR COBRAR (CREDITS)
// ==========================================
function getCreditInvoiceTotalPaid(inv) {
    if (inv.paymentMethod !== "Crédito") return 0;
    if (inv.creditPayments && inv.creditPayments.length > 0) {
        return inv.creditPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    }
    // Fallback legacy
    if (inv.creditStatus === "Pagado") {
        return inv.total;
    }
    return 0;
}

function getCreditInvoiceBalance(inv) {
    if (inv.paymentMethod !== "Crédito") return 0;
    return Math.max(0, inv.total - getCreditInvoiceTotalPaid(inv));
}

function getCreditRecoveredTotals(onlyActiveShift = false) {
    let cash = 0;
    let noncash = 0;
    let count = 0;

    invoices.forEach(inv => {
        if (inv.paymentMethod !== "Crédito") return;

        if (inv.creditPayments && inv.creditPayments.length > 0) {
            inv.creditPayments.forEach(p => {
                const matchShift = !onlyActiveShift || p.closureId === null;
                if (matchShift) {
                    if (p.method === "Efectivo") {
                        cash += p.amount || 0;
                    } else {
                        noncash += p.amount || 0;
                    }
                    count++;
                }
            });
        } else {
            // Legacy / fallback if invoice is fully paid and has no creditPayments list
            const matchShift = !onlyActiveShift || inv.creditPaidClosureId === null;
            if (inv.creditStatus === "Pagado" && matchShift) {
                if (inv.creditPaidMethod === "Efectivo") {
                    cash += inv.total;
                } else if (inv.creditPaidMethod) {
                    noncash += inv.total;
                }
                count++;
            }
        }
    });

    return { cash, noncash, count };
}

function renderCreditInvoicesTable() {
    if (!DOM.creditTableTbody) return;
    DOM.creditTableTbody.innerHTML = "";

    const creditInvoices = invoices.filter(inv => inv.paymentMethod === "Crédito");

    // Calculate summaries
    const totalPending = creditInvoices.reduce((sum, i) => sum + getCreditInvoiceBalance(i), 0);
    const recoveredData = getCreditRecoveredTotals(true);
    const shiftRecovered = recoveredData.cash + recoveredData.noncash;

    if (DOM.creditPendingTotal) DOM.creditPendingTotal.textContent = `L ${totalPending.toFixed(2)}`;
    if (DOM.creditShiftRecovered) DOM.creditShiftRecovered.textContent = `L ${shiftRecovered.toFixed(2)}`;

    if (creditInvoices.length === 0) {
        DOM.creditTableTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding: 20px;">No hay registros de crédito.</td></tr>`;
        return;
    }

    const query = DOM.creditSearchInput ? DOM.creditSearchInput.value.trim().toLowerCase() : "";
    const statusVal = DOM.creditStatusFilter ? DOM.creditStatusFilter.value : "all";

    let filtered = creditInvoices.slice().reverse();

    if (statusVal !== "all") {
        if (statusVal === "Pendiente") {
            filtered = filtered.filter(inv => inv.creditStatus === "Pendiente" || inv.creditStatus === "Parcial");
        } else {
            filtered = filtered.filter(inv => inv.creditStatus === statusVal);
        }
    }

    if (query) {
        filtered = filtered.filter(inv => {
            const nameMatch = inv.customerName.toLowerCase().includes(query);
            const numberMatch = inv.invoiceNumber.toLowerCase().includes(query);
            return nameMatch || numberMatch;
        });
    }

    if (filtered.length === 0) {
        DOM.creditTableTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding: 20px;">No se encontraron créditos con los filtros aplicados.</td></tr>`;
        return;
    }

    filtered.forEach(inv => {
        const tr = document.createElement("tr");
        const totalPaid = getCreditInvoiceTotalPaid(inv);
        const balance = getCreditInvoiceBalance(inv);
        
        let statusBadge = "";
        if (inv.creditStatus === "Pagado") {
            statusBadge = `<span class="badge badge-success">Pagado</span>`;
        } else if (totalPaid > 0) {
            statusBadge = `<span class="badge badge-warning" style="background-color: #fee2e2; color: #b91c1c;">Parcial</span>`;
        } else {
            statusBadge = `<span class="badge badge-danger" style="background-color: #fef3c7; color: #d97706;">Pendiente</span>`;
        }

        const paidDate = inv.creditPaidDate ? `${inv.creditPaidDate} ${inv.creditPaidTime || ""}` : (inv.creditPayments && inv.creditPayments.length > 0 ? `${inv.creditPayments[inv.creditPayments.length - 1].date} ${inv.creditPayments[inv.creditPayments.length - 1].time || ""}` : "-");
        const paidMethod = inv.creditPaidMethod || (inv.creditPayments && inv.creditPayments.length > 0 ? inv.creditPayments[inv.creditPayments.length - 1].method : "-");

        let actionButton = "";
        if (balance > 0) {
            actionButton = `<button class="btn btn-sm btn-success collect-credit-btn" data-id="${inv.id}"><i data-lucide="check-circle-2"></i> Cobrar</button>`;
        }

        tr.innerHTML = `
            <td><strong>${inv.invoiceNumber}</strong></td>
            <td>${inv.date} ${inv.time}</td>
            <td>${inv.customerName}</td>
            <td>
                <strong>L ${inv.total.toFixed(2)}</strong>
                ${balance > 0 && totalPaid > 0 ? `<br><small style="color: var(--text-muted);">Abonado: L ${totalPaid.toFixed(2)}</small><br><small style="color: var(--color-danger); font-weight: bold;">Saldo: L ${balance.toFixed(2)}</small>` : (balance > 0 ? `<br><small style="color: var(--color-danger); font-weight: bold;">Saldo: L ${balance.toFixed(2)}</small>` : `<br><small style="color: var(--color-success);">Saldado</small>`)}
            </td>
            <td>${statusBadge}</td>
            <td>${paidDate}</td>
            <td>${paidMethod}</td>
            <td>
                <div style="display: flex; gap: 6px;">
                    ${actionButton}
                    <button class="btn btn-sm btn-outline view-credit-invoice-btn" data-id="${inv.id}"><i data-lucide="eye"></i> Ver</button>
                </div>
            </td>
        `;
        DOM.creditTableTbody.appendChild(tr);
    });

    document.querySelectorAll(".collect-credit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openCollectCreditModal(btn.getAttribute("data-id"));
        });
    });

    document.querySelectorAll(".view-credit-invoice-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            viewInvoiceTicket(btn.getAttribute("data-id"));
        });
    });

    safeCreateIcons();
}

function openCollectCreditModal(invoiceId) {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    if (DOM.collectCreditInvoiceId) DOM.collectCreditInvoiceId.value = inv.id;
    if (DOM.collectInvoiceLabel) DOM.collectInvoiceLabel.textContent = inv.invoiceNumber;
    if (DOM.collectCustomerLabel) DOM.collectCustomerLabel.textContent = inv.customerName;

    const totalPaid = getCreditInvoiceTotalPaid(inv);
    const balance = getCreditInvoiceBalance(inv);

    if (DOM.collectTotalInvoiceLabel) DOM.collectTotalInvoiceLabel.textContent = `L ${inv.total.toFixed(2)}`;
    if (DOM.collectTotalPaidLabel) DOM.collectTotalPaidLabel.textContent = `L ${totalPaid.toFixed(2)}`;
    if (DOM.collectRemainingBalanceLabel) DOM.collectRemainingBalanceLabel.textContent = `L ${balance.toFixed(2)}`;

    if (DOM.collectAmountToPay) {
        DOM.collectAmountToPay.value = balance.toFixed(2);
        DOM.collectAmountToPay.setAttribute("max", balance);
    }

    if (DOM.collectCashReceived) DOM.collectCashReceived.value = "";
    if (DOM.collectCashChange) {
        DOM.collectCashChange.textContent = "L 0.00";
        DOM.collectCashChange.style.color = "var(--text-muted)";
    }

    if (DOM.collectMethod) {
        DOM.collectMethod.value = "Efectivo";
    }

    if (DOM.collectCashFields) {
        DOM.collectCashFields.style.display = "block";
    }

    // Render payments history
    if (DOM.collectPaymentsHistoryTbody) {
        DOM.collectPaymentsHistoryTbody.innerHTML = "";
        
        let hasPayments = false;
        if (inv.creditPayments && inv.creditPayments.length > 0) {
            inv.creditPayments.forEach(p => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="padding: 6px;">${p.date} ${p.time || ""}</td>
                    <td style="padding: 6px;">${p.method}</td>
                    <td style="padding: 6px; text-align: right; padding-right: 10px; font-weight: bold;">L ${(p.amount || 0).toFixed(2)}</td>
                `;
                DOM.collectPaymentsHistoryTbody.appendChild(tr);
            });
            hasPayments = true;
        } else if (inv.creditStatus === "Pagado") {
            const tr = document.createElement("tr");
            const dateStr = inv.creditPaidDate ? `${inv.creditPaidDate} ${inv.creditPaidTime || ""}` : "-";
            const methodStr = inv.creditPaidMethod || "-";
            tr.innerHTML = `
                <td style="padding: 6px;">${dateStr} (Histórico)</td>
                <td style="padding: 6px;">${methodStr}</td>
                <td style="padding: 6px; text-align: right; padding-right: 10px; font-weight: bold;">L ${inv.total.toFixed(2)}</td>
            `;
            DOM.collectPaymentsHistoryTbody.appendChild(tr);
            hasPayments = true;
        }

        if (!hasPayments) {
            DOM.collectPaymentsHistoryTbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 10px; color: #888;">Ningún abono registrado</td>
                </tr>
            `;
        }
    }

    if (DOM.modalCollectCredit) {
        DOM.modalCollectCredit.classList.add("active");
    }
}

if (DOM.creditSearchInput) DOM.creditSearchInput.addEventListener("input", renderCreditInvoicesTable);
if (DOM.creditStatusFilter) DOM.creditStatusFilter.addEventListener("change", renderCreditInvoicesTable);
if (DOM.btnClearCreditFilters) {
    DOM.btnClearCreditFilters.addEventListener("click", () => {
        if (DOM.creditSearchInput) DOM.creditSearchInput.value = "";
        if (DOM.creditStatusFilter) DOM.creditStatusFilter.value = "Pendiente";
        renderCreditInvoicesTable();
    });
}

if (DOM.btnCloseCollectCredit) {
    DOM.btnCloseCollectCredit.addEventListener("click", () => {
        if (DOM.modalCollectCredit) DOM.modalCollectCredit.classList.remove("active");
    });
}

if (DOM.btnCancelCollectCredit) {
    DOM.btnCancelCollectCredit.addEventListener("click", () => {
        if (DOM.modalCollectCredit) DOM.modalCollectCredit.classList.remove("active");
    });
}

if (DOM.collectMethod) {
    DOM.collectMethod.addEventListener("change", (e) => {
        if (DOM.collectCashFields) {
            DOM.collectCashFields.style.display = e.target.value === "Efectivo" ? "block" : "none";
        }
    });
}

function updateCollectCreditChange() {
    if (!DOM.collectAmountToPay || !DOM.collectCashReceived || !DOM.collectCashChange) return;
    const amountToPay = parseFloat(DOM.collectAmountToPay.value) || 0;
    const received = parseFloat(DOM.collectCashReceived.value) || 0;
    const change = received - amountToPay;
    
    if (change >= 0) {
        DOM.collectCashChange.textContent = `L ${change.toFixed(2)}`;
        DOM.collectCashChange.style.color = "var(--color-success)";
    } else {
        DOM.collectCashChange.textContent = `Monto Insuficiente`;
        DOM.collectCashChange.style.color = "var(--color-danger)";
    }
}

if (DOM.collectAmountToPay) DOM.collectAmountToPay.addEventListener("input", updateCollectCreditChange);
if (DOM.collectCashReceived) DOM.collectCashReceived.addEventListener("input", updateCollectCreditChange);

if (DOM.collectCreditForm) {
    DOM.collectCreditForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const invoiceId = DOM.collectCreditInvoiceId.value;
        const inv = invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        const amountToPay = parseFloat(DOM.collectAmountToPay.value) || 0;
        const balance = getCreditInvoiceBalance(inv);

        if (amountToPay <= 0 || amountToPay > balance) {
            alert(`El monto a pagar debe ser mayor a 0 y menor o igual al saldo pendiente de L ${balance.toFixed(2)}.`);
            return;
        }

        const method = DOM.collectMethod.value;
        if (method === "Efectivo") {
            const received = parseFloat(DOM.collectCashReceived.value) || 0;
            if (received < amountToPay) {
                alert("Monto en efectivo recibido es insuficiente.");
                return;
            }
        }

        const newPayment = {
            id: "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            date: getHNDateString(),
            time: new Date().toLocaleTimeString("es-HN", { hour12: false }),
            amount: amountToPay,
            method: method,
            closureId: null
        };

        if (!inv.creditPayments) {
            inv.creditPayments = [];
        }
        inv.creditPayments.push(newPayment);

        const newBalance = getCreditInvoiceBalance(inv);
        if (newBalance <= 0) {
            inv.creditStatus = "Pagado";
            inv.creditPaidDate = newPayment.date;
            inv.creditPaidTime = newPayment.time;
            inv.creditPaidMethod = newPayment.method;
            inv.creditPaidClosureId = null;
        } else {
            inv.creditStatus = "Parcial";
            inv.creditPaidDate = null;
            inv.creditPaidTime = null;
            inv.creditPaidMethod = null;
            inv.creditPaidClosureId = null;
        }

        saveToStorage("pr_invoices", invoices);
        cloudSave("invoices", inv.id, inv);

        if (DOM.modalCollectCredit) DOM.modalCollectCredit.classList.remove("active");
        alert("Pago de crédito (abono) registrado con éxito.");

        renderCreditInvoicesTable();
        updateActiveShiftDisplay();
    });
}

// ==========================================
// 9. KANBAN PEDIDOS ESPECIALES
// ==========================================
function renderKanbanOrders() {
    if (!DOM.ordersPending) return;
    DOM.ordersPending.innerHTML = ""; DOM.ordersProduction.innerHTML = ""; DOM.ordersReady.innerHTML = ""; DOM.ordersDelivered.innerHTML = "";

    orders.forEach(o => {
        card = document.createElement("div"); card.className = "order-kanban-card";
        card.innerHTML = `
            <strong>${o.customer}</strong><br><small>Tel: ${o.phone}</small>
            <p style="font-size:12px; background:#f1f5f9; padding:4px; margin:6px 0;">${o.details}</p>
            <small>Entrega: ${o.date}</small><br><strong>Total: L ${o.total.toFixed(2)}</strong>
            <div class="action-flex" style="margin-top:6px;">
                <select class="form-control status-change-select" data-id="${o.id}">
                    <option value="pendiente" ${o.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="producción" ${o.status === 'producción' ? 'selected' : ''}>Producción</option>
                    <option value="listo" ${o.status === 'listo' ? 'selected' : ''}>Listo</option>
                    <option value="entregado" ${o.status === 'entregado' ? 'selected' : ''}>Entregado</option>
                </select>
                <button class="btn btn-sm btn-outline edit-order-btn" data-id="${o.id}"><i data-lucide="edit-2"></i></button>
            </div>
        `;
        if (o.status === "pendiente") DOM.ordersPending.appendChild(card);
        else if (o.status === "producción") DOM.ordersProduction.appendChild(card);
        else if (o.status === "listo") DOM.ordersReady.appendChild(card);
        else if (o.status === "entregado") DOM.ordersDelivered.appendChild(card);
    });

    document.querySelectorAll(".status-change-select").forEach(s => s.addEventListener("change", (e) => {
        const ord = orders.find(o => o.id === s.getAttribute("data-id")); 
        if (ord) { 
            ord.status = e.target.value; 
            saveToStorage("pr_orders", orders); 
            cloudSave("orders", ord.id, ord);
            renderKanbanOrders(); 
        }
    }));
    document.querySelectorAll(".edit-order-btn").forEach(b => b.addEventListener("click", () => openOrderModal(b.getAttribute("data-id"))));
    safeCreateIcons();
}

if (DOM.btnAddOrder) DOM.btnAddOrder.addEventListener("click", () => openOrderModal(null));

function openOrderModal(orderId = null) {
    if (!DOM.orderForm || !DOM.modalOrder) return; DOM.orderForm.reset();
    if (orderId) {
        DOM.orderModalTitle.textContent = "Editar Encargo Especial";
        const o = orders.find(ord => ord.id === orderId);
        if (o) {
            DOM.orderId.value = o.id; DOM.orderCustomer.value = o.customer; DOM.orderPhone.value = o.phone;
            DOM.orderDate.value = o.date; DOM.orderTime.value = o.time; DOM.orderDetails.value = o.details;
            DOM.orderTotal.value = o.total; DOM.orderAdvance.value = o.advance; DOM.orderStatus.value = o.status;
        }
    } else {
        DOM.orderModalTitle.textContent = "Registrar Nuevo Pedido"; DOM.orderId.value = ""; DOM.orderStatus.value = "pendiente";
    }
    DOM.modalOrder.classList.add("active");
}

if (DOM.btnCloseOrderModal) DOM.btnCloseOrderModal.addEventListener("click", () => DOM.modalOrder.classList.remove("active"));
if (DOM.btnCancelOrderModal) DOM.btnCancelOrderModal.addEventListener("click", () => DOM.modalOrder.classList.remove("active"));

if (DOM.orderForm) {
    DOM.orderForm.addEventListener("submit", (e) => {
        e.preventDefault(); const id = DOM.orderId.value;
        const orderData = {
            customer: DOM.orderCustomer.value.trim(), phone: DOM.orderPhone.value.trim(), date: DOM.orderDate.value,
            time: DOM.orderTime.value, details: DOM.orderDetails.value.trim(), total: parseFloat(DOM.orderTotal.value) || 0,
            advance: parseFloat(DOM.orderAdvance.value) || 0, status: DOM.orderStatus.value
        };
        let finalId = id;
        if (id) {
            const idx = orders.findIndex(o => o.id === id); 
            if (idx !== -1) {
                orders[idx] = { ...orders[idx], ...orderData };
                orderData.id = id;
            }
        } else {
            finalId = "ord_" + Date.now();
            orderData.id = finalId;
            orders.push(orderData);
        }
        saveToStorage("pr_orders", orders); 
        cloudSave("orders", finalId, orderData);
        DOM.modalOrder.classList.remove("active"); 
        renderKanbanOrders();
    });
}

// ==========================================
// 10. TICKET FISCAL VISUALIZER AND CONFIGS
// ==========================================
let activeViewingInvoiceId = null;

function viewInvoiceTicket(invoiceId) {
    const inv = invoices.find(i => i.id === invoiceId); 
    if (!inv || !DOM.modalInvoiceView) return;

    activeViewingInvoiceId = invoiceId;
    
    // Select the print format, default is what's set in config
    const formatSelector = document.getElementById("invoice-print-format");
    if (formatSelector) {
        formatSelector.value = config.defaultPrinter || "ticket80";
        renderActiveInvoice(invoiceId, formatSelector.value);
    } else {
        renderActiveInvoice(invoiceId, "ticket80");
    }

    if (DOM.btnPrintInvoicePdf) {
        DOM.btnPrintInvoicePdf.onclick = () => {
            const format = formatSelector ? formatSelector.value : "ticket80";
            const opt = { 
                margin: 10, 
                filename: `Factura_${inv.invoiceNumber}.pdf`, 
                image: { type: 'jpeg', quality: 0.98 }, 
                html2canvas: { scale: 2 }, 
                jsPDF: format === "carta" 
                    ? { unit: 'mm', format: 'letter', orientation: 'portrait' }
                    : { unit: 'mm', format: format === "ticket80" ? [80, 297] : [58, 210], orientation: 'portrait' }
            };
            html2pdf().set(opt).from(DOM.printInvoiceArea).save();
        };
    }
    DOM.modalInvoiceView.classList.add("active");
}

function renderActiveInvoice(invoiceId, format) {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || !DOM.printInvoiceArea) return;

    DOM.printInvoiceArea.className = "";
    DOM.printInvoiceArea.classList.add(`format-${format}`);

    if (format === "carta") {
        DOM.printInvoiceArea.innerHTML = getCartaHTML(inv);
    } else {
        const is80mm = format === "ticket80";
        DOM.printInvoiceArea.innerHTML = getTicketHTML(inv, is80mm);
    }
}

const invoiceFormatSelector = document.getElementById("invoice-print-format");
if (invoiceFormatSelector) {
    invoiceFormatSelector.addEventListener("change", (e) => {
        if (activeViewingInvoiceId) {
            renderActiveInvoice(activeViewingInvoiceId, e.target.value);
        }
    });
}

const btnPrintInvoiceDirect = document.getElementById("btn-print-invoice-direct");
if (btnPrintInvoiceDirect) {
    btnPrintInvoiceDirect.addEventListener("click", () => {
        document.body.classList.add("printing-invoice");
        window.print();
    });
}

function getTicketHTML(inv, is80mm) {
    const widthClass = is80mm ? 'ticket-80' : 'ticket-58';
    let itemsHTML = '';
    inv.items.forEach(item => {
        itemsHTML += `
            <tr>
                <td style="padding: 3px 0;">${item.quantity} x ${item.name}</td>
                <td style="text-align: right; padding: 3px 0;">L ${item.price.toFixed(2)}</td>
                <td style="text-align: right; padding: 3px 0;">L ${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `;
    });

    return `
        <div class="ticket-container ${widthClass}" style="color: #000; background: #fff; font-family: 'Courier New', Courier, monospace; line-height: 1.3;">
            <div style="text-align: center; margin-bottom: 8px;">
                <h2 style="margin: 0; font-size: 14px; font-weight: bold;">${config.companyName.toUpperCase()}</h2>
                <p style="margin: 2px 0; font-size: 11px;">RTN: ${config.companyRtn}</p>
                <p style="margin: 2px 0; font-size: 10px;">${config.companyAddress}</p>
                ${config.companyPhone ? `<p style="margin: 2px 0; font-size: 11px;">Tel: ${config.companyPhone}</p>` : ''}
                ${config.companyEmail ? `<p style="margin: 2px 0; font-size: 10px;">Email: ${config.companyEmail}</p>` : ''}
            </div>
            <div style="border-top: 1px dashed #000; padding-top: 4px; margin-bottom: 4px; font-size: 11px;">
                <p style="margin: 1px 0;"><strong>FACTURA: ${inv.invoiceNumber}</strong></p>
                <p style="margin: 1px 0;">Fecha: ${inv.date} ${inv.time}</p>
                <p style="margin: 1px 0; font-size: 10px; word-break: break-all;">CAI: ${inv.cai}</p>
                <p style="margin: 1px 0; font-size: 10px;">Rango: ${inv.ranges}</p>
                <p style="margin: 1px 0; font-size: 10px;">Límite Emisión: ${inv.deadline}</p>
            </div>
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin-bottom: 4px; font-size: 11px;">
                <p style="margin: 1px 0;">Cliente: ${inv.customerName}</p>
                <p style="margin: 1px 0;">RTN/DNI: ${inv.customerRtn}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px;">
                <thead>
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding-bottom: 2px;">Cant - Prod</th>
                        <th style="text-align: right; padding-bottom: 2px;">Precio</th>
                        <th style="text-align: right; padding-bottom: 2px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div style="border-top: 1px dashed #000; padding-top: 4px; text-align: right; font-size: 11px;">
                <p style="margin: 1px 0;">Subtotal: L ${inv.subtotal.toFixed(2)}</p>
                <p style="margin: 1px 0;">Descuentos: L ${inv.discount.toFixed(2)}</p>
                <p style="margin: 1px 0;">Exento: L ${(inv.exento || 0).toFixed(2)}</p>
                <p style="margin: 1px 0;">Gravado 15%: L ${(inv.gravado15 || 0).toFixed(2)}</p>
                <p style="margin: 1px 0;">ISV 15%: L ${(inv.isv15 || 0).toFixed(2)}</p>
                <p style="margin: 2px 0; font-weight: bold; font-size: 12px;">TOTAL A PAGAR: L ${inv.total.toFixed(2)}</p>
            </div>
            
            <div style="margin-top: 8px; border-top: 1px dashed #000; padding-top: 4px; font-size: 11px;">
                <p style="margin: 1px 0;">Pago: ${inv.paymentMethod}</p>
                ${inv.paymentMethod === "Efectivo" ? `
                <p style="margin: 1px 0;">Recibido: L ${inv.cashReceived.toFixed(2)}</p>
                <p style="margin: 1px 0;">Cambio: L ${inv.cashChange.toFixed(2)}</p>
                ` : ''}
                ${inv.paymentMethod === "Crédito" ? (() => {
                    const totalPaid = getCreditInvoiceTotalPaid(inv);
                    const balance = getCreditInvoiceBalance(inv);
                    let paymentsListHTML = '';
                    if (inv.creditPayments && inv.creditPayments.length > 0) {
                        paymentsListHTML = inv.creditPayments.map(p => `
                            <p style="margin: 1px 0; font-size: 10px; padding-left: 8px;">- ${p.date}: L ${p.amount.toFixed(2)} (${p.method})</p>
                        `).join('');
                    } else if (inv.creditStatus === "Pagado") {
                        paymentsListHTML = `<p style="margin: 1px 0; font-size: 10px; padding-left: 8px;">- ${inv.creditPaidDate || ''}: L ${inv.total.toFixed(2)} (${inv.creditPaidMethod || ''})</p>`;
                    }
                    return `
                        <div style="margin-top: 4px; border-top: 1px dotted #000; padding-top: 4px;">
                            <p style="margin: 1px 0; font-weight: bold;">Historial de Pagos:</p>
                            ${paymentsListHTML || '<p style="margin: 1px 0; font-size: 10px; padding-left: 8px; color: #555;">Ningún abono</p>'}
                            <p style="margin: 3px 0 1px 0; font-weight: bold; border-top: 1px dotted #000; padding-top: 2px;">Total Abonado: L ${totalPaid.toFixed(2)}</p>
                            <p style="margin: 1px 0; font-weight: bold; font-size: 12px; color: ${balance > 0 ? '#d97706' : '#15803d'}">SALDO PENDIENTE: L ${balance.toFixed(2)}</p>
                        </div>
                    `;
                })() : ''}
            </div>

            <div style="text-align: center; margin-top: 12px; font-size: 10px; border-top: 1px dashed #000; padding-top: 4px;">
                <p style="margin: 2px 0; font-weight: bold;">"La factura es beneficio de todos, ¡exíjala!"</p>
                <p style="margin: 2px 0;">Gracias por su compra en Panificadora Rodríguez</p>
            </div>
        </div>
    `;
}

function getCartaHTML(inv) {
    let itemsHTML = '';
    inv.items.forEach(item => {
        const isExempt = item.tax === "Exento";
        itemsHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px;">${item.name}</td>
                <td style="padding: 10px; text-align: right;">L ${item.price.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right;">${isExempt ? `L ${(item.quantity * item.price).toFixed(2)}` : 'L 0.00'}</td>
                <td style="padding: 10px; text-align: right;">${!isExempt ? `L ${(item.quantity * item.price).toFixed(2)}` : 'L 0.00'}</td>
                <td style="padding: 10px; text-align: right;">L ${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `;
    });

    return `
        <div class="carta-container" style="color: #1e293b; background: #fff; font-family: 'Inter', sans-serif; padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <h1 style="margin: 0; font-size: 24px; color: #1e3a8a; font-weight: 800; font-family: 'Outfit', sans-serif;">${config.companyName.toUpperCase()}</h1>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">${config.companyAddress}</p>
                    <p style="margin: 1px 0 0 0; font-size: 12px; color: #64748b;">
                        ${config.companyPhone ? `Teléfono: ${config.companyPhone}` : ''}
                        ${config.companyPhone && config.companyEmail ? ' | ' : ''}
                        ${config.companyEmail ? `Email: ${config.companyEmail}` : ''}
                    </p>
                    <p style="margin: 1px 0 0 0; font-size: 12px; color: #64748b;"><strong>RTN: ${config.companyRtn}</strong></p>
                </div>
                <div style="text-align: right; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; min-width: 250px;">
                    <h2 style="margin: 0 0 5px 0; font-size: 14px; color: #1e3a8a; font-weight: 700; text-transform: uppercase;">Factura Comercial</h2>
                    <p style="margin: 2px 0; font-size: 14px; font-weight: bold; color: #ef4444;">N°: ${inv.invoiceNumber}</p>
                    <p style="margin: 2px 0; font-size: 11px; color: #475569; word-break: break-all;"><strong>CAI:</strong> ${inv.cai}</p>
                </div>
            </div>

            <!-- Invoice Metadata & Customer Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; background-color: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                <div>
                    <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">DATOS DEL CLIENTE</h3>
                    <p style="margin: 3px 0;"><strong>Nombre / Razón Social:</strong> ${inv.customerName}</p>
                    <p style="margin: 3px 0;"><strong>RTN / DNI:</strong> ${inv.customerRtn}</p>
                </div>
                <div>
                    <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">DETALLE DE EMISIÓN</h3>
                    <p style="margin: 3px 0;"><strong>Fecha y Hora Emisión:</strong> ${inv.date} ${inv.time}</p>
                    <p style="margin: 3px 0;"><strong>Rango Autorizado:</strong> ${inv.ranges}</p>
                    <p style="margin: 3px 0;"><strong>Fecha Límite de Emisión:</strong> ${inv.deadline}</p>
                </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px;">
                <thead>
                    <tr style="background-color: #1e3a8a; color: #fff; font-weight: bold;">
                        <th style="padding: 10px; width: 80px; text-align: center;">CANTIDAD</th>
                        <th style="padding: 10px; text-align: left;">DESCRIPCIÓN</th>
                        <th style="padding: 10px; text-align: right; width: 100px;">PRECIO UNIT.</th>
                        <th style="padding: 10px; text-align: right; width: 100px;">EXENTO</th>
                        <th style="padding: 10px; text-align: right; width: 100px;">GRAVADO 15%</th>
                        <th style="padding: 10px; text-align: right; width: 100px;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <!-- Totals & Payment Details -->
            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; font-size: 12px;">
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background-color: #f8fafc;">
                    <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 13px;">INFORMACIÓN DE PAGO</h4>
                    <p style="margin: 4px 0;"><strong>Método de Pago:</strong> ${inv.paymentMethod}</p>
                    ${inv.paymentMethod === "Efectivo" ? `
                    <p style="margin: 4px 0;"><strong>Efectivo Recibido:</strong> L ${inv.cashReceived.toFixed(2)}</p>
                    <p style="margin: 4px 0;"><strong>Cambio / Vuelto:</strong> L ${inv.cashChange.toFixed(2)}</p>
                    ` : ''}
                    ${inv.paymentMethod === "Crédito" ? (() => {
                        const totalPaid = getCreditInvoiceTotalPaid(inv);
                        const balance = getCreditInvoiceBalance(inv);
                        let rows = '';
                        if (inv.creditPayments && inv.creditPayments.length > 0) {
                            rows = inv.creditPayments.map(p => `
                                <tr>
                                    <td style="padding: 4px; border-bottom: 1px solid #e2e8f0;">${p.date} ${p.time || ''}</td>
                                    <td style="padding: 4px; border-bottom: 1px solid #e2e8f0;">${p.method}</td>
                                    <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: right;">L ${p.amount.toFixed(2)}</td>
                                </tr>
                            `).join('');
                        } else if (inv.creditStatus === "Pagado") {
                            rows = `
                                <tr>
                                    <td style="padding: 4px; border-bottom: 1px solid #e2e8f0;">${inv.creditPaidDate || ''} ${inv.creditPaidTime || ''} (Histórico)</td>
                                    <td style="padding: 4px; border-bottom: 1px solid #e2e8f0;">${inv.creditPaidMethod || ''}</td>
                                    <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; text-align: right;">L ${inv.total.toFixed(2)}</td>
                                </tr>
                            `;
                        } else {
                            rows = `
                                <tr>
                                    <td colspan="3" style="padding: 8px; text-align: center; color: #64748b;">Ningún abono registrado</td>
                                </tr>
                            `;
                        }
                        return `
                            <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                                <span style="font-weight: bold; color: #1e3a8a; display: block; margin-bottom: 4px;">Historial de Abonos:</span>
                                <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 6px;">
                                    <thead>
                                        <tr style="background-color: #f1f5f9; text-align: left;">
                                            <th style="padding: 4px;">Fecha</th>
                                            <th style="padding: 4px;">Método</th>
                                            <th style="padding: 4px; text-align: right;">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rows}
                                    </tbody>
                                </table>
                                <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 11px;">
                                    <span>Total Abonado:</span>
                                    <span>L ${totalPaid.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-weight: bold; color: ${balance > 0 ? '#ef4444' : '#10b981'}; font-size: 12px; margin-top: 2px;">
                                    <span>Saldo Restante:</span>
                                    <span>L ${balance.toFixed(2)}</span>
                                </div>
                            </div>
                        `;
                    })() : ''}
                    <div style="margin-top: 15px; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 10px; color: #64748b; text-align: center;">
                        <p style="margin: 2px 0; font-weight: bold; color: #1e3a8a;">"La factura es beneficio de todos, ¡exíjala!"</p>
                        <p style="margin: 2px 0;">ORIGINAL: CLIENTE / COPIA: OBLIGADO TRIBUTARIO EMISOR</p>
                    </div>
                </div>
                <div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 500;">L ${inv.subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Descuentos:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 500;">L ${inv.discount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Ventas Exentas:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 500;">L ${(inv.exento || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Gravado 15%:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 500;">L ${(inv.gravado15 || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">ISV 15%:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: 500;">L ${(inv.isv15 || 0).toFixed(2)}</td>
                        </tr>
                        <tr style="border-top: 1px solid #1e3a8a; font-size: 14px; font-weight: bold; color: #1e3a8a;">
                            <td style="padding: 10px 0;">TOTAL A PAGAR:</td>
                            <td style="padding: 10px 0; text-align: right; font-size: 16px;">L ${inv.total.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Footer Signatures / Note -->
            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 10px; color: #64748b;">
                <p>Gracias por su compra en Panificadora Rodríguez. Es un placer servirle.</p>
            </div>
        </div>
    `;
}

if (DOM.btnCloseInvoiceView) DOM.btnCloseInvoiceView.addEventListener("click", () => DOM.modalInvoiceView.classList.remove("active"));

function loadSettingsFormValues() {
    if (!DOM.settingsForm) return;
    DOM.setCompanyName.value = config.companyName; DOM.setCompanyRtn.value = config.companyRtn; DOM.setCompanyAddress.value = config.companyAddress;
    if (DOM.setCompanyPhone) DOM.setCompanyPhone.value = config.companyPhone || "";
    if (DOM.setCompanyEmail) DOM.setCompanyEmail.value = config.companyEmail || "";
    DOM.setCai.value = config.cai; DOM.setRangeStart.value = config.rangeStart; DOM.setRangeEnd.value = config.rangeEnd; DOM.setDeadline.value = config.deadline;
    if (DOM.setDefaultPrinter) DOM.setDefaultPrinter.value = config.defaultPrinter || "ticket80";

    // Load Firebase config values
    const fbConfig = JSON.parse(localStorage.getItem("pr_firebase_config"));
    if (fbConfig) {
        const apiKeyInput = document.getElementById("fb-api-key");
        const authDomainInput = document.getElementById("fb-auth-domain");
        const projectIdInput = document.getElementById("fb-project-id");
        const appIdInput = document.getElementById("fb-app-id");
        
        if (apiKeyInput) apiKeyInput.value = fbConfig.apiKey || "";
        if (authDomainInput) authDomainInput.value = fbConfig.authDomain || "";
        if (projectIdInput) projectIdInput.value = fbConfig.projectId || "";
        if (appIdInput) appIdInput.value = fbConfig.appId || "";
    }
}

if (DOM.settingsForm) {
    DOM.settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        config.companyName = DOM.setCompanyName.value.trim(); config.companyRtn = DOM.setCompanyRtn.value.trim();
        config.companyAddress = DOM.setCompanyAddress.value.trim();
        if (DOM.setCompanyPhone) config.companyPhone = DOM.setCompanyPhone.value.trim();
        if (DOM.setCompanyEmail) config.companyEmail = DOM.setCompanyEmail.value.trim();
        config.cai = DOM.setCai.value.trim();
        config.rangeStart = DOM.setRangeStart.value.trim(); config.rangeEnd = DOM.setRangeEnd.value.trim(); config.deadline = DOM.setDeadline.value;
        if (DOM.setDefaultPrinter) config.defaultPrinter = DOM.setDefaultPrinter.value;
        saveToStorage("pr_config", config); 
        cloudSave("config", "sar_config", config);
        alert("Configuración guardada correctamente.");
    });
}

// Firebase settings form listeners
const fbConfigForm = document.getElementById("firebase-config-form");
if (fbConfigForm) {
    fbConfigForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const apiKey = document.getElementById("fb-api-key").value.trim();
        const authDomain = document.getElementById("fb-auth-domain").value.trim();
        const projectId = document.getElementById("fb-project-id").value.trim();
        const appId = document.getElementById("fb-app-id").value.trim();
        
        if (!apiKey || !projectId) {
            alert("El API Key y el Project ID de Firebase son obligatorios para conectar.");
            return;
        }
        
        const fbConfig = { apiKey, authDomain, projectId, appId };
        localStorage.setItem("pr_firebase_config", JSON.stringify(fbConfig));
        alert("Configuración de Firebase guardada. Conectando con Firestore Cloud...");
        initFirebase();
    });
}

const btnClearFirebase = document.getElementById("btn-clear-firebase");
if (btnClearFirebase) {
    btnClearFirebase.addEventListener("click", () => {
        if (confirm("¿Desvincular base de datos Firebase? La app continuará funcionando localmente (offline-first).")) {
            localStorage.removeItem("pr_firebase_config");
            alert("Firebase desvinculado. El sistema volverá a modo local.");
            window.location.reload();
        }
    });
}

// ==========================================
// 10.5 DIARIO CASHIER CLOSURE (Z-REPORT) LOGIC
// ==========================================
function updateActiveShiftDisplay() {
    const activeInvoices = invoices.filter(inv => !inv.closed);
    const count = activeInvoices.length;
    
    // Direct payments in this shift
    const cashDirect = activeInvoices.filter(i => i.paymentMethod === "Efectivo").reduce((sum, i) => sum + i.total, 0);
    const noncash = activeInvoices.filter(i => i.paymentMethod === "Tarjeta" || i.paymentMethod === "Transferencia").reduce((sum, i) => sum + i.total, 0);
    const creditEmit = activeInvoices.filter(i => i.paymentMethod === "Crédito").reduce((sum, i) => sum + i.total, 0);
    
    // Credit collections in this shift
    const recovered = getCreditRecoveredTotals(true);
    const recoveredCash = recovered.cash;
    const recoveredNoncash = recovered.noncash;
    
    // Expected Cash = cashDirect + recoveredCash
    const expectedCash = cashDirect + recoveredCash;
    const total = cashDirect + noncash + creditEmit; // Total sales in the shift (including credit)
    
    const countEl = document.getElementById("active-shift-count");
    const cashDirectEl = document.getElementById("active-shift-cash-direct");
    const noncashEl = document.getElementById("active-shift-noncash");
    const creditEl = document.getElementById("active-shift-credit");
    const recoveredCashEl = document.getElementById("active-shift-recovered-cash");
    const recoveredNoncashEl = document.getElementById("active-shift-recovered-noncash");
    const expectedCashEl = document.getElementById("active-shift-cash-expected");
    
    // Backward compat elements
    const cashEl = document.getElementById("active-shift-cash");
    const totalEl = document.getElementById("active-shift-total");
    
    if (countEl) countEl.textContent = count;
    if (cashDirectEl) cashDirectEl.textContent = `L ${cashDirect.toFixed(2)}`;
    if (noncashEl) noncashEl.textContent = `L ${noncash.toFixed(2)}`;
    if (creditEl) creditEl.textContent = `L ${creditEmit.toFixed(2)}`;
    if (recoveredCashEl) recoveredCashEl.textContent = `L ${recoveredCash.toFixed(2)}`;
    if (recoveredNoncashEl) recoveredNoncashEl.textContent = `L ${recoveredNoncash.toFixed(2)}`;
    if (expectedCashEl) expectedCashEl.textContent = `L ${expectedCash.toFixed(2)}`;
    
    if (cashEl) cashEl.textContent = `L ${cashDirect.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `L ${total.toFixed(2)}`;
}

function renderClosuresTable() {
    const tbody = document.getElementById("closures-table-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (closures.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding: 20px;">No hay cierres registrados.</td></tr>`;
        return;
    }
    
    closures.slice().reverse().forEach(c => {
        const tr = document.createElement("tr");
        const diffClass = c.difference < 0 ? 'text-danger' : (c.difference > 0 ? 'text-success' : '');
        const diffText = c.difference < 0 
            ? `L ${c.difference.toFixed(2)} (Faltante)` 
            : (c.difference > 0 ? `L ${c.difference.toFixed(2)} (Sobrante)` : 'L 0.00 (Cuadrado)');
        
        tr.innerHTML = `
            <td><strong>Z-${c.number}</strong></td>
            <td>${c.dateEnd}</td>
            <td>L ${c.totalNet.toFixed(2)}</td>
            <td>L ${c.actualCash.toFixed(2)}</td>
            <td>L ${c.initialFund.toFixed(2)}</td>
            <td class="${diffClass}" style="font-weight:bold;">${diffText}</td>
            <td>${c.notes}</td>
            <td>
                <button class="btn btn-sm btn-outline view-closure-btn" data-id="${c.id}">Ver Cierre</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll(".view-closure-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            viewClosureZ(btn.getAttribute("data-id"));
        });
    });
}

function viewClosureZ(closureId) {
    const c = closures.find(cl => cl.id === closureId);
    if (!c) return;
    
    const pcCompanyName = document.getElementById("pc-company-name");
    const pcCompanyRtn = document.getElementById("pc-company-rtn");
    const pcCompanyAddress = document.getElementById("pc-company-address");
    const pcCompanyContact = document.getElementById("pc-company-contact");
    if (pcCompanyName) pcCompanyName.textContent = config.companyName.toUpperCase();
    if (pcCompanyRtn) pcCompanyRtn.textContent = `RTN: ${config.companyRtn}`;
    if (pcCompanyAddress) pcCompanyAddress.textContent = config.companyAddress;
    if (pcCompanyContact) pcCompanyContact.textContent = `Tel: ${config.companyPhone || ''} ${config.companyEmail ? ' | Email: ' + config.companyEmail : ''}`;
    
    document.getElementById("pc-num").textContent = `CIERRE N°: ${c.number}`;
    document.getElementById("pc-date-start").textContent = `Inicio: ${c.dateStart}`;
    document.getElementById("pc-date-end").textContent = `Fin: ${c.dateEnd}`;
    document.getElementById("pc-invoices-qty").textContent = c.invoicesCount;
    document.getElementById("pc-invoice-range").textContent = `Rango Facturas: ${c.invoiceRange}`;
    
    document.getElementById("pc-sales-exempt").textContent = `L ${c.salesExempt.toFixed(2)}`;
    document.getElementById("pc-sales-gravado15").textContent = `L ${c.salesGravado15.toFixed(2)}`;
    document.getElementById("pc-isv15").textContent = `L ${c.isv15.toFixed(2)}`;
    document.getElementById("pc-discount").textContent = `L ${c.discount.toFixed(2)}`;
    document.getElementById("pc-total-net").textContent = `L ${c.totalNet.toFixed(2)}`;
    
    document.getElementById("pc-pay-cash").textContent = `L ${c.payCash.toFixed(2)}`;
    document.getElementById("pc-pay-card").textContent = `L ${c.payCard.toFixed(2)}`;
    document.getElementById("pc-pay-transfer").textContent = `L ${c.payTransfer.toFixed(2)}`;
    document.getElementById("pc-pay-credit").textContent = `L ${(c.payCredit || 0).toFixed(2)}`;
    document.getElementById("pc-pay-credit-recovered-cash").textContent = `L ${(c.payCreditRecoveredCash || 0).toFixed(2)}`;
    document.getElementById("pc-pay-credit-recovered-noncash").textContent = `L ${(c.payCreditRecoveredNoncash || 0).toFixed(2)}`;
    
    document.getElementById("pc-initial-fund").textContent = `L ${c.initialFund.toFixed(2)}`;
    document.getElementById("pc-expected-cash").textContent = `L ${c.expectedCash.toFixed(2)}`;
    document.getElementById("pc-actual-cash").textContent = `L ${c.actualCash.toFixed(2)}`;
    
    const diffText = c.difference < 0 ? `L ${c.difference.toFixed(2)} (Faltante)` : (c.difference > 0 ? `L ${c.difference.toFixed(2)} (Sobrante)` : 'L 0.00 (Cuadrado)');
    const diffEl = document.querySelector("#pc-diff-row span");
    if (diffEl) {
        diffEl.textContent = diffText;
        diffEl.style.color = c.difference < 0 ? 'var(--color-danger)' : (c.difference > 0 ? 'var(--color-success)' : '#000');
    }
    
    // Populate categories
    const panSales = c.categorySales && c.categorySales.Pan ? c.categorySales.Pan : { total: 0, qty: 0 };
    const churroSales = c.categorySales && c.categorySales.Churro ? c.categorySales.Churro : { total: 0, qty: 0 };
    const jugosSales = c.categorySales && c.categorySales.Jugos ? c.categorySales.Jugos : { total: 0, qty: 0 };
    
    document.getElementById("pc-cat-pan").textContent = `L ${panSales.total.toFixed(2)} (${panSales.qty} unid)`;
    document.getElementById("pc-cat-churro").textContent = `L ${churroSales.total.toFixed(2)} (${churroSales.qty} unid)`;
    document.getElementById("pc-cat-jugos").textContent = `L ${jugosSales.total.toFixed(2)} (${jugosSales.qty} unid)`;
    
    document.getElementById("pc-notes").textContent = c.notes;
    
    const modal = document.getElementById("modal-closure-view");
    if (modal) modal.classList.add("active");
    
    // Setup print direct for closure
    const btnPrintClosureDirect = document.getElementById("btn-print-closure-direct");
    if (btnPrintClosureDirect) {
        btnPrintClosureDirect.onclick = () => {
            document.body.classList.add("printing-closure");
            window.print();
        };
    }
}

const btnOpenCierreModal = document.getElementById("btn-open-cierre-modal");
if (btnOpenCierreModal) {
    btnOpenCierreModal.addEventListener("click", () => {
        const activeInvoices = invoices.filter(inv => !inv.closed);
        
        const totalNet = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalIsv = activeInvoices.reduce((sum, inv) => sum + (inv.totalIsv || 0), 0);
        const payCash = activeInvoices.filter(i => i.paymentMethod === "Efectivo").reduce((sum, i) => sum + i.total, 0);
        const payNonCash = activeInvoices.filter(i => i.paymentMethod === "Tarjeta" || i.paymentMethod === "Transferencia").reduce((sum, i) => sum + i.total, 0);
        
        // New credit details
        const payCredit = activeInvoices.filter(i => i.paymentMethod === "Crédito").reduce((sum, i) => sum + i.total, 0);
        const recovered = getCreditRecoveredTotals(true);
        const payCreditRecoveredCash = recovered.cash;
        const payCreditRecoveredNoncash = recovered.noncash;
        const totalRecovered = payCreditRecoveredCash + payCreditRecoveredNoncash;
        
        document.getElementById("cierre-modal-total").textContent = `L ${totalNet.toFixed(2)}`;
        document.getElementById("cierre-modal-isv").textContent = `L ${totalIsv.toFixed(2)}`;
        document.getElementById("cierre-modal-credit").textContent = `L ${payCredit.toFixed(2)}`;
        document.getElementById("cierre-modal-credit-recovered").textContent = `L ${totalRecovered.toFixed(2)}`;
        document.getElementById("cierre-modal-cash").textContent = `L ${payCash.toFixed(2)}`;
        document.getElementById("cierre-modal-noncash").textContent = `L ${payNonCash.toFixed(2)}`;
        
        const initialFund = parseFloat(document.getElementById("cierre-initial-fund").value) || 0;
        const expectedCash = payCash + payCreditRecoveredCash + initialFund;
        document.getElementById("cierre-expected-cash-label").textContent = `L ${expectedCash.toFixed(2)}`;
        
        document.getElementById("cierre-actual-cash").value = "";
        
        const diffEl = document.getElementById("cierre-difference");
        diffEl.textContent = `L ${(-expectedCash).toFixed(2)} (Faltante)`;
        diffEl.style.color = "var(--color-danger)";
        
        document.getElementById("cierre-notes").value = "";
        
        const modal = document.getElementById("modal-cierre");
        if (modal) modal.classList.add("active");
    });
}

const btnCloseCierre = document.getElementById("btn-close-cierre-modal");
const btnCancelCierre = document.getElementById("btn-cancel-cierre");
if (btnCloseCierre) btnCloseCierre.addEventListener("click", () => document.getElementById("modal-cierre").classList.remove("active"));
if (btnCancelCierre) btnCancelCierre.addEventListener("click", () => document.getElementById("modal-cierre").classList.remove("active"));

const btnCloseClosureView = document.getElementById("btn-close-closure-view");
if (btnCloseClosureView) btnCloseClosureView.addEventListener("click", () => document.getElementById("modal-closure-view").classList.remove("active"));

const initialFundInput = document.getElementById("cierre-initial-fund");
const actualCashInput = document.getElementById("cierre-actual-cash");

function recalculateCierreDiff() {
    const activeInvoices = invoices.filter(inv => !inv.closed);
    const payCash = activeInvoices.filter(i => i.paymentMethod === "Efectivo").reduce((sum, i) => sum + i.total, 0);
    const payCreditRecoveredCash = getCreditRecoveredTotals(true).cash;
    const initialFund = parseFloat(initialFundInput.value) || 0;
    const expectedCash = payCash + payCreditRecoveredCash + initialFund;
    
    document.getElementById("cierre-expected-cash-label").textContent = `L ${expectedCash.toFixed(2)}`;
    
    if (actualCashInput.value === "") {
        const diffEl = document.getElementById("cierre-difference");
        diffEl.textContent = `L ${(-expectedCash).toFixed(2)} (Faltante)`;
        diffEl.style.color = "var(--color-danger)";
        return;
    }
    
    const actualCash = parseFloat(actualCashInput.value) || 0;
    const diff = actualCash - expectedCash;
    const diffEl = document.getElementById("cierre-difference");
    
    if (diff < 0) {
        diffEl.textContent = `L ${diff.toFixed(2)} (Faltante)`;
        diffEl.style.color = "var(--color-danger)";
    } else if (diff > 0) {
        diffEl.textContent = `L ${diff.toFixed(2)} (Sobrante)`;
        diffEl.style.color = "var(--color-success)";
    } else {
        diffEl.textContent = `L 0.00 (Cuadrado)`;
        diffEl.style.color = "var(--color-success)";
    }
}

if (initialFundInput) initialFundInput.addEventListener("input", recalculateCierreDiff);
if (actualCashInput) actualCashInput.addEventListener("input", recalculateCierreDiff);

const cierreForm = document.getElementById("cierre-form");
if (cierreForm) {
    cierreForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const activeInvoices = invoices.filter(inv => !inv.closed);
        
        // Count recovered credits that need closure assignment
        const recoveredTotals = getCreditRecoveredTotals(true);
        const payCreditRecoveredCash = recoveredTotals.cash;
        const payCreditRecoveredNoncash = recoveredTotals.noncash;
        const totalRecoveredCount = recoveredTotals.count;

        if (activeInvoices.length === 0 && totalRecoveredCount === 0 && !confirm("No hay ventas ni cobros de crédito registrados en el turno actual. ¿Desea proceder con el cierre de caja de todos modos?")) {
            return;
        }
        
        const initialFund = parseFloat(initialFundInput.value) || 0;
        const payCash = activeInvoices.filter(i => i.paymentMethod === "Efectivo").reduce((sum, i) => sum + i.total, 0);
        const expectedCash = payCash + payCreditRecoveredCash + initialFund;
        const actualCash = parseFloat(actualCashInput.value) || 0;
        const diff = actualCash - expectedCash;
        
        const closureId = "closure_" + Date.now();
        
        const categorySales = {
            Pan: { total: 0, qty: 0 },
            Churro: { total: 0, qty: 0 },
            Jugos: { total: 0, qty: 0 }
        };
        
        activeInvoices.forEach(inv => {
            inv.items.forEach(it => {
                let cat = it.category;
                if (!cat) {
                    if (it.name.toLowerCase().includes("churro")) cat = "Churro";
                    else if (it.name.toLowerCase().includes("jugo") || it.name.toLowerCase().includes("naranja")) cat = "Jugos";
                    else cat = "Pan";
                }
                if (categorySales[cat]) {
                    categorySales[cat].total += it.price * it.quantity;
                    categorySales[cat].qty += it.quantity;
                } else {
                    categorySales[cat] = { total: it.price * it.quantity, qty: it.quantity };
                }
            });
        });
        
        const newClosure = {
            id: closureId,
            number: String(closures.length + 1).padStart(4, '0'),
            dateStart: activeInvoices.length > 0 ? `${activeInvoices[0].date} ${activeInvoices[0].time}` : getHNDateString(),
            dateEnd: `${getHNDateString()} ${new Date().toLocaleTimeString("es-HN", { hour12: false })}`,
            invoicesCount: activeInvoices.length,
            invoiceRange: activeInvoices.length > 0 ? `${activeInvoices[0].invoiceNumber} al ${activeInvoices[activeInvoices.length - 1].invoiceNumber}` : "N/A",
            salesExempt: activeInvoices.reduce((sum, inv) => sum + (inv.exento || 0), 0),
            salesGravado15: activeInvoices.reduce((sum, inv) => sum + (inv.gravado15 || 0), 0),
            isv15: activeInvoices.reduce((sum, inv) => sum + (inv.isv15 || 0), 0),
            discount: activeInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0),
            totalNet: activeInvoices.reduce((sum, inv) => sum + inv.total, 0),
            payCash: payCash,
            payCard: activeInvoices.filter(i => i.paymentMethod === "Tarjeta").reduce((sum, i) => sum + i.total, 0),
            payTransfer: activeInvoices.filter(i => i.paymentMethod === "Transferencia").reduce((sum, i) => sum + i.total, 0),
            payCredit: activeInvoices.filter(i => i.paymentMethod === "Crédito").reduce((sum, i) => sum + i.total, 0),
            payCreditRecoveredCash: payCreditRecoveredCash,
            payCreditRecoveredNoncash: payCreditRecoveredNoncash,
            initialFund: initialFund,
            expectedCash: expectedCash,
            actualCash: actualCash,
            difference: diff,
            notes: document.getElementById("cierre-notes").value.trim() || "Ninguna",
            categorySales: categorySales
        };
        
        // Mark all active invoices as closed, and close/archive recovered credits for this shift
        invoices.forEach(inv => {
            let modified = false;
            if (!inv.closed) {
                inv.closed = true;
                inv.closureId = closureId;
                modified = true;
            }
            if (inv.paymentMethod === "Crédito") {
                if (inv.creditPayments && inv.creditPayments.length > 0) {
                    inv.creditPayments.forEach(p => {
                        if (p.closureId === null) {
                            p.closureId = closureId;
                            modified = true;
                        }
                    });
                }
                // Handle legacy or full pay archive setting on invoice
                if (inv.creditStatus === "Pagado" && inv.creditPaidClosureId === null) {
                    inv.creditPaidClosureId = closureId;
                    modified = true;
                }
            }
            if (modified) {
                cloudSave("invoices", inv.id, inv);
            }
        });
        
        closures.push(newClosure);
        saveToStorage("pr_invoices", invoices);
        saveToStorage("pr_closures", closures);
        cloudSave("closures", newClosure.id, newClosure);
        
        document.getElementById("modal-cierre").classList.remove("active");
        alert(`Cierre Z-${newClosure.number} guardado exitosamente.`);
        
        updateDashboardStats();
        renderClosuresTable();
        viewClosureZ(newClosure.id);
    });
}

if (DOM.btnPrintCierre) {
    DOM.btnPrintCierre.addEventListener("click", () => {
        const activeInvoices = invoices.filter(inv => !inv.closed);
        const recoveredTotals = getCreditRecoveredTotals(true);
        const payCreditRecoveredCash = recoveredTotals.cash;
        const payCreditRecoveredNoncash = recoveredTotals.noncash;
        const totalRecoveredCount = recoveredTotals.count;

        if (activeInvoices.length === 0 && totalRecoveredCount === 0) {
            alert("No hay ventas ni cobros de crédito en el turno activo actual para generar el Reporte Parcial de Caja (X).");
            return;
        }
        
        const payCash = activeInvoices.filter(i => i.paymentMethod === "Efectivo").reduce((sum, i) => sum + i.total, 0);
        const expectedCash = payCash + payCreditRecoveredCash;

        const tempClosure = {
            id: "temp_x",
            number: "PRE-X",
            dateStart: activeInvoices.length > 0 ? `${activeInvoices[0].date} ${activeInvoices[0].time}` : getHNDateString(),
            dateEnd: `${getHNDateString()} ${new Date().toLocaleTimeString("es-HN", { hour12: false })}`,
            invoicesCount: activeInvoices.length,
            invoiceRange: activeInvoices.length > 0 ? `${activeInvoices[0].invoiceNumber} al ${activeInvoices[activeInvoices.length - 1].invoiceNumber}` : "N/A",
            salesExempt: activeInvoices.reduce((sum, inv) => sum + (inv.exento || 0), 0),
            salesGravado15: activeInvoices.reduce((sum, inv) => sum + (inv.gravado15 || 0), 0),
            isv15: activeInvoices.reduce((sum, inv) => sum + (inv.isv15 || 0), 0),
            discount: activeInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0),
            totalNet: activeInvoices.reduce((sum, inv) => sum + inv.total, 0),
            payCash: payCash,
            payCard: activeInvoices.filter(i => i.paymentMethod === "Tarjeta").reduce((sum, i) => sum + i.total, 0),
            payTransfer: activeInvoices.filter(i => i.paymentMethod === "Transferencia").reduce((sum, i) => sum + i.total, 0),
            payCredit: activeInvoices.filter(i => i.paymentMethod === "Crédito").reduce((sum, i) => sum + i.total, 0),
            payCreditRecoveredCash: payCreditRecoveredCash,
            payCreditRecoveredNoncash: payCreditRecoveredNoncash,
            initialFund: 0.00,
            expectedCash: expectedCash,
            actualCash: expectedCash,
            difference: 0,
            notes: "Reporte Parcial (X) - Turno Sin Cerrar",
            categorySales: {
                Pan: { total: 0, qty: 0 },
                Churro: { total: 0, qty: 0 },
                Jugos: { total: 0, qty: 0 }
            }
        };
        
        activeInvoices.forEach(inv => {
            inv.items.forEach(it => {
                let cat = it.category;
                if (!cat) {
                    if (it.name.toLowerCase().includes("churro")) cat = "Churro";
                    else if (it.name.toLowerCase().includes("jugo") || it.name.toLowerCase().includes("naranja")) cat = "Jugos";
                    else cat = "Pan";
                }
                if (tempClosure.categorySales[cat]) {
                    tempClosure.categorySales[cat].total += it.price * it.quantity;
                    tempClosure.categorySales[cat].qty += it.quantity;
                }
            });
        });
        
        closures.push(tempClosure);
        viewClosureZ(tempClosure.id);
        closures.pop();
    });
}

if (DOM.btnShowMonthlyStats) {
    DOM.btnShowMonthlyStats.addEventListener("click", () => {
        populateMonthlyStatsMonths(); if (DOM.monthlyStatsSelect.value) updateMonthlyStats(DOM.monthlyStatsSelect.value);
        DOM.modalMonthlyStats.classList.add("active"); safeCreateIcons();
    });
}
if (DOM.btnCloseMonthlyStats) DOM.btnCloseMonthlyStats.addEventListener("click", () => DOM.modalMonthlyStats.classList.remove("active"));
if (DOM.btnCloseMonthlyStatsFooter) DOM.btnCloseMonthlyStatsFooter.addEventListener("click", () => DOM.modalMonthlyStats.classList.remove("active"));
if (DOM.monthlyStatsSelect) DOM.monthlyStatsSelect.addEventListener("change", (e) => updateMonthlyStats(e.target.value));

window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-invoice", "printing-closure");
});

// ==========================================
// 11. RUNTIME BOOTSTRAP INITIALIZATION
// ==========================================
initFirebase();
switchSection("dashboard");
renderCart();
updateClock();
safeCreateIcons();