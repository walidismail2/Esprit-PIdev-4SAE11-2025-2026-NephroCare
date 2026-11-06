package esprit.dialysisservice.services;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class SessionReportPdfGenerator {

    public byte[] generatePdfBytes(String title, List<String> lines) {
        try (PDDocument doc = new PDDocument()) {

            float margin = 50f;
            float leading = 14f;

            // fonts
            var fontTitle = PDType1Font.HELVETICA_BOLD;
            var fontMeta  = PDType1Font.HELVETICA;
            var fontBody  = PDType1Font.HELVETICA;

            int titleSize = 16;
            int metaSize  = 10;
            int bodySize  = 11;

            // Create first page
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            float pageHeight = page.getMediaBox().getHeight();
            float y = pageHeight - margin;

            // ----- Page state helper
            class PageState {
                PDPage p;
                PDPageContentStream cs;
                float y;
                PageState(PDPage p, PDPageContentStream cs, float y) {
                    this.p = p; this.cs = cs; this.y = y;
                }
            }

            java.util.function.Supplier<PageState> newPage = () -> {
                try {
                    PDPage np = new PDPage(PDRectangle.A4);
                    doc.addPage(np);

                    PDPageContentStream ncs = new PDPageContentStream(doc, np);

                    float ny = np.getMediaBox().getHeight() - margin;
                    ncs.beginText();
                    ncs.setFont(fontBody, bodySize);
                    ncs.newLineAtOffset(margin, ny);

                    return new PageState(np, ncs, ny);
                } catch (IOException e) {
                    throw new RuntimeException("Failed to open new PDF page", e);
                }
            };

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.newLineAtOffset(margin, y);

                // ===== Header (only once) =====
                cs.setFont(fontTitle, titleSize);
                String displayTitle = (title != null && title.startsWith("Dialysis Session Report"))
                        ? "Dialysis Session Report" : title;
                cs.showText(safePdfText(displayTitle));
                cs.newLineAtOffset(0, -leading * 1.6f);
                y -= leading * 1.6f;

                cs.setFont(fontMeta, metaSize);
                String ts = "Generated: " + LocalDateTime.now()
                        .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
                cs.showText(safePdfText(ts));
                cs.newLineAtOffset(0, -leading * 1.6f);
                y -= leading * 1.6f;

                // Separator (ASCII only)
                cs.showText("----------------------------------------------");
                cs.newLineAtOffset(0, -leading * 1.2f);
                y -= leading * 1.2f;

                // ===== Body =====
                cs.setFont(fontBody, bodySize);

                PDPageContentStream current = cs;

                List<String> safeLines = (lines == null) ? List.of() : lines;

                for (String line : safeLines) {
                    if (line == null) line = "";

                    // Requirement: Remove UUIDs from the displayed output
                    String uuidRegex = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
                    String processedLine = line.replaceAll(uuidRegex, "");
                    String trimmed = processedLine.trim();
                    String lower = trimmed.toLowerCase();

                    // Requirement: Remove only explicit technical ID lines
                    if (lower.startsWith("session id:") ||
                        lower.startsWith("treatment id:") ||
                        lower.startsWith("patient id:") ||
                        lower.startsWith("doctor id:") ||
                        lower.startsWith("nurse id:")) {
                        continue;
                    }

                    // Requirement: Do NOT skip lines just because they contain "id:" somewhere (unless they became empty)
                    if (line.matches(".*" + uuidRegex + ".*") && trimmed.isEmpty()) {
                        continue;
                    }

                    // OPTIONAL: remove duplicate header lines if reportText already contains them
                    if (trimmed.equalsIgnoreCase("Dialysis Session Report")) continue;
                    if (trimmed.matches("^=+$")) continue;         // "======" underline
                    if (trimmed.matches("^[\\-]{5,}$")) continue;  // "-----"
                    if (trimmed.matches("^[\\u2500\\u2501]{5,}$")) continue; // "────" or "━━━━" (avoid unicode)

                    // blank line support
                    if (trimmed.isEmpty()) {
                        if (y <= margin + leading) {
                            current.endText();
                            current.close();

                            PageState st = newPage.get();
                            current = st.cs;
                            y = st.y;
                        } else {
                            current.newLineAtOffset(0, -leading);
                            y -= leading;
                        }
                        continue;
                    }

                    // wrap each line
                    for (String wrapped : wrap(processedLine, 95)) {
                        if (y <= margin + leading) {
                            current.endText();
                            current.close();

                            PageState st = newPage.get();
                            current = st.cs;
                            y = st.y;
                        }

                        current.showText(safePdfText(wrapped));
                        current.newLineAtOffset(0, -leading);
                        y -= leading;
                    }
                }

                current.endText();
                if (current != cs) current.close();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    /**
     * Replace characters that Helvetica/WinAnsiEncoding cannot encode.
     * This prevents: IllegalArgumentException: U+2500 is not available in Helvetica WinAnsiEncoding.
     */
    private static String safePdfText(String s) {
        if (s == null) return "";

        // Normalize common problematic unicode into ASCII
        String x = s
                .replace('\u2500', '-')  // ─
                .replace('\u2501', '-')  // ━
                .replace('\u2502', '|')  // │
                .replace('\u2503', '|')  // ┃
                .replace('\u2022', '-')  // •
                .replace('\u2013', '-')  // –
                .replace('\u2014', '-')  // —
                .replace('\u00A0', ' '); // NBSP

        // Last-resort: keep ASCII only (PDFBox Type1 + WinAnsi safe)
        // If you need full unicode later, you must embed a TTF font (PDType0Font.load).
        x = x.replaceAll("[^\\x00-\\x7F]", "?");

        return x;
    }

    private static List<String> wrap(String text, int maxLen) {
        if (text == null) return List.of("");
        String t = text.replace("\t", "    ");
        if (t.length() <= maxLen) return List.of(t);

        List<String> out = new ArrayList<>();
        int i = 0;
        while (i < t.length()) {
            int end = Math.min(i + maxLen, t.length());

            int lastSpace = t.lastIndexOf(' ', end);
            if (lastSpace <= i) lastSpace = end;
            out.add(t.substring(i, lastSpace).trim());
            i = lastSpace + 1;
        }
        return out.isEmpty() ? List.of("") : out;
    }
}