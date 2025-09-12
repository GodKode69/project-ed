const diagram = document.getElementById("diagram");
const exprInput = document.getElementById("expr");
const renderBtn = document.getElementById("renderBtn");

// Create and insert an inline error container below the textarea
let errorMsg = document.createElement("div");
errorMsg.style.color = "red";
errorMsg.style.marginTop = "6px";
exprInput.parentNode.insertBefore(errorMsg, exprInput.nextSibling);

function setError(message) {
  errorMsg.textContent = message;
}
function clearError() {
  setError("");
}

// Tokenizer for supported tokens
function tokenize(expr) {
  const re = /\s*([()])\s*|\s*(and|or|not|nand|nor|xor)\s*|\s*([A-Za-z])\s*/gi;
  let match,
    tokens = [];
  while ((match = re.exec(expr)) !== null) {
    if (match[1]) tokens.push({ type: "paren", value: match[1] });
    else if (match[2])
      tokens.push({ type: "op", value: match[2].toUpperCase() });
    else if (match[3])
      tokens.push({ type: "literal", value: match[3].toUpperCase() });
  }
  return tokens;
}

// Recursive descent parser with operator precedence
function parseBooleanExpression(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  function peek() {
    return tokens[pos];
  }
  function consume(type, value) {
    const t = tokens[pos];
    if (!t || t.type !== type || (value && t.value !== value))
      throw new SyntaxError(
        `Expected ${value || type} but found ${t ? t.value : "end of input"}`
      );
    pos++;
    return t;
  }
  function parsePrimary() {
    const t = peek();
    if (!t) throw new SyntaxError("Unexpected end of expression");
    if (t.type === "literal") {
      pos++;
      return { type: "literal", name: t.value };
    }
    if (t.type === "op" && t.value === "NOT") {
      pos++;
      return { type: "operator", name: "NOT", args: [parsePrimary()] };
    }
    if (t.type === "paren" && t.value === "(") {
      pos++;
      const n = parseExpression();
      consume("paren", ")");
      return n;
    }
    throw new SyntaxError(`Unexpected token: ${t.value}`);
  }
  function parseNandNorXor() {
    let left = parsePrimary();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && ["NAND", "NOR", "XOR"].includes(t.value)) {
        pos++;
        left = {
          type: "operator",
          name: t.value,
          args: [left, parsePrimary()],
        };
      } else break;
    }
    return left;
  }
  function parseAnd() {
    let left = parseNandNorXor();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && t.value === "AND") {
        pos++;
        left = {
          type: "operator",
          name: "AND",
          args: [left, parseNandNorXor()],
        };
      } else break;
    }
    return left;
  }
  function parseOr() {
    let left = parseAnd();
    while (true) {
      const t = peek();
      if (t && t.type === "op" && t.value === "OR") {
        pos++;
        left = { type: "operator", name: "OR", args: [left, parseAnd()] };
      } else break;
    }
    return left;
  }
  function parseExpression() {
    return parseOr();
  }
  const root = parseExpression();
  if (pos < tokens.length)
    throw new SyntaxError("Unexpected input after expression");
  return root;
}

// SVG gate shapes
function drawAndGate(svg, x, y) {
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", `M${x},${y} l30,0 a20,20 0 0,1 0,40 l-30,0 z`);
  path.setAttribute("class", "gate");
  svg.appendChild(path);
  return { in1: [x, y + 10], in2: [x, y + 30], out: [x + 50, y + 20] };
}
function drawOrGate(svg, x, y) {
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute(
    "d",
    `
    M${x},${y + 40}
    Q${x + 15},${y + 20} ${x},${y}
    Q${x + 28},${y + 20} ${x + 55},${y + 20}
    Q${x + 28},${y + 23} ${x},${y + 40}
    Z
  `
  );
  path.setAttribute("class", "gate");
  svg.appendChild(path);
  return {
    in1: [x + 10, y + 10],
    in2: [x + 10, y + 30],
    out: [x + 55, y + 20],
  };
}
function drawNotGate(svg, x, y) {
  const group = document.createElementNS(svg.namespaceURI, "g");
  const triangle = document.createElementNS(svg.namespaceURI, "polygon");
  triangle.setAttribute(
    "points",
    `${x},${y} ${x},${y + 40} ${x + 40},${y + 20}`
  );
  triangle.setAttribute("class", "gate");
  group.appendChild(triangle);
  const circle = document.createElementNS(svg.namespaceURI, "circle");
  circle.setAttribute("cx", x + 45);
  circle.setAttribute("cy", y + 20);
  circle.setAttribute("r", 5);
  circle.setAttribute("stroke", "#333");
  circle.setAttribute("stroke-width", 2);
  circle.setAttribute("fill", "#fafafa");
  group.appendChild(circle);
  svg.appendChild(group);
  return { in1: [x, y + 20], out: [x + 50, y + 20] };
}
function drawNandGate(svg, x, y) {
  const and = drawAndGate(svg, x, y);
  const circle = document.createElementNS(svg.namespaceURI, "circle");
  circle.setAttribute("cx", and.out[0] + 5);
  circle.setAttribute("cy", and.out[1]);
  circle.setAttribute("r", 5);
  circle.setAttribute("stroke", "#333");
  circle.setAttribute("stroke-width", 2);
  circle.setAttribute("fill", "#fafafa");
  svg.appendChild(circle);
  return { in1: and.in1, in2: and.in2, out: [and.out[0] + 10, and.out[1]] };
}
function drawNorGate(svg, x, y) {
  const or = drawOrGate(svg, x, y);
  const circle = document.createElementNS(svg.namespaceURI, "circle");
  circle.setAttribute("cx", or.out[0] + 5);
  circle.setAttribute("cy", or.out[1]);
  circle.setAttribute("r", 5);
  circle.setAttribute("stroke", "#333");
  circle.setAttribute("stroke-width", 2);
  circle.setAttribute("fill", "#fafafa");
  svg.appendChild(circle);
  return { in1: or.in1, in2: or.in2, out: [or.out[0] + 10, or.out[1]] };
}
function drawXorGate(svg, x, y) {
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute(
    "d",
    `
    M${x - 7},${y + 37}
    Q${x + 14},${y + 20} ${x - 7},${y + 3}
  `
  );
  path.setAttribute("stroke", "#333");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-width", 2);
  svg.appendChild(path);
  return drawOrGate(svg, x, y);
}
function drawWire(svg, from, to) {
  const wire = document.createElementNS(svg.namespaceURI, "path");
  const d = `M${from[0]} ${from[1]} H${(from[0] + to[0]) / 2} V${to[1]} H${
    to[0]
  }`;
  wire.setAttribute("d", d);
  wire.setAttribute("class", "wire");
  svg.appendChild(wire);
}

// Draw inputs as circles with labels
function drawInput(svg, x, y, label) {
  const group = document.createElementNS(svg.namespaceURI, "g");
  const circ = document.createElementNS(svg.namespaceURI, "circle");
  circ.setAttribute("cx", x);
  circ.setAttribute("cy", y);
  circ.setAttribute("r", 18);
  circ.setAttribute("stroke", "#333");
  circ.setAttribute("stroke-width", 2);
  circ.setAttribute("fill", "#e6f0ff");
  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y + 7);
  text.setAttribute("text-anchor", "middle");
  text.textContent = label;
  group.appendChild(circ);
  group.appendChild(text);
  svg.appendChild(group);
  return { out: [x + 18, y] };
}

// Render node recursively
function renderNode(svg, node, x, y, dy = 70) {
  if (!node) return null;
  if (node.type === "literal") {
    return drawInput(svg, x, y, node.name);
  }
  const gateFns = {
    AND: drawAndGate,
    OR: drawOrGate,
    NOT: drawNotGate,
    NAND: drawNandGate,
    NOR: drawNorGate,
    XOR: drawXorGate,
  };
  const fn = gateFns[node.name];
  if (node.args.length === 1) {
    const in1 = renderNode(svg, node.args[0], x - 120, y, dy);
    const out = fn(svg, x, y - 20);
    drawWire(svg, in1.out, out.in1);
    return { out: out.out };
  }
  if (node.args.length === 2) {
    const in1 = renderNode(svg, node.args[0], x - 120, y - dy / 2, dy / 2);
    const in2 = renderNode(svg, node.args[1], x - 120, y + dy / 2, dy / 2);
    const out = fn(svg, x, y - 20);
    drawWire(svg, in1.out, out.in1);
    drawWire(svg, in2.out, out.in2);
    return { out: out.out };
  }
  return null;
}

function clearDiagram() {
  diagram.innerHTML = "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "1100");
  svg.setAttribute("height", "650");
  diagram.appendChild(svg);
  return svg;
}

renderBtn.onclick = () => {
  clearError();
  clearDiagram();

  const expr = exprInput.value.trim();
  if (!expr) {
    setError("Enter a Boolean expression");
    exprInput.focus();
    return;
  }

  let tree;
  try {
    tree = parseBooleanExpression(expr);
  } catch (e) {
    setError("Invalid Boolean Expression: " + e.message);
    exprInput.focus();
    return;
  }

  const svg = document.querySelector("#diagram svg") || clearDiagram();
  const output = renderNode(svg, tree, 830, 320, 100);

  if (output && output.out) drawWire(svg, output.out, [1030, output.out[1]]);

  // Output label
  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("x", 1040);
  text.setAttribute("y", output.out[1] + 6);
  text.setAttribute("text-anchor", "start");
  text.style.fontWeight = "bold";
  text.textContent = "OUTPUT";
  svg.appendChild(text);
};
