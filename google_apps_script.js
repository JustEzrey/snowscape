/**
 * System Ewidencji Sprzętu Sportowego - Google Apps Script Backend
 * 
 * Arkusze:
 * 1. 'Magazyn' - baza przyjętych i sprzedanych przedmiotów
 *    Kolumny: ID_Przedmiotu | Data_Przyjecia | Kategoria | Rodzaj | Rozmiar | Stan | Opis | Cena_Zakupu | Cena_Sprzedazy | Status | Data_Sprzedazy
 * 2. 'Slowniki' - dynamiczne słowniki powiązań:
 *    Kol A-B: Kategoria -> Rodzaj
 *    Kol D-E: Rodzaj -> Rozmiar
 *    Kol G: Stan
 */

function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Arkusz Magazyn
  var magSheet = ss.getSheetByName("Magazyn");
  if (!magSheet) magSheet = ss.insertSheet("Magazyn");
  
  var magHeaders = [
    "ID_Przedmiotu",
    "Data_Przyjecia",
    "Kategoria",
    "Rodzaj",
    "Rozmiar",
    "Stan",
    "Opis",
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
    
    // Przykładowy wiersz
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    magSheet.appendRow([
      "SP-00001",
      today,
      "Narciarstwo",
      "Narty",
      "165 cm",
      "Po serwisie",
      "Salomon X-Drive 8.0 z wiązaniami",
      400,
      650,
      "Dostępny",
      ""
    ]);
  }
  
  // 2. Arkusz Słowniki
  var dictSheet = ss.getSheetByName("Slowniki");
  if (!dictSheet) dictSheet = ss.insertSheet("Slowniki");
  
  if (dictSheet.getLastRow() === 0) {
    dictSheet.getRange(1, 1).setValue("Kategoria");
    dictSheet.getRange(1, 2).setValue("Rodzaj");
    dictSheet.getRange(1, 4).setValue("Rodzaj_Dla_Rozmiaru");
    dictSheet.getRange(1, 5).setValue("Rozmiar");
    dictSheet.getRange(1, 7).setValue("Stan");
    
    var h1 = dictSheet.getRange("A1:B1");
    h1.setFontWeight("bold").setBackground("#2563eb").setFontColor("#ffffff");
    var h2 = dictSheet.getRange("D1:E1");
    h2.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
    var h3 = dictSheet.getRange("G1");
    h3.setFontWeight("bold").setBackground("#0d9488").setFontColor("#ffffff");
    dictSheet.setFrozenRows(1);
    
    // Dane domyślne: Kategoria -> Rodzaj
    var catRodzaje = [
      ["Narciarstwo", "Narty"],
      ["Narciarstwo", "Buty"],
      ["Narciarstwo", "Kijki"],
      ["Narciarstwo", "Kask"],
      ["Narciarstwo", "Gogle"],
      ["Snowboard", "Deska"],
      ["Snowboard", "Buty"],
      ["Snowboard", "Wiązania"],
      ["Snowboard", "Kask"],
      ["Snowboard", "Gogle"],
      ["Kolarstwo", "Rower MTB"],
      ["Kolarstwo", "Rower Szosowy"],
      ["Kolarstwo", "Rower Gravel"],
      ["Kolarstwo", "Rower Miejski"],
      ["Kolarstwo", "Kask"],
      ["Kolarstwo", "Akcesoria"],
      ["Rolki / Łyżwy", "Rolki"],
      ["Rolki / Łyżwy", "Łyżwy"],
      ["Rolki / Łyżwy", "Kask"],
      ["Rolki / Łyżwy", "Ochraniacze"],
      ["Turystyka", "Plecak"],
      ["Turystyka", "Kije trekkingowe"],
      ["Turystyka", "Namiot"],
      ["Turystyka", "Śpiwór"],
      ["Inne", "Sprzęt"],
      ["Inne", "Akcesoria"]
    ];
    dictSheet.getRange(2, 1, catRodzaje.length, 2).setValues(catRodzaje);
    
    // Dane domyślne: Rodzaj -> Rozmiar
    var rodzRozmiary = [
      ["Narty", "140 cm"], ["Narty", "145 cm"], ["Narty", "150 cm"], ["Narty", "155 cm"],
      ["Narty", "160 cm"], ["Narty", "165 cm"], ["Narty", "170 cm"], ["Narty", "175 cm"], ["Narty", "180 cm"],
      ["Buty", "24.5 (EU 38)"], ["Buty", "25.0 (EU 39)"], ["Buty", "25.5 (EU 40)"], ["Buty", "26.0 (EU 40.5)"],
      ["Buty", "26.5 (EU 41)"], ["Buty", "27.0 (EU 42)"], ["Buty", "27.5 (EU 42.5)"], ["Buty", "28.0 (EU 43)"],
      ["Buty", "28.5 (EU 44)"], ["Buty", "29.0 (EU 45)"], ["Buty", "29.5 (EU 45.5)"], ["Buty", "30.0 (EU 46)"],
      ["Kijki", "110 cm"], ["Kijki", "115 cm"], ["Kijki", "120 cm"], ["Kijki", "125 cm"], ["Kijki", "130 cm"], ["Kijki", "135 cm"],
      ["Deska", "145 cm"], ["Deska", "150 cm"], ["Deska", "153 cm"], ["Deska", "156 cm"], ["Deska", "159 cm"], ["Deska", "162 cm"],
      ["Wiązania", "S"], ["Wiązania", "M"], ["Wiązania", "L"], ["Wiązania", "M/L"],
      ["Kask", "XS (48-51 cm)"], ["Kask", "S (52-55 cm)"], ["Kask", "M (56-58 cm)"], ["Kask", "L (59-61 cm)"], ["Kask", "XL (62-64 cm)"],
      ["Rower MTB", "Rama S (15-16\")"], ["Rower MTB", "Rama M (17-18\")"], ["Rower MTB", "Rama L (19-20\")"], ["Rower MTB", "Rama XL (21-22\")"],
      ["Rower Szosowy", "50 cm"], ["Rower Szosowy", "52 cm"], ["Rower Szosowy", "54 cm"], ["Rower Szosowy", "56 cm"], ["Rower Szosowy", "58 cm"],
      ["Rolki", "Rozm. 38"], ["Rolki", "Rozm. 39"], ["Rolki", "Rozm. 40"], ["Rolki", "Rozm. 41"], ["Rolki", "Rozm. 42"], ["Rolki", "Rozm. 43"], ["Rolki", "Rozm. 44"],
      ["Łyżwy", "Rozm. 38"], ["Łyżwy", "Rozm. 39"], ["Łyżwy", "Rozm. 40"], ["Łyżwy", "Rozm. 41"], ["Łyżwy", "Rozm. 42"], ["Łyżwy", "Rozm. 43"], ["Łyżwy", "Rozm. 44"]
    ];
    dictSheet.getRange(2, 4, rodzRozmiary.length, 2).setValues(rodzRozmiary);
    
    // Dane domyślne: Stany
    var stany = [
      ["Nowy"],
      ["Używany"],
      ["Bardzo dobry"],
      ["Po serwisie"],
      ["Do serwisu"]
    ];
    dictSheet.getRange(2, 7, stany.length, 1).setValues(stany);
  }
  
  // Usuń domyślny pusty Arkusz1 / Sheet1 jeśli są już inne
  var defaultSheet = ss.getSheetByName("Arkusz1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
  
  return "Konfiguracja arkuszy Magazyn i Slowniki zakończona sukcesem!";
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
        if (num >= nextNum) nextNum = num + 1;
      }
    }
  }
  
  var padNum = ("00000" + nextNum).slice(-5);
  var newId = "SP-" + padNum;
  
  // SAMA DATA BEZ GODZINY: YYYY-MM-DD
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  var category = (data.category || "").trim();
  var rodzaj = (data.rodzaj || "").trim();
  var size = (data.size || "").trim();
  var condition = (data.condition || "").trim();
  var opis = (data.opis || data.model || "").trim();
  var buyPrice = data.buyPrice ? Number(data.buyPrice) : 0;
  var sellPrice = data.sellPrice ? Number(data.sellPrice) : 0;
  var status = "Dostępny";
  
  sheet.appendRow([
    newId,
    today,
    category,
    rodzaj,
    size,
    condition,
    opis,
    buyPrice,
    sellPrice,
    status,
    ""
  ]);
  
  // Automatycznie zaktualizuj słowniki nowymi wartościami
  updateDictionaries(ss, category, rodzaj, size, condition);
  
  return jsonResponse({
    success: true,
    id: newId,
    date: today,
    message: "Przedmiot zarejestrowany pomyślnie",
    item: {
      id: newId,
      date: today,
      category: category,
      rodzaj: rodzaj,
      size: size,
      condition: condition,
      opis: opis,
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      status: status
    }
  });
}

// 2. Oznaczanie jako sprzedane
function handleSellItem(id) {
  if (!id) return jsonResponse({ success: false, message: "Brak ID przedmiotu" });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Magazyn");
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ success: false, message: "Magazyn jest pusty" });
  
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0].toString().trim().toUpperCase() === id.toString().trim().toUpperCase()) {
      targetRow = i + 2;
      break;
    }
  }
  
  if (targetRow === -1) return jsonResponse({ success: false, message: "Nie znaleziono przedmiotu: " + id });
  
  // SAMA DATA BEZ GODZINY
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  sheet.getRange(targetRow, 10).setValue("Sprzedany"); // Kolumna Status (10)
  sheet.getRange(targetRow, 11).setValue(today);       // Kolumna Data_Sprzedazy (11)
  
  return jsonResponse({
    success: true,
    message: "Przedmiot " + id + " oznaczony jako SPRZEDANY",
    soldDate: today
  });
}

// 3. Pobranie danych pojedynczego przedmiotu po ID
function handleGetItem(id) {
  if (!id) return jsonResponse({ success: false, message: "Brak parametru ID" });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Magazyn");
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ success: false, message: "Brak danych w magazynie" });
  
  var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0].toString().trim().toUpperCase() === id.toString().trim().toUpperCase()) {
      return jsonResponse({
        success: true,
        item: {
          id: data[i][0],
          date: formatDateOnly(data[i][1]),
          category: data[i][2],
          rodzaj: data[i][3],
          size: data[i][4],
          condition: data[i][5],
          opis: data[i][6],
          buyPrice: data[i][7],
          sellPrice: data[i][8],
          status: data[i][9],
          soldDate: formatDateOnly(data[i][10])
        }
      });
    }
  }
  return jsonResponse({ success: false, message: "Nie znaleziono przedmiotu: " + id });
}

// 4. Pobieranie słowników powiązań
function handleGetDictionaries() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dictSheet = ss.getSheetByName("Slowniki");
  if (!dictSheet) {
    setupSpreadsheet();
    dictSheet = ss.getSheetByName("Slowniki");
  }
  
  var categories = [];
  var categoryRodzaje = {}; // { "Narciarstwo": ["Narty", "Buty"] }
  var rodzajRozmiary = {};  // { "Narty": ["150 cm", "155 cm"] }
  var conditions = [];
  
  var lastRow = dictSheet.getLastRow();
  if (lastRow > 1) {
    // Odczytaj kolumny A:G
    var values = dictSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    
    for (var i = 0; i < values.length; i++) {
      var cat = values[i][0] ? values[i][0].toString().trim() : "";
      var rodz = values[i][1] ? values[i][1].toString().trim() : "";
      var forRodz = values[i][3] ? values[i][3].toString().trim() : "";
      var size = values[i][4] ? values[i][4].toString().trim() : "";
      var cond = values[i][6] ? values[i][6].toString().trim() : "";
      
      if (cat) {
        if (categories.indexOf(cat) === -1) categories.push(cat);
        if (rodz) {
          if (!categoryRodzaje[cat]) categoryRodzaje[cat] = [];
          if (categoryRodzaje[cat].indexOf(rodz) === -1) categoryRodzaje[cat].push(rodz);
        }
      }
      
      if (forRodz && size) {
        if (!rodzajRozmiary[forRodz]) rodzajRozmiary[forRodz] = [];
        if (rodzajRozmiary[forRodz].indexOf(size) === -1) rodzajRozmiary[forRodz].push(size);
      }
      
      if (cond && conditions.indexOf(cond) === -1) {
        conditions.push(cond);
      }
    }
  }
  
  return jsonResponse({
    success: true,
    dictionaries: {
      categories: categories.length ? categories : ["Narciarstwo", "Snowboard", "Kolarstwo", "Rolki / Łyżwy", "Turystyka", "Inne"],
      categoryRodzaje: categoryRodzaje,
      rodzajRozmiary: rodzajRozmiary,
      conditions: conditions.length ? conditions : ["Nowy", "Używany", "Bardzo dobry", "Po serwisie", "Do serwisu"]
    }
  });
}

// 5. Automatyczna aktualizacja słowników przy wpisaniu nowej wartości w aplikacji
function updateDictionaries(ss, category, rodzaj, size, condition) {
  var dictSheet = ss.getSheetByName("Slowniki");
  if (!dictSheet) return;
  
  var lastRow = Math.max(dictSheet.getLastRow(), 2);
  var values = dictSheet.getRange(2, 1, lastRow, 7).getValues();
  
  // 1. Sprawdź parę Kategoria -> Rodzaj
  if (category && rodzaj) {
    var foundCatRodz = false;
    var nextEmptyRowAB = -1;
    for (var i = 0; i < values.length; i++) {
      var c = values[i][0].toString().trim().toLowerCase();
      var r = values[i][1].toString().trim().toLowerCase();
      if (c === category.toLowerCase() && r === rodzaj.toLowerCase()) {
        foundCatRodz = true;
        break;
      }
      if (!values[i][0] && !values[i][1] && nextEmptyRowAB === -1) {
        nextEmptyRowAB = i + 2;
      }
    }
    if (!foundCatRodz) {
      var targetRow = nextEmptyRowAB !== -1 ? nextEmptyRowAB : dictSheet.getLastRow() + 1;
      dictSheet.getRange(targetRow, 1).setValue(category);
      dictSheet.getRange(targetRow, 2).setValue(rodzaj);
    }
  }
  
  // 2. Sprawdź parę Rodzaj -> Rozmiar
  if (rodzaj && size) {
    var foundRodzSize = false;
    var nextEmptyRowDE = -1;
    for (var j = 0; j < values.length; j++) {
      var rz = values[j][3].toString().trim().toLowerCase();
      var sz = values[j][4].toString().trim().toLowerCase();
      if (rz === rodzaj.toLowerCase() && sz === size.toLowerCase()) {
        foundRodzSize = true;
        break;
      }
      if (!values[j][3] && !values[j][4] && nextEmptyRowDE === -1) {
        nextEmptyRowDE = j + 2;
      }
    }
    if (!foundRodzSize) {
      var targetRowDE = nextEmptyRowDE !== -1 ? nextEmptyRowDE : dictSheet.getLastRow() + 1;
      dictSheet.getRange(targetRowDE, 4).setValue(rodzaj);
      dictSheet.getRange(targetRowDE, 5).setValue(size);
    }
  }
  
  // 3. Sprawdź Stan
  if (condition) {
    var foundCond = false;
    var nextEmptyRowG = -1;
    for (var k = 0; k < values.length; k++) {
      var cd = values[k][6].toString().trim().toLowerCase();
      if (cd === condition.toLowerCase()) {
        foundCond = true;
        break;
      }
      if (!values[k][6] && nextEmptyRowG === -1) {
        nextEmptyRowG = k + 2;
      }
    }
    if (!foundCond) {
      var targetRowG = nextEmptyRowG !== -1 ? nextEmptyRowG : dictSheet.getLastRow() + 1;
      dictSheet.getRange(targetRowG, 7).setValue(condition);
    }
  }
}

function formatDateOnly(d) {
  if (!d) return "";
  if (d instanceof Date) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  var str = d.toString().trim();
  // Jeśli ma postać YYYY-MM-DD HH:mm, obetnij do YYYY-MM-DD
  var m = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return str;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
