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
  
  // 0. 하이픈 뒤 에피소드 번호 패턴 (최우선)
  const episodePatterns = [
    /-\s*(\d{1,3})\s*(?:\(|\[|$)/,
    /ep?\.?\s*(\d{1,3})\b/i,
    /episode\s*(\d{1,3})\b/i,
  ];
  
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