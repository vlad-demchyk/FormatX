import JSZip from "jszip";
import type { PlacedSignature, SignDocumentSource, SignExportResult } from "./types";

const EMU_PER_PX = 9525;
const DEFAULT_PAGE_W_PX = 816;
const DEFAULT_PAGE_H_PX = 1056;

export async function exportSignedDocx(
  source: SignDocumentSource,
  signatures: PlacedSignature[],
  signaturePng: ArrayBuffer,
): Promise<SignExportResult> {
  const zip = await JSZip.loadAsync(source.originalBytes);
  const relsPath = "word/_rels/document.xml.rels";
  const relsFile = zip.file(relsPath);
  if (!relsFile) throw new Error("Invalid DOCX: missing document relationships");

  let relsXml = await relsFile.async("string");
  let docXml = await zip.file("word/document.xml")!.async("string");
  let contentTypes = await zip.file("[Content_Types].xml")!.async("string");
  docXml = ensureDocNamespaces(docXml);

  const existingMedia = Object.keys(zip.files).filter((f) => f.startsWith("word/media/")).length;
  let relId = maxRelId(relsXml) + 1;

  const sigsByPage = groupByPage(signatures);

  for (const [pageIndexStr, pageSigs] of Object.entries(sigsByPage)) {
    const pageIndex = Number(pageIndexStr);
    const page = source.pages[pageIndex];
    const pageW = page?.nativeWidth ?? DEFAULT_PAGE_W_PX;
    const pageH = page?.nativeHeight ?? DEFAULT_PAGE_H_PX;

    for (let i = 0; i < pageSigs.length; i++) {
      const sig = pageSigs[i]!;
      const mediaIndex = existingMedia + relId;
      const mediaName = `signature${mediaIndex}.png`;
      const mediaPath = `word/media/${mediaName}`;
      const rId = `rId${relId}`;

      zip.file(mediaPath, signaturePng);

      if (!contentTypes.includes("/png")) {
        contentTypes = contentTypes.replace(
          "</Types>",
          '<Default Extension="png" ContentType="image/png"/></Types>',
        );
      }

      relsXml = relsXml.replace(
        "</Relationships>",
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/></Relationships>`,
      );

      const drawing = buildDrawingXml(sig, pageW, pageH, rId);
      docXml = insertDrawing(docXml, drawing, pageIndex);
      relId++;
    }
  }

  zip.file(relsPath, relsXml);
  zip.file("word/document.xml", docXml);
  zip.file("[Content_Types].xml", contentTypes);

  const out = await zip.generateAsync({ type: "arraybuffer" });
  const stem = source.file.name.replace(/\.[^.]+$/, "");
  return {
    blob: new Blob([out], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: `${stem}-signed.docx`,
  };
}

function ensureDocNamespaces(docXml: string): string {
  const ns = [
    ['xmlns:wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'],
    ['xmlns:a', 'http://schemas.openxmlformats.org/drawingml/2006/main'],
    ['xmlns:pic', 'http://schemas.openxmlformats.org/drawingml/2006/picture'],
    ['xmlns:r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'],
  ] as const;
  return docXml.replace(/<w:document([^>]*)>/, (_match, attrs: string) => {
    let next = attrs;
    for (const [key, value] of ns) {
      if (!next.includes(key)) next += ` ${key}="${value}"`;
    }
    return `<w:document${next}>`;
  });
}

function groupByPage(signatures: PlacedSignature[]): Record<number, PlacedSignature[]> {
  const out: Record<number, PlacedSignature[]> = {};
  for (const s of signatures) {
    (out[s.pageIndex] ??= []).push(s);
  }
  return out;
}

function maxRelId(relsXml: string): number {
  const matches = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
  return matches.reduce((max, m) => Math.max(max, Number(m[1])), 0);
}

function buildDrawingXml(sig: PlacedSignature, pageW: number, pageH: number, rId: string): string {
  const cx = Math.round((sig.x + sig.w / 2) * pageW * EMU_PER_PX);
  const cy = Math.round((sig.y + sig.h / 2) * pageH * EMU_PER_PX);
  const cxExt = Math.round(sig.w * pageW * EMU_PER_PX);
  const cyExt = Math.round(sig.h * pageH * EMU_PER_PX);
  const rot = Math.round(sig.rotation * 60000);

  return `<w:p><w:r><w:drawing>
    <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
      <wp:simplePos x="0" y="0"/>
      <wp:positionH relativeFrom="page"><wp:posOffset>${cx}</wp:posOffset></wp:positionH>
      <wp:positionV relativeFrom="page"><wp:posOffset>${cy}</wp:posOffset></wp:positionV>
      <wp:extent cx="${cxExt}" cy="${cyExt}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:wrapNone/>
      <wp:docPr id="${Date.now() % 100000}" name="Signature"/>
      <wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr><pic:cNvPr id="0" name="Signature"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm rot="${rot}"><a:off x="0" y="0"/><a:ext cx="${cxExt}" cy="${cyExt}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:anchor>
  </w:drawing></w:r></w:p>`;
}

function insertDrawing(docXml: string, drawing: string, pageIndex: number): string {
  const bodyClose = "</w:body>";
  const idx = docXml.lastIndexOf(bodyClose);
  if (idx === -1) throw new Error("Invalid DOCX document body");

  if (pageIndex === 0) {
    return docXml.slice(0, idx) + drawing + docXml.slice(idx);
  }

  const pageBreaks = [...docXml.matchAll(/<w:br w:type="page"\/>/g)];
  if (pageBreaks.length >= pageIndex) {
    const match = pageBreaks[pageIndex - 1];
    if (match?.index != null) {
      return docXml.slice(0, match.index) + drawing + docXml.slice(match.index);
    }
  }

  return docXml.slice(0, idx) + drawing + docXml.slice(idx);
}
