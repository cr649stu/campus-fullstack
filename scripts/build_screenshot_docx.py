# 把 screenshots/ 下的 17 张运行截图排版为一个 Word 文档
from __future__ import annotations

import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "screenshots"
CHUNKS = ROOT / "assets" / "docx-chunks"
OUT = ROOT / "毕业之前-运行截图.docx"

INK = RGBColor(0x11, 0x11, 0x10)
MUTED = RGBColor(0x77, 0x75, 0x6D)
LINE = "D9D5CB"

PAGES = [
    ("01", "首页 · 首屏", "封面：黑白 Hero 与三个栏目入口", "首页"),
    ("02", "首页 · 整页", "入口、最新记录、正在讨论、纪念品与页脚", "首页"),
    ("03", "记录 · 文章列表", "分类、标签、搜索、分页", "记录"),
    ("04", "文章 · 详情", "Markdown 正文、点赞、评论与相关阅读", "记录"),
    ("05", "文章 · 编辑器", "Markdown 写作与右侧实时预览", "记录"),
    ("06", "互助 · 问题列表", "最新 / 热门 / 未解决排序与标签筛选", "互助"),
    ("07", "互助 · 问题详情", "回答、点赞、采纳与积分说明", "互助"),
    ("08", "互助 · 提问", "标题、描述与标签输入", "互助"),
    ("09", "纪念 · 商品列表", "分类筛选与 8 件毕业纪念品", "纪念"),
    ("10", "纪念 · 商品详情", "库存、规格、加入购物袋", "纪念"),
    ("11", "购物袋", "数量调整、金额小计与结算入口", "纪念"),
    ("12", "确认订单", "收货地址、商品清单与支付明细", "纪念"),
    ("13", "订单 · 列表", "订单状态、商品与金额", "纪念"),
    ("14", "订单 · 详情", "状态步骤、地址快照与商品快照", "纪念"),
    ("15", "个人主页", "文章、阅读、获赞与积分统计", "账号"),
    ("16", "登录", "账号登录与演示账号", "账号"),
    ("17", "注册", "用户名、邮箱与密码校验", "账号"),
]

INDEX_ROWS = []

FILE_NAMES = {
    "01": "01-home.png",
    "02": "02-home-full.png",
    "03": "03-blog.png",
    "04": "04-post.png",
    "05": "05-write.png",
    "06": "06-qa.png",
    "07": "07-qa-detail.png",
    "08": "08-ask.png",
    "09": "09-shop.png",
    "10": "10-product.png",
    "11": "11-cart.png",
    "12": "12-checkout.png",
    "13": "13-orders.png",
    "14": "14-order-detail.png",
    "15": "15-profile.png",
    "16": "16-login.png",
    "17": "17-register.png",
}

SPLITS: dict[str, list[tuple[int, int]]] = {}


def set_run_font(run, name="宋体", size=10.5, bold=False, color=INK, spacing=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    rfonts.set(qn("w:ascii"), name)
    rfonts.set(qn("w:hAnsi"), name)
    rfonts.set(qn("w:eastAsia"), name)
    if spacing is not None:
        element = OxmlElement("w:spacing")
        element.set(qn("w:val"), str(spacing))
        rpr.append(element)


def add_bottom_border(paragraph, color=LINE, size=6, space=6):
    ppr = paragraph._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), str(space))
    bottom.set(qn("w:color"), color)
    pbdr.append(bottom)
    ppr.append(pbdr)


def add_rule(width_pt=0.75, color=LINE, before=6, after=10):
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = Pt(1)
    add_bottom_border(paragraph, color=color, size=int(width_pt * 8), space=0)
    return paragraph


def add_field(paragraph, instruction, placeholder="1", size=8, color=MUTED):
    run = paragraph.add_run()
    run.font.name = "宋体"
    run.font.size = Pt(size)
    run.font.color.rgb = color
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for element in (begin, instr, separate, text, end):
        run._r.append(element)


def configure_styles(document):
    normal = document.styles["Normal"]
    normal.font.name = "宋体"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    rpr = normal.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    rfonts.set(qn("w:ascii"), "宋体")
    rfonts.set(qn("w:hAnsi"), "宋体")
    rfonts.set(qn("w:eastAsia"), "宋体")
    normal.paragraph_format.line_spacing = 1.5
    normal.paragraph_format.space_after = Pt(6)

    h1 = document.styles["Heading 1"]
    h1.font.name = "微软雅黑"
    h1.font.size = Pt(20)
    h1.font.bold = True
    h1.font.color.rgb = INK
    h1.paragraph_format.space_before = Pt(0)
    h1.paragraph_format.space_after = Pt(14)
    h1_rpr = h1.element.get_or_add_rPr()
    h1_fonts = h1_rpr.find(qn("w:rFonts"))
    if h1_fonts is None:
        h1_fonts = OxmlElement("w:rFonts")
        h1_rpr.append(h1_fonts)
    h1_fonts.set(qn("w:ascii"), "微软雅黑")
    h1_fonts.set(qn("w:hAnsi"), "微软雅黑")
    h1_fonts.set(qn("w:eastAsia"), "微软雅黑")

    h2 = document.styles["Heading 2"]
    h2.font.name = "微软雅黑"
    h2.font.size = Pt(12.5)
    h2.font.bold = True
    h2.font.color.rgb = INK
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)
    h2_rpr = h2.element.get_or_add_rPr()
    h2_fonts = h2_rpr.find(qn("w:rFonts"))
    if h2_fonts is None:
        h2_fonts = OxmlElement("w:rFonts")
        h2_rpr.append(h2_fonts)
    h2_fonts.set(qn("w:ascii"), "微软雅黑")
    h2_fonts.set(qn("w:hAnsi"), "微软雅黑")
    h2_fonts.set(qn("w:eastAsia"), "微软雅黑")


def setup_page(document):
    section = document.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)
    section.header_distance = Cm(0.9)
    section.footer_distance = Cm(0.9)
    section.different_first_page_header_footer = True

    header = section.header
    header.is_linked_to_previous = False

    header_style = document.styles["Header"]
    style_ppr = header_style.element.get_or_add_pPr()
    old_tabs = style_ppr.find(qn("w:tabs"))
    if old_tabs is not None:
        style_ppr.remove(old_tabs)
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "right")
    tab.set(qn("w:pos"), str(int(Cm(17).twips)))
    tabs.append(tab)
    style_ppr.append(tabs)

    paragraph = header.paragraphs[0]
    paragraph.text = ""
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(2)
    left = paragraph.add_run("毕业之前 · 全栈开发示例项目")
    set_run_font(left, "宋体", 8, False, MUTED)
    tab_run = paragraph.add_run("\t运行截图")
    set_run_font(tab_run, "宋体", 8, False, MUTED)
    add_bottom_border(paragraph, color=LINE, size=4, space=4)

    footer = section.footer
    footer.is_linked_to_previous = False
    fparagraph = footer.paragraphs[0]
    fparagraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = fparagraph.add_run("第 ")
    set_run_font(run, "宋体", 8, False, MUTED)
    add_field(fparagraph, " PAGE ", "2")
    run = fparagraph.add_run(" 页 / 共 ")
    set_run_font(run, "宋体", 8, False, MUTED)
    add_field(fparagraph, " NUMPAGES ", "26")
    run = fparagraph.add_run(" 页")
    set_run_font(run, "宋体", 8, False, MUTED)


def build_cover(document):
    image = Image.open(ROOT / "server" / "public" / "covers" / "hero.jpg")
    target_height = image.width * 9 // 16
    top = max(0, (image.height - target_height) // 2)
    image = image.crop((0, top, image.width, top + target_height))
    cover_path = CHUNKS / "cover.jpg"
    image.save(cover_path, quality=90)
    picture = document.add_paragraph()
    picture.alignment = WD_ALIGN_PARAGRAPH.CENTER
    picture.paragraph_format.space_after = Pt(0)
    picture.add_run().add_picture(str(cover_path), width=Cm(17))

    eyebrow = document.add_paragraph()
    eyebrow.paragraph_format.space_before = Pt(30)
    eyebrow.paragraph_format.space_after = Pt(4)
    run = eyebrow.add_run("BEFORE GRADUATION  ·  FULL-STACK PROJECT")
    set_run_font(run, "宋体", 8.5, False, MUTED, spacing=60)

    title = document.add_paragraph()
    title.paragraph_format.space_after = Pt(4)
    title.paragraph_format.line_spacing = 1.0
    run = title.add_run("毕业之前")
    set_run_font(run, "微软雅黑", 44, True, INK, spacing=140)

    subtitle = document.add_paragraph()
    subtitle.paragraph_format.space_after = Pt(10)
    run = subtitle.add_run("校园内容与毕业纪念平台 · 全栈开发示例项目")
    set_run_font(run, "微软雅黑", 13.5, False, INK)

    add_rule(before=6, after=14)

    meta = [
        ("课　程", "Vibe Coding 全栈应用开发"),
        ("模　块", "记录（博客） / 互助（问答） / 纪念（商城）"),
        ("技　术", "React 19 · TypeScript · Vite · Express · SQLite"),
        ("演示账号", "linyi@campus.cn / 123456"),
        ("截　图", f"17 个页面 · {sum(len(value) for value in SPLITS.values())} 页截图 · 1440px 宽"),
    ]
    for label, value in meta:
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(2)
        run = paragraph.add_run(f"{label}　　")
        set_run_font(run, "宋体", 9.5, False, MUTED)
        run = paragraph.add_run(value)
        set_run_font(run, "宋体", 10, False, INK)

    for _ in range(2):
        document.add_paragraph()

    fill = document.add_paragraph()
    fill.paragraph_format.space_before = Pt(10)
    run = fill.add_run("姓名：______________　　学号：______________　　班级：______________")
    set_run_font(run, "宋体", 10, False, MUTED)

    date = document.add_paragraph()
    run = date.add_run("2026 年 10 月")
    set_run_font(run, "宋体", 10, False, MUTED)


def build_overview(document):
    heading = document.add_heading("项目说明", level=1)
    heading.paragraph_format.page_break_before = True

    lead = document.add_paragraph()
    run = lead.add_run(
        "本作业把课程文档中的三个示例项目——个人博客系统、问答社区、Mini 在线商城——"
        "合并为一个校园毕业主题站点「毕业之前」。三个模块共用一套账号、导航与数据库，"
        "分别对应毕业前的三种状态：记录、互助、纪念。"
    )
    set_run_font(run, "宋体", 10.5)

    document.add_heading("三个模块", level=2)
    modules = [
        ("记录（个人博客系统）", "文章增删改查、分类与标签、关键词搜索、分页、Markdown 渲染、评论与点赞、实时预览编辑器。"),
        ("互助（问答社区）", "提问、回答、点赞、采纳答案；积分规则：提问 −5、回答 +10、采纳 +30、被赞 +5 / +10；支持最新、热门、未解决排序。"),
        ("纪念（Mini 在线商城）", "商品列表与详情、购物袋、收货地址、下单事务扣库存、订单列表与详情、取消订单恢复库存。"),
    ]
    for name, description in modules:
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(8)
        run = paragraph.add_run(name)
        set_run_font(run, "微软雅黑", 10.5, True)
        run = paragraph.add_run("　" + description)
        set_run_font(run, "宋体", 10)

    document.add_heading("技术栈与运行", level=2)
    paragraph = document.add_paragraph()
    run = paragraph.add_run(
        "前端 React 19 + TypeScript + Vite，后端 Node.js + Express，数据库使用 Node 内置 SQLite，"
        "登录态使用 JWT（7 天有效），密码以 bcrypt 存储。执行 pnpm install 后，"
        "pnpm dev 可在 5173 端口开发预览；pnpm build && pnpm start 则由 Express 在 8787 端口同时托管前端与接口。"
    )
    set_run_font(run, "宋体", 10)

    document.add_heading("截图说明", level=2)
    paragraph = document.add_paragraph()
    run = paragraph.add_run(
        "以下截图于 1440px 宽度下由无头浏览器整页拍摄，按「首页 → 记录 → 互助 → 纪念 → 账号」顺序排列。"
        "超出一页高度的页面按内容段落拆分为“续页”，并在图注中标注第几段；原始 PNG 见项目的 screenshots 目录。"
    )
    set_run_font(run, "宋体", 10, False, MUTED)


def set_cell_text(cell, text, size=8.5, bold=False, color=INK, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = align
    paragraph.paragraph_format.space_before = Pt(2)
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.paragraph_format.line_spacing = 1.15
    run = paragraph.add_run(text)
    set_run_font(run, "宋体", size, bold, color)


def shade_cell(cell, color="111110"):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tcpr.append(shd)


def set_table_borders(table, color=LINE, size=4):
    tbl = table._tbl
    tblpr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), str(size))
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)
        borders.append(element)
    tblpr.append(borders)


def build_index(document):
    heading = document.add_heading("截图目录", level=1)
    heading.paragraph_format.page_break_before = True

    intro = document.add_paragraph()
    total_pages = sum(len(value) for value in SPLITS.values())
    run = intro.add_run(f"共 17 个页面、{total_pages} 页截图。分段页面在“段数”一列标注。")
    set_run_font(run, "宋体", 9, False, MUTED)

    table = document.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [Cm(1.4), Cm(5.6), Cm(7.4), Cm(2.6)]
    headers = ["编号", "页面", "文件名", "段数"]
    for index, cell in enumerate(table.rows[0].cells):
        cell.width = widths[index]
        set_cell_text(cell, headers[index], 8.5, True, RGBColor(0xFF, 0xFF, 0xFF))
        shade_cell(cell)

    for num, title, _, _ in PAGES:
        segments = len(SPLITS[num])
        cells = table.add_row().cells
        for index, value in enumerate([num, title, FILE_NAMES[num], str(segments)]):
            cells[index].width = widths[index]
            set_cell_text(cells[index], value, 8.5, False, INK)

    set_table_borders(table)

    note = document.add_paragraph()
    note.paragraph_format.space_before = Pt(14)
    run = note.add_run(
        "说明：截图中的作者、文章、问题、商品与订单均为演示数据；「毕业之前」为课程练习作品，不涉及真实交易。"
    )
    set_run_font(run, "宋体", 8.5, False, MUTED)


def plan_splits(image: Image.Image, max_height=1950, min_height=700):
    width, height = image.size
    if height <= max_height:
        return [(0, height)]

    count = math.ceil(height / max_height)
    gray = np.asarray(image.convert("L"), dtype=np.int32)
    row_means = gray.mean(axis=1)

    cuts = [0]
    for index in range(1, count):
        target = round(index * height / count)
        lower = max(cuts[-1] + min_height, height - max_height * (count - index))
        upper = min(cuts[-1] + max_height, height - min_height * (count - index), height - 1)
        low = max(lower, target - 300)
        high = min(upper, target + 300)
        cut = target
        if high > low:
            window = row_means[low:high]
            offset = int(window.argmax())
            if window[offset] > 205:
                cut = low + offset
        cuts.append(min(max(cut, lower), upper))
    cuts.append(height)
    return [(cuts[i], cuts[i + 1]) for i in range(count)]


def split_image(image: Image.Image):
    width, _ = image.size
    return [image.crop((0, top, width, bottom)) for top, bottom in plan_splits(image)]


def build_screenshots(document):
    for num, title, description, section in PAGES:
        path = SHOTS / FILE_NAMES[num]
        with Image.open(path) as raw:
            chunks = split_image(raw.convert("RGB"))

        for chunk_index, chunk in enumerate(chunks, start=1):
            heading = document.add_paragraph()
            heading.paragraph_format.page_break_before = True
            heading.paragraph_format.space_before = Pt(0)
            heading.paragraph_format.space_after = Pt(4)
            heading.paragraph_format.keep_with_next = True
            run = heading.add_run(f"{num} / {title}")
            set_run_font(run, "微软雅黑", 13, True, INK)
            suffix = f"（续 {chunk_index}/{len(chunks)}）" if len(chunks) > 1 else ""
            if suffix:
                run = heading.add_run(suffix)
                set_run_font(run, "微软雅黑", 9.5, False, MUTED)
            add_bottom_border(heading, color=LINE, size=4, space=6)

            chunk_path = CHUNKS / f"{num}-{chunk_index}.png"
            chunk.save(chunk_path, optimize=True)

            picture = document.add_paragraph()
            picture.alignment = WD_ALIGN_PARAGRAPH.CENTER
            picture.paragraph_format.space_before = Pt(6)
            picture.paragraph_format.space_after = Pt(0)
            picture.paragraph_format.line_spacing = 1.0
            picture.paragraph_format.keep_with_next = True
            picture.add_run().add_picture(str(chunk_path), width=Cm(17))

            caption = document.add_paragraph()
            caption.paragraph_format.space_before = Pt(5)
            caption.paragraph_format.space_after = Pt(0)
            text = f"图 {num}　{title}"
            if len(chunks) > 1:
                text += f" · 第 {chunk_index}/{len(chunks)} 段"
            text += f"　·　{description}　·　{chunk.size[0]}×{chunk.size[1]}"
            run = caption.add_run(text)
            set_run_font(run, "宋体", 8, False, MUTED)


def add_data_table(document, headers, rows, widths):
    table = document.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for index, cell in enumerate(table.rows[0].cells):
        cell.width = widths[index]
        set_cell_text(cell, headers[index], 8.5, True, RGBColor(0xFF, 0xFF, 0xFF))
        shade_cell(cell)
    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            cells[index].width = widths[index]
            set_cell_text(cells[index], value, 8.5, False, INK)
    set_table_borders(table)
    return table


def add_code_block(document, lines):
    for line in lines:
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = 1.2
        paragraph.paragraph_format.left_indent = Cm(0.3)
        ppr = paragraph._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), "F1EFE9")
        ppr.append(shd)
        run = paragraph.add_run(line if line else " ")
        set_run_font(run, "Consolas", 8.5, False, RGBColor(0x33, 0x33, 0x30))


def bullet(document, text):
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.left_indent = Cm(0.5)
    paragraph.paragraph_format.space_after = Pt(2)
    run = paragraph.add_run("— " + text)
    set_run_font(run, "宋体", 9.5)


def build_appendix_ai(document):
    heading = document.add_heading("附录 A · AI 智能体协作记录", level=1)
    heading.paragraph_format.page_break_before = True

    intro = document.add_paragraph()
    run = intro.add_run(
        "本附录记录「毕业之前」从需求到交付的智能体协作过程。项目不是从模板复制的："
        "页面、接口、示例内容、截图与 Word 均由智能体在当前会话中生成，使用者负责需求决策与验收。"
    )
    set_run_font(run, "宋体", 10)

    document.add_heading("A.1 会话信息", level=2)
    add_data_table(
        document,
        ["项目", "内容"],
        [
            ["协作方式", "DeepSeek Harness 编码智能体（会话式工具调用）"],
            ["模型", "deepseek-flash"],
            ["会话时间", "2026-10-29 19:52 — 21:20（Asia/Shanghai）"],
            ["任务", "把课程文档的三个示例项目合并实现，并产出截图与 Word 提交文档"],
        ],
        [Cm(4.2), Cm(12.8)],
    )

    document.add_heading("A.2 使用者决策", level=2)
    add_data_table(
        document,
        ["决策点", "选择"],
        [
            ["做哪些项目", "三个都做（个人博客 / 问答社区 / Mini 在线商城）"],
            ["内容主题", "校园生活记录 ——「毕业之前」"],
            ["加分功能", "评论 + 点赞；分类 / 标签筛选 + 搜索"],
            ["视觉风格", "极简黑白"],
            ["交付形式", "运行截图 + 完整源码 + README，后续追加 Word 汇总"],
        ],
        [Cm(4.2), Cm(12.8)],
    )

    document.add_heading("A.3 协作时间线", level=2)
    add_data_table(
        document,
        ["时间", "智能体动作", "结果"],
        [
            ["19:54", "检查 Node / pnpm / 浏览器 / 网络", "确认环境可用"],
            ["19:57", "建立 workspace，安装 React、Vite、Express", "依赖就绪"],
            ["20:03", "设计 12 张表与 REST 接口，实现后端", "认证 / 文章 / 问答 / 商城接口"],
            ["20:06", "写入示例数据并处理灰度图片", "4 位作者、9 篇文章、7 个问题、8 件商品"],
            ["20:12", "实现 React 19 + TS 前端 17 个页面", "记录 / 互助 / 纪念 / 账号"],
            ["20:19", "完成极简黑白样式与响应式", "全站视觉定稿"],
            ["20:24", "无头 Edge + CDP 截取整页截图", "17 张 1440px 截图，无报错"],
            ["21:05", "python-docx 生成 A4 截图文档", "封面 + 目录 + 23 页截图"],
            ["21:26", "初始化 Git 仓库与 GitHub Actions", "10 个提交，工作区干净"],
        ],
        [Cm(2.0), Cm(8.4), Cm(6.6)],
    )

    document.add_heading("A.4 关键指令", level=2)
    add_code_block(
        document,
        [
            "pnpm install",
            "node server/src/index.js          # Express + SQLite",
            "node scripts/test-api.mjs         # 15 项写接口冒烟测试",
            "node scripts/shoot.mjs screenshots # 无头浏览器整页截图",
            "python scripts/build_screenshot_docx.py  # 生成 Word",
        ],
    )

    document.add_heading("A.5 产出与验证", level=2)
    bullet(document, "代码：Express + SQLite 后端（12 张表、30+ 接口），React 19 + TS 前端（17 个页面）。")
    bullet(document, "测试：15 项写操作全部通过；17 个页面截图过程无 JavaScript 控制台报错。")
    bullet(document, "文档：本文件共含封面、项目说明、截图目录与 23 页截图，以及本附录与版本管理附录。")
    bullet(document, "版本管理：10 个提交按「配置 → 认证 → 接口 → 数据 → 前端 → 页面 → 样式 → 测试 → 文档 → CI」拆分。")

    note = document.add_paragraph()
    note.paragraph_format.space_before = Pt(8)
    run = note.add_run(
        "说明：本项目未使用 Cursor 等第三方 IDE，而是通过 DeepSeek Harness 的会话式智能体完成需求拆解、"
        "代码生成、依赖修复、接口测试、浏览器截图与 Word 排版；上述记录与 Git 提交历史可作为智能体协作证据。"
    )
    set_run_font(run, "宋体", 9, False, MUTED)


def build_appendix_git(document):
    heading = document.add_heading("附录 B · 版本管理与提交记录", level=1)
    heading.paragraph_format.page_break_before = True

    intro = document.add_paragraph()
    run = intro.add_run(
        "项目使用 Git 管理，默认分支 main，提交按开发顺序拆分，便于回溯每个阶段的产出。"
        "本地仓库已包含全部源码、截图、Word 与 CI 配置，可直接推送到 GitHub。"
    )
    set_run_font(run, "宋体", 10)

    document.add_heading("B.1 仓库状态", level=2)
    add_data_table(
        document,
        ["项目", "状态"],
        [
            ["分支", "main"],
            ["提交数", "10"],
            ["纳入版本管理的文件", "107"],
            ["工作区", "干净（无未提交改动）"],
            ["许可证", "MIT"],
            ["CI", "GitHub Actions：typecheck + build + seed"],
        ],
        [Cm(5.0), Cm(12.0)],
    )

    document.add_heading("B.2 提交历史", level=2)
    add_data_table(
        document,
        ["提交", "时间", "说明"],
        [
            ["36a7dd7", "19:56", "chore: 初始化 pnpm workspace 与工程配置"],
            ["6110dba", "20:03", "feat(server): 用户认证与 JWT 鉴权"],
            ["5cbb26c", "20:07", "feat(server): 文章、问答与商城的业务接口"],
            ["e6c6ffe", "20:10", "feat(server): 写入校园主题示例数据与静态资源"],
            ["bf59714", "20:12", "feat(web): 搭建路由、布局与登录态"],
            ["3fb7b87", "20:16", "feat(web): 实现记录、互助、纪念与账号页面"],
            ["71fd019", "20:19", "style(web): 极简黑白视觉与响应式布局"],
            ["5314a5c", "20:22", "test: 接口冒烟测试、截图脚本与静态构建脚本"],
            ["f765cf6", "21:08", "docs: README、运行截图与 Word 提交文档"],
            ["5c68bb0", "21:26", "ci: 添加 GitHub Actions 构建检查"],
        ],
        [Cm(2.6), Cm(2.0), Cm(12.4)],
    )

    document.add_heading("B.3 GitHub Actions", level=2)
    add_code_block(
        document,
        [
            "on: [push, pull_request]",
            "jobs:",
            "  build:",
            "    runs-on: ubuntu-latest",
            "    steps:",
            "      - uses: actions/checkout@v4",
            "      - uses: pnpm/action-setup@v4",
            "      - uses: actions/setup-node@v4",
            "      - run: pnpm install --frozen-lockfile",
            "      - run: pnpm -C web exec tsc --noEmit",
            "      - run: pnpm build && pnpm seed",
        ],
    )

    document.add_heading("B.4 推送到 GitHub", level=2)
    paragraph = document.add_paragraph()
    run = paragraph.add_run(
        "在可访问 GitHub 的环境中执行以下命令，即可把本地提交原样推送到新建的公开仓库："
    )
    set_run_font(run, "宋体", 10)
    add_code_block(
        document,
        [
            "git remote add origin https://github.com/<你的账号>/before-graduation.git",
            "git branch -M main",
            "git push -u origin main",
        ],
    )
    tip = document.add_paragraph()
    tip.paragraph_format.space_before = Pt(8)
    run = tip.add_run("仓库结构：server / web / screenshots / docs / scripts / .github，根目录含 README、LICENSE 与本 Word。")
    set_run_font(run, "宋体", 9, False, MUTED)


def main():
    global document
    if CHUNKS.exists():
        shutil.rmtree(CHUNKS)
    CHUNKS.mkdir(parents=True, exist_ok=True)

    for num, _, _, _ in PAGES:
        with Image.open(SHOTS / FILE_NAMES[num]) as raw:
            SPLITS[num] = plan_splits(raw.convert("RGB"))

    document = Document()
    configure_styles(document)
    setup_page(document)
    build_cover(document)
    build_overview(document)
    build_index(document)
    build_screenshots(document)
    build_appendix_ai(document)
    build_appendix_git(document)

    properties = document.core_properties
    properties.title = "「毕业之前」全栈项目 · 运行截图"
    properties.subject = "Vibe Coding 全栈应用开发 · 示例项目练习"
    properties.author = "课程练习"
    properties.comments = "17 个页面，1440px 宽，按首页/记录/互助/纪念/账号排序。"

    document.save(OUT)
    print(OUT)
    print(OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
