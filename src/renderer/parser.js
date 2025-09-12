// renderer/parser.js - wrap boolean-parser for lightweight parsing
import { parse } from "boolean-parser"; // installed via npm

export function parseExpression(expr) {
  try {
    return parse(expr);
  } catch {
    return null;
  }
}
