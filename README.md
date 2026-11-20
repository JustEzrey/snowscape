# SportInventory - System Ewidencji Sprzętu Sportowego

Aplikacja mobilna na Androida dedykowana do przyjęcia towaru, drukowania etykiet 50x30 mm przez Bluetooth (Zenwire TP-210) oraz skanowania kodów QR aparatem do rejestracji sprzedaży.

---

## 🚀 Jak uruchomić i wdrożyć krok po kroku

### Krok 1: Wdrożenie bazy Google Sheets (2 minuty)
1. Otwórz swój arkusz Google:
   - Utwórz zakładkę **`Magazyn`** z kolumnami w wierszu 1:
     `ID_Przedmiotu | Data_Przyjecia | Kategoria | Nazwa_Model | Rozmiar_Wariant | Stan_Opis | Cena_Zakupu | Cena_Sprzedazy | Status | Data_Sprzedazy`
   - Utwórz drugą zakładkę **`Slowniki`** z kolumnami:
     `Kategorie | Marki_Modele | Stany`
2. W menu u góry kliknij: **Rozszerzenia -> Apps Script**.
3. Usuń zawartość i wklej cały kod z pliku [google_apps_script.js](./google_apps_script.js).
4. Kliknij niebieski przycisk w prawym górnym rogu: **Wdróż -> Nowe wdrożenie**.
5. Wybierz typ: **Aplikacja internetowa (Web App)**:
   - *Wykonaj jako:* **Ja (Twój adres email)**
   - *Kto ma dostęp:* **Każdy (Anyone)**
6. Kliknij **Wdróż**, zezwól na dostęp i **skopiuj wygenerowany adres URL aplikacji internetowej** (kończy się na `/exec`).

---

### Krok 2: Uruchomienie aplikacji na telefonie

Masz dwie wygodne opcje:

#### Opcja A: Natychmiastowe uruchomienie w Chrome na Androidzie (PWA)
1. Włącz lokalny serwer w tym folderze:
   ```bash
   python -m http.server 8080
   ```
2. Otwórz w telefonie w przeglądarce Chrome adres Twojego komputera w lokalnym Wi-Fi (np. `http://192.168.1.X:8080`).
3. W aplikacji wejdź w Ustawienia (⚙️) i wklej skopiowany URL z Google Apps Script.
4. Kliknij ikonę błyskawicy ⚡ u góry i połącz się z **Zenwire TP-210**.
5. Kliknij w menu Chrome: **"Dodaj do ekranu głównego"** – aplikacja otworzy się na pełnym ekranie jak każda natywna apka!

#### Opcja B: Automatyczna kompilacja do pliku `.apk` (GitHub Actions)
Projekt ma gotowy plik `.github/workflows/build-apk.yml`.
1. Wrzuć ten folder na prywatne repozytorium GitHub.
2. Wejdź w zakładkę **Actions** na GitHubie -> kliknij **Build Android APK** -> **Run workflow**.
3. Po 2 minutach w sekcji **Artifacts** pobierzesz gotowy plik `app-debug.apk` wprost na swój telefon!
