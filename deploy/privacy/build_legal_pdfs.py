"""Build static PDFs from actual React SSR; no manual legal-text copies.
Build-only: reportlab==4.4.3. Verification: pypdf; rendering: PyMuPDF.
Run from repo root: python -B deploy/privacy/build_legal_pdfs.py
"""
from hashlib import sha256
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[2]
FRONT=ROOT/"wwwhypda-frontendV2"
OUT=FRONT/"public/legal"
TEMP=ROOT/"tmp/pdfs"
ORIGIN="https://www.wwhypdatestdeployversion.it"


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root=dict(tag="root",attrs={},children=[])
        self.stack=[self.root]

    def handle_starttag(self,tag,attrs):
        node=dict(tag=tag,attrs=dict(attrs),children=[])
        self.stack[-1]["children"].append(node)
        if tag not in {"br","hr","img","input","meta","link"}:
            self.stack.append(node)

    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if self.stack[-1]["tag"]==tag:
            self.stack.pop()

    def handle_endtag(self,tag):
        if len(self.stack)>1 and self.stack[-1]["tag"]==tag:
            self.stack.pop()
        else:
            raise ValueError("Unexpected legal HTML structure")

    def handle_data(self,data):
        self.stack[-1]["children"].append(data)


def plain(node):
    if isinstance(node,str):
        return node
    if node["tag"]=="br":
        return " "
    return "".join(plain(child) for child in node["children"])


def rich(node):
    if isinstance(node,str):
        return escape(node)
    tag=node["tag"]
    inner="".join(rich(child) for child in node["children"])
    if tag=="br":
        return "<br/>"
    if tag=="a":
        href=node["attrs"]["href"]
        if href.startswith("/"):
            href=ORIGIN+href
        if not href.startswith(("https://","mailto:")):
            raise ValueError("Unexpected document link")
        return '<link href="'+escape(href,quote=True)+'" color="#184c78">'+inner+"</link>"
    if tag in ("strong","b","em","i"):
        return "<"+tag+">"+inner+"</"+tag+">"
    return inner


def blocks(node):
    result=[]
    if isinstance(node,str):
        return result
    if node["attrs"].get("data-legal-download"):
        return result
    if node["tag"] in {"h1","h2","h3","p","li"}:
        return [dict(kind=node["tag"],text=plain(node),html=rich(node))]
    for child in node["children"]:
        result.extend(blocks(child))
    return result


def normalized(text):
    return re.sub(r"\s+"," ",text.replace("\u2022","")).strip()


def verify_text(path,expected):
    reader=PdfReader(path)
    actual="\n".join(page.extract_text() or "" for page in reader.pages)
    actual=re.sub(r"(?m)^wwwhypda \| [0-9.-]+\s*$","",actual)
    actual=re.sub(r"(?m)^Page [0-9]+\s*$","",actual)
    if normalized(actual)!=normalized(expected):
        raise ValueError("Extracted PDF text differs from canonical React content: "+path.name)
    if any(not page.get("/Resources",{}).get("/Font") for page in reader.pages):
        raise ValueError("Missing PDF font resources")
    return len(reader.pages)


def invariant_canvas(*args, **kwargs):
    # SimpleDocTemplate passes invariant=None explicitly; override it, not a partial default.
    kwargs['invariant'] = 1
    return Canvas(*args, **kwargs)


def generate():
    subprocess.run(["node",str(ROOT/"deploy/privacy/render_legal.mjs")],cwd=ROOT,check=True)
    rendered=json.loads((TEMP/"legal-rendered.json").read_text(encoding="utf-8"))
    version=rendered["version"]
    OUT.mkdir(parents=True,exist_ok=True)
    fontdir=Path(reportlab.__file__).parent/"fonts"
    for name,file in (("Legal","Vera.ttf"),("LegalBold","VeraBd.ttf"),("LegalItalic","VeraIt.ttf")):
        pdfmetrics.registerFont(TTFont(name,str(fontdir/file)))
    pdfmetrics.registerFontFamily("Legal",normal="Legal",bold="LegalBold",italic="LegalItalic",boldItalic="LegalBold")
    base=ParagraphStyle("body",fontName="Legal",fontSize=9.5,leading=13.2,
        textColor=colors.HexColor("#1c2630"),spaceAfter=6,alignment=TA_LEFT)
    styles={"p":base,
        "li":ParagraphStyle("li",parent=base,leftIndent=13,firstLineIndent=-10),
        "h1":ParagraphStyle("h1",parent=base,fontName="LegalBold",fontSize=20,leading=25,spaceAfter=14,keepWithNext=True),
        "h2":ParagraphStyle("h2",parent=base,fontName="LegalBold",fontSize=12,leading=17,spaceBefore=10,spaceAfter=6,keepWithNext=True),
        "h3":ParagraphStyle("h3",parent=base,fontName="LegalBold",fontSize=10.5,leading=15,spaceBefore=8,spaceAfter=6,keepWithNext=True)}
    manifest_path=OUT/'manifest.json'
    previous=json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.is_file() else {}
    previous_records={item['file']:item for item in previous.get('documents',[])}
    records=[]
    for document in rendered["documents"]:
        tree=Tree();tree.feed(document["html"]);tree.close()
        content=blocks(tree.root)
        expected="\n".join(block["text"] for block in content)
        if not content or version not in expected:
            raise ValueError("Document package version missing")
        filename=document["slug"]+"-"+version+".pdf"
        path=OUT/filename
        content_digest=sha256(json.dumps(content,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        if path.is_file():
            old=previous_records.get(filename)
            if (not old or old['content_sha256']!=content_digest or
                    old['sha256']!=sha256(path.read_bytes()).hexdigest()):
                raise ValueError('Existing PDF edition differs; release a new version: '+filename)
            if verify_text(path,expected)!=old['pages']:
                raise ValueError('Existing PDF page count differs: '+filename)
            records.append(old)
            continue  # Published/versioned bytes must not change for an unrelated UI edit.
        story=[]
        for block in content:
            value=("\u2022 " if block["kind"]=="li" else "")+block["html"]
            story.append(Paragraph(value,styles[block["kind"]]))
        def decorate(canvas,doc):
            canvas.saveState()
            canvas.setFont("Legal",8)
            canvas.setFillColor(colors.HexColor("#52616d"))
            canvas.drawString(45,25,"wwwhypda | "+version)
            canvas.drawRightString(A4[0]-45,25,"Page "+str(doc.page))
            canvas.restoreState()
        doc=SimpleDocTemplate(str(path),pagesize=A4,leftMargin=45,rightMargin=45,
            topMargin=40,bottomMargin=45,title=content[0]["text"],
            author="Georgii Gvozdik",pageCompression=1)
        doc.build(story,onFirstPage=decorate,onLaterPages=decorate,canvasmaker=invariant_canvas)
        pages=verify_text(path,expected)
        records.append(dict(slug=document["slug"],file=filename,pages=pages,
            sha256=sha256(path.read_bytes()).hexdigest(),
            content_sha256=content_digest))
    sources=[
        "src/components/pages/userAgreement.tsx","src/components/pages/privacyPolicy.tsx",
        "src/components/pages/cookiePolicy.tsx","src/components/pages/legalDocumentDownload.tsx",
        "src/common/userAgreementVersion.ts","src/common/legalDocuments.ts","src/common/error_messages.json"]
    inputs=["wwwhypda-frontendV2/"+source for source in sources]+[
        "deploy/privacy/render_legal.mjs","deploy/privacy/build_legal_pdfs.py"]
    manifest=dict(version=version,generator="ReportLab 4.4.3 / embedded Bitstream Vera / React SSR",
        sources={file:sha256((ROOT/file).read_text(encoding="utf-8").replace("\r\n","\n").encode()).hexdigest() for file in inputs},
        documents=records)
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print("Generated and text-verified PDFs:",[(r["slug"],r["pages"]) for r in records])


if __name__=="__main__":
    generate()
