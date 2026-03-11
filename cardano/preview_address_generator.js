#!/usr/bin/env node

/**
 * Test Script: Generate Cardano Testnet Addresses
 * JavaScript version with embedded functions
 * need install blakejs package
 */

const crypto = require('crypto');

/**
 * Blake2b-224 hash function
 */
function blake2b_224(data) {
  const blake = require('blakejs');
  const hash = blake.blake2b(data, undefined, 28);
  return Buffer.from(hash);
}

/**
 * Bech32 encoding for Cardano
 */
function bech32_encode(readable, data) {
  const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

  if (!readable) throw new Error("Readable part is empty.");
  for (let i = 0; i < readable.length; i++) {
    const charCode = readable.charCodeAt(i);
    if (charCode < 33 || charCode > 126) throw new Error("Invalid character in readable part.");
  }

  // Convert to 5-bit integers
  const data_int5 = [];
  let bits = 0;
  let current = 0;
  for (const byte of data) {
    bits += 8;
    current = (current << 8) + byte;
    while (bits >= 5) {
      bits -= 5;
      const int5 = current >> bits;
      data_int5.push(int5);
      current -= int5 << bits;
    }
  }
  if (bits) {
    const int5 = (current << (5 - bits)) & 31;
    data_int5.push(int5);
  }

  // Calculate checksum
  let to_check = [];
  for (let char of readable) to_check.push(char.charCodeAt(0) >> 5);
  to_check.push(0);
  for (let char of readable) to_check.push(char.charCodeAt(0) & 31);
  to_check = to_check.concat(data_int5);
  to_check = to_check.concat([0, 0, 0, 0, 0, 0]);

  let checksum = 1;
  for (const int5 of to_check) {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ int5;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        checksum ^= BECH32_GENERATOR[i];
      }
    }
  }
  checksum ^= 1;

  for (let i = 0; i < 6; i++) {
    data_int5.push((checksum >> (5 * (5 - i))) & 31);
  }

  let result = readable + '1';
  for (const int5 of data_int5) {
    result += BECH32_CHARSET[int5];
  }
  return result;
}

// BIP39 English Wordlist (full 2048 words)
const wordlist = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
    "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
    "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
    "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
    "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
    "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
    "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
    "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
    "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
    "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
    "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
    "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
    "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
    "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
    "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
    "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
    "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
    "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
    "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
    "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
    "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
    "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
    "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
    "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
    "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
    "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
    "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas",
    "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry",
    "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category",
    "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century",
    "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase",
    "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child",
    "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle",
    "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk",
    "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close",
    "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut",
    "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort",
    "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control",
    "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "correct", "cost",
    "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack", "cradle",
    "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit", "creek",
    "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd", "crucial",
    "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture", "cup",
    "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle", "dad",
    "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day", "deal",
    "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease", "deer", "defense",
    "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial", "dentist", "deny",
    "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design", "desk",
    "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial", "diamond",
    "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner", "dinosaur",
    "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder", "display", "distance",
    "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain",
    "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon", "drama",
    "drastic", "draw", "dream", "dress", "drift", "drill", "drink", "drip", "drive", "drop",
    "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf",
    "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy", "echo",
    "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow",
    "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else", "embark", "embody",
    "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact", "end", "endless",
    "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough",
    "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal", "equip",
    "era", "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence", "estate",
    "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange",
    "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit",
    "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye",
    "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame",
    "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father",
    "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel",
    "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure",
    "file", "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm",
    "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame", "flash", "flat",
    "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush",
    "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot", "force",
    "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found", "fox",
    "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost", "frown",
    "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain",
    "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas",
    "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine",
    "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give", "glad",
    "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow",
    "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern",
    "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great", "green",
    "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess", "guide",
    "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand",
    "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head",
    "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero",
    "hidden", "high", "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold",
    "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse",
    "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor",
    "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon",
    "idea", "identify", "idle", "ignore", "ill", "illegal", "illness", "image", "imitate", "immense",
    "immune", "impact", "impose", "improve", "impulse", "inch", "include", "income", "increase", "index",
    "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject",
    "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect", "inside", "inspire",
    "install", "intact", "interest", "into", "invest", "invite", "involve", "iron", "island", "isolate",
    "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans", "jelly",
    "jewel", "job", "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle",
    "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key", "kick", "kid",
    "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee",
    "knife", "knock", "know", "lab", "label", "labor", "ladder", "lady", "lake", "lamp",
    "language", "laptop", "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn",
    "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg",
    "legal", "legend", "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter",
    "level", "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb",
    "limit", "link", "lion", "liquid", "list", "little", "live", "lizard", "load", "loan",
    "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge",
    "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine",
    "mad", "magic", "magnet", "maid", "mail", "main", "major", "make", "mammal", "man",
    "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine",
    "market", "marriage", "mask", "mass", "master", "match", "material", "math", "matrix", "matter",
    "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody",
    "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh",
    "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum",
    "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture",
    "mobile", "model", "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon",
    "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move",
    "movie", "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must",
    "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation",
    "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest",
    "net", "network", "neutral", "never", "news", "next", "nice", "night", "noble", "noise",
    "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel",
    "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure",
    "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office",
    "often", "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion",
    "online", "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard",
    "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer",
    "output", "outside", "oval", "oven", "over", "own", "owner", "oxygen", "oyster", "ozone",
    "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther",
    "paper", "parade", "parent", "park", "parrot", "party", "pass", "patch", "path", "patient",
    "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican",
    "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone",
    "photo", "phrase", "physical", "piano", "picnic", "picture", "piece", "pig", "pigeon", "pill",
    "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic",
    "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem", "poet", "point",
    "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion", "position", "possible",
    "post", "potato", "pottery", "poverty", "powder", "power", "practice", "praise", "predict", "prefer",
    "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison",
    "private", "prize", "problem", "process", "produce", "profit", "program", "project", "promote", "proof",
    "property", "prosper", "protect", "proud", "provide", "public", "pudding", "pull", "pulp", "pulse",
    "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse", "push", "put",
    "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote",
    "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain", "raise", "rally",
    "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather", "raven", "raw",
    "razor", "ready", "real", "reason", "rebel", "rebuild", "recall", "receive", "recipe", "record",
    "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax",
    "release", "relief", "rely", "remain", "remember", "remind", "remove", "render", "renew", "rent",
    "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble", "resist", "resource",
    "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review", "reward", "rhythm",
    "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right", "rigid", "ring",
    "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast", "robot", "robust",
    "rocket", "romance", "roof", "rookie", "room", "rose", "rotate", "rough", "round", "route",
    "royal", "rubber", "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle",
    "sadness", "safe", "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample",
    "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare",
    "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen",
    "script", "scrub", "sea", "search", "season", "seat", "second", "secret", "section", "security",
    "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series",
    "service", "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share", "shed",
    "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot",
    "shop", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick",
    "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar", "simple",
    "since", "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch", "ski",
    "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice", "slide",
    "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke",
    "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer", "social", "sock",
    "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song", "soon",
    "sorry", "sort", "soul", "sound", "soup", "source", "south", "space", "spare", "spatial",
    "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike",
    "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread",
    "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff", "stage", "stairs",
    "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem", "step", "stereo",
    "stick", "still", "sting", "stock", "stomach", "stone", "stool", "story", "stove", "strategy",
    "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject", "submit",
    "subway", "success", "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun",
    "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise", "surround",
    "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear", "sweet", "swift",
    "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system", "table", "tackle",
    "tag", "tail", "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo",
    "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent", "term",
    "test", "text", "thank", "that", "theme", "then", "theory", "there", "they", "thing",
    "this", "thought", "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide", "tiger",
    "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco",
    "today", "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone",
    "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise",
    "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic",
    "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree",
    "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck",
    "true", "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble",
    "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin",
    "twist", "two", "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover",
    "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown",
    "unlock", "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset",
    "urban", "urge", "usage", "use", "used", "useful", "useless", "usual", "utility", "vacant",
    "vacuum", "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast",
    "vault", "vehicle", "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very",
    "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage",
    "violin", "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice",
    "void", "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall",
    "walnut", "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave",
    "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird",
    "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip",
    "whisper", "wide", "width", "wife", "wild", "will", "win", "window", "wine", "wing",
    "wink", "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman",
    "wonder", "wood", "wool", "word", "work", "world", "worry", "worth", "wrap", "wreck",
    "wrestle", "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth",
    "zebra", "zero", "zone", "zoo"
];

/**
 * Wordlist class (simplified version)
 */
class Wordlist {
  constructor(words) {
    this.words = words;
    this.indexMap = new Map();
    words.forEach((word, index) => {
      this.indexMap.set(word, index);
    });
  }
  
  getNumber(word) {
    const index = this.indexMap.get(word);
    if (index === undefined) {
      throw new Error(`Word not found in wordlist: ${word}`);
    }
    return index;
  }
}

// Create wordlist instance
const bip39Wordlist = new Wordlist(wordlist);

/**
 * Checksum Error
 */
class ChecksumError extends Error {
  constructor() {
    super('Checksum is not correct.');
  }
}

/**
 * Generate entropy from mnemonic (BIP39 compliant with checksum)
 */
function seed_to_entropy(seed) {
    let entropy = Buffer.alloc(0);
    let bits = 0;
    let rest = 0;

    for (const word of seed) {
        const number = bip39Wordlist.getNumber(word);
        const byte = (rest << (8 - bits)) | (number >> (3 + bits));
        entropy = Buffer.concat([entropy, Buffer.from([byte])]);
        bits += 3;
        rest = number & ((1 << bits) - 1);
        if (bits > 8) {
            entropy = Buffer.concat([entropy, Buffer.from([rest >> (bits - 8)])]);
            bits -= 8;
            rest = number & ((1 << bits) - 1);
        }
    }

    const hash = crypto.createHash('sha256').update(entropy).digest();
    const first_byte = hash[0];
    const checksum_bits = entropy.length / 4;
    if ((first_byte >> (8 - checksum_bits)) !== rest) {
        throw new ChecksumError();
    }

    return entropy;
}

/**
 * Generate master key from entropy
 */
function entropy_to_masterkey(entropy) {
  const key = crypto.pbkdf2Sync('', entropy, 4096, 96, 'sha512');
  key[0] &= 0b11111000;
  key[31] &= 0b00011111;
  key[31] |= 0b01000000;
  return key;
}

/**
 * Generate testnet payment address
 */
function generate_shelley_testnet_address(payment_key, stake_key) {
  if (payment_key === null) {
    if (stake_key === null) throw new Error("At least one key required.");
    const stake_hash = blake2b_224(stake_key);
    const data = Buffer.concat([Buffer.from([0xe0]), stake_hash]);
    return bech32_encode('stake_test', data);
  } else {
    const payment_hash = blake2b_224(payment_key);
    if (stake_key === null) {
      // Shelley testnet enterprise address: [0x60] + payment_hash
      const data = Buffer.concat([Buffer.from([0x60]), payment_hash]);
      return bech32_encode('addr_test', data);
    } else {
      const stake_hash = blake2b_224(stake_key);
      // Shelley testnet base address: [0x00] + payment_hash + stake_hash
      const data = Buffer.concat([Buffer.from([0x00]), payment_hash, stake_hash]);
      return bech32_encode('addr_test', data);
    }
  }
}

// Ed25519 constants (from cardano.ts)
const P = 2n ** 255n - 19n;
const L = 2n ** 252n + 27742317777372353535851937790883648493n;

// Ed25519 math functions (from cardano.ts)
function expmod(b, e, m) {
  let res = 1n;
  b %= m;
  while (e > 0n) {
    if (e % 2n === 1n) res = (res * b) % m;
    b = (b * b) % m;
    e /= 2n;
  }
  return res;
}

function inv(x) {
  return expmod(x, P - 2n, P);
}

const d = -121665n * inv(121666n) % P;
const I = expmod(2n, (P - 1n) / 4n, P);

function recover_x(y, sign) {
  const x2 = (y * y - 1n) * inv(d * y * y + 1n) % P;
  let x = expmod(x2, (P + 3n) / 8n, P);
  if ((x * x - x2) % P !== 0n) x = (x * I) % P;
  if (x % 2n !== sign) x = P - x;
  return x;
}

const Gy = 4n * inv(5n) % P;
const Gx = recover_x(Gy, 0n);
const G = [Gx, Gy];

function edwards_add(P1, P2) {
  const [x1, y1] = P1;
  const [x2, y2] = P2;
  const x3 = (x1 * y2 + x2 * y1) * inv(1n + d * x1 * x2 * y1 * y2) % P;
  const y3 = (y1 * y2 + x1 * x2) * inv(1n - d * x1 * x2 * y1 * y2) % P;
  return [(x3 + P) % P, (y3 + P) % P];
}

function edwards_mul(P1, e) {
  let res = [0n, 1n];
  let q = P1;
  while (e > 0n) {
    if (e % 2n === 1n) res = edwards_add(res, q);
    q = edwards_add(q, q);
    e /= 2n;
  }
  return res;
}

function encode_point(P) {
  let [x, y] = P;
  const bytes = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number(y & 0xFFn);
    y >>= 8n;
  }
  if (x % 2n === 1n) bytes[31] |= 0x80;
  return bytes;
}

/**
 * Convert master key to root key (from cardano.ts)
 */
function masterkey_to_rootkey(masterkey) {
  const c = masterkey.slice(64);
  const k = masterkey.slice(0, 64);
  // Read 32 bytes as little-endian bigint for k_L
  const k_L_bigint = BigInt('0x' + Buffer.from(k.slice(0, 32)).reverse().toString('hex'));
  const A = encode_point(edwards_mul(G, k_L_bigint));
  return [k, A, c];
}

/**
 * Derive child key from parent key (from cardano.ts)
 */
function child_key(k_parent, A_parent, c_parent, i) {
  const index = Buffer.alloc(4);
  index.writeUInt32LE(i, 0);

  let Z;
  let c;

  if (i < 2 ** 31) {
    Z = crypto.createHmac('sha512', c_parent).update(Buffer.concat([Buffer.from([0x02]), A_parent, index])).digest();
    c = crypto.createHmac('sha512', c_parent).update(Buffer.concat([Buffer.from([0x03]), A_parent, index])).digest().slice(32);
  } else {
    Z = crypto.createHmac('sha512', c_parent).update(Buffer.concat([Buffer.from([0x00]), k_parent, index])).digest();
    c = crypto.createHmac('sha512', c_parent).update(Buffer.concat([Buffer.from([0x01]), k_parent, index])).digest().slice(32);
  }

  const z_L = BigInt('0x' + Buffer.from(Z.slice(0, 28)).reverse().toString('hex')) * 8n;
  const k_parent_L = BigInt('0x' + Buffer.from(k_parent.slice(0, 32)).reverse().toString('hex'));
  const k_L_new = (z_L + k_parent_L);

  if (k_L_new % L === 0n) throw new Error("k_L is zero.");

  const z_R = BigInt('0x' + Buffer.from(Z.slice(32)).reverse().toString('hex'));
  const k_parent_R = BigInt('0x' + Buffer.from(k_parent.slice(32)).reverse().toString('hex'));
  const k_R_new = (z_R + k_parent_R) % (2n ** 256n);

  const k_new = Buffer.concat([
    Buffer.from(k_L_new.toString(16).padStart(64, '0'), 'hex').reverse(),
    Buffer.from(k_R_new.toString(16).padStart(64, '0'), 'hex').reverse()
  ]);

  const A_new = encode_point(edwards_mul(G, k_L_new));
  return [k_new, A_new, c];
}

/**
 * Proper BIP32 derivation from master key to public key (from cardano.ts)
 */
function masterkey_to_pubkey(masterkey, path) {
  let [k, A, c] = masterkey_to_rootkey(masterkey);
  for (const component of path.split('/')) {
    if (!component || component === 'm') continue;
    let index;
    if (component.endsWith("'")) {
      index = parseInt(component.slice(0, -1)) + 2 ** 31;
    } else {
      index = parseInt(component);
    }
    [k, A, c] = child_key(k, A, c, index);
  }
  return A; // Return public key
}

/**
 * Generate valid BIP39 mnemonic with checksum
 */
function generateValidBIP39Mnemonic() {
  // Generate random entropy (128 bits = 12 words)
  const entropy = crypto.randomBytes(16);
  
  // Convert to binary string
  let binary = '';
  for (const byte of entropy) {
    binary += byte.toString(2).padStart(8, '0');
  }
  
  // Add checksum (first 4 bits of SHA256)
  const hash = crypto.createHash('sha256').update(entropy).digest();
  const hashBinary = hash[0].toString(2).padStart(8, '0');
  const checksum = hashBinary.slice(0, 4);
  
  // Combine entropy + checksum
  const fullBinary = binary + checksum;
  
  // Convert to 11-bit chunks and map to words
  const mnemonic = [];
  for (let i = 0; i < fullBinary.length; i += 11) {
    const chunk = fullBinary.slice(i, i + 11);
    const index = parseInt(chunk, 2);
    mnemonic.push(wordlist[index]);
  }
  
  return mnemonic;
}

/**
 * Main function
 */
function main() {
  console.log('🧪 Test Script: Generate Cardano Testnet Addresses\n');
  console.log('='.repeat(60));

  // Generate valid BIP39 mnemonic with checksum
  const mnemonic = generateValidBIP39Mnemonic();
  console.log(`📝 Mnemonic: ${mnemonic.join(' ')}\n`);

  try {
    // Generate entropy and master key
    const entropy = seed_to_entropy(mnemonic);
    const masterKey = entropy_to_masterkey(entropy);
    
    // Derive keys using proper BIP32 derivation
    const paymentKey = masterkey_to_pubkey(masterKey, "1852'/1815'/0'/0/0");
    const stakeKey = masterkey_to_pubkey(masterKey, "1852'/1815'/0'/2/0");
    
    console.log('🔑 Generated Keys:');
    console.log(`   Master Key: ${masterKey.toString('hex').slice(0, 32)}...`);
    console.log(`   Payment Key: ${paymentKey.toString('hex')}`);
    console.log(`   Stake Key: ${stakeKey.toString('hex')}\n`);

    // Generate addresses
    console.log('🏠 Generated Testnet Addresses:');
    
    const paymentAddress = generate_shelley_testnet_address(paymentKey, null);
    console.log(`   Payment Address: ${paymentAddress}`);
    
    const stakeAddress = generate_shelley_testnet_address(null, stakeKey);
    console.log(`   Stake Address: ${stakeAddress}`);
    
    const delegatedAddress = generate_shelley_testnet_address(paymentKey, stakeKey);
    console.log(`   Delegated Address: ${delegatedAddress}\n`);

    console.log('✅ Verification:');
    console.log(`   Payment address starts with addr_test: ${paymentAddress.startsWith('addr_test') ? '✅' : '❌'}`);
    console.log(`   Stake address starts with stake_test: ${stakeAddress.startsWith('stake_test') ? '✅' : '❌'}`);
    console.log(`   Delegated address starts with addr_test: ${delegatedAddress.startsWith('addr_test') ? '✅' : '❌'}\n`);

    console.log('🎉 All testnet addresses generated successfully!');
    console.log('='.repeat(60));
    console.log('💡 You can use these addresses on Cardano testnet!');

  } catch (error) {
    console.error('❌ Error generating addresses:', error.message);
    console.error(error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateValidBIP39Mnemonic,
  generate_shelley_testnet_address,
  main
};
