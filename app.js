/**
 * SportInventory - Aplikacja Ewidencji i Etykietowania Sprzętu Sportowego
 * Obsługa:
 *  - Drukarka Zenwire TP-210 przez Bluetooth Low Energy (BLE)
 *  - Etykiety 50x30 mm (TSPL 203 DPI) z polskimi znakami (CP1250)
 *  - Dynamiczne słowniki z automatycznym dodawaniem (Combobox)
 *  - Skaner kodów QR z aparatu (html5-qrcode)
 *  - Baza danych Google Sheets (REST API)
 */

// ================= STAN APLIKACJI =================
const AppState = {
  printerDevice: null,
  printerCharacteristic: null,
  isPrinterConnected: false,
  scriptUrl: localStorage.getItem("sport_script_url") || "",
  html5QrCode: null,
  isCameraActive: false,
  currentItem: null,
  
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

      // Auto-zarządzanie kamerą przy przełączaniu
      if (btn.dataset.tab === "tab-scanner") {
        startCamera();
      } else {
        stopCamera();
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

  document.getElementById("btnSaveAndPrint").addEventListener("click", handleSaveAndPrint);
}

function updateLabelPreview() {
  const model = document.getElementById("inputModel").value || "Nazwa sprzętu";
  const size = document.getElementById("inputSize").value || "";
  const condition = document.getElementById("inputCondition").value || "";
  const price = document.getElementById("inputSellPrice").value || "0";

  document.getElementById("prevTitle").textContent = model;
  
  let details = [];
  if (size) details.push(size);
  if (condition) details.push(condition);
  document.getElementById("prevDetails").textContent = details.join(" / ") || "Rozmiar / Stan";

  document.getElementById("prevPrice").textContent = `CENA: ${price} PLN`;
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

  // Czyste komendy TSPL z ramką diagnostyczną BOX i CRLF
  const lines = [
    "SIZE 50 mm,30 mm",
    "GAP 3 mm,0 mm",
    "DIRECTION 1",
    "CLS",
    // Ramka testowa o grubości 3 punktów (dzięki niej od razu widać, że głowica grzeje)
    "BOX 10,10,385,225,3",
    `QRCODE 25,35,L,5,A,0,"${itemId}"`,
    `TEXT 180,35,"3",0,1,1,"ID: ${itemId}"`,
    `TEXT 180,75,"2",0,1,1,"${title}"`,
    `TEXT 180,115,"2",0,1,1,"${subText}"`,
    `TEXT 180,165,"3",0,1,1,"CENA: ${price} PLN"`,
    "PRINT 1,1",
    ""
  ];

  const tsplString = lines.join("\r\n");
  return encodeWindows1250(tsplString);
}

/**
 * Bezpieczna wysyłka bajtów przez BLE
 * Kluczowe: pakiety po 20 bajtów (standard BLE ATT MTU = 23B z 20B payloadu)
 * Zapobiega ucinaniu komend i blokowaniu bufora drukarki
 */
async function sendRawTsplToPrinter(uint8Bytes) {
  if (!AppState.printerDevice) {
    throw new Error("Drukarka nie jest wybrana. Kliknij ikonę błyskawicy ⚡.");
  }

  // Jeśli połączenie padło w tle, połącz ponownie
  if (!AppState.printerDevice.gatt.connected) {
    showToast("Wznawianie połączenia z Zenwire...");
    const server = await AppState.printerDevice.gatt.connect();
    
    // Odnajdź charakterystykę zapisu
    let writeChar = null;
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
    if (!writeChar) throw new Error("Nie można odnaleźć charakterystyki zapisu.");
    AppState.printerCharacteristic = writeChar;
    AppState.isPrinterConnected = true;
    updatePrinterUI(true, AppState.printerDevice.name);
  }

  const char = AppState.printerCharacteristic;
  const CHUNK_SIZE = 20; // Ścisły limit pakietu BLE 4.0

  for (let offset = 0; offset < uint8Bytes.length; offset += CHUNK_SIZE) {
    const chunk = uint8Bytes.slice(offset, offset + CHUNK_SIZE);
    
    try {
      if (char.writeValue) {
        await char.writeValue(chunk);
      } else if (char.writeValueWithResponse) {
        await char.writeValueWithResponse(chunk);
      } else if (char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      }
    } catch (e) {
      // Fallback jeśli writeValue zawiedzie
      if (char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else {
        throw e;
      }
    }

    // Krótka pauza między pakietami BLE
    await new Promise(r => setTimeout(r, 25));
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

    // 2. Drukowanie przez Bluetooth
    if (AppState.isPrinterConnected) {
      showToast(`Drukowanie etykiety dla ${newItemId}...`);
      const tsplBytes = buildTsplCommand(newItemId, model, size, condition, sellPrice);
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
    showToast("Drukowanie etykiety...");
    const tsplBytes = buildTsplCommand(it.id, it.model, it.size, it.condition, it.sellPrice);
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

  // Testowy wydruk 50x30 mm z polskimi znakami
  document.getElementById("btnTestPrint").addEventListener("click", async () => {
    try {
      showToast("Wysyłanie testu do Zenwire TP-210...");
      const testBytes = buildTsplCommand(
        "SP-TEST",
        "Zażółć gęślą jaźń",
        "Test 165cm",
        "Ślizgi po serwisie",
        "999"
      );
      await sendRawTsplToPrinter(testBytes);
      showToast("Test wydrukowany! Sprawdź etykietę ✅");
    } catch (err) {
      alert("Błąd wydruku testowego: " + err.message);
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

// ================= POWIADOMIENIA (TOAST) =================
function showToast(msg, duration = 2500) {
  const toast = document.getElementById("toastNotification");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, duration);
}
