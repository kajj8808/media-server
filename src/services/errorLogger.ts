import fs from "fs";
import path from "path";

// 상수 정의
const ERROR_LOG_CONFIG = {
  BASE_DIR: "error-logs",
  SUBDIRS: {
    EPISODE_PARSING: "episode-parsing",
    SERVER_ERRORS: "server-errors"
  },
  MAX_EPISODE_NUMBER: 999,
  MIN_EPISODE_NUMBER: 1
} as const;

// 로그 디렉터리 자동 생성
function ensureLogDirectories() {
  const baseDir = ERROR_LOG_CONFIG.BASE_DIR;
  const subdirs = Object.values(ERROR_LOG_CONFIG.SUBDIRS);
  
  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    subdirs.forEach(subdir => {
      const fullPath = path.join(baseDir, subdir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  } catch (error) {
    console.error("Error creating log directories:", error);
  }
}

// 파일명 파싱 에러 로깅
interface EpisodeParsingError {
  filename: string;
  timestamp: string;
  extractedNumber: number | null;
  reason: string;
  patterns?: {
    hyphenPattern?: string | null;
    extensionPattern?: string | null;
    tagPattern?: string | null;
    generalPattern?: string | null;
  };
}

export function logEpisodeParsingError(
  filename: string, 
  extractedNumber: number | null, 
  reason: string,
  debugInfo?: any
) {
  ensureLogDirectories();
  
  const error: EpisodeParsingError = {
    filename,
    timestamp: new Date().toISOString(),
    extractedNumber,
    reason,
    patterns: debugInfo
  };
  
  const logFile = path.join(
    ERROR_LOG_CONFIG.BASE_DIR,
    ERROR_LOG_CONFIG.SUBDIRS.EPISODE_PARSING,
    `parsing-errors-${new Date().toISOString().split('T')[0]}.json`
  );
  
  try {
    let existingLogs: EpisodeParsingError[] = [];
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, 'utf-8');
      existingLogs = JSON.parse(fileContent);
    }
    
    existingLogs.push(error);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    
    console.log(`Episode parsing error logged: ${filename} => ${extractedNumber} (${reason})`);
  } catch (writeError) {
    console.error("Failed to write episode parsing error log:", writeError);
  }
}

// 서버 에러 로깅
interface ServerError {
  timestamp: string;
  error: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
}

export function logServerError(
  error: Error,
  endpoint?: string,
  method?: string,
  userId?: string
) {
  ensureLogDirectories();
  
  const serverError: ServerError = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    endpoint,
    method,
    userId
  };
  
  const logFile = path.join(
    ERROR_LOG_CONFIG.BASE_DIR,
    ERROR_LOG_CONFIG.SUBDIRS.SERVER_ERRORS,
    `server-errors-${new Date().toISOString().split('T')[0]}.json`
  );
  
  try {
    let existingLogs: ServerError[] = [];
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, 'utf-8');
      existingLogs = JSON.parse(fileContent);
    }
    
    existingLogs.push(serverError);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    
    console.error(`Server error logged: ${error.message}`);
  } catch (writeError) {
    console.error("Failed to write server error log:", writeError);
  }
}

// 개선된 extractEpisodeNumber with 로깅
export function extractEpisodeNumberWithLogging(filename: string): number | null {
  const debugInfo: any = {};
  
  // 0. 하이픈 뒤 에피소드 번호 패턴 (최우선) - Season 패턴 제외
  const episodePatterns = [
    /ep?\.?\s*(\d{1,3})\b/i,
    /episode\s*(\d{1,3})\b/i,
  ];
  
  // 하이픈 뒤 숫자 패턴을 특별히 처리 (Season X 제외)
  const hyphenMatches = filename.match(/-\s*(\d{1,3})\s*(?:\[|\(|$)/g);
  if (hyphenMatches) {
    // 뒤에서부터 검사해서 Season X 패턴을 피함
    for (let i = hyphenMatches.length - 1; i >= 0; i--) {
      const match = hyphenMatches[i];
      const numberMatch = match.match(/-\s*(\d{1,3})/);
      if (numberMatch) {
        const num = parseInt(numberMatch[1], 10);
        // Season 패턴이 아닌지 확인
        const beforeMatch = filename.substring(0, filename.indexOf(match));
        if (!beforeMatch.match(/Season\s+\d+\s*$/i) && 
            num >= ERROR_LOG_CONFIG.MIN_EPISODE_NUMBER && 
            num <= ERROR_LOG_CONFIG.MAX_EPISODE_NUMBER) {
          debugInfo.hyphenPattern = num.toString();
          return num;
        }
      }
    }
  }
  
  // 대안: 브래킷 안의 에피소드 번호 패턴 (예: [ 10 ])
  const bracketEpisodeMatch = filename.match(/\[\s*(\d{1,3})\s*\]/g);
  if (bracketEpisodeMatch) {
    // 마지막 브래킷 패턴부터 검사 (해상도 등이 아닌 에피소드 번호를 찾기 위해)
    for (let i = bracketEpisodeMatch.length - 1; i >= 0; i--) {
      const match = bracketEpisodeMatch[i];
      const numberMatch = match.match(/\[\s*(\d{1,3})\s*\]/);
      if (numberMatch) {
        const num = parseInt(numberMatch[1], 10);
        // 해상도나 연도가 아닌 에피소드 번호인지 확인
        if (num >= ERROR_LOG_CONFIG.MIN_EPISODE_NUMBER && num <= 50) { // 50화를 넘는 에피소드는 드물어서
          debugInfo.bracketPattern = num.toString();
          return num;
        }
      }
    }
  }
  
  // 일반 에피소드 패턴들
  for (const pattern of episodePatterns) {
    const match = filename.match(pattern);
    debugInfo.hyphenPattern = match?.[1] || null;
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= ERROR_LOG_CONFIG.MIN_EPISODE_NUMBER && num <= ERROR_LOG_CONFIG.MAX_EPISODE_NUMBER) {
        return num;
      }
    }
  }

  // 1. 파일 확장자 직전의 숫자
  const extensionRegex = /(\d+)(?:\.\w+)?$/;
  const extensionMatch = filename.match(extensionRegex);
  debugInfo.extensionPattern = extensionMatch?.[1] || null;
  if (extensionMatch) {
    const num = parseInt(extensionMatch[1], 10);
    if (num >= ERROR_LOG_CONFIG.MIN_EPISODE_NUMBER && num <= ERROR_LOG_CONFIG.MAX_EPISODE_NUMBER) {
      return num;
    }
  }

  // 2. 태그 앞의 숫자
  const parts = filename.split(/[ _\-()]/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= ERROR_LOG_CONFIG.MIN_EPISODE_NUMBER && num <= ERROR_LOG_CONFIG.MAX_EPISODE_NUMBER) {
      const nextPart = parts[i + 1];
      if (nextPart && /^\[/.test(nextPart)) {
        debugInfo.tagPattern = num.toString();
        return num;
      }
    }
  }

  // 3. 마지막 수단
  const generalEpisodeRegex = /\b([1-9]\d{0,2})\b/;
  const match = filename.match(generalEpisodeRegex);
  debugInfo.generalPattern = match?.[1] || null;
  if (match) {
    const num = parseInt(match[1], 10);
    if (num <= ERROR_LOG_CONFIG.MAX_EPISODE_NUMBER) {
      return num;
    }
  }

  // 에러 로깅
  logEpisodeParsingError(
    filename, 
    null, 
    "No valid episode number found with any pattern",
    debugInfo
  );
  
  return null;
}

export { ERROR_LOG_CONFIG };