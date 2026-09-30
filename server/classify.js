// Lightweight language / bug-category detection (same logic as before, now runs on the server).
export function classify(text) {
  const t = text.toLowerCase();
  const language =
    /```(\w+)/.exec(text)?.[1]?.toLowerCase() ??
    (/\bdef |print\(|import numpy|import pandas/.test(t) ? "python" :
    /\bfunction |const |=>|console\.log/.test(t) ? "javascript" :
    /public static void main|System\.out/.test(t) ? "java" :
    /#include|std::|cout <</.test(t) ? "cpp" :
    /^\s*select |from |where /i.test(text) ? "sql" : null);
  const category =
    /segmentation fault|null pointer|nullpointerexception/.test(t) ? "runtime" :
    /syntaxerror|unexpected token|expected|missing/.test(t) ? "syntax" :
    /typeerror|type mismatch|cannot assign|is not assignable/.test(t) ? "type" :
    /infinite loop|slow|performance|timeout|o\(n\^2\)/.test(t) ? "performance" :
    /race condition|sql injection|xss|csrf|leak/.test(t) ? "security" :
    /```/.test(text) ? "logic" : null;
  return { language, category };
}
