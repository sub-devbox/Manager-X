import io
from typing import Dict, Any, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

def format_money(amount: float, currency_code: str = "USD") -> str:
    code = (currency_code or "USD").upper()
    symbol = "$"
    if code == "INR":
        symbol = "₹"
    elif code == "EUR":
        symbol = "€"
    elif code == "GBP":
        symbol = "£"
    elif code == "CAD" or code == "AUD":
        symbol = "$"
    return f"{symbol}{amount:,.2f} {code}"

def build_invoice_pdf(
    invoice_data: Dict[str, Any],
    client_data: Optional[Dict[str, Any]] = None,
    company_profile: Optional[Dict[str, Any]] = None,
) -> bytes:
    buffer = io.BytesIO()

    # Letter is 8.5 x 11 inches. Margins: 0.5 inch (36 pt)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=f"Invoice {invoice_data.get('invoice_number', '')}",
        author="Manager-X",
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0f172a"),
    )

    status_style = ParagraphStyle(
        "StatusBadge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#2563eb"),
    )

    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_RIGHT,
    )

    meta_value_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    section_hdr_style = ParagraphStyle(
        "SectionHdr",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569"),
        textTransform="uppercase",
    )

    body_style = ParagraphStyle(
        "AddressBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )

    body_bold_style = ParagraphStyle(
        "AddressBodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )

    table_th_style = ParagraphStyle(
        "TableTH",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    table_th_right_style = ParagraphStyle(
        "TableTHRight",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    table_td_style = ParagraphStyle(
        "TableTD",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )

    table_td_muted_style = ParagraphStyle(
        "TableTDMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#64748b"),
    )

    table_td_right_style = ParagraphStyle(
        "TableTDRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    table_td_right_bold = ParagraphStyle(
        "TableTDRightBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    instructions_label = ParagraphStyle(
        "InstLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569"),
        textTransform="uppercase",
    )

    instructions_text = ParagraphStyle(
        "InstText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )

    total_label_style = ParagraphStyle(
        "TotalLabel",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
    )

    total_val_style = ParagraphStyle(
        "TotalVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    grand_total_label = ParagraphStyle(
        "GrandTotalLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
    )

    grand_total_val = ParagraphStyle(
        "GrandTotalVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    story = []

    inv_num = invoice_data.get("invoice_number", "DRAFT")
    issue_date = invoice_data.get("issue_date", "")
    due_date = invoice_data.get("due_date", "")
    gateway = invoice_data.get("payment_gateway", "Razorpay")
    status_str = (invoice_data.get("status") or "draft").upper()
    currency_code = invoice_data.get("currency_code", "USD")

    # 1. Top Header: Title & Meta Info
    status_color = "#2563eb"
    if status_str == "PAID":
        status_color = "#16a34a"
    elif status_str == "OVERDUE":
        status_color = "#dc2626"
    elif status_str == "DRAFT":
        status_color = "#d97706"

    header_left = [
        Paragraph("INVOICE", title_style),
        Spacer(1, 3),
        Paragraph(
            f'<font color="{status_color}"><b>● {status_str}</b></font>',
            status_style,
        ),
    ]

    header_right = [
        Paragraph(f"<b>Invoice #:</b> {inv_num}", meta_value_style),
        Spacer(1, 2),
        Paragraph(f"<b>Issue Date:</b> {issue_date}", meta_label_style),
        Spacer(1, 2),
        Paragraph(f"<b>Due Date:</b> {due_date}", meta_label_style),
        Spacer(1, 2),
        Paragraph(f"<b>Gateway / Remittance:</b> {gateway}", meta_label_style),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[270, 270],
    )
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 14))

    # Dark divider
    story.append(
        HRFlowable(
            width="100%",
            thickness=1.5,
            color=colors.HexColor("#0f172a"),
            spaceBefore=0,
            spaceAfter=14,
        )
    )

    # 2. Bill From & Bill To
    comp = company_profile or {}
    comp_lines = []
    if comp.get("name"):
        comp_lines.append(Paragraph(comp["name"], body_bold_style))
    else:
        comp_lines.append(Paragraph("Manager-X Company", body_bold_style))
    if comp.get("address"):
        for addr_line in comp["address"].split("\n"):
            if addr_line.strip():
                comp_lines.append(Paragraph(addr_line.strip(), body_style))
    if comp.get("phone"):
        comp_lines.append(Paragraph(f"Phone: {comp['phone']}", body_style))
    if comp.get("email"):
        comp_lines.append(Paragraph(f"Email: {comp['email']}", body_style))
    if comp.get("pan"):
        comp_lines.append(Paragraph(f"PAN: {comp['pan']}", body_style))
    if comp.get("gstin"):
        comp_lines.append(Paragraph(f"GSTIN: {comp['gstin']}", body_style))

    cli = client_data or {}
    cli_lines = []
    if cli.get("company_name"):
        cli_lines.append(Paragraph(cli["company_name"], body_bold_style))
    if cli.get("contact_person"):
        cli_lines.append(Paragraph(f"Attn: {cli['contact_person']}", body_style))
    addr1 = cli.get("address_line1", "")
    addr2 = cli.get("address_line2", "")
    if addr1 or addr2:
        full_addr = f"{addr1}{', ' + addr2 if addr2 else ''}"
        cli_lines.append(Paragraph(full_addr, body_style))
    city_st = f"{cli.get('city', '')}{', ' + cli.get('state', '') if cli.get('state') else ''} {cli.get('postal_code', '')}".strip()
    if city_st or cli.get("country"):
        full_city_country = f"{city_st}{', ' + cli.get('country') if cli.get('country') else ''}".strip()
        if full_city_country:
            cli_lines.append(Paragraph(full_city_country, body_style))
    if cli.get("tax_id"):
        cli_lines.append(Paragraph(f"Tax ID: {cli['tax_id']}", body_style))
    if cli.get("email"):
        cli_lines.append(Paragraph(f"Email: {cli['email']}", body_style))

    bill_from_cell = [
        Paragraph("<b>BILL FROM:</b>", section_hdr_style),
        Spacer(1, 4),
        *comp_lines,
    ]
    bill_to_cell = [
        Paragraph("<b>BILL TO:</b>", section_hdr_style),
        Spacer(1, 4),
        *cli_lines,
    ]

    parties_table = Table(
        [[bill_from_cell, bill_to_cell]],
        colWidths=[270, 270],
    )
    parties_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(parties_table)
    story.append(Spacer(1, 16))

    # 3. Items Table
    raw_items = invoice_data.get("items") or []
    items_data = [
        [
            Paragraph("Items / Deliverables", table_th_style),
            Paragraph("HSN/SAC", table_th_style),
            Paragraph("Qty", table_th_right_style),
            Paragraph("Unit Price", table_th_right_style),
            Paragraph("Total", table_th_right_style),
        ]
    ]

    col_widths = [260, 60, 45, 85, 90]  # Sum = 540 pt (matches letter width minus margins)

    if not raw_items:
        items_data.append([
            Paragraph("<i>No deliverables added to this invoice.</i>", table_td_muted_style),
            Paragraph("—", table_td_muted_style),
            Paragraph("0", table_td_right_style),
            Paragraph(format_money(0, currency_code), table_td_right_style),
            Paragraph(format_money(0, currency_code), table_td_right_bold),
        ])
    else:
        for itm in raw_items:
            desc = itm.get("description", "Deliverable item")
            hsn = itm.get("hsn_sac") or "—"
            qty = itm.get("quantity", 1)
            unit_price = itm.get("unit_price") or itm.get("price") or 0.0
            total_price = itm.get("total") or (qty * unit_price)

            items_data.append([
                Paragraph(desc, table_td_style),
                Paragraph(str(hsn), table_td_muted_style),
                Paragraph(str(qty), table_td_right_style),
                Paragraph(format_money(unit_price, currency_code), table_td_right_style),
                Paragraph(format_money(total_price, currency_code), table_td_right_bold),
            ])

    items_table = Table(items_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(
        TableStyle([
            ("LINEABOVE", (0, 0), (-1, 0), 1.5, colors.HexColor("#0f172a")),
            ("LINEBELOW", (0, 0), (-1, 0), 1.5, colors.HexColor("#0f172a")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(items_table)
    story.append(Spacer(1, 14))

    # 4. Bottom Section: Left (Payment Instructions) & Right (Totals)
    gateway_notes = invoice_data.get("gateway_notes") or (
        f"Payment terms: Net 15 days.\n"
        f"Remit via {gateway} or direct bank wire.\n"
        f"Please reference {inv_num} with your payment."
    )

    notes_flowables = [
        Paragraph(f"Payment Instructions ({gateway})", instructions_label),
        Spacer(1, 4),
    ]
    for line in gateway_notes.split("\n"):
        if line.strip():
            notes_flowables.append(Paragraph(line.strip(), instructions_text))
            notes_flowables.append(Spacer(1, 2))

    notes_box = Table(
        [[notes_flowables]],
        colWidths=[280],
    )
    notes_box.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )

    # Calculate Totals
    subtotal = invoice_data.get("subtotal", 0.0)
    if not subtotal and raw_items:
        subtotal = sum(i.get("total", (i.get("quantity", 1) * (i.get("unit_price", 0.0)))) for i in raw_items)

    discount_amount = invoice_data.get("discount_amount", 0.0)
    round_off = invoice_data.get("round_off", 0.0)
    final_amount = invoice_data.get("final_amount", 0.0)
    if not final_amount:
        final_amount = max(0.0, subtotal - discount_amount + round_off)

    totals_rows = [
        [
            Paragraph("Total Amount:", total_label_style),
            Paragraph(format_money(subtotal, currency_code), total_val_style),
        ]
    ]
    if discount_amount > 0:
        disc_type = invoice_data.get("discount_type", "fixed")
        disc_val = invoice_data.get("discount_value", 0)
        disc_label = f"Discount ({disc_val}%):" if disc_type == "percentage" else "Discount:"
        totals_rows.append([
            Paragraph(disc_label, total_label_style),
            Paragraph(f"-{format_money(discount_amount, currency_code)}", total_val_style),
        ])

    if round_off != 0:
        totals_rows.append([
            Paragraph("Round Off:", total_label_style),
            Paragraph(f"{round_off:+.2f}", total_val_style),
        ])

    totals_rows.append([
        Paragraph("Final Amount Due:", grand_total_label),
        Paragraph(format_money(final_amount, currency_code), grand_total_val),
    ])

    totals_table = Table(totals_rows, colWidths=[120, 130])
    totals_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("LINEABOVE", (0, -1), (-1, -1), 1.5, colors.HexColor("#0f172a")),
            ("TOPPADDING", (0, -1), (-1, -1), 8),
        ])
    )

    bottom_table = Table(
        [[notes_box, totals_table]],
        colWidths=[290, 250],
    )
    bottom_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )

    story.append(KeepTogether([bottom_table]))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
