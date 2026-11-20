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
      { id: "el_model", type: "text", text: "{MODEL}", x: 160, y: 75, fontSize: 22, bold: true },
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
      { id: "el_model", type: "text", text: "{MODEL}", x: 195, y: 75, fontSize: 20, bold: false },
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
      { id: "el_model", type: "text", text: "{MODEL}", x: 15, y: 75, fontSize: 20, bold: true },
      { id: "el_sub", type: "text", text: "{STAN} ({ROZMIAR})", x: 15, y: 110, fontSize: 17, bold: false },
      { id: "el_price", type: "text", text: "{CENA} PLN", x: 15, y: 160, fontSize: 26, bold: true },
      { id: "el_id", type: "text", text: "ID: {ID}", x: 15, y: 200, fontSize: 16, bold: false }
    ]
  }
];

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

  // Domyślne słowniki (rozszerzane dynamicznie)
  dictionaries: JSON.parse(localStorage.getItem("sport_dictionaries")) || {
    categories: ["Narciarstwo", "Snowboard", "Kolarstwo", "Fitness", "Rolki / Łyżwy", "Turystyka"],
    models: ["Salomon X-Drive", "Atomic Redster", "Head Supershape", "Rossignol Hero", "Trek Marlin", "Kross Hexagon", "Giant Talon"],
    sizes: ["150 cm", "155 cm", "160 cm", "165 cm", "170 cm", "175 cm", "Rama S", "Rama M", "Rama L", "Rozm. 42", "Rozm. 43"],
    conditions: ["Bardzo dobry", "Po serwisie", "Nowy / Jak nowy", "Widoczne ślady użytkowania", "Drobne otarcia", "Do serwisu"]
  }
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

// ================= DYNAMICZNE SŁOWNIKI (COMBOBOX) =================
function initComboboxes() {
  setupCombobox("inputCategory", "listCategory", AppState.dictionaries.categories, "categories");
  setupCombobox("inputModel", "listModel", AppState.dictionaries.models, "models");
  setupCombobox("inputSize", "listSize", AppState.dictionaries.sizes, "sizes");
  setupCombobox("inputCondition", "listCondition", AppState.dictionaries.conditions, "conditions");
}

function setupCombobox(inputId, listId, itemsArray, dictKey) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;

  function renderList(query = "") {
    list.innerHTML = "";
    const cleanQuery = query.trim().toLowerCase();
    
    // Filtrowanie istniejących
    const matches = itemsArray.filter(item => item.toLowerCase().includes(cleanQuery));

    matches.forEach(item => {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      div.textContent = item;
      div.addEventListener("click", () => {
        input.value = item;
        list.classList.remove("show");
        updateLabelPreview();
      });
      list.appendChild(div);
    });

    // Opcja dodania nowego, jeśli nie istnieje dokładnie
    if (query.trim() && !itemsArray.some(it => it.toLowerCase() === cleanQuery)) {
      const addDiv = document.createElement("div");
      addDiv.className = "dropdown-item add-new";
      addDiv.textContent = `➕ Dodaj nową: "${query.trim()}"`;
      addDiv.addEventListener("click", () => {
        saveNewOption(dictKey, query.trim(), itemsArray);
        input.value = query.trim();
        list.classList.remove("show");
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

function saveNewOption(dictKey, val, itemsArray) {
  if (!val) return;
  const trimmed = val.trim();
  if (!itemsArray.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
    itemsArray.push(trimmed);
    localStorage.setItem("sport_dictionaries", JSON.stringify(AppState.dictionaries));
    showToast(`Dodano "${trimmed}" do podpowiedzi!`);
  }
}

// ================= PODGLĄD ETYKIETY (50x30 mm) =================
function initFormPreviewListeners() {
  const ids = ["inputCategory", "inputModel", "inputSize", "inputCondition", "inputSellPrice"];
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

function updateLabelPreview() {
  const canvas = document.getElementById("intakePreviewCanvas");
  if (!canvas) return;

  const currentData = {
    id: "SP-AUTO",
    model: document.getElementById("inputModel").value.trim() || "Nazwa sprzętu",
    size: document.getElementById("inputSize").value.trim() || "165 cm",
    condition: document.getElementById("inputCondition").value.trim() || "Po serwisie",
    price: document.getElementById("inputSellPrice").value.trim() || "0",
    category: document.getElementById("inputCategory").value.trim() || "Narciarstwo"
  };

  renderTemplateToCanvas(canvas, getActiveTemplate(), currentData, false);
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
        text = text.replace(/\{MODEL\}/gi, itemData.model || "Nazwa sprzętu");
        text = text.replace(/\{ROZMIAR\}/gi, itemData.size || "165 cm");
        text = text.replace(/\{STAN\}/gi, itemData.condition || "Po serwisie");
        text = text.replace(/\{CENA\}/gi, itemData.price || "0");
        text = text.replace(/\{KATEGORIA\}/gi, itemData.category || "Sprzęt");

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
async function generateTsplBitmapPayload(itemId, title, size, condition, price, customTemplate = null) {
  const WIDTH_DOTS = 384; // 48 mm przy 203 DPI (podzielne przez 8: 48 bajtów)
  const HEIGHT_DOTS = 240; // 30 mm przy 203 DPI
  const WIDTH_BYTES = WIDTH_DOTS / 8; // 48 bajtów na wiersz

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH_DOTS;
  canvas.height = HEIGHT_DOTS;

  const itemData = {
    id: itemId,
    model: title,
    size: size,
    condition: condition,
    price: price,
    category: document.getElementById("inputCategory") ? document.getElementById("inputCategory").value : "Sprzęt"
  };

  const templateToUse = customTemplate || getActiveTemplate();
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

  // 6. Budowa pełnego pakietu TSPL z nagłówkiem BITMAP i stopką PRINT 1
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
  const category = document.getElementById("inputCategory").value.trim();
  const model = document.getElementById("inputModel").value.trim();
  const size = document.getElementById("inputSize").value.trim();
  const condition = document.getElementById("inputCondition").value.trim();
  const buyPrice = document.getElementById("inputBuyPrice").value.trim();
  const sellPrice = document.getElementById("inputSellPrice").value.trim();

  if (!model || !sellPrice) {
    alert("Wypełnij wymagane pola: Marka/Model oraz Cena sprzedaży!");
    return;
  }

  // Zapisz wpisane wartości do słowników jeśli są nowe
  saveNewOption("categories", category, AppState.dictionaries.categories);
  saveNewOption("models", model, AppState.dictionaries.models);
  saveNewOption("sizes", size, AppState.dictionaries.sizes);
  saveNewOption("conditions", condition, AppState.dictionaries.conditions);

  const btn = document.getElementById("btnSaveAndPrint");
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = `<span>⏳ Zapisywanie...</span>`;

  try {
    let newItemId = "SP-" + Math.floor(10000 + Math.random() * 90000); // Awaryjny ID offline

    // 1. Wysyłka do Google Sheets jeśli podano URL
    if (AppState.scriptUrl) {
      showToast("Wysyłanie do Google Sheets...");
      const response = await fetch(AppState.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "add_item",
          category: category,
          model: model,
          size: size,
          condition: condition,
          buyPrice: buyPrice,
          sellPrice: sellPrice
        })
      });

      const resJson = await response.json();
      if (resJson.success && resJson.id) {
        newItemId = resJson.id;
      }
    }

    document.getElementById("prevId").textContent = "ID: " + newItemId;

    // 2. Drukowanie przez Bluetooth w trybie graficznym (BITMAP)
    if (AppState.isPrinterConnected) {
      showToast(`Generowanie etykiety dla ${newItemId}...`);
      const tsplBytes = await generateTsplBitmapPayload(newItemId, model, size, condition, sellPrice);
      showToast(`Drukowanie etykiety dla ${newItemId}...`);
      await sendRawTsplToPrinter(tsplBytes);
      showToast(`Wydrukowano etykietę: ${newItemId}! 🎉`, 3000);
    } else {
      showToast(`Zapisano ${newItemId}! (Drukarka rozłączona - wydruk pominięty)`, 4000);
    }

    // 3. Czyszczenie formularza i przygotowanie do kolejnego
    document.getElementById("inputModel").value = "";
    document.getElementById("inputSize").value = "";
    document.getElementById("inputSellPrice").value = "";
    document.getElementById("inputBuyPrice").value = "";
    updateLabelPreview();
    document.getElementById("inputModel").focus();

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
      model: "Przykładowy sprzęt (Brak URL Google Sheets)",
      category: "Narciarstwo",
      size: "165 cm",
      condition: "Po serwisie",
      sellPrice: "500",
      status: "Dostępny",
      date: new Date().toISOString().slice(0, 10)
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

  document.getElementById("cardItemId").textContent = item.id;
  document.getElementById("cardItemDate").textContent = item.date || "";
  document.getElementById("cardItemTitle").textContent = item.model;
  document.getElementById("cardItemCategory").textContent = item.category || "-";
  document.getElementById("cardItemSize").textContent = item.size || "-";
  document.getElementById("cardItemCondition").textContent = item.condition || "-";
  document.getElementById("cardItemPrice").textContent = `${item.sellPrice} PLN`;

  const badge = document.getElementById("cardStatusBadge");
  const btnSell = document.getElementById("btnMarkAsSold");

  const isSold = (item.status || "").toLowerCase() === "sprzedany";
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
    const tsplBytes = await generateTsplBitmapPayload(it.id, it.model, it.size, it.condition, it.sellPrice);
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
        const payload = await generateTsplBitmapPayload(
          "SP-00001",
          "Narty Salomon X-Drive",
          "165 cm",
          "Ślizgi po serwisie",
          "650"
        );
        showToast("Wysyłanie pikseli do głowicy...");
        await sendRawTsplToPrinter(payload);
        showToast("Wydruk BITMAP wysłany! Sprawdź etykietę ✅", 3000);
      } catch (err) {
        alert("Błąd testu BITMAP: " + err.message);
      }
    });
  }

  // Test A: TSPL (Standard DIRECTION 0 - bez obracania)
  document.getElementById("btnTestTspl0").addEventListener("click", async () => {
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

  // Test B: CPCL (Często domyślny protokół mobilnych drukarek etykiet Zebra / HPRT)
  document.getElementById("btnTestCpcl").addEventListener("click", async () => {
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

  // Testowy wydruk w uniwersalnym trybie paragonowym (ESC/POS)
  document.getElementById("btnTestEscPos").addEventListener("click", async () => {
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
          categories: data.dictionaries.categories.length ? data.dictionaries.categories : AppState.dictionaries.categories,
          models: data.dictionaries.models.length ? data.dictionaries.models : AppState.dictionaries.models,
          sizes: AppState.dictionaries.sizes,
          conditions: data.dictionaries.conditions.length ? data.dictionaries.conditions : AppState.dictionaries.conditions
        };
        localStorage.setItem("sport_dictionaries", JSON.stringify(AppState.dictionaries));
        initComboboxes();
        showToast("Słowniki zaktualizowane pomyślnie! 🔄");
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

  // Zsynchronizuj selecty szablonów
  populateTemplateSelects();

  // Zdarzenia wyboru szablonu w edytorze
  const selectEditor = document.getElementById("selectEditorTemplate");
  if (selectEditor) {
    selectEditor.addEventListener("change", (e) => {
      const found = AppState.templates.find(t => t.id === e.target.value);
      if (found) {
        AppState.editorTemplate = JSON.parse(JSON.stringify(found));
        AppState.selectedElementId = null;
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
    const idx = AppState.templates.findIndex(t => t.id === AppState.editorTemplate.id);
    if (idx !== -1) {
      AppState.templates[idx] = JSON.parse(JSON.stringify(AppState.editorTemplate));
    } else {
      AppState.templates.push(JSON.parse(JSON.stringify(AppState.editorTemplate)));
    }
    localStorage.setItem("sport_templates", JSON.stringify(AppState.templates));
    populateTemplateSelects();
    updateLabelPreview();
    showToast(`Zapisano szablon "${AppState.editorTemplate.name}"! 💾`);
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
  document.getElementById("btnAddImageElement").addEventListener("click", () => fileInput.click());
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

        // Konwertuj obraz do ostrych czarno-białych pikseli (monochrom)
        const procCanvas = document.createElement("canvas");
        procCanvas.width = w;
        procCanvas.height = h;
        const procCtx = procCanvas.getContext("2d");
        procCtx.drawImage(img, 0, 0, w, h);
        const imgData = procCtx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
          // Zwiększ kontrast dla głowicy termicznej
          const val = lum < 140 ? 0 : 255;
          d[i] = val;
          d[i+1] = val;
          d[i+2] = val;
          // Jeśli przezroczysty, zrób biały
          if (d[i+3] < 128) {
            d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = 255;
          }
        }
        procCtx.putImageData(imgData, 0, 0);
        const monoDataUrl = procCanvas.toDataURL("image/png");

        if (AppState.selectedElementId && AppState.selectedElementId.startsWith("img_")) {
          // Zmiana istniejącego
          const existing = AppState.editorTemplate.elements.find(el => el.id === AppState.selectedElementId);
          if (existing) {
            existing.dataUrl = monoDataUrl;
            existing._imgObj = null;
            existing.width = w;
            existing.height = h;
          }
        } else {
          // Dodaj nowy
          const newImgEl = {
            id: "img_" + Date.now(),
            type: "image",
            dataUrl: monoDataUrl,
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
      const payload = await generateTsplBitmapPayload(
        "SP-SZABLON",
        "Narty Salomon X-Drive",
        "165 cm",
        "Po serwisie",
        "650",
        AppState.editorTemplate
      );
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

function renderEditorCanvas() {
  const canvas = document.getElementById("templateEditorCanvas");
  if (!canvas || !AppState.editorTemplate) return;

  const sampleData = {
    id: "SP-00042",
    model: "Narty Salomon X-Drive",
    size: "165 cm",
    condition: "Po serwisie",
    price: "650",
    category: "Narciarstwo"
  };

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
}

function setupCanvasPointerEvents(canvas) {
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const scaleX = 384 / rect.width;
    const scaleY = 240 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function handlePointerDown(e) {
    const pos = getCanvasCoords(e);
    const tpl = AppState.editorTemplate;
    if (!tpl) return;

    let hitId = null;

    // 1. Sprawdź elementy tekstowe i obrazy (od końca)
    const ctx = canvas.getContext("2d");
    for (let i = tpl.elements.length - 1; i >= 0; i--) {
      const el = tpl.elements[i];
      if (el.type === "text") {
        ctx.font = (el.bold ? "bold " : "") + (el.fontSize || 20) + "px Arial, sans-serif";
        const w = ctx.measureText(el.text).width;
        const h = el.fontSize || 20;
        // Bounding box: [el.x - 4, el.y - h, w + 8, h + 4]
        if (pos.x >= el.x - 6 && pos.x <= el.x + w + 6 && pos.y >= el.y - h - 4 && pos.y <= el.y + 4) {
          hitId = el.id;
          AppState.initialElementX = el.x;
          AppState.initialElementY = el.y;
          break;
        }
      } else if (el.type === "image") {
        if (pos.x >= el.x && pos.x <= el.x + el.width && pos.y >= el.y && pos.y <= el.y + el.height) {
          hitId = el.id;
          AppState.initialElementX = el.x;
          AppState.initialElementY = el.y;
          break;
        }
      }
    }

    // 2. Jeśli nie kliknięto elementu, sprawdź kod QR
    if (!hitId && tpl.hasQr) {
      const qrX = tpl.qrX !== undefined ? tpl.qrX : 15;
      const qrY = tpl.qrY !== undefined ? tpl.qrY : 52;
      const qrSize = tpl.qrSize || 135;
      if (pos.x >= qrX && pos.x <= qrX + qrSize && pos.y >= qrY && pos.y <= qrY + qrSize) {
        hitId = "__qr";
        AppState.initialElementX = qrX;
        AppState.initialElementY = qrY;
      }
    }

    AppState.selectedElementId = hitId;
    if (hitId) {
      AppState.isDragging = true;
      AppState.dragStartX = pos.x;
      AppState.dragStartY = pos.y;
    }

    updateInspectorUI();
    renderEditorCanvas();
  }

  function handlePointerMove(e) {
    if (!AppState.isDragging || !AppState.selectedElementId) return;
    const pos = getCanvasCoords(e);
    const deltaX = Math.round(pos.x - AppState.dragStartX);
    const deltaY = Math.round(pos.y - AppState.dragStartY);

    if (AppState.selectedElementId === "__qr") {
      AppState.editorTemplate.qrX = Math.max(0, Math.min(384 - (AppState.editorTemplate.qrSize || 135), AppState.initialElementX + deltaX));
      AppState.editorTemplate.qrY = Math.max(0, Math.min(240 - (AppState.editorTemplate.qrSize || 135), AppState.initialElementY + deltaY));
      document.getElementById("propCoordX").value = AppState.editorTemplate.qrX;
      document.getElementById("propCoordY").value = AppState.editorTemplate.qrY;
    } else {
      const el = AppState.editorTemplate.elements.find(x => x.id === AppState.selectedElementId);
      if (el) {
        el.x = Math.max(0, Math.min(380, AppState.initialElementX + deltaX));
        el.y = Math.max(10, Math.min(235, AppState.initialElementY + deltaY));
        document.getElementById("propCoordX").value = el.x;
        document.getElementById("propCoordY").value = el.y;
      }
    }

    renderEditorCanvas();
  }

  function handlePointerUp() {
    AppState.isDragging = false;
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
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
