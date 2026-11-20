/**
 * SportInventory - Aplikacja Ewidencji i Etykietowania Sprzętu Sportowego
 * Obsługa:
 *  - Drukarka Zenwire TP-210 przez Bluetooth Low Energy (BLE)
 *  - Etykiety 50x30 mm (TSPL 203 DPI) z polskimi znakami (CP1250)
 *  - Dynamiczne słowniki z automatycznym dodawaniem (Combobox)
 *  - Skaner kodów QR z aparatu (html5-qrcode)
 *  - Baza danych Google Sheets (REST API)
 */

// ================= DOMYŚLNE SZABLONY ETYKIET =================
const DEFAULT_TEMPLATES = [
  {
    id: "tpl_standard",
    name: "Standardowy z kodem QR",
    hasBorder: true,
    hasQr: true,
    qrX: 15,
    qrY: 52,
    qrSize: 135,
    elements: [
      { id: "el_id", type: "text", text: "ID: {ID}", x: 15, y: 36, fontSize: 22, bold: true },
      { id: "el_title", type: "text", text: "{MARKA} {RODZAJ}", x: 160, y: 75, fontSize: 22, bold: true },
      { id: "el_sub", type: "text", text: "{ROZMIAR} / {STAN}", x: 160, y: 115, fontSize: 18, bold: false },
      { id: "el_price", type: "text", text: "CENA: {CENA} PLN", x: 160, y: 175, fontSize: 26, bold: true }
    ]
  },
  {
    id: "tpl_big_price",
    name: "Wyprzedaż / Duża Cena",
    hasBorder: true,
    hasQr: true,
    qrX: 15,
    qrY: 30,
    qrSize: 170,
    elements: [
      { id: "el_promo", type: "text", text: "★ SUPER OKAZJA ★", x: 195, y: 40, fontSize: 20, bold: true },
      { id: "el_title", type: "text", text: "{MARKA} {RODZAJ}", x: 195, y: 75, fontSize: 20, bold: false },
      { id: "el_id", type: "text", text: "ID: {ID}", x: 195, y: 110, fontSize: 16, bold: false },
      { id: "el_price", type: "text", text: "{CENA} PLN", x: 195, y: 170, fontSize: 34, bold: true }
    ]
  },
  {
    id: "tpl_logo_header",
    name: "Z Nagłówkiem / Logo",
    hasBorder: true,
    hasQr: true,
    qrX: 235,
    qrY: 45,
    qrSize: 140,
    elements: [
      { id: "el_brand", type: "text", text: "SPORT-SERVICE", x: 15, y: 35, fontSize: 22, bold: true },
      { id: "el_title", type: "text", text: "{MARKA} {RODZAJ}", x: 15, y: 75, fontSize: 20, bold: true },
      { id: "el_sub", type: "text", text: "{STAN} ({ROZMIAR})", x: 15, y: 110, fontSize: 17, bold: false },
      { id: "el_price", type: "text", text: "{CENA} PLN", x: 15, y: 160, fontSize: 26, bold: true },
      { id: "el_id", type: "text", text: "ID: {ID}", x: 15, y: 200, fontSize: 16, bold: false }
    ]
  }
];

// ================= DOMYŚLNE SŁOWNIKI KASKADOWE =================
const DEFAULT_DICTIONARIES = {
  categories: ["Narciarstwo", "Snowboard", "Kolarstwo", "Rolki / Łyżwy", "Turystyka", "Inne"],
  brands: [
    "Salomon", "Head", "Atomic", "Rossignol", "Fischer", "Völkl", "Blizzard", "Nordica", "Dynastar",
    "Burton", "Nitro", "Ride", "Bataleon", "Capita", "Jones",
    "Trek", "Giant", "Kross", "Specialized", "Scott", "Cube", "Cannondale", "Merida", "Romet",
    "Rollerblade", "K2", "Powerslide", "Tempish", "Bauer", "CCM",
    "The North Face", "Columbia", "Deuter", "Osprey", "Salewa", "Jack Wolfskin", "Inna"
  ],
  categoryRodzaje: {
    "Narciarstwo": ["Narty", "Buty", "Kijki", "Kask", "Gogle"],
    "Snowboard": ["Deska", "Buty SB", "Wiązania", "Kask", "Gogle"],
    "Kolarstwo": ["Rower Górski (MTB)", "Rower Szosowy", "Rower Gravel", "Rower Miejski", "Kask rowerowy", "Akcesoria"],
    "Rolki / Łyżwy": ["Rolki", "Łyżwy figurowe", "Łyżwy hokejowe", "Ochraniacze"],
    "Turystyka": ["Plecak", "Kije trekkingowe", "Namiot", "Śpiwór", "Buty trekkingowe"],
    "Inne": ["Sprzęt ogólny", "Akcesoria"]
  },
  rodzajRozmiary: {
    "Narty": ["140 cm", "145 cm", "150 cm", "155 cm", "160 cm", "165 cm", "170 cm", "175 cm", "180 cm"],
    "Buty": ["24.0 (EU 37)", "24.5 (EU 38)", "25.0 (EU 39)", "25.5 (EU 40)", "26.0 (EU 40.5)", "26.5 (EU 41)", "27.0 (EU 42)", "27.5 (EU 42.5)", "28.0 (EU 43)", "28.5 (EU 44)", "29.0 (EU 44.5)", "29.5 (EU 45)"],
    "Kijki": ["110 cm", "115 cm", "120 cm", "125 cm", "130 cm", "135 cm"],
    "Kask": ["XS (51-53 cm)", "S (53-55 cm)", "M (56-58 cm)", "L (59-61 cm)", "XL (61-63 cm)"],
    "Gogle": ["S (Dziecięce)", "M/L (Uniwersalne)", "OTG (Na okulary)"],
    "Deska": ["145 cm", "150 cm", "153 cm", "156 cm", "159 cm", "162 cm"],
    "Buty SB": ["25.0 (EU 39)", "26.0 (EU 40.5)", "27.0 (EU 42)", "28.0 (EU 43)", "29.0 (EU 44.5)"],
    "Wiązania": ["S", "M", "L"],
    "Rower Górski (MTB)": ["Rama XS (14\")", "Rama S (16\")", "Rama M (18\")", "Rama L (20\")", "Rama XL (22\")"],
    "Rower Szosowy": ["50 cm (S)", "52 cm (M)", "54 cm (M/L)", "56 cm (L)", "58 cm (XL)"],
    "Rower Gravel": ["S", "M", "L", "XL"],
    "Rower Miejski": ["Rama M", "Rama L"],
    "Kask rowerowy": ["S (52-56 cm)", "M (55-59 cm)", "L (58-62 cm)"],
    "Rolki": ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45"],
    "Łyżwy figurowe": ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41"],
    "Łyżwy hokejowe": ["EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45"]
  },
  conditions: ["Nowy", "Używany", "Bardzo dobry", "Po serwisie", "Do serwisu"]
};

function loadStoredDictionaries() {
  const stored = localStorage.getItem("sport_dictionaries");
  if (!stored) return JSON.parse(JSON.stringify(DEFAULT_DICTIONARIES));
  try {
    const parsed = JSON.parse(stored);
    
    // Lista znanych marek do oczyszczenia z categoryRodzaje
    const knownBrands = [
      "Salomon", "Head", "Atomic", "Rossignol", "Fischer", "Völkl", "Volkl", "Blizzard", "Nordica", 
      "Burton", "Nitro", "Ride", "Bataleon", "Capita", "Jones",
      "Trek", "Giant", "Kross", "Specialized", "Scott", "Cube", "Cannondale", "Merida", "Romet",
      "Rollerblade", "K2", "Powerslide", "Tempish", "Bauer", "CCM",
      "The North Face", "Columbia", "Deuter", "Osprey", "Salewa", "Jack Wolfskin"
    ];
    
    let brands = parsed.brands && Array.isArray(parsed.brands) && parsed.brands.length ? parsed.brands : [];
    if (parsed.models && Array.isArray(parsed.models)) {
      parsed.models.forEach(m => {
        const brandMatch = knownBrands.find(b => m.toLowerCase().includes(b.toLowerCase()));
        const bName = brandMatch || m.split(" ")[0];
        if (bName && !brands.includes(bName)) brands.push(bName);
      });
    }
    DEFAULT_DICTIONARIES.brands.forEach(b => {
      if (!brands.includes(b)) brands.push(b);
    });

    // Oczyść categoryRodzaje jeśli w pamięci były tam omyłkowo marki
    let categoryRodzaje = parsed.categoryRodzaje || {};
    if (!categoryRodzaje["Narciarstwo"] || categoryRodzaje["Narciarstwo"].some(r => knownBrands.includes(r))) {
      categoryRodzaje = JSON.parse(JSON.stringify(DEFAULT_DICTIONARIES.categoryRodzaje));
    } else {
      Object.keys(DEFAULT_DICTIONARIES.categoryRodzaje).forEach(k => {
        if (!categoryRodzaje[k]) categoryRodzaje[k] = DEFAULT_DICTIONARIES.categoryRodzaje[k];
      });
    }

    let rodzajRozmiary = parsed.rodzajRozmiary || {};
    if (!rodzajRozmiary["Narty"]) {
      rodzajRozmiary = JSON.parse(JSON.stringify(DEFAULT_DICTIONARIES.rodzajRozmiary));
    }

    return {
      categories: (parsed.categories && parsed.categories.length) ? parsed.categories : DEFAULT_DICTIONARIES.categories,
      brands: brands,
      categoryRodzaje: categoryRodzaje,
      rodzajRozmiary: rodzajRozmiary,
      conditions: (parsed.conditions && parsed.conditions.length) ? parsed.conditions : DEFAULT_DICTIONARIES.conditions
    };
  } catch (_) {
    return JSON.parse(JSON.stringify(DEFAULT_DICTIONARIES));
  }
}

function saveDictionaries() {
  try {
    localStorage.setItem("sport_dictionaries", JSON.stringify(AppState.dictionaries));
  } catch (e) {
    console.error("Błąd zapisu słowników:", e);
  }
}

function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ================= STAN APLIKACJI =================
const AppState = {
  printerDevice: null,
  printerCharacteristic: null,
  isPrinterConnected: false,
  scriptUrl: localStorage.getItem("sport_script_url") || "",
  html5QrCode: null,
  isCameraActive: false,
  currentItem: null,
  
  // Szablony
  templates: JSON.parse(localStorage.getItem("sport_templates")) || DEFAULT_TEMPLATES,
  activeTemplateId: localStorage.getItem("sport_active_template_id") || "tpl_standard",
  editorTemplate: null,
  selectedElementId: null,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  initialElementX: 0,
  initialElementY: 0,

  // Domyślne słowniki kaskadowe (rozszerzane dynamicznie)
  dictionaries: loadStoredDictionaries()
};

// ================= INICJALIZACJA PO ZAŁADOWANIU =================
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initComboboxes();
  initTemplateEditor();
  initFormPreviewListeners();
  initBluetoothEvents();
  initScannerEvents();
  initSettingsModal();

  // Sprawdź czy jest zapisany adres API
  if (!AppState.scriptUrl) {
    showToast("Wskazówka: Uzupełnij URL do Google Sheets w Ustawieniach (⚙️)", 4000);
  }
});

// ================= NAWIGACJA ZAKŁADEK =================
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add("active");

      // Auto-zarządzanie kamerą i edytorem przy przełączaniu
      if (btn.dataset.tab === "tab-scanner") {
        startCamera();
      } else {
        stopCamera();
      }

      if (btn.dataset.tab === "tab-templates") {
        renderEditorCanvas();
      } else if (btn.dataset.tab === "tab-intake") {
        updateLabelPreview();
      }
    });
  });
}

// ================= DYNAMICZNE SŁOWNIKI KASKADOWE (COMBOBOX) =================
function initComboboxes() {
  const inputCategory = document.getElementById("inputCategory");
  const inputBrand = document.getElementById("inputBrand");
  const inputRodzaj = document.getElementById("inputRodzaj");
  const inputSize = document.getElementById("inputSize");

  // 1. Kategoria
  setupCombobox(
    "inputCategory",
    "listCategory",
    () => AppState.dictionaries.categories,
    (selectedCat) => {
      updateLabelPreview();
    },
    (newCat) => {
      if (!AppState.dictionaries.categories.includes(newCat)) {
        AppState.dictionaries.categories.push(newCat);
        if (!AppState.dictionaries.categoryRodzaje[newCat]) {
          AppState.dictionaries.categoryRodzaje[newCat] = [];
        }
        saveDictionaries();
        showToast(`Dodano nową kategorię: "${newCat}"`);
      }
    }
  );

  // 2. Marka (ze Słownika)
  setupCombobox(
    "inputBrand",
    "listBrand",
    () => AppState.dictionaries.brands,
    (selectedBrand) => {
      updateLabelPreview();
    },
    (newBrand) => {
      if (!AppState.dictionaries.brands.includes(newBrand)) {
        AppState.dictionaries.brands.push(newBrand);
        saveDictionaries();
        showToast(`Dodano nową markę: "${newBrand}"`);
      }
    }
  );

  // 3. Rodzaj sprzętu (dynamicznie zależny od Kategorii)
  setupCombobox(
    "inputRodzaj",
    "listRodzaj",
    () => {
      const cat = inputCategory ? inputCategory.value.trim() : "";
      if (cat && AppState.dictionaries.categoryRodzaje[cat] && AppState.dictionaries.categoryRodzaje[cat].length) {
        return AppState.dictionaries.categoryRodzaje[cat];
      }
      const all = [];
      Object.values(AppState.dictionaries.categoryRodzaje).forEach(arr => {
        arr.forEach(r => { if (!all.includes(r)) all.push(r); });
      });
      return all;
    },
    (selectedRodzaj) => {
      updateLabelPreview();
    },
    (newRodzaj) => {
      const cat = (inputCategory && inputCategory.value.trim()) || "Inne";
      if (!AppState.dictionaries.categoryRodzaje[cat]) {
        AppState.dictionaries.categoryRodzaje[cat] = [];
      }
      if (!AppState.dictionaries.categoryRodzaje[cat].includes(newRodzaj)) {
        AppState.dictionaries.categoryRodzaje[cat].push(newRodzaj);
      }
      if (!AppState.dictionaries.rodzajRozmiary[newRodzaj]) {
        AppState.dictionaries.rodzajRozmiary[newRodzaj] = [];
      }
      saveDictionaries();
      showToast(`Dodano rodzaj: "${newRodzaj}" do kategorii "${cat}"`);
    }
  );

  // 4. Rozmiar (dynamicznie zależny od Rodzaju)
  setupCombobox(
    "inputSize",
    "listSize",
    () => {
      const rod = inputRodzaj ? inputRodzaj.value.trim() : "";
      if (rod && AppState.dictionaries.rodzajRozmiary[rod] && AppState.dictionaries.rodzajRozmiary[rod].length) {
        return AppState.dictionaries.rodzajRozmiary[rod];
      }
      const all = [];
      Object.values(AppState.dictionaries.rodzajRozmiary).forEach(arr => {
        arr.forEach(s => { if (!all.includes(s)) all.push(s); });
      });
      return all.length ? all : ["150 cm", "160 cm", "170 cm", "S", "M", "L", "XL"];
    },
    (selectedSize) => {
      updateLabelPreview();
    },
    (newSize) => {
      const rod = (inputRodzaj && inputRodzaj.value.trim()) || "Inne";
      if (!AppState.dictionaries.rodzajRozmiary[rod]) {
        AppState.dictionaries.rodzajRozmiary[rod] = [];
      }
      if (!AppState.dictionaries.rodzajRozmiary[rod].includes(newSize)) {
        AppState.dictionaries.rodzajRozmiary[rod].push(newSize);
      }
      saveDictionaries();
      showToast(`Dodano rozmiar: "${newSize}" dla "${rod}"`);
    }
  );

  // 5. Stan techniczny
  setupCombobox(
    "inputCondition",
    "listCondition",
    () => AppState.dictionaries.conditions,
    (selectedCond) => {
      updateLabelPreview();
    },
    (newCond) => {
      if (!AppState.dictionaries.conditions.includes(newCond)) {
        AppState.dictionaries.conditions.push(newCond);
        saveDictionaries();
        showToast(`Dodano stan: "${newCond}"`);
      }
    }
  );
}

function setupCombobox(inputId, listId, getItemsFn, onSelectFn, onAddNewFn) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;

  function getItems() {
    return typeof getItemsFn === "function" ? getItemsFn() : (getItemsFn || []);
  }

  function renderList(query = "") {
    list.innerHTML = "";
    const cleanQuery = query.trim().toLowerCase();
    const items = getItems();
    
    // Filtrowanie istniejących
    const matches = items.filter(item => item.toLowerCase().includes(cleanQuery));

    matches.forEach(item => {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      div.textContent = item;
      div.addEventListener("click", () => {
        input.value = item;
        list.classList.remove("show");
        if (onSelectFn) onSelectFn(item);
        updateLabelPreview();
      });
      list.appendChild(div);
    });

    // Opcja dodania nowego, jeśli nie istnieje dokładnie
    if (query.trim() && !items.some(it => it.toLowerCase() === cleanQuery)) {
      const addDiv = document.createElement("div");
      addDiv.className = "dropdown-item add-new";
      addDiv.textContent = `➕ Dodaj nową: "${query.trim()}"`;
      addDiv.addEventListener("click", () => {
        const val = query.trim();
        input.value = val;
        list.classList.remove("show");
        if (onAddNewFn) onAddNewFn(val);
        updateLabelPreview();
      });
      list.appendChild(addDiv);
    }

    if (list.children.length > 0) {
      list.classList.add("show");
    } else {
      list.classList.remove("show");
    }
  }

  input.addEventListener("focus", () => renderList(input.value));
  input.addEventListener("input", () => {
    renderList(input.value);
    updateLabelPreview();
  });

  // Ukryj listę po kliknięciu poza nią
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.classList.remove("show");
    }
  });
}

// ================= PODGLĄD ETYKIETY (50x30 mm) =================
function initFormPreviewListeners() {
  const ids = ["inputCategory", "inputBrand", "inputRodzaj", "inputSize", "inputCondition", "inputOpis", "inputBuyPrice", "inputSellPrice"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateLabelPreview);
  });

  const selectActive = document.getElementById("selectActiveTemplate");
  if (selectActive) {
    selectActive.addEventListener("change", (e) => {
      AppState.activeTemplateId = e.target.value;
      localStorage.setItem("sport_active_template_id", AppState.activeTemplateId);
      updateLabelPreview();
    });
  }

  document.getElementById("btnSaveAndPrint").addEventListener("click", handleSaveAndPrint);
}

function getActiveTemplate() {
  return AppState.templates.find(t => t.id === AppState.activeTemplateId) || AppState.templates[0];
}

async function updateLabelPreview() {
  const canvas = document.getElementById("intakePreviewCanvas");
  if (!canvas) return;

  const category = (document.getElementById("inputCategory")?.value || "").trim();
  const brand = (document.getElementById("inputBrand")?.value || "").trim();
  const rodzaj = (document.getElementById("inputRodzaj")?.value || "").trim();
  const size = (document.getElementById("inputSize")?.value || "").trim();
  const condition = (document.getElementById("inputCondition")?.value || "").trim();
  const opis = (document.getElementById("inputOpis")?.value || "").trim();
  const buyPrice = (document.getElementById("inputBuyPrice")?.value || "").trim();
  const sellPrice = (document.getElementById("inputSellPrice")?.value || "").trim();

  const currentData = {
    id: "SP-AUTO",
    category: category || "Narciarstwo",
    brand: brand || "Salomon",
    rodzaj: rodzaj || "Narty",
    size: size || "165 cm",
    condition: condition || "Po serwisie",
    opis: opis || "X-Drive 8.0",
    buyPrice: buyPrice || "400",
    price: sellPrice || "650",
    sellPrice: sellPrice || "650",
    status: "Dostępny",
    date: getTodayDate()
  };

  const activeTpl = getActiveTemplate();
  await preloadTemplateImages(activeTpl);
  renderTemplateToCanvas(canvas, activeTpl, currentData, false);
}

// ================= OBSŁUGA BLUETOOTH BLE (ZENWIRE TP-210) =================
function initBluetoothEvents() {
  const btnConnect = document.getElementById("btnConnectPrinter");
  btnConnect.addEventListener("click", connectToPrinter);
}

// Lista znanych serwisów i charakterystyk BLE dla mobilnych drukarek termicznych
const PRINTER_SERVICES = [
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ae00-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
];

async function connectToPrinter() {
  if (!navigator.bluetooth) {
    alert("Twoja przeglądarka/urządzenie nie obsługuje Web Bluetooth. Uruchom aplikację w Chrome na telefonie z włączonym Bluetooth i lokalizacją.");
    return;
  }

  try {
    showToast("Wyszukiwanie drukarki Zenwire TP-210...");
    
    // Szukanie dowolnego urządzenia Bluetooth z serwisami transmisji danych
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES
    });

    showToast(`Łączenie z ${device.name || "Drukarką"}...`);
    const server = await device.gatt.connect();

    // Wyszukanie odpowiedniej charakterystyki zapisu (write / writeWithoutResponse)
    let writeChar = null;

    // Przeszukaj serwisy
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          writeChar = ch;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error("Nie znaleziono charakterystyki zapisu w urządzeniu.");
    }

    AppState.printerDevice = device;
    AppState.printerCharacteristic = writeChar;
    AppState.isPrinterConnected = true;

    updatePrinterUI(true, device.name || "TP-210");
    showToast(`Połączono z: ${device.name || "Drukarką"}! ✅`);

    device.addEventListener("gattserverdisconnected", () => {
      AppState.isPrinterConnected = false;
      AppState.printerCharacteristic = null;
      updatePrinterUI(false);
      showToast("Drukarka została rozłączona", 3000);
    });

  } catch (err) {
    console.error(err);
    if (err.name !== "NotFoundError") { // Anulowanie przez użytkownika
      alert("Błąd połączenia Bluetooth: " + err.message);
    }
    updatePrinterUI(false);
  }
}

function updatePrinterUI(connected, name = "") {
  const dot = document.getElementById("printerDot");
  const text = document.getElementById("printerStatusText");
  if (connected) {
    dot.className = "status-dot connected";
    text.textContent = name || "Zenwire: Gotowa";
  } else {
    dot.className = "status-dot disconnected";
    text.textContent = "Zenwire: Rozłączona";
  }
}

// ================= GENERATOR KOMEND TSPL (50x30 mm) Z POLSKIMI ZNAKAMI =================

/**
 * Konwersja tekstu na tablicę bajtów w kodowaniu Windows-1250 (CP1250)
 * Pozwala drukarce TSPL wydrukować polskie litery (ą, ę, ś, ć, ł, ó, ż, ź)
 */
function encodeWindows1250(str) {
  const map1250 = {
    'Ą': 0xA5, 'ą': 0xB9,
    'Ć': 0xC6, 'ć': 0xE6,
    'Ę': 0xCA, 'ę': 0xEA,
    'Ł': 0xA3, 'ł': 0xB3,
    'Ń': 0xD1, 'ń': 0xF1,
    'Ó': 0xD3, 'ó': 0xF3,
    'Ś': 0x8C, 'ś': 0x9C,
    'Ź': 0x8F, 'ź': 0x9F,
    'Ż': 0xAF, 'ż': 0xBF
  };

  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (map1250[ch]) {
      bytes.push(map1250[ch]);
    } else {
      const code = str.charCodeAt(i);
      bytes.push(code < 128 ? code : 63); // 63 = '?' dla nieobsługiwanych
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Generuje ciąg instrukcji TSPL dla etykiety 50x30 mm
 * Używa ściśle zakończeń \r\n (CRLF) wymaganych przez mikrokontrolery drukarek
 */
function buildTsplCommand(itemId, title, size, condition, price) {
  let subText = [size, condition].filter(Boolean).join(" / ");
  if (title.length > 20) title = title.substring(0, 19) + "…";
  if (subText.length > 24) subText = subText.substring(0, 23) + "…";

  // Czyste komendy TSPL z maksymalną gęstością i solidnym czarnym paskiem BAR
  const lines = [
    "SIZE 50 mm,30 mm",
    "GAP 3 mm,0 mm",
    "DENSITY 15",
    "SPEED 2",
    "DIRECTION 1",
    "CLS",
    // 1. Solidny czarny pasek na samej górze (360x20 punktów) - 100% pewny test grzania głowicy
    "BAR 20,15,360,20",
    // 2. Kody i teksty
    `QRCODE 25,45,L,5,A,0,"${itemId}"`,
    `TEXT 175,45,"3",0,1,1,"ID: ${itemId}"`,
    `TEXT 175,85,"2",0,1,1,"${title}"`,
    `TEXT 175,120,"2",0,1,1,"${subText}"`,
    `TEXT 175,165,"3",0,1,1,"CENA: ${price} PLN"`,
    "PRINT 1,1",
    ""
  ];

  const tsplString = lines.join("\r\n");
  return encodeWindows1250(tsplString);
}

/**
 * Rysuje kod QR bezpośrednio na płótnie Canvas bez żadnych zewnętrznych zależności (100% offline).
 */
function drawQrCodeToCanvas(ctx, text, startX, startY, targetSize) {
  try {
    // Inicjalizacja biblioteki qrcode.js: typeNumber 0 = auto, ErrorCorrection M
    const qr = new QRCode(0, QRCode.ErrorCorrectLevel.M);
    qr.addData(text);
    qr.make();

    const count = qr.getModuleCount();
    const cellSize = targetSize / count;

    // Białe tło pod kodem QR
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(startX, startY, targetSize, targetSize);

    // Rysowanie czarnych modułów kodu QR
    ctx.fillStyle = "#000000";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          const x = Math.round(startX + col * cellSize);
          const y = Math.round(startY + row * cellSize);
          const w = Math.round(startX + (col + 1) * cellSize) - x;
          const h = Math.round(startY + (row + 1) * cellSize) - y;
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  } catch (err) {
    console.error("Błąd generowania kodu QR:", err);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, targetSize, targetSize);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 14px Arial";
    ctx.fillText("QR ERR", startX + 15, startY + targetSize / 2);
  }
}

/**
 * Asynchronicznie upewnia się, że wszystkie obrazy (logo/grafiki) w szablonie
 * są w 100% zdekodowane i załadowane w pamięci przed rysowaniem lub wydrukiem.
 */
async function preloadTemplateImages(template) {
  if (!template || !template.elements) return;
  const promises = [];
  for (const el of template.elements) {
    if (el.type === "image" && el.dataUrl) {
      if (!el._imgObj || !el._imgObj.complete || el._imgObj.naturalWidth === 0) {
        const p = new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            el._imgObj = img;
            resolve();
          };
          img.onerror = () => {
            console.error("Błąd ładowania obrazu:", el.id);
            resolve();
          };
          img.src = el.dataUrl;
        });
        promises.push(p);
      }
    }
  }
  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

/**
 * Uniwersalna funkcja renderująca dowolny szablon z dowolnymi danymi na Canvasie.
 */
function renderTemplateToCanvas(canvas, template, itemData, isEditor = false) {
  if (!canvas || !template) return;
  const ctx = canvas.getContext("2d");
  const WIDTH_DOTS = 384;
  const HEIGHT_DOTS = 240;

  // 1. Czyste białe tło
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH_DOTS, HEIGHT_DOTS);

  // 2. Ramka zewnętrzna
  if (template.hasBorder) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, WIDTH_DOTS - 6, HEIGHT_DOTS - 6);
  }

  // 3. Kod QR (jeśli włączony w szablonie)
  if (template.hasQr) {
    const qrSize = template.qrSize || 135;
    const qrX = template.qrX !== undefined ? template.qrX : 15;
    const qrY = template.qrY !== undefined ? template.qrY : 52;
    drawQrCodeToCanvas(ctx, itemData.id || "SP-00001", qrX, qrY, qrSize);

    if (isEditor && AppState.selectedElementId === "__qr") {
      drawSelectionBox(ctx, qrX, qrY, qrSize, qrSize);
    }
  }

  // 4. Elementy (teksty, obrazy)
  if (template.elements && Array.isArray(template.elements)) {
    for (const el of template.elements) {
      if (el.type === "text") {
        // Podstawienie zmiennych dynamicznych
        let text = el.text || "";
        text = text.replace(/\{ID\}/gi, itemData.id || "SP-00001");
        text = text.replace(/\{MARKA\}/gi, itemData.brand || "Salomon");
        text = text.replace(/\{KATEGORIA\}/gi, itemData.category || "Narciarstwo");
        text = text.replace(/\{RODZAJ\}/gi, itemData.rodzaj || "Narty");
        text = text.replace(/\{ROZMIAR\}/gi, itemData.size || "165 cm");
        text = text.replace(/\{STAN\}/gi, itemData.condition || "Po serwisie");
        text = text.replace(/\{OPIS\}/gi, itemData.opis || "");
        text = text.replace(/\{CENA_ZAKUPU\}/gi, itemData.buyPrice || "0");
        text = text.replace(/\{CENA\}/gi, itemData.price || itemData.sellPrice || "0");
        text = text.replace(/\{STATUS\}/gi, itemData.status || "Dostępny");
        text = text.replace(/\{DATA_PRZYJECIA\}/gi, itemData.date || itemData.dateIntake || getTodayDate());

        // Kompatybilność wsteczna z szablonami zawierającymi {MODEL}
        const compModel = itemData.model || [itemData.brand, itemData.rodzaj, itemData.opis].filter(Boolean).join(" ") || "Sprzęt";
        text = text.replace(/\{MODEL\}/gi, compModel);

        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        const fontSize = el.fontSize || 20;
        ctx.font = (el.bold ? "bold " : "") + fontSize + "px Arial, sans-serif";
        ctx.fillText(text, el.x, el.y);

        if (isEditor && AppState.selectedElementId === el.id) {
          const metrics = ctx.measureText(text);
          const w = metrics.width;
          const h = fontSize;
          drawSelectionBox(ctx, el.x - 2, el.y - h, w + 4, h + 4);
        }
      } else if (el.type === "image" && el.dataUrl) {
        if (!el._imgObj) {
          el._imgObj = new Image();
          el._imgObj.src = el.dataUrl;
          el._imgObj.onload = () => {
            if (isEditor) renderEditorCanvas();
            else updateLabelPreview();
          };
        }
        if (el._imgObj.complete && el._imgObj.naturalWidth > 0) {
          ctx.drawImage(el._imgObj, el.x, el.y, el.width, el.height);
        }
        if (isEditor && AppState.selectedElementId === el.id) {
          drawSelectionBox(ctx, el.x, el.y, el.width, el.height);
        }
      }
    }
  }
}

function drawSelectionBox(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(x + w - 4, y + h - 4, 8, 8);
  ctx.restore();
}

/**
 * Renderuje etykietę 50x30 mm na ukrytym Canvasie HTML5 w oparciu o AKTYWNY SZABLON,
 * konwertuje na 1-bitową monochromatyczną bitmapę i generuje komendę TSPL BITMAP.
 */
async function generateTsplBitmapPayload(itemDataOrId, customTemplate = null, ...legacyArgs) {
  const WIDTH_DOTS = 384; // 48 mm przy 203 DPI (podzielne przez 8: 48 bajtów)
  const HEIGHT_DOTS = 240; // 30 mm przy 203 DPI
  const WIDTH_BYTES = WIDTH_DOTS / 8; // 48 bajtów na wiersz

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH_DOTS;
  canvas.height = HEIGHT_DOTS;

  let itemData = {};
  let templateToUse = customTemplate;

  if (typeof itemDataOrId === "object" && itemDataOrId !== null) {
    itemData = { ...itemDataOrId };
    if (!templateToUse) templateToUse = getActiveTemplate();
  } else {
    // Kompatybilność z parametrami pozycyjnymi: (itemId, title, size, condition, price, customTemplate)
    const title = customTemplate;
    const size = legacyArgs[0] || "";
    const condition = legacyArgs[1] || "";
    const price = legacyArgs[2] || "0";
    templateToUse = legacyArgs[3] || getActiveTemplate();

    itemData = {
      id: itemDataOrId,
      brand: document.getElementById("inputBrand") ? document.getElementById("inputBrand").value : "Salomon",
      rodzaj: title || "Sprzęt",
      model: title || "Sprzęt",
      size: size,
      condition: condition,
      price: price,
      sellPrice: price,
      category: document.getElementById("inputCategory") ? document.getElementById("inputCategory").value : "Sprzęt",
      opis: document.getElementById("inputOpis") ? document.getElementById("inputOpis").value : "",
      buyPrice: document.getElementById("inputBuyPrice") ? document.getElementById("inputBuyPrice").value : "",
      status: "Dostępny",
      date: getTodayDate()
    };
  }

  await preloadTemplateImages(templateToUse);
  renderTemplateToCanvas(canvas, templateToUse, itemData, false);

  // Konwersja Canvas -> 1-bitowa monochromatyczna tablica bajtów
  // DLA ZENWIRE TP-210: bit 1 = brak grzania (BIAŁY), bit 0 = grzanie (CZARNY)
  const imgData = canvas.getContext("2d").getImageData(0, 0, WIDTH_DOTS, HEIGHT_DOTS);
  const pixels = imgData.data;
  const bitmapBytes = new Uint8Array(WIDTH_BYTES * HEIGHT_DOTS);

  for (let y = 0; y < HEIGHT_DOTS; y++) {
    for (let byteX = 0; byteX < WIDTH_BYTES; byteX++) {
      let byteVal = 0xFF; // Domyślnie wszystkie bity = 1 (czyste BIAŁE tło, brak grzania)
      for (let bit = 0; bit < 8; bit++) {
        const x = byteX * 8 + bit;
        const idx = (y * WIDTH_DOTS + x) * 4;
        const lum = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
        
        // Jeśli piksel na canvasie jest czarny:
        // Zerujemy bit (0 = igła głowicy rozgrzewa się i wypala czarny punkt)
        if (lum < 128) {
          byteVal &= ~(0x80 >> bit);
        }
      }
      bitmapBytes[y * WIDTH_BYTES + byteX] = byteVal;
    }
  }

  // Budowa pełnego pakietu TSPL z nagłówkiem BITMAP i stopką PRINT 1
  const headerStr = `SIZE 48 mm,30 mm\r\nGAP 2 mm,0 mm\r\nDENSITY 15\r\nSPEED 2\r\nDIRECTION 0\r\nCLS\r\nBITMAP 0,0,${WIDTH_BYTES},${HEIGHT_DOTS},0,`;
  const footerStr = `\r\nPRINT 1\r\n`;

  const headerBytes = new TextEncoder().encode(headerStr);
  const footerBytes = new TextEncoder().encode(footerStr);

  const fullPayload = new Uint8Array(headerBytes.length + bitmapBytes.length + footerBytes.length);
  fullPayload.set(headerBytes, 0);
  fullPayload.set(bitmapBytes, headerBytes.length);
  fullPayload.set(footerBytes, headerBytes.length + bitmapBytes.length);

  return fullPayload;
}

/**
 * Bezpieczna wysyłka bajtów przez BLE z podziałem na pakiety
 */
async function sendRawTsplToPrinter(uint8Bytes) {
  if (!AppState.printerDevice) {
    throw new Error("Drukarka nie jest wybrana. Kliknij ikonę błyskawicy ⚡.");
  }

  // Jeśli połączenie padło w tle, połącz ponownie
  if (!AppState.printerDevice.gatt || !AppState.printerDevice.gatt.connected) {
    showToast("Wznawianie połączenia z Zenwire...");
    const server = await AppState.printerDevice.gatt.connect();
    
    let writeChar = null;
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.writeWithoutResponse || ch.properties.write) {
          writeChar = ch;
          break;
        }
      }
      if (writeChar) break;
    }
    if (!writeChar) throw new Error("Nie można odnaleźć charakterystyki zapisu.");
    AppState.printerCharacteristic = writeChar;
    AppState.isPrinterConnected = true;
    updatePrinterUI(true, AppState.printerDevice.name);
  }

  const char = AppState.printerCharacteristic;
  // Bezpieczny rozmiar pakietu (64 bajty przy writeWithoutResponse, 20 bajtów przy write)
  const CHUNK_SIZE = char.properties.writeWithoutResponse ? 64 : 20;

  for (let offset = 0; offset < uint8Bytes.length; offset += CHUNK_SIZE) {
    const chunk = uint8Bytes.slice(offset, offset + CHUNK_SIZE);
    
    const writeOp = (async () => {
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else if (char.properties.write) {
        await char.writeValue(chunk);
      } else {
        await char.writeValue(chunk);
      }
    })();

    const timeoutOp = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Limit czasu wysyłki Bluetooth (timeout)")), 3000)
    );

    await Promise.race([writeOp, timeoutOp]);
    await new Promise(r => setTimeout(r, 15));
  }
}

// ================= ZAPIS PRZEDMIOTU I WYDRUK =================
async function handleSaveAndPrint() {
  const category = (document.getElementById("inputCategory")?.value || "").trim();
  const brand = (document.getElementById("inputBrand")?.value || "").trim();
  const rodzaj = (document.getElementById("inputRodzaj")?.value || "").trim();
  const size = (document.getElementById("inputSize")?.value || "").trim();
  const condition = (document.getElementById("inputCondition")?.value || "").trim();
  const opis = (document.getElementById("inputOpis")?.value || "").trim();
  const buyPrice = (document.getElementById("inputBuyPrice")?.value || "").trim();
  const sellPrice = (document.getElementById("inputSellPrice")?.value || "").trim();

  if (!brand || !rodzaj || !sellPrice) {
    alert("Wypełnij wymagane pola: Marka, Rodzaj sprzętu oraz Cena sprzedaży!");
    return;
  }

  // Zapisz wpisane wartości do lokalnych słowników jeśli są nowe
  if (category && !AppState.dictionaries.categories.includes(category)) {
    AppState.dictionaries.categories.push(category);
  }
  if (brand && !AppState.dictionaries.brands.includes(brand)) {
    AppState.dictionaries.brands.push(brand);
  }
  const currentCat = category || "Inne";
  if (!AppState.dictionaries.categoryRodzaje[currentCat]) {
    AppState.dictionaries.categoryRodzaje[currentCat] = [];
  }
  if (rodzaj && !AppState.dictionaries.categoryRodzaje[currentCat].includes(rodzaj)) {
    AppState.dictionaries.categoryRodzaje[currentCat].push(rodzaj);
  }
  if (!AppState.dictionaries.rodzajRozmiary[rodzaj]) {
    AppState.dictionaries.rodzajRozmiary[rodzaj] = [];
  }
  if (size && !AppState.dictionaries.rodzajRozmiary[rodzaj].includes(size)) {
    AppState.dictionaries.rodzajRozmiary[rodzaj].push(size);
  }
  if (condition && !AppState.dictionaries.conditions.includes(condition)) {
    AppState.dictionaries.conditions.push(condition);
  }
  saveDictionaries();

  const btn = document.getElementById("btnSaveAndPrint");
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = `<span>⏳ Zapisywanie...</span>`;

  try {
    let newItemId = "SP-" + Math.floor(10000 + Math.random() * 90000); // Awaryjny ID offline
    const todayDate = getTodayDate();

    // 1. Wysyłka do Google Sheets jeśli podano URL (arkusz Magazyn + auto dodanie do Slowniki)
    if (AppState.scriptUrl) {
      showToast("Wysyłanie do Google Sheets...");
      const response = await fetch(AppState.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "add_item",
          category: category,
          brand: brand,
          rodzaj: rodzaj,
          size: size,
          condition: condition,
          opis: opis,
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          date: todayDate
        })
      });

      const resJson = await response.json();
      if (resJson.success && resJson.id) {
        newItemId = resJson.id;
      }
    }

    const itemData = {
      id: newItemId,
      category: category,
      brand: brand,
      rodzaj: rodzaj,
      size: size,
      condition: condition,
      opis: opis,
      buyPrice: buyPrice,
      price: sellPrice,
      sellPrice: sellPrice,
      status: "Dostępny",
      date: todayDate
    };

    // 2. Drukowanie przez Bluetooth w trybie graficznym (BITMAP)
    if (AppState.isPrinterConnected) {
      showToast(`Generowanie etykiety dla ${newItemId}...`);
      const tsplBytes = await generateTsplBitmapPayload(itemData);
      showToast(`Drukowanie etykiety dla ${newItemId}...`);
      await sendRawTsplToPrinter(tsplBytes);
      showToast(`Wydrukowano etykietę: ${newItemId}! 🎉`, 3000);
    } else {
      showToast(`Zapisano ${newItemId}! (Drukarka rozłączona - wydruk pominięty)`, 4000);
    }

    // 3. Czyszczenie pól formularza
    document.getElementById("inputBrand").value = "";
    document.getElementById("inputRodzaj").value = "";
    document.getElementById("inputSize").value = "";
    document.getElementById("inputOpis").value = "";
    document.getElementById("inputBuyPrice").value = "";
    document.getElementById("inputSellPrice").value = "";
    updateLabelPreview();
    document.getElementById("inputBrand").focus();

  } catch (err) {
    console.error(err);
    alert("Wystąpił błąd: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ================= SKANER QR I OBSŁUGA SPRZEDAŻY =================
function initScannerEvents() {
  document.getElementById("btnToggleCamera").addEventListener("click", () => {
    if (AppState.isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  });

  document.getElementById("btnManualSearch").addEventListener("click", () => {
    const val = document.getElementById("manualIdInput").value.trim();
    if (val) handleQrCodeScanned(val);
  });

  document.getElementById("btnMarkAsSold").addEventListener("click", handleMarkAsSold);
  document.getElementById("btnReprintLabel").addEventListener("click", handleReprintCurrentItem);
}

async function startCamera() {
  if (AppState.isCameraActive) return;

  try {
    const qrDiv = document.getElementById("qrReader");
    if (!AppState.html5QrCode) {
      AppState.html5QrCode = new Html5Qrcode("qrReader");
    }

    await AppState.html5QrCode.start(
      { facingMode: "environment" }, // Tylny aparat
      {
        fps: 10,
        qrbox: { width: 220, height: 220 }
      },
      (decodedText) => {
        // Pomyślny odczyt kodu QR
        handleQrCodeScanned(decodedText);
      },
      (error) => {
        // Ignoruj błędy klatki bez kodu
      }
    );

    AppState.isCameraActive = true;
    document.getElementById("cameraBtnText").textContent = "⏹️ Wyłącz aparat";
  } catch (err) {
    console.error("Błąd kamery:", err);
    showToast("Nie udało się uruchomić aparatu: " + err.message);
  }
}

async function stopCamera() {
  if (!AppState.isCameraActive || !AppState.html5QrCode) return;
  try {
    await AppState.html5QrCode.stop();
    AppState.isCameraActive = false;
    document.getElementById("cameraBtnText").textContent = "📷 Uruchom aparat";
  } catch (err) {
    console.error(err);
  }
}

// Obsługa zeskanowanego ID
async function handleQrCodeScanned(rawCode) {
  // Wyciągnij ID przedmiotu (jeśli kod zawiera np. URL lub sam numer)
  let cleanId = rawCode.trim();
  const match = cleanId.match(/SP-\d+/i);
  if (match) cleanId = match[0].toUpperCase();

  showToast(`Zeskanowano: ${cleanId}. Pobieranie danych...`);

  if (!AppState.scriptUrl) {
    displayItemCard({
      id: cleanId,
      category: "Narciarstwo",
      brand: "Salomon",
      rodzaj: "Narty",
      size: "165 cm",
      condition: "Po serwisie",
      opis: "Przykładowy opis (Brak URL Google Sheets)",
      buyPrice: "300",
      sellPrice: "500",
      status: "Dostępny",
      date: getTodayDate()
    });
    return;
  }

  try {
    const url = `${AppState.scriptUrl}?action=get_item&id=${encodeURIComponent(cleanId)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.item) {
      displayItemCard(data.item);
    } else {
      alert("Nie znaleziono w bazie przedmiotu o ID: " + cleanId);
    }
  } catch (err) {
    alert("Błąd pobierania danych: " + err.message);
  }
}

function displayItemCard(item) {
  AppState.currentItem = item;
  const card = document.getElementById("itemCard");
  card.classList.remove("hidden");

  const brandPrefix = item.brand ? item.brand + " " : "";
  const titleText = (brandPrefix + (item.rodzaj ? item.rodzaj + (item.opis ? " " + item.opis : "") : item.model)) || item.id;

  document.getElementById("cardItemId").textContent = item.id;
  document.getElementById("cardItemDate").textContent = item.date || item.dateIntake || "";
  document.getElementById("cardItemTitle").textContent = titleText;
  document.getElementById("cardItemCategory").textContent = item.category || "-";
  const cardBrand = document.getElementById("cardItemBrand");
  if (cardBrand) cardBrand.textContent = item.brand || "-";
  document.getElementById("cardItemRodzaj").textContent = item.rodzaj || "-";
  document.getElementById("cardItemSize").textContent = item.size || "-";
  document.getElementById("cardItemCondition").textContent = item.condition || "-";

  const cardOpis = document.getElementById("cardItemOpis");
  if (cardOpis) cardOpis.textContent = item.opis || "-";

  const cardBuyPrice = document.getElementById("cardItemBuyPrice");
  if (cardBuyPrice) cardBuyPrice.textContent = item.buyPrice ? `${item.buyPrice} PLN` : "-";

  const cardPrice = document.getElementById("cardItemPrice");
  if (cardPrice) cardPrice.textContent = `${item.sellPrice || item.price || 0} PLN`;

  const boxSoldDate = document.getElementById("boxItemSoldDate");
  const cardSoldDate = document.getElementById("cardItemSoldDate");
  const isSold = (item.status || "").toLowerCase() === "sprzedany";
  if (isSold && (item.soldDate || item.dateSold)) {
    if (boxSoldDate) boxSoldDate.classList.remove("hidden");
    if (cardSoldDate) cardSoldDate.textContent = item.soldDate || item.dateSold;
  } else {
    if (boxSoldDate) boxSoldDate.classList.add("hidden");
  }

  const badge = document.getElementById("cardStatusBadge");
  const btnSell = document.getElementById("btnMarkAsSold");

  if (isSold) {
    badge.textContent = "Sprzedany";
    badge.className = "card-status-pill sold";
    btnSell.disabled = true;
    btnSell.textContent = "✓ JUŻ SPRZEDANE";
  } else {
    badge.textContent = "Dostępny";
    badge.className = "card-status-pill available";
    btnSell.disabled = false;
    btnSell.textContent = "🛒 OZNACZ JAKO SPRZEDANE";
  }

  // Przewiń stronę do karty przedmiotu
  card.scrollIntoView({ behavior: "smooth" });
}

async function handleMarkAsSold() {
  if (!AppState.currentItem) return;
  const id = AppState.currentItem.id;

  if (!confirm(`Czy na pewno oznaczyć ${id} jako SPRZEDANY?`)) return;

  const btnSell = document.getElementById("btnMarkAsSold");
  btnSell.disabled = true;
  btnSell.textContent = "Zapisywanie w arkuszu...";

  try {
    if (AppState.scriptUrl) {
      const response = await fetch(AppState.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "sell_item",
          id: id
        })
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
    }

    AppState.currentItem.status = "Sprzedany";
    displayItemCard(AppState.currentItem);
    showToast(`Przedmiot ${id} został oznaczony jako SPRZEDANY! 💰`, 3000);

  } catch (err) {
    alert("Błąd oznaczania sprzedaży: " + err.message);
    btnSell.disabled = false;
    btnSell.textContent = "🛒 OZNACZ JAKO SPRZEDANE";
  }
}

async function handleReprintCurrentItem() {
  if (!AppState.currentItem) return;
  const it = AppState.currentItem;
  try {
    showToast("Generowanie i drukowanie etykiety...");
    const tsplBytes = await generateTsplBitmapPayload(it);
    await sendRawTsplToPrinter(tsplBytes);
    showToast("Etykieta wydrukowana!");
  } catch (err) {
    alert(err.message);
  }
}

// ================= MODAL USTAWIEŃ =================
function initSettingsModal() {
  const modal = document.getElementById("settingsModal");
  const btnOpen = document.getElementById("btnOpenSettings");
  const btnClose = document.getElementById("btnCloseSettings");
  const btnSave = document.getElementById("btnSaveSettings");
  const inputUrl = document.getElementById("settingScriptUrl");

  btnOpen.addEventListener("click", () => {
    inputUrl.value = AppState.scriptUrl;
    modal.classList.remove("hidden");
  });

  btnClose.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  btnSave.addEventListener("click", () => {
    AppState.scriptUrl = inputUrl.value.trim();
    localStorage.setItem("sport_script_url", AppState.scriptUrl);
    modal.classList.add("hidden");
    showToast("Zapisano ustawienia!");
  });

  // Główny test graficzny (BITMAP - niezależny od czcionek w ROM drukarki)
  const btnBitmap = document.getElementById("btnTestBitmap");
  if (btnBitmap) {
    btnBitmap.addEventListener("click", async () => {
      try {
        showToast("Generowanie grafiki etykiety (BITMAP)...");
        const sampleData = {
          id: "SP-00001",
          category: "Narciarstwo",
          brand: "Salomon",
          rodzaj: "Narty",
          size: "165 cm",
          condition: "Ślizgi po serwisie",
          opis: "X-Drive 8.0 z wiązaniami",
          buyPrice: "400",
          price: "650",
          sellPrice: "650",
          status: "Dostępny",
          date: getTodayDate()
        };
        const payload = await generateTsplBitmapPayload(sampleData);
        showToast("Wysyłanie pikseli do głowicy...");
        await sendRawTsplToPrinter(payload);
        showToast("Wydruk BITMAP wysłany! Sprawdź etykietę ✅", 3000);
      } catch (err) {
        alert("Błąd testu BITMAP: " + err.message);
      }
    });
  }

  // Test A: TSPL (Standard DIRECTION 0 - bez obracania)
  const btnTspl0 = document.getElementById("btnTestTspl0");
  if (btnTspl0) {
    btnTspl0.addEventListener("click", async () => {
      try {
        showToast("Wysyłanie Testu A (TSPL DIRECTION 0)...");
        const lines = [
          "SIZE 48 mm,30 mm",
          "GAP 2 mm,0 mm",
          "DENSITY 15",
          "DIRECTION 0",
          "CLS",
          "BOX 5,5,375,225,4",
          `TEXT 20,25,"3",0,1,1,"ZENWIRE TSPL TEST"`,
          `QRCODE 25,65,L,4,A,0,"SP-00001"`,
          `TEXT 160,75,"3",0,1,1,"ID: SP-00001"`,
          `TEXT 160,115,"2",0,1,1,"Narty Salomon"`,
          `TEXT 160,155,"3",0,1,1,"CENA: 650 PLN"`,
          "PRINT 1",
          ""
        ];
        await sendRawTsplToPrinter(new TextEncoder().encode(lines.join("\r\n")));
        showToast("Test A (TSPL) wysłany! ✅");
      } catch (err) {
        alert("Błąd Testu A: " + err.message);
      }
    });
  }

  // Test B: CPCL (Często domyślny protokół mobilnych drukarek etykiet Zebra / HPRT)
  const btnCpcl = document.getElementById("btnTestCpcl");
  if (btnCpcl) {
    btnCpcl.addEventListener("click", async () => {
      try {
        showToast("Wysyłanie Testu B (CPCL)...");
        const lines = [
          "! 0 200 200 240 1",
          "PAGE-WIDTH 384",
          "BOX 5 5 375 225 4",
          "TEXT 4 0 20 25 TEST CPCL ZENWIRE",
          "B QR 25 75 M 2 U 4",
          "MA,SP-00001",
          "ENDQR",
          "TEXT 4 0 160 80 ID: SP-00001",
          "TEXT 4 0 160 120 CENA: 650 PLN",
          "FORM",
          "PRINT",
          ""
        ];
        await sendRawTsplToPrinter(new TextEncoder().encode(lines.join("\r\n")));
        showToast("Test B (CPCL) wysłany! Sprawdź etykietę ✅");
      } catch (err) {
        alert("Błąd Testu B: " + err.message);
      }
    });
  }

  // Testowy wydruk w uniwersalnym trybie paragonowym (ESC/POS)
  const btnEscPos = document.getElementById("btnTestEscPos");
  if (btnEscPos) {
    btnEscPos.addEventListener("click", async () => {
      try {
        showToast("Wysyłanie testu tekstowego ESC/POS...");
        const encoder = new TextEncoder();
        const escPosData = [
          0x1B, 0x40,       // ESC @ (Inicjalizacja drukarki)
          0x1B, 0x61, 0x01, // Wyśrodkowanie tekstu
          0x1D, 0x21, 0x11, // Podwójny rozmiar czcionki
          ...Array.from(encoder.encode("ZENWIRE TP-210\r\n")),
          0x1D, 0x21, 0x00, // Zwykły rozmiar czcionki
          ...Array.from(encoder.encode("TEST TRYBU ESC/POS OK!\r\n")),
          ...Array.from(encoder.encode("Drukarka termiczna dziala!\r\n")),
          0x0A, 0x0A, 0x0A  // Wysuw 3 linii
        ];
        await sendRawTsplToPrinter(new Uint8Array(escPosData));
        showToast("Test ESC/POS wysłany! ✅");
      } catch (err) {
        alert("Błąd testu ESC/POS: " + err.message);
      }
    });
  }

  // Pobranie słowników z Google Sheets
  document.getElementById("btnSyncDictionaries").addEventListener("click", async () => {
    if (!AppState.scriptUrl) {
      alert("Najpierw podaj URL do Google Apps Script!");
      return;
    }
    try {
      showToast("Pobieranie słowników z arkusza...");
      const res = await fetch(`${AppState.scriptUrl}?action=get_dictionaries`);
      const data = await res.json();
      if (data.success && data.dictionaries) {
        AppState.dictionaries = {
          categories: (data.dictionaries.categories && data.dictionaries.categories.length)
            ? data.dictionaries.categories
            : AppState.dictionaries.categories,
          brands: (data.dictionaries.brands && data.dictionaries.brands.length)
            ? data.dictionaries.brands
            : AppState.dictionaries.brands,
          categoryRodzaje: (data.dictionaries.categoryRodzaje && Object.keys(data.dictionaries.categoryRodzaje).length)
            ? data.dictionaries.categoryRodzaje
            : AppState.dictionaries.categoryRodzaje,
          rodzajRozmiary: (data.dictionaries.rodzajRozmiary && Object.keys(data.dictionaries.rodzajRozmiary).length)
            ? data.dictionaries.rodzajRozmiary
            : AppState.dictionaries.rodzajRozmiary,
          conditions: (data.dictionaries.conditions && data.dictionaries.conditions.length)
            ? data.dictionaries.conditions
            : AppState.dictionaries.conditions
        };
        saveDictionaries();
        initComboboxes();
        showToast("Słowniki zaktualizowane pomyślnie z Google Sheets! 🔄");
      }
    } catch (err) {
      alert("Błąd synchronizacji: " + err.message);
    }
  });
}

// ================= EDYTOR SZABLONÓW ETYKIET =================
function initTemplateEditor() {
  const canvas = document.getElementById("templateEditorCanvas");
  if (!canvas) return;

  // Zainicjalizuj szablon edytora jako głęboką kopię aktywnego szablonu
  const currentActive = getActiveTemplate();
  AppState.editorTemplate = JSON.parse(JSON.stringify(currentActive));

  function updateEditorToggles() {
    const borderStatus = document.getElementById("labelBorderStatus");
    if (borderStatus && AppState.editorTemplate) borderStatus.textContent = AppState.editorTemplate.hasBorder ? "WŁ" : "WYŁ";
    const qrStatus = document.getElementById("labelQrStatus");
    if (qrStatus && AppState.editorTemplate) qrStatus.textContent = AppState.editorTemplate.hasQr ? "WŁ" : "WYŁ";
  }

  // Zsynchronizuj selecty szablonów
  populateTemplateSelects();
  updateEditorToggles();

  // Zdarzenia wyboru szablonu w edytorze
  const selectEditor = document.getElementById("selectEditorTemplate");
  if (selectEditor) {
    selectEditor.addEventListener("change", (e) => {
      const found = AppState.templates.find(t => t.id === e.target.value);
      if (found) {
        AppState.editorTemplate = JSON.parse(JSON.stringify(found));
        AppState.selectedElementId = null;
        updateEditorToggles();
        updateInspectorUI();
        renderEditorCanvas();
      }
    });
  }

  // Zmiana nazwy szablonu
  const inputName = document.getElementById("inputTemplateName");
  if (inputName) {
    inputName.value = AppState.editorTemplate.name || "";
    inputName.addEventListener("input", (e) => {
      AppState.editorTemplate.name = e.target.value;
    });
  }

  // Zapisz szablon
  document.getElementById("btnSaveTemplate").addEventListener("click", () => {
    // Zachowaj referencje do _imgObj
    const imgObjMap = new Map();
    AppState.editorTemplate.elements.forEach(el => {
      if (el.type === "image" && el._imgObj) {
        imgObjMap.set(el.id, el._imgObj);
      }
    });

    const savedTemplate = JSON.parse(JSON.stringify(AppState.editorTemplate));

    const idx = AppState.templates.findIndex(t => t.id === AppState.editorTemplate.id);
    if (idx !== -1) {
      AppState.templates[idx] = savedTemplate;
    } else {
      AppState.templates.push(savedTemplate);
    }

    // Przywróć referencje _imgObj do szablonów w pamięci
    const targetTpl = AppState.templates[idx !== -1 ? idx : AppState.templates.length - 1];
    targetTpl.elements.forEach(el => {
      if (imgObjMap.has(el.id)) el._imgObj = imgObjMap.get(el.id);
    });
    AppState.editorTemplate.elements.forEach(el => {
      if (imgObjMap.has(el.id)) el._imgObj = imgObjMap.get(el.id);
    });

    // Ustaw od razu ten szablon jako aktywny do drukowania na przyjęciu
    AppState.activeTemplateId = AppState.editorTemplate.id;
    try {
      localStorage.setItem("sport_templates", JSON.stringify(AppState.templates));
      localStorage.setItem("sport_active_template_id", AppState.activeTemplateId);
    } catch (e) {
      console.error("Błąd zapisu w localStorage:", e);
    }

    populateTemplateSelects();
    updateLabelPreview();
    showToast(`Zapisano i aktywowano szablon "${AppState.editorTemplate.name}"! 💾`);
  });

  // Nowy pusty szablon
  document.getElementById("btnNewTemplate").addEventListener("click", () => {
    const newId = "tpl_" + Date.now();
    const newTpl = {
      id: newId,
      name: "Nowy szablon",
      hasBorder: true,
      hasQr: true,
      qrX: 15,
      qrY: 52,
      qrSize: 135,
      elements: [
        { id: "el_1", type: "text", text: "ID: {ID}", x: 15, y: 36, fontSize: 22, bold: true },
        { id: "el_2", type: "text", text: "{MODEL}", x: 160, y: 75, fontSize: 22, bold: true },
        { id: "el_3", type: "text", text: "CENA: {CENA} PLN", x: 160, y: 175, fontSize: 26, bold: true }
      ]
    };
    AppState.templates.push(newTpl);
    AppState.editorTemplate = JSON.parse(JSON.stringify(newTpl));
    AppState.activeTemplateId = newId;
    localStorage.setItem("sport_templates", JSON.stringify(AppState.templates));
    localStorage.setItem("sport_active_template_id", newId);
    populateTemplateSelects();
    renderEditorCanvas();
    showToast("Utworzono nowy szablon!");
  });

  // Usuń szablon
  document.getElementById("btnDeleteTemplate").addEventListener("click", () => {
    if (AppState.templates.length <= 1) {
      alert("Musisz posiadać przynajmniej jeden szablon!");
      return;
    }
    if (!confirm(`Czy na pewno usunąć szablon "${AppState.editorTemplate.name}"?`)) return;

    AppState.templates = AppState.templates.filter(t => t.id !== AppState.editorTemplate.id);
    AppState.activeTemplateId = AppState.templates[0].id;
    AppState.editorTemplate = JSON.parse(JSON.stringify(AppState.templates[0]));
    localStorage.setItem("sport_templates", JSON.stringify(AppState.templates));
    localStorage.setItem("sport_active_template_id", AppState.activeTemplateId);
    populateTemplateSelects();
    renderEditorCanvas();
    updateLabelPreview();
    showToast("Szablon usunięty!");
  });

  // Narzędzia: Dodaj tekst
  document.getElementById("btnAddTextElement").addEventListener("click", () => {
    const newEl = {
      id: "el_" + Date.now(),
      type: "text",
      text: "Nowy tekst",
      x: 30,
      y: 100,
      fontSize: 20,
      bold: false
    };
    AppState.editorTemplate.elements.push(newEl);
    AppState.selectedElementId = newEl.id;
    updateInspectorUI();
    renderEditorCanvas();
  });

  // Narzędzia: Przełącznik ramki
  document.getElementById("btnToggleBorder").addEventListener("click", () => {
    AppState.editorTemplate.hasBorder = !AppState.editorTemplate.hasBorder;
    document.getElementById("labelBorderStatus").textContent = AppState.editorTemplate.hasBorder ? "WŁ" : "WYŁ";
    renderEditorCanvas();
  });

  // Narzędzia: Przełącznik kodu QR
  document.getElementById("btnToggleQr").addEventListener("click", () => {
    AppState.editorTemplate.hasQr = !AppState.editorTemplate.hasQr;
    document.getElementById("labelQrStatus").textContent = AppState.editorTemplate.hasQr ? "WŁ" : "WYŁ";
    renderEditorCanvas();
  });

  // Narzędzia: Wgrywanie obrazka
  const fileInput = document.getElementById("fileImageUpload");
  document.getElementById("btnAddImageElement").addEventListener("click", () => {
    AppState.selectedElementId = null;
    fileInput.click();
  });
  document.getElementById("btnChangeImageFile").addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Skalowanie proporcjonalne do maks. 120 px szerokości
        let w = img.width;
        let h = img.height;
        const maxW = 120;
        const maxH = 80;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        w = Math.max(20, w);
        h = Math.max(20, h);

        // Konwertuj obraz do ostrych czarno-białych pikseli (monochrom)
        const procCanvas = document.createElement("canvas");
        procCanvas.width = w;
        procCanvas.height = h;
        const procCtx = procCanvas.getContext("2d");
        procCtx.drawImage(img, 0, 0, w, h);
        const imgData = procCtx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 128) {
            d[i] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
            d[i + 3] = 255;
          } else {
            const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
            const val = lum < 150 ? 0 : 255;
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
            d[i + 3] = 255;
          }
        }
        procCtx.putImageData(imgData, 0, 0);
        const monoDataUrl = procCanvas.toDataURL("image/png");

        const preloadedImg = new Image();
        preloadedImg.onload = () => {
          if (AppState.selectedElementId && AppState.selectedElementId.startsWith("img_")) {
            // Zmiana istniejącego
            const existing = AppState.editorTemplate.elements.find(el => el.id === AppState.selectedElementId);
            if (existing) {
              existing.dataUrl = monoDataUrl;
              existing._imgObj = preloadedImg;
              existing.width = w;
              existing.height = h;
            }
          } else {
            // Dodaj nowy
            const newImgEl = {
              id: "img_" + Date.now(),
              type: "image",
              dataUrl: monoDataUrl,
              _imgObj: preloadedImg,
              x: 20,
              y: 20,
              width: w,
              height: h
            };
            AppState.editorTemplate.elements.push(newImgEl);
            AppState.selectedElementId = newImgEl.id;
          }

          updateInspectorUI();
          renderEditorCanvas();
        };
        preloadedImg.src = monoDataUrl;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = "";
  });

  // Inspektor: Zdarzenia pól
  setupInspectorListeners();

  // Obsługa przeciągania myszą / palcem po Canvasie
  setupCanvasPointerEvents(canvas);

  // Wydruk testowy szablonu
  document.getElementById("btnPrintTemplateTest").addEventListener("click", async () => {
    try {
      showToast("Wysyłanie wydruku szablonu do Zenwire...");
      const sampleData = {
        id: "SP-SZABLON",
        category: "Narciarstwo",
        brand: "Salomon",
        rodzaj: "Narty",
        size: "165 cm",
        condition: "Po serwisie",
        opis: "X-Drive 8.0 z wiązaniami",
        buyPrice: "400",
        price: "650",
        sellPrice: "650",
        status: "Dostępny",
        date: getTodayDate()
      };
      const payload = await generateTsplBitmapPayload(sampleData, AppState.editorTemplate);
      await sendRawTsplToPrinter(payload);
      showToast("Szablon wydrukowany! ✅");
    } catch (err) {
      alert("Błąd wydruku szablonu: " + err.message);
    }
  });

  // Pierwszy render
  renderEditorCanvas();
}

function populateTemplateSelects() {
  const selectEditor = document.getElementById("selectEditorTemplate");
  const selectActive = document.getElementById("selectActiveTemplate");
  if (!selectEditor || !selectActive) return;

  selectEditor.innerHTML = "";
  selectActive.innerHTML = "";

  AppState.templates.forEach(t => {
    const opt1 = document.createElement("option");
    opt1.value = t.id;
    opt1.textContent = t.name;
    if (AppState.editorTemplate && AppState.editorTemplate.id === t.id) opt1.selected = true;
    selectEditor.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = t.id;
    opt2.textContent = t.name;
    if (AppState.activeTemplateId === t.id) opt2.selected = true;
    selectActive.appendChild(opt2);
  });

  const inputName = document.getElementById("inputTemplateName");
  if (inputName && AppState.editorTemplate) {
    inputName.value = AppState.editorTemplate.name;
  }
}

async function renderEditorCanvas() {
  const canvas = document.getElementById("templateEditorCanvas");
  if (!canvas || !AppState.editorTemplate) return;

  const sampleData = {
    id: "SP-00042",
    category: "Narciarstwo",
    brand: "Salomon",
    rodzaj: "Narty",
    size: "165 cm",
    condition: "Po serwisie",
    opis: "X-Drive 8.0 z wiązaniami",
    buyPrice: "400",
    price: "650",
    sellPrice: "650",
    status: "Dostępny",
    date: getTodayDate()
  };

  await preloadTemplateImages(AppState.editorTemplate);
  renderTemplateToCanvas(canvas, AppState.editorTemplate, sampleData, true);
}

function updateInspectorUI() {
  const card = document.getElementById("inspectorCard");
  const textControls = document.getElementById("inspectorTextControls");
  const imageControls = document.getElementById("inspectorImageControls");
  const qrControls = document.getElementById("inspectorQrControls");
  const title = document.getElementById("inspectorTitle");

  if (!AppState.selectedElementId) {
    card.style.opacity = "0.5";
    card.style.pointerEvents = "none";
    title.textContent = "Brak zaznaczonego elementu (kliknij na etykiecie)";
    return;
  }

  card.style.opacity = "1";
  card.style.pointerEvents = "auto";

  if (AppState.selectedElementId === "__qr") {
    title.textContent = "Edycja: Kod QR";
    textControls.classList.add("hidden");
    imageControls.classList.add("hidden");
    qrControls.classList.remove("hidden");
    document.getElementById("propQrSize").value = AppState.editorTemplate.qrSize || 135;
    document.getElementById("propCoordX").value = AppState.editorTemplate.qrX !== undefined ? AppState.editorTemplate.qrX : 15;
    document.getElementById("propCoordY").value = AppState.editorTemplate.qrY !== undefined ? AppState.editorTemplate.qrY : 52;
    return;
  }

  const el = AppState.editorTemplate.elements.find(e => e.id === AppState.selectedElementId);
  if (!el) return;

  document.getElementById("propCoordX").value = el.x;
  document.getElementById("propCoordY").value = el.y;

  if (el.type === "text") {
    title.textContent = "Edycja: Tekst / Zmienna";
    textControls.classList.remove("hidden");
    imageControls.classList.add("hidden");
    qrControls.classList.add("hidden");

    document.getElementById("propTextContent").value = el.text;
    document.getElementById("propFontSize").value = el.fontSize || 20;
    document.getElementById("propFontBold").checked = !!el.bold;
  } else if (el.type === "image") {
    title.textContent = "Edycja: Logo / Grafika";
    textControls.classList.add("hidden");
    imageControls.classList.remove("hidden");
    qrControls.classList.add("hidden");

    document.getElementById("propImgWidth").value = el.width;
    document.getElementById("propImgHeight").value = el.height;
  }
}

function setupInspectorListeners() {
  // Zmiana tekstu
  const textInput = document.getElementById("propTextContent");
  textInput.addEventListener("input", (e) => {
    const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
    if (el && el.type === "text") {
      el.text = e.target.value;
      renderEditorCanvas();
    }
  });

  // Dodawanie tagów (+{ID}, +{CENA} itp.)
  document.querySelectorAll(".tag-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const tag = pill.dataset.tag;
      const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
      if (el && el.type === "text") {
        textInput.value += (textInput.value ? " " : "") + tag;
        el.text = textInput.value;
        renderEditorCanvas();
      }
    });
  });

  // Rozmiar czcionki
  document.getElementById("propFontSize").addEventListener("input", (e) => {
    const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
    if (el && el.type === "text") {
      el.fontSize = parseInt(e.target.value, 10) || 20;
      renderEditorCanvas();
    }
  });

  // Pogrubienie
  document.getElementById("propFontBold").addEventListener("change", (e) => {
    const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
    if (el && el.type === "text") {
      el.bold = e.target.checked;
      renderEditorCanvas();
    }
  });

  // Wymiary obrazka
  document.getElementById("propImgWidth").addEventListener("input", (e) => {
    const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
    if (el && el.type === "image") {
      el.width = parseInt(e.target.value, 10) || 50;
      renderEditorCanvas();
    }
  });
  document.getElementById("propImgHeight").addEventListener("input", (e) => {
    const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
    if (el && el.type === "image") {
      el.height = parseInt(e.target.value, 10) || 50;
      renderEditorCanvas();
    }
  });

  // Rozmiar QR
  document.getElementById("propQrSize").addEventListener("input", (e) => {
    if (AppState.selectedElementId === "__qr") {
      AppState.editorTemplate.qrSize = parseInt(e.target.value, 10) || 135;
      renderEditorCanvas();
    }
  });

  // Współrzędne X / Y
  document.getElementById("propCoordX").addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    if (AppState.selectedElementId === "__qr") {
      AppState.editorTemplate.qrX = val;
    } else {
      const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
      if (el) el.x = val;
    }
    renderEditorCanvas();
  });
  document.getElementById("propCoordY").addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    if (AppState.selectedElementId === "__qr") {
      AppState.editorTemplate.qrY = val;
    } else {
      const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
      if (el) el.y = val;
    }
    renderEditorCanvas();
  });

  // Usunięcie elementu
  document.getElementById("btnDeleteElement").addEventListener("click", () => {
    if (!AppState.selectedElementId) return;
    if (AppState.selectedElementId === "__qr") {
      AppState.editorTemplate.hasQr = false;
      document.getElementById("labelQrStatus").textContent = "WYŁ";
      AppState.selectedElementId = null;
    } else {
      AppState.editorTemplate.elements = AppState.editorTemplate.elements.filter(x => x.id !== AppState.selectedElementId);
      AppState.selectedElementId = null;
    }
    updateInspectorUI();
    renderEditorCanvas();
  });

  // Obsługa przycisków precyzyjnego przesuwania (Nudge)
  document.querySelectorAll(".btn-nudge").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!AppState.selectedElementId) return;

      const nudgeX = parseInt(btn.dataset.nudgeX, 10) || 0;
      const nudgeY = parseInt(btn.dataset.nudgeY, 10) || 0;

      if (AppState.selectedElementId === "__qr") {
        if (nudgeX) AppState.editorTemplate.qrX = Math.max(0, Math.min(384 - (AppState.editorTemplate.qrSize || 135), (AppState.editorTemplate.qrX || 0) + nudgeX));
        if (nudgeY) AppState.editorTemplate.qrY = Math.max(0, Math.min(240 - (AppState.editorTemplate.qrSize || 135), (AppState.editorTemplate.qrY || 0) + nudgeY));
        const cx = document.getElementById("propCoordX");
        const cy = document.getElementById("propCoordY");
        if (cx) cx.value = AppState.editorTemplate.qrX;
        if (cy) cy.value = AppState.editorTemplate.qrY;
      } else {
        const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
        if (el) {
          if (nudgeX) el.x = Math.max(0, Math.min(380, el.x + nudgeX));
          if (nudgeY) el.y = Math.max(10, Math.min(235, el.y + nudgeY));
          const cx = document.getElementById("propCoordX");
          const cy = document.getElementById("propCoordY");
          if (cx) cx.value = el.x;
          if (cy) cy.value = el.y;
        }
      }

      renderEditorCanvas();
    });
  });
}

function setupCanvasPointerEvents(canvas) {
  let pendingDrag = false;
  let isDragging = false;
  let dragStartPos = { x: 0, y: 0 };
  let initialElemPos = { x: 0, y: 0 };
  const DRAG_THRESHOLD = 8; // Wymagany ruch min. 8px, by uznać to za przeciąganie, a nie zwykłe tapnięcie

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    let cx = e.clientX;
    let cy = e.clientY;
    if (cx === undefined && e.touches && e.touches[0]) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    }
    const scaleX = 384 / rect.width;
    const scaleY = 240 / rect.height;
    return {
      x: (cx - rect.left) * scaleX,
      y: (cy - rect.top) * scaleY
    };
  }

  function handlePointerDown(e) {
    if (e.cancelable) e.preventDefault();

    const pos = getCanvasCoords(e);
    const tpl = AppState.editorTemplate;
    if (!tpl) return;

    let hitId = null;

    // 1. Sprawdź elementy tekstowe i obrazy (od wierzchu do spodu)
    const ctx = canvas.getContext("2d");
    for (let i = tpl.elements.length - 1; i >= 0; i--) {
      const el = tpl.elements[i];
      if (el.type === "text") {
        ctx.font = (el.bold ? "bold " : "") + (el.fontSize || 20) + "px Arial, sans-serif";
        const w = ctx.measureText(el.text).width;
        const h = el.fontSize || 20;
        // Bounding box z tolerancją na palec (+8px)
        if (pos.x >= el.x - 8 && pos.x <= el.x + w + 8 && pos.y >= el.y - h - 8 && pos.y <= el.y + 8) {
          hitId = el.id;
          initialElemPos = { x: el.x, y: el.y };
          break;
        }
      } else if (el.type === "image") {
        if (pos.x >= el.x - 6 && pos.x <= el.x + el.width + 6 && pos.y >= el.y - 6 && pos.y <= el.y + el.height + 6) {
          hitId = el.id;
          initialElemPos = { x: el.x, y: el.y };
          break;
        }
      }
    }

    // 2. Jeśli nie trafiono w element, sprawdź kod QR
    if (!hitId && tpl.hasQr) {
      const qrX = tpl.qrX !== undefined ? tpl.qrX : 15;
      const qrY = tpl.qrY !== undefined ? tpl.qrY : 52;
      const qrSize = tpl.qrSize || 135;
      if (pos.x >= qrX - 6 && pos.x <= qrX + qrSize + 6 && pos.y >= qrY - 6 && pos.y <= qrY + qrSize + 6) {
        hitId = "__qr";
        initialElemPos = { x: qrX, y: qrY };
      }
    }

    AppState.selectedElementId = hitId;
    updateInspectorUI();
    renderEditorCanvas();

    if (hitId) {
      pendingDrag = true;
      isDragging = false;
      dragStartPos = { x: pos.x, y: pos.y };

      // Przechwycenie zdarzeń wskaźnika – blokuje scrollowanie całej strony
      if (canvas.setPointerCapture && e.pointerId !== undefined) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    } else {
      pendingDrag = false;
      isDragging = false;
    }
  }

  function handlePointerMove(e) {
    if (!pendingDrag || !AppState.selectedElementId) return;
    if (e.cancelable) e.preventDefault();

    const pos = getCanvasCoords(e);
    const deltaX = pos.x - dragStartPos.x;
    const deltaY = pos.y - dragStartPos.y;

    // Przeciąganie rozpoczyna się tylko jeśli palec przesunął się o więcej niż DRAG_THRESHOLD
    if (!isDragging) {
      if (Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
        isDragging = true;
      } else {
        return; // Zwykłe tapnięcie/kliknięcie – nie ruszaj obiektu ani o 1px!
      }
    }

    const targetX = Math.round(initialElemPos.x + deltaX);
    const targetY = Math.round(initialElemPos.y + deltaY);

    if (AppState.selectedElementId === "__qr") {
      AppState.editorTemplate.qrX = Math.max(0, Math.min(384 - (AppState.editorTemplate.qrSize || 135), targetX));
      AppState.editorTemplate.qrY = Math.max(0, Math.min(240 - (AppState.editorTemplate.qrSize || 135), targetY));
      const cx = document.getElementById("propCoordX");
      const cy = document.getElementById("propCoordY");
      if (cx) cx.value = AppState.editorTemplate.qrX;
      if (cy) cy.value = AppState.editorTemplate.qrY;
    } else {
      const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
      if (el) {
        el.x = Math.max(0, Math.min(380, targetX));
        el.y = Math.max(10, Math.min(235, targetY));
        const cx = document.getElementById("propCoordX");
        const cy = document.getElementById("propCoordY");
        if (cx) cx.value = el.x;
        if (cy) cy.value = el.y;
      }
    }

    renderEditorCanvas();
  }

  function handlePointerEnd(e) {
    pendingDrag = false;
    isDragging = false;
    if (canvas.hasPointerCapture && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  }

  // Zdarzenia wskaźnika
  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  canvas.addEventListener("pointerup", handlePointerEnd);
  canvas.addEventListener("pointercancel", handlePointerEnd);
  canvas.addEventListener("lostpointercapture", handlePointerEnd);

  // Dodatkowe zabezpieczenie dla zdarzeń dotykowych
  canvas.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  canvas.addEventListener("touchmove", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
}

// ================= POWIADOMIENIA (TOAST) =================
function showToast(msg, duration = 2500) {
  const toast = document.getElementById("toastNotification");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, duration);
}
