/**
 * UniComp Secure Parser v4.1
 *
 * Security features:
 * - DoS protection (input length, symbol count, timeout limits)
 * - Deterministic parsing without regex where possible
 * - Strict validation of all inputs
 * - Proper escaping and quoting
 * - Multi-line file parsing with comments support
 */

// ============================================================================
// SECURITY LIMITS
// ============================================================================

export const SECURITY_LIMITS = {
  MAX_INPUT_LENGTH: 10000,
  MAX_SYMBOLS: 1000,
  MAX_PARAMS_PER_SYMBOL: 10,
  MIN_GRID_SIZE: 2,
  MAX_GRID_SIZE: 100,
  TIMEOUT_MS: 100,
  MAX_LINES: 500,
} as const;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SymbolSpec {
  char: string;
  start: number;
  end: number;
  opacity?: number;
  color?: string;
  rotate?: number;
  flip?: 'h' | 'v' | 'hv';
  fontFamily?: string;
  id?: string;
  className?: string;
  name?: string;
  scale?: { x: number; y: number };
  margin?: { top: number; right: number; bottom: number; left: number };
  position?: { top: number; right: number; bottom: number; left: number };
  transition?: number;
}

export interface GridDimensions {
  width: number;
  height: number;
}

export interface UniCompSpec {
  gridSize: number;
  gridWidth: number;
  gridHeight: number;
  symbols: SymbolSpec[];
  raw: string;
  encoding?: string;
  name?: string;
  id?: string;
  className?: string;
}

export interface ParseError {
  message: string;
  position?: number;
  line?: number;
  column?: number;
  context?: string;
}

export type ParseResult =
  | { success: true; spec: UniCompSpec }
  | { success: false; error: ParseError };

export interface MultiLineParseResult {
  blocks: ParsedBlock[];
  totalLines: number;
  validCount: number;
  errorCount: number;
  errorLines: ErrorLine[];
}

export interface ParsedBlock {
  lineNumber: number;
  raw: string;
  result: ParseResult;
  name?: string;
}

export interface ErrorLine {
  lineNumber: number;
  column?: number;
  message: string;
  raw: string;
}

// ============================================================================
// SECURITY HELPERS
// ============================================================================

function isDigit(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function isLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isWhitespace(char: string): boolean {
  const code = char.charCodeAt(0);
  return code === 32 || code === 9 || code === 10 || code === 13;
}

function isIdentifierChar(char: string): boolean {
  return isLetter(char) || char === '_';
}

const SPECIAL_CHARS = new Set([
  '(', ')', '[', ']', '{', '}',
  ':', ';', ',', '-', '=',
  '"', "'", '`', '\\',
  '<', '>', '^', '@', '#', '№',
  '!', '?', '*', '×', '÷',
  '+', '_', '~', '/', '|',
  '&', '%', '$', ' '
]);

function needsQuoting(char: string): boolean {
  return isDigit(char) || SPECIAL_CHARS.has(char);
}

// ============================================================================
// TOKEN TYPES & TOKENIZER
// ============================================================================

enum TokenType {
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  DASH = 'DASH',
  EQUALS = 'EQUALS',
  NUMBER = 'NUMBER',
  SYMBOL = 'SYMBOL',
  QUOTED_STRING = 'QUOTED_STRING',
  IDENTIFIER = 'IDENTIFIER',
  TIMES = 'TIMES',
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN',
}

interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

class Tokenizer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private startTime: number;
  private inGridSpec: boolean = false;

  constructor(input: string) {
    if (input.length > SECURITY_LIMITS.MAX_INPUT_LENGTH) {
      throw new SecurityError(`Input too long: ${input.length} chars (max: ${SECURITY_LIMITS.MAX_INPUT_LENGTH})`);
    }
    this.input = input;
    this.startTime = Date.now();
  }

  private checkTimeout(): void {
    if (Date.now() - this.startTime > SECURITY_LIMITS.TIMEOUT_MS) {
      throw new SecurityError('Parsing timeout exceeded');
    }
  }

  private currentChar(): string | null {
    return this.position < this.input.length ? this.input[this.position] : null;
  }

  private advance(): void {
    if (this.position < this.input.length) {
      if (this.input[this.position] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  private skipWhitespace(): void {
    while (this.currentChar() && isWhitespace(this.currentChar()!)) {
      this.advance();
    }
  }

  private readNumber(): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    while (this.currentChar() && isDigit(this.currentChar()!)) {
      value += this.currentChar();
      this.advance();
    }

    if (this.currentChar() === '.') {
      value += this.currentChar();
      this.advance();
      while (this.currentChar() && isDigit(this.currentChar()!)) {
        value += this.currentChar();
        this.advance();
      }
    }

    return { type: TokenType.NUMBER, value, position: startPos, line: startLine, column: startCol };
  }

  private readQuotedString(quoteChar: string): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    this.advance();

    while (this.currentChar() && this.currentChar() !== quoteChar) {
      if (this.currentChar() === '\\') {
        this.advance();
        const escaped = this.currentChar();
        if (escaped) {
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            default: value += escaped;
          }
          this.advance();
        }
      } else {
        value += this.currentChar();
        this.advance();
      }
    }

    if (this.currentChar() === quoteChar) {
      this.advance();
    } else {
      throw new Error(`Unclosed quote starting at line ${startLine}, column ${startCol}`);
    }

    return { type: TokenType.QUOTED_STRING, value, position: startPos, line: startLine, column: startCol };
  }

  private readIdentifier(): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    while (this.currentChar() && isIdentifierChar(this.currentChar()!)) {
      value += this.currentChar();
      this.advance();
    }

    return { type: TokenType.IDENTIFIER, value, position: startPos, line: startLine, column: startCol };
  }

  private readSymbol(): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;

    if (this.currentChar() === '\\') {
      this.advance();
      const escaped = this.currentChar();
      if (escaped) {
        this.advance();
        return { type: TokenType.SYMBOL, value: escaped, position: startPos, line: startLine, column: startCol };
      }
      throw new Error(`Invalid escape at end of input`);
    }

    const char = this.currentChar();
    if (char) {
      const code = char.charCodeAt(0);
      if (code >= 0xD800 && code <= 0xDBFF) {
        this.advance();
        const low = this.currentChar();
        if (low) {
          this.advance();
          return { type: TokenType.SYMBOL, value: char + low, position: startPos, line: startLine, column: startCol };
        }
      }

      this.advance();
      return { type: TokenType.SYMBOL, value: char, position: startPos, line: startLine, column: startCol };
    }

    throw new Error(`Unexpected character at position ${startPos}`);
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.inGridSpec = false;

    while (this.position < this.input.length) {
      this.checkTimeout();
      this.skipWhitespace();

      if (this.position >= this.input.length) break;

      const char = this.currentChar()!;

      switch (char) {
        case '(':
          this.inGridSpec = true;
          this.tokens.push({ type: TokenType.LPAREN, value: '(', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case ')':
          this.inGridSpec = false;
          this.tokens.push({ type: TokenType.RPAREN, value: ')', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case '[':
          this.tokens.push({ type: TokenType.LBRACKET, value: '[', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case ']':
          this.tokens.push({ type: TokenType.RBRACKET, value: ']', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case ':':
          this.tokens.push({ type: TokenType.COLON, value: ':', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case ';':
          this.tokens.push({ type: TokenType.SEMICOLON, value: ';', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case ',':
          this.tokens.push({ type: TokenType.COMMA, value: ',', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case '-':
          this.tokens.push({ type: TokenType.DASH, value: '-', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case '×':
          this.tokens.push({ type: TokenType.TIMES, value: char, position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case 'x':
        case 'X':
          if (this.inGridSpec) {
            this.tokens.push({ type: TokenType.TIMES, value: char, position: this.position, line: this.line, column: this.column });
            this.advance();
          } else {
            this.tokens.push(this.readIdentifier());
          }
          break;
        case '=':
          this.tokens.push({ type: TokenType.EQUALS, value: '=', position: this.position, line: this.line, column: this.column });
          this.advance();
          break;
        case '"':
        case "'":
        case '`':
          this.tokens.push(this.readQuotedString(char));
          break;
        default:
          if (isDigit(char)) {
            this.tokens.push(this.readNumber());
          } else if (isIdentifierChar(char)) {
            this.tokens.push(this.readIdentifier());
          } else {
            // Check if it's a special character we should tokenized separately or as a symbol
            if (SPECIAL_CHARS.has(char)) {
                this.tokens.push({ type: TokenType.UNKNOWN, value: char, position: this.position, line: this.line, column: this.column });
                this.advance();
            } else {
                this.tokens.push(this.readSymbol());
            }
          }
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', position: this.position, line: this.line, column: this.column });
    return this.tokens;
  }
}

// ============================================================================
// COLOR VALIDATION
// ============================================================================

const VALID_COLORS = new Set([
  'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan',
  'magenta', 'lime', 'teal', 'indigo', 'violet', 'brown', 'gray', 'grey',
  'black', 'white', 'gold', 'silver', 'coral', 'salmon', 'crimson',
  'navy', 'olive', 'maroon', 'aqua', 'fuchsia', 'tomato', 'plum'
]);

function isValidColor(value: string): boolean {
  if (VALID_COLORS.has(value.toLowerCase())) return true;
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length !== 3 && hex.length !== 6 && hex.length !== 8) return false;
    for (let i = 0; i < hex.length; i++) {
      const code = hex.charCodeAt(i);
      const isHexDigit = isDigit(hex[i]) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
      if (!isHexDigit) return false;
    }
    return true;
  }
  return false;
}

// ============================================================================
// BOX VALUE PARSER (for margin / position)
// ============================================================================

function parseBoxValue(value: string): { top: number; right: number; bottom: number; left: number } {
  const dirMap: Record<string, string> = { t: 'top', r: 'right', b: 'bottom', l: 'left' };
  const result = { top: 0, right: 0, bottom: 0, left: 0 };

  const dirParts = value.split(/\s+/);
  let usedDir = false;
  for (const part of dirParts) {
    const match = part.match(/^(-?\d*\.?\d+)(t|r|b|l)$/i);
    if (match) {
      const val = parseFloat(match[1]);
      const dir = match[2].toLowerCase();
      (result as any)[dirMap[dir]] = val;
      usedDir = true;
    }
  }

  if (!usedDir) {
    const nums = value.split(/\s+/).map(v => parseFloat(v)).filter(n => !isNaN(n));
    if (nums.length === 1) {
      result.top = result.right = result.bottom = result.left = nums[0];
    } else if (nums.length === 2) {
      result.top = result.bottom = nums[0];
      result.left = result.right = nums[1];
    } else if (nums.length === 3) {
      result.top = nums[0];
      result.left = result.right = nums[1];
      result.bottom = nums[2];
    } else if (nums.length >= 4) {
      result.top = nums[0];
      result.right = nums[1];
      result.bottom = nums[2];
      result.left = nums[3];
    }
  }

  return result;
}

// ============================================================================
// PARSER ENGINE
// ============================================================================

class Parser {
  private tokens: Token[];
  private position: number = 0;
  private symbolCount: number = 0;
  private startTime: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.startTime = Date.now();
  }

  private checkTimeout(): void {
    if (Date.now() - this.startTime > SECURITY_LIMITS.TIMEOUT_MS) {
      throw new SecurityError('Parsing timeout exceeded');
    }
  }

  private checkSymbolLimit(): void {
    if (this.symbolCount > SECURITY_LIMITS.MAX_SYMBOLS) {
      throw new SecurityError(`Too many symbols: max ${SECURITY_LIMITS.MAX_SYMBOLS}`);
    }
  }

  private currentToken(): Token {
    return this.tokens[this.position];
  }

  private advance(): void {
    if (this.position < this.tokens.length - 1) {
      this.position++;
    }
  }

  private expect(type: TokenType): Token {
    const token = this.currentToken();
    if (token.type !== type) {
      throw new Error(
        `Expected ${type} but got ${token.type} "${token.value}" at line ${token.line}, column ${token.column}`
      );
    }
    const result = token;
    this.advance();
    return result;
  }

  private parseGridSpec(): GridDimensions {
    let width: number;
    let height: number;

    if (this.currentToken().type === TokenType.LPAREN) {
      this.advance();
      const firstNum = this.expect(TokenType.NUMBER);
      width = parseInt(firstNum.value, 10);

      if (this.currentToken().type === TokenType.TIMES) {
        this.advance();
        const secondNum = this.expect(TokenType.NUMBER);
        height = parseInt(secondNum.value, 10);
      } else {
        height = width;
      }

      this.expect(TokenType.RPAREN);
    } else {
      const numToken = this.expect(TokenType.NUMBER);
      width = parseInt(numToken.value, 10);
      height = width;
    }

    return { width, height };
  }

  private parseSymbolChar(): string {
    const token = this.currentToken();

    if (token.type === TokenType.SYMBOL) {
      this.advance();
      return token.value;
    } else if (token.type === TokenType.QUOTED_STRING) {
      this.advance();
      return token.value;
    } else if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      const firstChar = token.value.charAt(0);

      if (token.value.length > 1) {
        const remaining = token.value.slice(1);
        let allDigits = true;
        for (let i = 0; i < remaining.length; i++) {
          if (!isDigit(remaining[i])) {
            allDigits = false;
            break;
          }
        }

        if (allDigits) {
          const numToken: Token = {
            type: TokenType.NUMBER,
            value: remaining,
            position: token.position + 1,
            line: token.line,
            column: token.column + 1,
          };
          this.tokens.splice(this.position, 0, numToken);
        } else {
          return token.value;
        }
      }

      return firstChar;
    } else {
      throw new Error(
        `Expected symbol but got ${token.type} "${token.value}" at line ${token.line}, column ${token.column}`
      );
    }
  }

  private parseIndexRange(): { start: number; end: number } {
    const startToken = this.expect(TokenType.NUMBER);
    
    const dashToken = this.currentToken();
    if (dashToken.type !== TokenType.DASH) {
      throw new Error(`Expected '-' after index but got ${dashToken.type} "${dashToken.value}" at line ${dashToken.line}, column ${dashToken.column}`);
    }
    this.advance();
    
    // STRICT CHECK: The next token MUST be a NUMBER. 
    const nextToken = this.currentToken();
    if (nextToken.type !== TokenType.NUMBER) {
        throw new Error(
            `Expected number after '-' but got ${nextToken.type} "${nextToken.value}" at line ${nextToken.line}, column ${nextToken.column}. Invalid index range.`
        );
    }
    
    const endToken = this.expect(TokenType.NUMBER);

    return {
      start: parseInt(startToken.value, 10),
      end: parseInt(endToken.value, 10),
    };
  }

  private parseParameters(): Partial<SymbolSpec> {
    const params: Partial<SymbolSpec> = {};

    if (this.currentToken().type !== TokenType.LBRACKET) {
      return params;
    }

    this.advance();

    let paramCount = 0;

    while (this.currentToken().type !== TokenType.RBRACKET && this.currentToken().type !== TokenType.EOF) {
      paramCount++;
      if (paramCount > SECURITY_LIMITS.MAX_PARAMS_PER_SYMBOL) {
        throw new SecurityError(`Too many parameters: max ${SECURITY_LIMITS.MAX_PARAMS_PER_SYMBOL}`);
      }

      const keyToken = this.currentToken();
      if (keyToken.type !== TokenType.IDENTIFIER) {
        throw new Error(`Expected parameter key at line ${keyToken.line}, column ${keyToken.column}`);
      }
      this.advance();

      this.expect(TokenType.EQUALS);
      const valueToken = this.currentToken();

      let value: string;
      // Handle negative numbers (DASH followed by NUMBER)
      if (valueToken.type === TokenType.DASH) {
        this.advance();
        const numToken = this.currentToken();
        if (numToken.type === TokenType.NUMBER) {
          value = '-' + numToken.value;
          this.advance();
        } else {
          value = '-';
        }
      } else if (valueToken.type === TokenType.NUMBER) {
        value = valueToken.value;
        this.advance();
      } else if (valueToken.type === TokenType.SYMBOL) {
        value = valueToken.value;
        this.advance();
      } else if (valueToken.type === TokenType.QUOTED_STRING) {
        value = valueToken.value;
        this.advance();
      } else if (valueToken.type === TokenType.IDENTIFIER) {
        value = valueToken.value;
        this.advance();
      } else {
        throw new Error(
          `Expected parameter value at line ${valueToken.line}, column ${valueToken.column}`
        );
      }

      const key = keyToken.value.toLowerCase();
      switch (key) {
        case 'c':
        case 'color':
          if (!isValidColor(value)) {
            throw new Error(`Invalid color: "${value}"`);
          }
          params.color = value;
          break;
        case 'a':
        case 'alpha':
        case 'opacity': {
          const opacity = parseFloat(value);
          if (isNaN(opacity) || opacity < 0 || opacity > 1) {
            throw new Error(`Invalid opacity: "${value}" (must be 0-1)`);
          }
          params.opacity = opacity;
          break;
        }
        case 'r':
        case 'rotate': {
          const rotate = parseFloat(value);
          if (isNaN(rotate)) {
            throw new Error(`Invalid rotation: "${value}" (must be a number)`);
          }
          params.rotate = ((rotate % 360) + 360) % 360;
          break;
        }
        case 'f':
        case 'flip':
          if (value !== 'h' && value !== 'v' && value !== 'hv') {
            throw new Error(`Invalid flip: "${value}" (must be h, v, or hv)`);
          }
          params.flip = value;
          break;
        case 'font':
        case 'fontfamily':
          params.fontFamily = value;
          break;
        case 'n':
        case 'name':
          params.name = value;
          break;
        case 'id':
          params.id = value;
          break;
        case 'class':
        case 'classname':
          params.className = value;
          break;
        case 's':
        case 'scale': {
          const parts = value.split(',').map(v => v.trim());
          const sx = parseFloat(parts[0]);
          const sy = parts.length > 1 ? parseFloat(parts[1]) : sx;
          if (isNaN(sx) || isNaN(sy) || sx <= 0 || sy <= 0) {
            throw new Error(`Invalid scale: "${value}" (must be positive numbers)`);
          }
          params.scale = { x: sx, y: sy };
          break;
        }
        case 't':
        case 'transition': {
          const t = parseFloat(value);
          if (isNaN(t) || t < 0) {
            throw new Error(`Invalid transition: "${value}" (must be >= 0)`);
          }
          params.transition = t;
          break;
        }
        case 'm':
        case 'margin': {
          params.margin = parseBoxValue(value);
          break;
        }
        case 'p':
        case 'position': {
          params.position = parseBoxValue(value);
          break;
        }
        default:
          break;
      }

      if (this.currentToken().type === TokenType.SEMICOLON) {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return params;
  }

  private parseSymbol(gridWidth: number, gridHeight: number): SymbolSpec {
    this.checkTimeout();
    this.checkSymbolLimit();
    this.symbolCount++;

    const char = this.parseSymbolChar();
    const params = this.parseParameters();

    if (this.currentToken().type === TokenType.COMMA) {
      this.advance();
    }

    const { start, end } = this.parseIndexRange();

    const maxIndex = gridWidth * gridHeight - 1;
    if (start > maxIndex || end > maxIndex || start < 0 || end < 0) {
      throw new Error(
        `Index out of bounds. Valid range for ${gridWidth}×${gridHeight} grid is 0-${maxIndex}`
      );
    }

    return {
      char,
      start,
      end,
      ...params,
    } as SymbolSpec;
  }

  parse(): ParseResult {
    try {
      const grid = this.parseGridSpec();
      const { width: gridWidth, height: gridHeight } = grid;

      if (gridWidth < SECURITY_LIMITS.MIN_GRID_SIZE || gridWidth > SECURITY_LIMITS.MAX_GRID_SIZE) {
        throw new Error(`Grid width must be between ${SECURITY_LIMITS.MIN_GRID_SIZE} and ${SECURITY_LIMITS.MAX_GRID_SIZE}`);
      }
      if (gridHeight < SECURITY_LIMITS.MIN_GRID_SIZE || gridHeight > SECURITY_LIMITS.MAX_GRID_SIZE) {
        throw new Error(`Grid height must be between ${SECURITY_LIMITS.MIN_GRID_SIZE} and ${SECURITY_LIMITS.MAX_GRID_SIZE}`);
      }

      this.expect(TokenType.COLON);

      const symbols: SymbolSpec[] = [];

      while (this.currentToken().type !== TokenType.EOF) {
        symbols.push(this.parseSymbol(gridWidth, gridHeight));

        if (this.currentToken().type === TokenType.SEMICOLON) {
          this.advance();
        } else if (this.currentToken().type !== TokenType.EOF) {
          // If we are not at EOF and not at SEMICOLON, it's an error
          const token = this.currentToken();
          throw new Error(`Unexpected token ${token.type} "${token.value}" at line ${token.line}, column ${token.column}. Expected semicolon or end of input.`);
        }
      }

      return {
        success: true,
        spec: {
          gridSize: gridWidth,
          gridWidth,
          gridHeight,
          symbols,
          raw: this.tokens
            .filter((t) => t.type !== TokenType.EOF)
            .map((t) => t.value)
            .join(''),
        },
      };
    } catch (e) {
      return {
        success: false,
        error: {
          message: e instanceof Error ? e.message : 'Unknown parse error',
          position: this.currentToken().position,
          line: this.currentToken().line,
          column: this.currentToken().column,
        },
      };
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function parseUniComp(input: string): ParseResult {
  try {
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  } catch (e) {
    return {
      success: false,
      error: {
        message: e instanceof Error ? e.message : 'Tokenization error',
      },
    };
  }
}

export function parseMultiLine(input: string): MultiLineParseResult {
  const lines = input.split('\n');
  const blocks: ParsedBlock[] = [];
  const errorLines: ErrorLine[] = [];
  let validCount = 0;
  let errorCount = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    // Skip empty lines and all comment formats
    if (!trimmed || isCommentLine(trimmed)) {
      return;
    }

    const result = parseUniComp(trimmed);
    
    if (result.success) {
      validCount++;
      blocks.push({
        lineNumber,
        raw: line,
        result,
        name: result.spec.name || `Line ${lineNumber}`,
      });
    } else {
      const failResult = result as { success: false; error: ParseError };
      errorCount++;
      errorLines.push({
        lineNumber,
        column: failResult.error.column,
        message: failResult.error.message,
        raw: line,
      });
      blocks.push({
        lineNumber,
        raw: line,
        result,
      });
    }
  });

  return {
    blocks,
    totalLines: lines.length,
    validCount,
    errorCount,
    errorLines,
  };
}

export function resizeGrid(rule: string, newWidth: number, newHeight: number): string {
  const result = parseUniComp(rule);
  if (!result.success) return rule;

  const { spec } = result;
  const oldWidth = spec.gridWidth;
  const oldHeight = spec.gridHeight;

  const newSymbols = spec.symbols.map(sym => {
    const startX = sym.start % oldWidth;
    const startY = Math.floor(sym.start / oldWidth);
    const endX = sym.end % oldWidth;
    const endY = Math.floor(sym.end / oldWidth);

    const clampedStartX = Math.min(startX, newWidth - 1);
    const clampedStartY = Math.min(startY, newHeight - 1);
    const clampedEndX = Math.min(endX, newWidth - 1);
    const clampedEndY = Math.min(endY, newHeight - 1);

    const newStart = clampedStartY * newWidth + clampedStartX;
    const newEnd = clampedEndY * newWidth + clampedEndX;

    return { ...sym, start: newStart, end: newEnd };
  });

  return stringifySpec({
    ...spec,
    gridWidth: newWidth,
    gridHeight: newHeight,
    symbols: newSymbols,
  });
}

export function stringifySpec(spec: UniCompSpec): string {
  const gridPart = spec.gridWidth === spec.gridHeight 
    ? `(${spec.gridWidth})` 
    : `(${spec.gridWidth}×${spec.gridHeight})`;
  
  // Parameter type schema for proper serialization
  const STRING_PARAMS = new Set(['n', 'name', 'id', 'class', 'font', 'text']);
  
  function serializeParam(key: string, value: string | number): string {
    if (STRING_PARAMS.has(key) || (typeof value === 'string' && value.length > 1)) {
      return `${key}="${value}"`;
    }
    return `${key}=${value}`;
  }

  const symbolsPart = spec.symbols.map(sym => {
    let params = '';
    const p: string[] = [];
    if (sym.color) p.push(serializeParam('c', sym.color));
    if (sym.opacity !== undefined) p.push(serializeParam('a', sym.opacity));
    if (sym.rotate !== undefined) p.push(serializeParam('r', sym.rotate));
    if (sym.flip) p.push(serializeParam('f', sym.flip));
    if (sym.fontFamily) p.push(serializeParam('font', sym.fontFamily));
    if (sym.id) p.push(serializeParam('id', sym.id));
    if (sym.className) p.push(serializeParam('class', sym.className));
    if (sym.name) p.push(serializeParam('n', sym.name));
    if (sym.scale) p.push(`s=${sym.scale.x}${sym.scale.y !== sym.scale.x ? `,${sym.scale.y}` : ''}`);
    
    if (p.length > 0) params = `[${p.join(';')}]`;
    
    const charPart = (needsQuoting(sym.char) || sym.char.length > 1) ? `"${sym.char}"` : sym.char;
    return `${charPart}${params}${sym.start}-${sym.end}`;
  }).join(';');

  return `${gridPart}:${symbolsPart}`;
}

export function getRect(start: number, end: number, gridWidth: number) {
  const x1 = start % gridWidth;
  const y1 = Math.floor(start / gridWidth);
  const x2 = end % gridWidth;
  const y2 = Math.floor(end / gridWidth);

  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
    width: Math.abs(x2 - x1) + 1,
    height: Math.abs(y2 - y1) + 1,
  };
}

export function linearToCoords(index: number, gridWidth: number) {
  return {
    x: index % gridWidth,
    y: Math.floor(index / gridWidth),
  };
}

export function symbolToCoords(sym: { char: string; start: number; end: number }, gridWidth: number) {
  const x = sym.start % gridWidth;
  const y = Math.floor(sym.start / gridWidth);
  const ex = sym.end % gridWidth;
  const ey = Math.floor(sym.end / gridWidth);
  return { x, y, w: ex - x + 1, h: ey - y + 1 };
}

export function coordsToSymbolIndices(coords: { x: number; y: number; w: number; h: number }, gridWidth: number) {
  const start = coords.y * gridWidth + coords.x;
  const end = (coords.y + coords.h - 1) * gridWidth + (coords.x + coords.w - 1);
  return { start, end };
}

function isCommentLine(trimmed: string): boolean {
  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('--') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('<!--') ||
    trimmed.startsWith("'''") ||
    trimmed.startsWith('"""')
  );
}
