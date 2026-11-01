# 🏡 Magic Home Tour – USS Practice Game

**Play it:** <https://hamsajaisal.github.io/magic-home-tour/>

A free browser game for Kerala UP school students (Classes 5–7) preparing for the
**USS (Upper Primary Scholarship) exam**. The child walks around a colourful 3D Kerala
house. Every room door is locked, and answering questions opens it.

- Works in **Malayalam medium** and **English medium**. One button switches between them, even in the middle of a question.
- Runs in any modern browser, on computers and on Android phones.
- **No login, no ads, no tracking.** Progress is saved only on the child's own device.

---

## 🏡 What's in the house

- **6 locked rooms**, one for each USS subject: Maths Workshop, Science Lab, Malayalam Reading Room, English Corner, Social Science Room and Knowledge Room (GK). Answer questions at a door to open it.
- **A gift box 🎁 in every open room.** Each room gives one free surprise a day, and after that the child answers a few questions for a new one. Surprises: chocolate rain, sweets rain, coin rain, a hidden kitten, balloons and a treasure chest.
- **🌟 Secret room of the day:** one room each day gives double coins for its surprise.
- **📚 Revision Cupboard** (back of the hall): questions the child got wrong are "locked" in here to practise again. They leave the cupboard once answered correctly.
- **🪣 Wishing Well** (in the garden): a mixed quiz from all subjects, with bonus coins.
- **📊 My Progress:** time taken for each question, a short time report after every quiz, results subject by subject, the last 7 days, and the questions to practise more. Saved only on the device, so parents and teachers can look at it there.
- **🛍️ Shop, 📒 album, 🔥 daily bonus:** decorations, pets, costumes, badges and stickers.

To add a new room, add it to `data/rooms.json` (a programmer can help with the position), and give its `subject` some questions.

## ▶️ How to play on your computer

1. Make sure **Node.js** is installed. If it isn't, download it from <https://nodejs.org> and click the big **LTS** button.
2. Open the game folder and **double-click `start-game.bat`**.
3. A black window opens, and then the game opens in your browser.
   Keep the black window open while playing. Close it when you're done.

> Why not just double-click `index.html`? Browsers block games from reading their own
> question files when they are opened that way. The small `start-game.bat` server fixes this.

## 📱 How to open it on a phone

**Easiest:** use the GitHub Pages link once the game is published (see the end of this file).

**Before publishing, on the same Wi-Fi:**
1. Run `start-game.bat` on your computer.
2. In the black window, look for the line **"On a phone (same Wi-Fi): http://192.168.x.x:8080"**.
3. Type that address into Chrome on the phone (phone and computer must be on the same Wi-Fi).
4. If Windows asks *"Allow Node.js on networks?"*, tick **Private networks** and click **Allow**.

**Controls on a phone:** drag your finger on the **left half** of the screen to walk.
Drag on the **right half** (or use the ⟲ ⟳ buttons) to turn the camera.
**On a computer:** use the arrow keys or W A S D to walk, and Q / E or drag with the mouse to turn.
At a door, press Enter or click the button.

---

## ⚙️ How to change settings

Open **`settings.js`** with Notepad (right-click → *Open with* → *Notepad*). Each line has
an explanation. For example:

```
QUESTIONS_PER_QUIZ: 5,      // how many questions at each door
CORRECT_TO_UNLOCK: 4,       // how many must be right to open the door
```

To use 10 questions with 7 needed to pass, change them to `10` and `7`.

Other things you can change in `settings.js`:
- **Surprises:** `BONUS_QUESTIONS` / `BONUS_CORRECT` set the quick quiz at a gift box. One surprise per room per day is free, and after that the child answers these questions for a new one. `SURPRISE_SECONDS` sets how long chocolate rain and balloons last.
- **Daily bonus:** `DAILY_BONUS` is the coins for playing today. It is multiplied by the streak, up to 7 days.

### 🎙️ Spoken praise (voice)
After a right answer the game says things like "അടിപൊളി!". By default it uses the phone's own voice: Malayalam if the phone has a Malayalam voice installed, otherwise English ("Super!"). Children can switch it off in **Settings → Spoken praise**.

**To use real recorded voices instead** (warmer, and the same on every phone):
1. Record short clips (1–2 seconds) as .mp3, for example "അടിപൊളി!", "നന്നായി!", "ഒന്നുകൂടി നോക്കൂ!", "വാതിൽ തുറന്നു!".
2. Put them in the `data/voice` folder.
3. Open `data/voice/voice.json` and write the file names in the right list, for example `"praise": ["adipoli.mp3", "nannayi.mp3"]`.
   The lists are: `praise` (right answer), `tryAgain` (wrong answer), `pass` (door or surprise opens), `fail` (needs another try), separately for `ml` and `en`.

### Shop, badges and stickers
- **Prices and names** of shop items are in `data/shop.json`. Change `price` or `name`, but keep `id` the same.
- **Badges and stickers** are in `data/badges.json`. You can change the number a badge needs (`n`) and its name.
Save the file and reload the game page.
Only change the number or word **after the colon**, and keep the comma at the end.

---

## ➕ How to add questions

Questions live in the **`data/questions`** folder, with one file per subject
(`maths.json`, `science.json`, …). The game code never needs to change.

### Way 1 – Use the converter (recommended)

1. Run `start-game.bat`.
2. In your browser open **<http://localhost:8080/tools/converter.html>**.
3. Paste the question-paper text (English, Malayalam or both), or open a PDF.
4. Fill in subject, class and **source/credit**, then click **Convert**.
5. Check every **red card**. These are questions the converter wasn't sure about, for example ones with pictures, tables, maths symbols, a missing answer, or garbled text. Fix them in the boxes, then tick **"I checked this"**.
6. Click **Download file**.
7. Put the downloaded file in `data/questions`, then add its name to `data/questions/index.json`:
   ```
   "files": [
     "maths.json",
     "science.json",
     "gk-new.json"
   ]
   ```
   (Each name in quotes, with commas between them but **not after the last one**.)
   To **add to an existing file** instead, choose that file in the converter's "Add to an existing question file?" box. The download then contains the old and new questions together, so replace the old file with it.
8. In the converter, open the **"Check my question files"** tab and click **Check now**. It tells you if anything is wrong.

**Things the converter cannot do (please be aware):**
- **Scanned PDFs** (photos of pages) have no text inside them, so you must type those questions.
- Many older Malayalam PDFs use **old non-Unicode fonts** (ML-TT, Karthika and similar). Their text comes out as nonsense like `hÀj¯nÂ`. The converter warns you, and those questions need to be retyped.
- Questions that depend on a **picture, table or map** are flagged. The game can't show pictures yet.
- Hints and explanations are not in most papers. Please add them where you can, because they are what help children learn.

### Way 2 – Add a question by hand

Copy an existing question in the file (from `{` to `}`), paste it after the last one,
put a comma between them, and change the words. Each question looks like this:

```json
{
  "id": "MATHS-0013",
  "subject": "maths",
  "class": 6,
  "difficulty": "easy",
  "answer": "B",
  "en": {
    "question": "What is 3/4 of 24?",
    "options": ["16", "18", "20", "12"],
    "hint": "First find 1/4 of 24.",
    "explanation": "24 ÷ 4 = 6, and 6 × 3 = 18."
  },
  "ml": {
    "question": "24 ന്റെ 3/4 എത്ര?",
    "options": ["16", "18", "20", "12"],
    "hint": "ആദ്യം 24 ന്റെ 1/4 കണ്ടുപിടിക്കൂ.",
    "explanation": "24 ÷ 4 = 6, 6 × 3 = 18."
  },
  "source": "USS 2023 question paper",
  "year": 2023,
  "reviewed": false,
  "needsReview": false
}
```

| Field | What it means |
|---|---|
| `id` | A unique name. Never use the same id twice. |
| `subject` | `maths`, `science`, `malayalam`, `english`, `social` or `gk`. It decides which room the question appears in. |
| `class` | 5, 6 or 7 |
| `difficulty` | `easy`, `medium` or `hard` |
| `answer` | The right option: `A`, `B`, `C` or `D` (A = first option) |
| `en` / `ml` | The English and Malayalam versions. You can leave one out, and the question will then show only in the other medium. |
| `hint` | A small clue shown after a wrong answer (optional) |
| `explanation` | Why the answer is right, shown after answering |
| `source`, `year` | Where the question came from. Shown under each question and in **Settings → Credits**. |
| `reviewed` | Set to `true` once a teacher has checked the question |
| `needsReview` | `true` hides the question from children until you fix it |
| `noShuffle` | (optional) `true` keeps options in A-B-C-D order, for example "All of these". The game already keeps the order automatically for options like "all of these" / "both". |

**Tip:** a single missing comma or quote breaks the whole file. After editing, always
run **"Check my question files"** in the converter.

---

## 🧪 About the starter questions

There are 24 starter questions (12 Maths, 12 Science), in both English and Malayalam.
They are **original USS-style practice questions written for this game**, not copied from
real papers. They are marked `"reviewed": false` because **a teacher has not checked them yet**,
especially the Malayalam wording. Please have a Malayalam-medium teacher look at them.

**Where to find real papers:** Kerala Pareeksha Bhavan (keralapareekshabhavan.in) usually
publishes previous USS papers. Many teacher blogs share model papers too. Before using
a paper, please make sure sharing it is allowed, and always fill in the **source** so
children and parents can see where it came from.

---

## 📁 What's in each folder

```
index.html          the game page
settings.js         ← numbers you can change
start-game.bat      double-click to play on this computer
css/                colours and layout
js/                 the game code (you don't need to touch this)
  world/            the 3D house, rooms, character
  ui/               the question panel
  lib/              Three.js (the 3D library)
data/
  questions/        ← the questions (add more here)
  lang/             ← all on-screen words in English (en.json) and Malayalam (ml.json)
  rooms.json        the rooms: name, subject, colour, place in the house, gift box spot
  shop.json         ← shop items and prices
  badges.json       ← badges and stickers
assets/fonts/       fonts: Manjari for Malayalam, Baloo Chettan 2 for English
tools/
  converter.html    question converter + file checker
  server.js         the tiny local server used by start-game.bat
```

## 🔒 Privacy

- No accounts, no names, no ads, no analytics, no cookies.
- The game never contacts any other website. Fonts and the 3D library are stored inside the project.
  (Only the converter tool loads a PDF reader from cdnjs, and only when an adult opens it.)
- Progress (coins, stars, which rooms are open) is saved in the browser's local storage on that device.
  **Settings → Erase all progress** deletes it.

## 📜 Credits & licences

- 3D: [Three.js](https://threejs.org) (MIT licence)
- Malayalam font: Manjari by Swathanthra Malayalam Computing (SIL Open Font License, see `assets/fonts/OFL-manjari.txt`)
- New-script (reformed) Malayalam font: Anek Malayalam by Ek Type (SIL Open Font License, see `assets/fonts/OFL-anek-malayalam.txt`)
- English font: Baloo Chettan 2 by Ek Type (SIL Open Font License, see `assets/fonts/OFL-baloo-chettan-2.txt`)
- Question sources are listed in the game under **Settings → Credits**.
