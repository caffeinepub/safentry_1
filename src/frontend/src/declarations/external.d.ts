declare module "jspdf" {
  export class jsPDF {
    constructor(options?: Record<string, unknown>);
    setFillColor(r: number, g: number, b: number): void;
    setTextColor(r: number, g: number, b: number): void;
    setDrawColor(r: number, g: number, b: number): void;
    setFontSize(size: number): void;
    setFont(family: string, style: string): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): void;
    text(text: string, x: number, y: number, options?: Record<string, unknown>): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    addImage(data: string, format: string, x: number, y: number, w: number, h: number): void;
    save(filename: string): void;
  }
}

declare module "qrcode" {
  export function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
}
