/**
 * Internationalization (i18n) system for UniComp
 */

export type SupportedLocale = 
  | 'en' | 'ru' | 'uk' | 'de' | 'fr' | 'it' | 'es' 
  | 'lt' | 'kk' | 'zh' | 'hi' | 'ja' | 'ko'
  | 'pt' | 'ar' | 'tr' | 'vi' | 'pl' | 'nl';

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
];

export interface Translations {
  appName: string;
  appSubtitle: string;
  layerRendering: string;
  anySymbol: string;
  ruleEditor: string;
  editorPlaceholder: string;
  validBlocks: string;
  errorBlocks: string;
  line: string;
  column: string;
  selectBlock: string;
  defaultBlockName: string;
  showGrid: string;
  showIndices: string;
  gridVisualization: string;
  examplePresets: string;
  chemistry: string;
  superscript: string;
  vectorF: string;
  formula: string;
  fraction: string;
  integral: string;
  rectangular: string;
  complex: string;
  multiLayer: string;
  coloredVector: string;
  rotations: string;
  reflection: string;
  transparency: string;
  multiLineDemo: string;
  import: string;
  export: string;
  exportCurrent: string;
  exportAll: string;
  exportCanvas: string;
  exportComponent: string;
  importFile: string;
  exportFile: string;
  copyRule: string;
  copyError: string;
  errorInRule: string;
  fixErrorFirst: string;
  invalidFormat: string;
  emptyInput: string;
  formatReference: string;
  basicSyntax: string;
  gridSpec: string;
  squareGrid: string;
  rectangularGrid: string;
  symbolSpec: string;
  symbolParams: string;
  paramColor: string;
  paramRotation: string;
  paramOpacity: string;
  paramFlip: string;
  paramName: string;
  paramId: string;
  paramClass: string;
  escaping: string;
  comments: string;
  resultPreview: string;
  specification: string;
  gridSize: string;
  symbols: string;
  noValidSpec: string;
  footerTagline: string;
  formatHint: string;
  escapingHint: string;
  ok: string;
  cancel: string;
  close: string;
  download: string;
  copy: string;
  copied: string;
}

const en: Translations = {
  appName: 'UniComp',
  appSubtitle: 'Universal Symbol Composition System',
  layerRendering: 'Layer Rendering',
  anySymbol: 'Any Unicode Symbol',
  ruleEditor: 'Rule Editor',
  editorPlaceholder: '(5):F5-24;→0-9 or (10×3):F15-17 for rectangular grid',
  validBlocks: 'valid',
  errorBlocks: 'errors',
  line: 'Line',
  column: 'Col',
  selectBlock: 'Select Block',
  defaultBlockName: 'Block',
  showGrid: 'Show Grid',
  showIndices: 'Show Indices',
  gridVisualization: 'Grid Visualization',
  examplePresets: 'Example Presets',
  chemistry: 'Chemistry: H₂O',
  superscript: 'Superscript',
  vectorF: 'Vector F',
  formula: 'Formula F=ma',
  fraction: 'Fraction',
  integral: 'Integral',
  rectangular: 'Rectangular',
  complex: 'Complex',
  multiLayer: 'Multi-layer',
  coloredVector: 'Colored Vector',
  rotations: 'Rotations →',
  reflection: 'Reflection',
  transparency: 'Transparency',
  multiLineDemo: 'Multi-line Demo',
  import: 'Import',
  export: 'Export',
  exportCurrent: 'Export Current',
  exportAll: 'Export All',
  exportCanvas: 'Export as PNG',
  exportComponent: 'Export as Component',
  importFile: 'Import File',
  exportFile: 'Export File',
  copyRule: 'Copy Rule',
  copyError: 'Copy Error',
  errorInRule: 'Error in rule',
  fixErrorFirst: 'Please fix errors before exporting',
  invalidFormat: 'Invalid format',
  emptyInput: 'Empty input',
  formatReference: 'Format Reference',
  basicSyntax: 'Basic Syntax',
  gridSpec: 'Grid Specification',
  squareGrid: 'Square grid',
  rectangularGrid: 'Rectangular grid',
  symbolSpec: 'Symbol Specification',
  symbolParams: 'Symbol Parameters',
  paramColor: 'Color',
  paramRotation: 'Rotation (degrees)',
  paramOpacity: 'Opacity (0-1)',
  paramFlip: 'Flip (h/v/hv)',
  paramName: 'Display name',
  paramId: 'ID for reference',
  paramClass: 'CSS class',
  escaping: 'Escaping',
  comments: 'Comments',
  resultPreview: 'Result Preview',
  specification: 'Specification',
  gridSize: 'Grid Size',
  symbols: 'Symbols',
  noValidSpec: 'No valid specification',
  footerTagline: 'one function replaces thousands of symbols',
  formatHint: 'Format',
  escapingHint: 'Escaping',
  ok: 'OK',
  cancel: 'Cancel',
  close: 'Close',
  download: 'Download',
  copy: 'Copy',
  copied: 'Copied!',
};

const ru: Translations = {
  appName: 'UniComp',
  appSubtitle: 'Универсальная Система Компоновки Символов',
  layerRendering: 'Послойный рендеринг',
  anySymbol: 'Любой Unicode символ',
  ruleEditor: 'Редактор правил',
  editorPlaceholder: '(5):F5-24;→0-9 или (10×3):F15-17 для прямоугольной сетки',
  validBlocks: 'валидных',
  errorBlocks: 'ошибок',
  line: 'Строка',
  column: 'Поз',
  selectBlock: 'Выберите блок',
  defaultBlockName: 'Блок',
  showGrid: 'Показать сетку',
  showIndices: 'Показать индексы',
  gridVisualization: 'Визуализация сетки',
  examplePresets: 'Примеры пресетов',
  chemistry: 'Химия: H₂O',
  superscript: 'Надстрочный',
  vectorF: 'Вектор F',
  formula: 'Формула F=ma',
  fraction: 'Дробь',
  integral: 'Интеграл',
  rectangular: 'Прямоугольная',
  complex: 'Сложная',
  multiLayer: 'Многослойная',
  coloredVector: 'Цветной вектор',
  rotations: 'Повороты →',
  reflection: 'Отражение',
  transparency: 'Прозрачность',
  multiLineDemo: 'Многострочный пример',
  import: 'Импорт',
  export: 'Экспорт',
  exportCurrent: 'Экспорт текущего',
  exportAll: 'Экспорт всех',
  exportCanvas: 'Экспорт как PNG',
  exportComponent: 'Экспорт как компонент',
  importFile: 'Импорт файла',
  exportFile: 'Экспорт файла',
  copyRule: 'Копировать правило',
  copyError: 'Копировать ошибку',
  errorInRule: 'Ошибка в правиле',
  fixErrorFirst: 'Исправьте ошибки перед экспортом',
  invalidFormat: 'Неверный формат',
  emptyInput: 'Пустой ввод',
  formatReference: 'Справочник формата',
  basicSyntax: 'Базовый синтаксис',
  gridSpec: 'Спецификация сетки',
  squareGrid: 'Квадратная сетка',
  rectangularGrid: 'Прямоугольная сетка',
  symbolSpec: 'Спецификация символа',
  symbolParams: 'Параметры символа',
  paramColor: 'Цвет',
  paramRotation: 'Поворот (градусы)',
  paramOpacity: 'Прозрачность (0-1)',
  paramFlip: 'Отражение (h/v/hv)',
  paramName: 'Отображаемое имя',
  paramId: 'ID для ссылки',
  paramClass: 'CSS класс',
  escaping: 'Экранирование',
  comments: 'Комментарии',
  resultPreview: 'Предпросмотр результата',
  specification: 'Спецификация',
  gridSize: 'Размер сетки',
  symbols: 'Символы',
  noValidSpec: 'Нет валидной спецификации',
  footerTagline: 'одна функция заменяет тысячи символов',
  formatHint: 'Формат',
  escapingHint: 'Экранирование',
  ok: 'OK',
  cancel: 'Отмена',
  close: 'Закрыть',
  download: 'Скачать',
  copy: 'Копировать',
  copied: 'Скопировано!',
};

const uk: Translations = {
  appName: 'UniComp',
  appSubtitle: 'Універсальна Система Компонування Символів',
  layerRendering: 'Пошаровий рендеринг',
  anySymbol: 'Будь-який Unicode символ',
  ruleEditor: 'Редактор правил',
  editorPlaceholder: '(5):F5-24;→0-9 або (10×3):F15-17 для прямокутної сітки',
  validBlocks: 'валідних',
  errorBlocks: 'помилок',
  line: 'Рядок',
  column: 'Поз',
  selectBlock: 'Виберіть блок',
  defaultBlockName: 'Блок',
  showGrid: 'Показати сітку',
  showIndices: 'Показати індекси',
  gridVisualization: 'Візуалізація сітки',
  examplePresets: 'Приклади пресетів',
  chemistry: 'Хімія: H₂O',
  superscript: 'Надрядковий',
  vectorF: 'Вектор F',
  formula: 'Формула F=ma',
  fraction: 'Дріб',
  integral: 'Інтеграл',
  rectangular: 'Прямокутна',
  complex: 'Складна',
  multiLayer: 'Багатошарова',
  coloredVector: 'Кольоровий вектор',
  rotations: 'Повороти →',
  reflection: 'Відображення',
  transparency: 'Прозорість',
  multiLineDemo: 'Багаторядковий приклад',
  import: 'Імпорт',
  export: 'Експорт',
  exportCurrent: 'Експорт поточного',
  exportAll: 'Експорт всіх',
  exportCanvas: 'Експорт як PNG',
  exportComponent: 'Експорт як компонент',
  importFile: 'Імпорт файлу',
  exportFile: 'Експорт файлу',
  copyRule: 'Копіювати правило',
  copyError: 'Копіювати помилку',
  errorInRule: 'Помилка в правилі',
  fixErrorFirst: 'Виправте помилки перед експортом',
  invalidFormat: 'Невірний формат',
  emptyInput: 'Порожній ввід',
  formatReference: 'Довідник формату',
  basicSyntax: 'Базовий синтаксис',
  gridSpec: 'Специфікація сітки',
  squareGrid: 'Квадратна сітка',
  rectangularGrid: 'Прямокутна сітка',
  symbolSpec: 'Специфікація символу',
  symbolParams: 'Параметри символу',
  paramColor: 'Колір',
  paramRotation: 'Поворот (градуси)',
  paramOpacity: 'Прозорість (0-1)',
  paramFlip: 'Відображення (h/v/hv)',
  paramName: 'Відображуване ім\'я',
  paramId: 'ID для посилання',
  paramClass: 'CSS клас',
  escaping: 'Екранування',
  comments: 'Коментарі',
  resultPreview: 'Попередній перегляд',
  specification: 'Специфікація',
  gridSize: 'Розмір сітки',
  symbols: 'Символи',
  noValidSpec: 'Немає валідної специфікації',
  footerTagline: 'одна функція замінює тисячі символів',
  formatHint: 'Формат',
  escapingHint: 'Екранування',
  ok: 'OK',
  cancel: 'Скасувати',
  close: 'Закрити',
  download: 'Завантажити',
  copy: 'Копіювати',
  copied: 'Скопійовано!',
};

const de: Translations = { ...en, appSubtitle: 'Universelles Symbol-Kompositionssystem', layerRendering: 'Schicht-Rendering', anySymbol: 'Jedes Unicode-Symbol', ruleEditor: 'Regel-Editor', validBlocks: 'gültig', errorBlocks: 'Fehler', line: 'Zeile', column: 'Pos', selectBlock: 'Block wählen', defaultBlockName: 'Block', showGrid: 'Raster anzeigen', showIndices: 'Indizes anzeigen', gridVisualization: 'Raster-Visualisierung', examplePresets: 'Beispiel-Vorlagen', import: 'Importieren', export: 'Exportieren', errorInRule: 'Fehler in Regel', fixErrorFirst: 'Bitte beheben Sie Fehler vor dem Export', formatReference: 'Format-Referenz', resultPreview: 'Ergebnis-Vorschau', specification: 'Spezifikation', gridSize: 'Rastergröße', symbols: 'Symbole', noValidSpec: 'Keine gültige Spezifikation', footerTagline: 'eine Funktion ersetzt tausende Symbole', ok: 'OK', cancel: 'Abbrechen', close: 'Schließen', download: 'Herunterladen', copy: 'Kopieren', copied: 'Kopiert!' };
const fr: Translations = { ...en, appSubtitle: 'Système Universel de Composition de Symboles', layerRendering: 'Rendu par couches', anySymbol: 'Tout symbole Unicode', ruleEditor: 'Éditeur de règles', validBlocks: 'valides', errorBlocks: 'erreurs', line: 'Ligne', column: 'Col', selectBlock: 'Sélectionner un bloc', defaultBlockName: 'Bloc', showGrid: 'Afficher la grille', showIndices: 'Afficher les indices', gridVisualization: 'Visualisation de la grille', examplePresets: 'Exemples de préréglages', import: 'Importer', export: 'Exporter', errorInRule: 'Erreur dans la règle', fixErrorFirst: 'Veuillez corriger les erreurs avant l\'export', formatReference: 'Référence du format', resultPreview: 'Aperçu du résultat', specification: 'Spécification', gridSize: 'Taille de la grille', symbols: 'Symboles', noValidSpec: 'Aucune spécification valide', footerTagline: 'une fonction remplace des milliers de symboles', ok: 'OK', cancel: 'Annuler', close: 'Fermer', download: 'Télécharger', copy: 'Copier', copied: 'Copié !' };
const it: Translations = { ...en, appSubtitle: 'Sistema Universale di Composizione Simboli', layerRendering: 'Rendering a strati', anySymbol: 'Qualsiasi simbolo Unicode', ruleEditor: 'Editor regole', validBlocks: 'validi', errorBlocks: 'errori', line: 'Riga', column: 'Col', selectBlock: 'Seleziona blocco', defaultBlockName: 'Blocco', showGrid: 'Mostra griglia', showIndices: 'Mostra indici', gridVisualization: 'Visualizzazione griglia', examplePresets: 'Esempi preimpostati', import: 'Importa', export: 'Esporta', errorInRule: 'Errore nella regola', fixErrorFirst: 'Correggi gli errori prima di esportare', formatReference: 'Riferimento formato', resultPreview: 'Anteprima risultato', specification: 'Specifica', gridSize: 'Dimensione griglia', symbols: 'Simboli', noValidSpec: 'Nessuna specifica valida', footerTagline: 'una funzione sostituisce migliaia di simboli', ok: 'OK', cancel: 'Annulla', close: 'Chiudi', download: 'Scarica', copy: 'Copia', copied: 'Copiato!' };
const es: Translations = { ...en, appSubtitle: 'Sistema Universal de Composición de Símbolos', layerRendering: 'Renderizado por capas', anySymbol: 'Cualquier símbolo Unicode', ruleEditor: 'Editor de reglas', validBlocks: 'válidos', errorBlocks: 'errores', line: 'Línea', column: 'Col', selectBlock: 'Seleccionar bloque', defaultBlockName: 'Bloque', showGrid: 'Mostrar cuadrícula', showIndices: 'Mostrar índices', gridVisualization: 'Visualización de cuadrícula', examplePresets: 'Ejemplos preestablecidos', import: 'Importar', export: 'Exportar', errorInRule: 'Error en la regla', fixErrorFirst: 'Corrija los errores antes de exportar', formatReference: 'Referencia de formato', resultPreview: 'Vista previa del resultado', specification: 'Especificación', gridSize: 'Tamaño de cuadrícula', symbols: 'Símbolos', noValidSpec: 'No hay especificación válida', footerTagline: 'una función reemplaza miles de símbolos', ok: 'OK', cancel: 'Cancelar', close: 'Cerrar', download: 'Descargar', copy: 'Copiar', copied: '¡Copiado!' };

const pt: Translations = { ...en, appSubtitle: 'Sistema Universal de Composição de Símbolos' };
const lt: Translations = { ...en, appSubtitle: 'Universali simbolių kompozicijos sistema' };
const kk: Translations = { ...en, appSubtitle: 'Әмбебап символдар композициясы жүйесі' };
const zh: Translations = { ...en, appSubtitle: '通用符号组合系统', import: '导入', export: '导出' };
const hi: Translations = { ...en, appSubtitle: 'यूनिवर्सल सिंबल कंपोजिशन सिस्टम' };
const ja: Translations = { ...en, appSubtitle: 'ユニバーサルシンボル構成システム' };
const ko: Translations = { ...en, appSubtitle: '범용 기호 구성 시스템' };
const ar: Translations = { ...en, appSubtitle: 'نظام تكوين الرموز العالمي' };
const tr: Translations = { ...en, appSubtitle: 'Evrensel Sembol Kompozisyon Sistemi' };
const vi: Translations = { ...en, appSubtitle: 'Hệ thống Soạn thảo Ký hiệu Phổ quát' };
const pl: Translations = { ...en, appSubtitle: 'Uniwersalny System Kompozycji Symboli' };
const nl: Translations = { ...en, appSubtitle: 'Universeel Symbool Compositie Systeem' };

const translations: Record<SupportedLocale, Translations> = {
  en, ru, uk, de, fr, it, es, pt, lt, kk, zh, hi, ja, ko, ar, tr, vi, pl, nl,
};

export function detectBrowserLocale(): SupportedLocale {
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (browserLang in translations) {
    return browserLang as SupportedLocale;
  }
  return 'en';
}

export function getTranslations(locale: SupportedLocale): Translations {
  return translations[locale] || translations.en;
}

export function t(locale: SupportedLocale, key: keyof Translations): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

const LOCALE_STORAGE_KEY = 'unicomp_locale';

export function getSavedLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && saved in translations) {
      return saved as SupportedLocale;
    }
  } catch {
    // localStorage not available
  }
  return detectBrowserLocale();
}

export function saveLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }
}
