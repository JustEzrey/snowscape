/**
 * System Ewidencji Sprzętu Sportowego - Google Apps Script Backend
 * Obsługuje:
 *  - Dodawanie przedmiotu z automatycznym generowaniem ID (SP-00001)
 *  - Aktualizację słowników (Kategorie, Marki, Stany) w osobnym arkuszu
 *  - Oznaczanie jako sprzedane
 *  - Pobieranie danych pojedynczego przedmiotu po ID
 *  - Pobieranie aktualnych list słownikowych
 *  - Auto-instalator arkuszy 'Magazyn' i 'Slowniki' (setupSpreadsheet)
 */

/**
 * Funkcja jednorazowej inicjalizacji (można uruchomić ręcznie lub wykona się automatycznie przy 1. zapisie).
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Arkusz Magazyn
  var magSheet = ss.getSheetByName("Magazyn");
  if (!magSheet) {
    magSheet = ss.insertSheet("Magazyn");
  }
  
  var magHeaders = [
    "ID",
    "Data_Przyjecia",
    "Kategoria",
    "Model",
    "Rozmiar",
    "Stan",
    "Cena_Zakupu",
    "Cena_Sprzedazy",
    "Status",
    "Data_Sprzedazy"
  ];
  
  if (magSheet.getLastRow() === 0) {
    magSheet.appendRow(magHeaders);
    var hRange = magSheet.getRange(1, 1, 1, magHeaders.length);
    hRange.setFontWeight("bold");
    hRange.setBackground("#1e293b");
    hRange.setFontColor("#ffffff");
    magSheet.setFrozenRows(1);
  }
  
  // 2. Arkusz Słowniki
  var dictSheet = ss.getSheetByName("Slowniki");
  if (!dictSheet) {
    dictSheet = ss.insertSheet("Slowniki");
  }
  
  var dictHeaders = ["Kategorie", "Modele", "Stany"];
  if (dictSheet.getLastRow() === 0) {
    dictSheet.appendRow(dictHeaders);
    var dRange = dictSheet.getRange(1, 1, 1, dictHeaders.length);
    dRange.setFontWeight("bold");
    dRange.setBackground("#2563eb");
    dRange.setFontColor("#ffffff");
    dictSheet.setFrozenRows(1);
    
    var sampleCategories = ["Narciarstwo", "Snowboard", "Kolarstwo", "Fitness", "Rolki / Łyżwy", "Turystyka"];
    var sampleModels = ["Salomon X-Drive", "Atomic Redster", "Head Supershape", "Rossignol Hero", "Trek Marlin", "Kross Hexagon"];
    var sampleConditions = ["Bardzo dobry", "Po serwisie", "Nowy / Jak nowy", "Widoczne ślady użytkowania", "Drobne otarcia", "Do serwisu"];
    
    var maxLen = Math.max(sampleCategories.length, sampleModels.length, sampleConditions.length);
    for (var i = 0; i < maxLen; i++) {
      dictSheet.appendRow([
        sampleCategories[i] || "",
        sampleModels[i] || "",
        sampleConditions[i] || ""
      ]);
    }
  }
  
  // Usuń domyślny pusty "Arkusz1" / "Sheet1" jeśli są inne
  var defaultSheet = ss.getSheetByName("Arkusz1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
  
  return "Konfiguracja arkuszy zakończona sukcesem!";
}

function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action;
  
  if (action === "get_dictionaries") {
    return handleGetDictionaries();
  } else if (action === "get_item") {
    return handleGetItem(params.id);
  }
  
  return jsonResponse({ success: false, message: "Nieznana akcja GET" });
}

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    var action = data.action;
    
    if (action === "add_item") {
      return handleAddItem(data);
    } else if (action === "sell_item") {
      return handleSellItem(data.id);
    }
    
    return jsonResponse({ success: false, message: "Nieznana akcja POST" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// 1. Dodawanie nowego przedmiotu i auto-aktualizacja słowników
function handleAddItem(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Magazyn");
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName("Magazyn");
  }
  
  var lastRow = sheet.getLastRow();
  var nextNum = 1;
  
  if (lastRow > 1) {
    var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idValues.length; i++) {
      var val = idValues[i][0].toString();
      var match = val.match(/SP-(\d+)/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    }
  }
  
  var padNum = ("00000" + nextNum).slice(-5);
  var newId = "SP-" + padNum;
  
  var now = new Date();
  var formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  
  var category = (data.category || "").trim();
  var model = (data.model || "").trim();
  var size = (data.size || "").trim();
  var condition = (data.condition || "").trim();
  var buyPrice = data.buyPrice ? Number(data.buyPrice) : 0;
  var sellPrice = data.sellPrice ? Number(data.sellPrice) : 0;
  var status = "Dostępny";
  
  sheet.appendRow([
    newId,
    formattedDate,
    category,
    model,
    size,
    condition,
    buyPrice,
    sellPrice,
    status,
    ""
  ]);
  
  // Automatycznie zaktualizuj słowniki nowymi wartościami
  updateDictionaries(ss, category, model, condition);
  
  return jsonResponse({
    success: true,
    id: newId,
    message: "Przedmiot zarejestrowany pomyślnie",
    item: {
      id: newId,
      date: formattedDate,
      category: category,
      model: model,
      size: size,
      condition: condition,
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      status: status
    }
  });
}

// 2. Oznaczanie jako sprzedane
function handleSellItem(id) {
  if (!id) {
    return jsonResponse({ success: false, message: "Brak ID przedmiotu" });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Magazyn");
  var lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({ success: false, message: "Magazyn jest pusty" });
  }
  
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var targetRow = -1;
  
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0].toString().trim().toUpperCase() === id.toString().trim().toUpperCase()) {
      targetRow = i + 2;
      break;
    }
  }
  
  if (targetRow === -1) {
    return jsonResponse({ success: false, message: "Nie znaleziono przedmiotu o ID: " + id });
  }
  
  var now = new Date();
  var formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  
  sheet.getRange(targetRow, 9).setValue("Sprzedany"); // Kolumna Status
  sheet.getRange(targetRow, 10).setValue(formattedDate); // Kolumna Data_Sprzedazy
  
  return jsonResponse({
    success: true,
    message: "Przedmiot " + id + " oznaczony jako SPRZEDANY",
    soldDate: formattedDate
  });
}

// 3. Pobranie danych pojedynczego przedmiotu po ID
function handleGetItem(id) {
  if (!id) {
    return jsonResponse({ success: false, message: "Brak parametru ID" });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Magazyn");
  var lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return jsonResponse({ success: false, message: "Brak danych w magazynie" });
  }
  
  var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0].toString().trim().toUpperCase() === id.toString().trim().toUpperCase()) {
      return jsonResponse({
        success: true,
        item: {
          id: data[i][0],
          date: data[i][1],
          category: data[i][2],
          model: data[i][3],
          size: data[i][4],
          condition: data[i][5],
          buyPrice: data[i][6],
          sellPrice: data[i][7],
          status: data[i][8],
          soldDate: data[i][9]
        }
      });
    }
  }
  
  return jsonResponse({ success: false, message: "Nie znaleziono przedmiotu " + id });
}

// 4. Pobieranie słowników podpowiedzi
function handleGetDictionaries() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dictSheet = ss.getSheetByName("Slowniki");
  if (!dictSheet) {
    setupSpreadsheet();
    dictSheet = ss.getSheetByName("Slowniki");
  }
  
  var categories = [];
  var models = [];
  var conditions = [];
  
  if (dictSheet && dictSheet.getLastRow() > 1) {
    var lastRow = dictSheet.getLastRow();
    var values = dictSheet.getRange(2, 1, lastRow - 1, 3).getValues();
    
    for (var i = 0; i < values.length; i++) {
      if (values[i][0]) categories.push(values[i][0].toString().trim());
      if (values[i][1]) models.push(values[i][1].toString().trim());
      if (values[i][2]) conditions.push(values[i][2].toString().trim());
    }
  }
  
  return jsonResponse({
    success: true,
    dictionaries: {
      categories: uniqueArray(categories),
      models: uniqueArray(models),
      conditions: uniqueArray(conditions)
    }
  });
}

// Pomocnicza aktualizacja słowników
function updateDictionaries(ss, category, model, condition) {
  var dictSheet = ss.getSheetByName("Slowniki");
  if (!dictSheet) return;
  
  var lastRow = Math.max(dictSheet.getLastRow(), 2);
  var values = dictSheet.getRange(1, 1, lastRow, 3).getValues();
  
  var catCol = [];
  var modCol = [];
  var condCol = [];
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0]) catCol.push(values[i][0].toString().trim().toLowerCase());
    if (values[i][1]) modCol.push(values[i][1].toString().trim().toLowerCase());
    if (values[i][2]) condCol.push(values[i][2].toString().trim().toLowerCase());
  }
  
  if (category && catCol.indexOf(category.toLowerCase()) === -1) {
    dictSheet.getRange(dictSheet.getLastRow() + 1, 1).setValue(category);
  }
  if (model && modCol.indexOf(model.toLowerCase()) === -1) {
    dictSheet.getRange(dictSheet.getLastRow() + 1, 2).setValue(model);
  }
  if (condition && condCol.indexOf(condition.toLowerCase()) === -1) {
    dictSheet.getRange(dictSheet.getLastRow() + 1, 3).setValue(condition);
  }
}

function uniqueArray(arr) {
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    if (item && !seen[item.toLowerCase()]) {
      seen[item.toLowerCase()] = true;
      out.push(item);
    }
  }
  return out;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
