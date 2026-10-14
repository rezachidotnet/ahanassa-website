import { DRAWING_LAYERS, type DrawingLayer, type SectionDrawing } from "./sections.ts";

/**
 * W17.2 — a minimal, dependency-free DXF writer: AutoCAD R12 (AC1009), the oldest format every CAD program
 * still opens (AutoCAD, LibreCAD, DraftSight, QCAD). ASCII, CRLF line ends, millimetre geometry.
 *
 * Sections: HEADER ($ACADVER, extents, decimal units), TABLES (LTYPE CONTINUOUS, LAYER 0/OUTLINE/DIM/TEXT,
 * STYLE STANDARD), ENTITIES (LINE, ARC, CIRCLE, SOLID, TEXT), EOF. Dimensions are drawn as lines, arrowheads
 * and text on the DIM/TEXT layers, not as associative DIMENSION entities (those need anonymous blocks).
 * R12 has no $INSUNITS header variable, so the unit is stated in the title block ("Dimensions in mm").
 * Output is a pure function of the drawing: the same catalog data always gives the same bytes.
 */

/** AutoCAD colour index per layer: OUTLINE white/black, DIM cyan, TEXT yellow (the usual CAD conventions). */
const LAYER_COLOR: Record<DrawingLayer, number> = { OUTLINE: 7, DIM: 4, TEXT: 2 };

const n = (v: number) => {
  const r = Math.round(v * 10000) / 10000;
  return Object.is(r, -0) ? "0.0" : Number.isInteger(r) ? `${r}.0` : String(r);
};

export function writeDxf(drawing: SectionDrawing): string {
  const out: string[] = [];
  const g = (code: number, value: string | number) => out.push(String(code), typeof value === "number" ? n(value) : value);
  const gi = (code: number, value: number) => out.push(String(code), String(Math.trunc(value)));
  const [[minX, minY], [maxX, maxY]] = drawing.extents;

  g(0, "SECTION"); g(2, "HEADER");
  g(9, "$ACADVER"); g(1, "AC1009");
  g(9, "$INSBASE"); g(10, 0); g(20, 0); g(30, 0);
  g(9, "$EXTMIN"); g(10, minX); g(20, minY); g(30, 0);
  g(9, "$EXTMAX"); g(10, maxX); g(20, maxY); g(30, 0);
  g(9, "$LIMMIN"); g(10, minX); g(20, minY);
  g(9, "$LIMMAX"); g(10, maxX); g(20, maxY);
  g(9, "$LUNITS"); gi(70, 2);
  g(9, "$LUPREC"); gi(70, 2);
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "TABLES");
  g(0, "TABLE"); g(2, "LTYPE"); gi(70, 1);
  g(0, "LTYPE"); g(2, "CONTINUOUS"); gi(70, 0); g(3, "Solid line"); gi(72, 65); gi(73, 0); g(40, 0);
  g(0, "ENDTAB");
  g(0, "TABLE"); g(2, "LAYER"); gi(70, DRAWING_LAYERS.length + 1);
  for (const [name, color] of [["0", 7] as const, ...DRAWING_LAYERS.map((l) => [l, LAYER_COLOR[l]] as const)]) {
    g(0, "LAYER"); g(2, name); gi(70, 0); gi(62, color); g(6, "CONTINUOUS");
  }
  g(0, "ENDTAB");
  g(0, "TABLE"); g(2, "STYLE"); gi(70, 1);
  g(0, "STYLE"); g(2, "STANDARD"); gi(70, 0); g(40, 0); g(41, 1); g(50, 0); gi(71, 0); g(42, 2.5); g(3, "txt"); g(4, "");
  g(0, "ENDTAB");
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "ENTITIES");
  for (const layer of DRAWING_LAYERS) {
    for (const p of drawing.layers[layer]) {
      switch (p.kind) {
        case "line":
          g(0, "LINE"); g(8, layer); g(10, p.a[0]); g(20, p.a[1]); g(30, 0); g(11, p.b[0]); g(21, p.b[1]); g(31, 0);
          break;
        case "circle":
          g(0, "CIRCLE"); g(8, layer); g(10, p.c[0]); g(20, p.c[1]); g(30, 0); g(40, p.r);
          break;
        case "arc":
          g(0, "ARC"); g(8, layer); g(10, p.c[0]); g(20, p.c[1]); g(30, 0); g(40, p.r); g(50, p.start); g(51, p.end);
          break;
        case "solid": {
          // A triangle: SOLID's 4th corner repeats the 3rd.
          const [a, b, c] = p.points;
          g(0, "SOLID"); g(8, layer);
          g(10, a[0]); g(20, a[1]); g(30, 0); g(11, b[0]); g(21, b[1]); g(31, 0);
          g(12, c[0]); g(22, c[1]); g(32, 0); g(13, c[0]); g(23, c[1]); g(33, 0);
          break;
        }
        case "text":
          g(0, "TEXT"); g(8, layer); g(10, p.at[0]); g(20, p.at[1]); g(30, 0); g(40, p.height); g(1, asciiText(p.text)); g(7, "STANDARD");
          if (p.align === "center") {
            gi(72, 1); g(11, p.at[0]); g(21, p.at[1]); g(31, 0);
          }
          break;
      }
    }
  }
  g(0, "ENDSEC");
  g(0, "EOF");
  return `${out.join("\r\n")}\r\n`;
}

/** R12 TEXT is single-byte: anything outside printable ASCII is dropped (the drawings' text is ASCII by construction). */
function asciiText(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, "");
}
