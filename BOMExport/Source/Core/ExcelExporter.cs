using BOMExport.Models;
using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace BOMExport.Core
{
    public static class ExcelExporter
    {
        // ── WARNA TEMA ──────────────────────────────────────────────────────
        private static readonly XLColor C_BG_DARK   = XLColor.FromHtml("#1A2B45");  // Navy gelap
        private static readonly XLColor C_BG_MID    = XLColor.FromHtml("#243B5E");  // Navy sedang
        private static readonly XLColor C_ACCENT    = XLColor.FromHtml("#F5A623");  // Emas
        private static readonly XLColor C_WHITE      = XLColor.White;
        private static readonly XLColor C_ROW_ODD   = XLColor.FromHtml("#F0F4FB");  // Biru pucat
        private static readonly XLColor C_ROW_EVEN  = XLColor.White;
        private static readonly XLColor C_HEADER_TXT= XLColor.White;
        private static readonly XLColor C_TOTAL_BG  = XLColor.FromHtml("#E8F0FE");
        private static readonly XLColor C_TOTAL_TXT = XLColor.FromHtml("#1A2B45");
        private static readonly XLColor C_BORDER    = XLColor.FromHtml("#CBD5E1");

        // Warna per kategori
        private static readonly XLColor C_LIGHT_H = XLColor.FromHtml("#F59E0B");  // Kuning
        private static readonly XLColor C_RECEP_H  = XLColor.FromHtml("#3B82F6");  // Biru
        private static readonly XLColor C_CTRAY_H  = XLColor.FromHtml("#6366F1");  // Ungu
        private static readonly XLColor C_PA_H     = XLColor.FromHtml("#10B981");  // Hijau
        private static readonly XLColor C_FA_H     = XLColor.FromHtml("#EF4444");  // Merah
        private static readonly XLColor C_DATA_H   = XLColor.FromHtml("#8B5CF6");  // Violet

        public static void Export(BOMResult data, string filePath,
            bool inclLighting, bool inclReceptacle, bool inclCableTray,
            bool inclPA, bool inclFA, bool inclData)
        {
            using var wb = new XLWorkbook();

            // Sheet 1: Cover / Summary
            BuildCoverSheet(wb, data, inclLighting, inclReceptacle, inclCableTray, inclPA, inclFA, inclData);

            if (inclLighting    && data.Lighting.Any())      BuildLightingSheet(wb, data);
            if (inclReceptacle  && data.Receptacles.Any())   BuildReceptacleSheet(wb, data);
            if (inclCableTray   && data.CableTrays.Any())    BuildCableTraySheet(wb, data);
            if (inclPA          && data.PublicAddress.Any()) BuildPASheet(wb, data);
            if (inclFA          && data.FireAlarms.Any())    BuildFireAlarmSheet(wb, data);
            if (inclData        && data.DataPoints.Any())    BuildDataSheet(wb, data);

            wb.SaveAs(filePath);
        }

        // ────────────────────────────────────────────────────────────────────
        //  COVER SHEET
        // ────────────────────────────────────────────────────────────────────
        private static void BuildCoverSheet(IXLWorkbook wb, BOMResult data,
            bool l, bool r, bool ct, bool pa, bool fa, bool d)
        {
            var ws = wb.Worksheets.Add("SUMMARY");
            ws.SheetView.ShowGridLines = false;
            ws.Column(1).Width = 4;
            ws.Column(2).Width = 30;
            ws.Column(3).Width = 20;
            ws.Column(4).Width = 20;
            ws.Column(5).Width = 20;
            ws.Column(6).Width = 4;

            // ── Header Banner ──
            MergeStyle(ws.Range("B1:E1"), C_BG_DARK, C_WHITE, 24, true, XLAlignmentHorizontalValues.Center);
            ws.Cell("B1").Value = "BILL OF MATERIALS";
            ws.Row(1).Height = 45;

            MergeStyle(ws.Range("B2:E2"), C_ACCENT, C_BG_DARK, 13, true, XLAlignmentHorizontalValues.Center);
            ws.Cell("B2").Value = "ELECTRICAL ENGINEERING — MATERIAL TAKE OFF";
            ws.Row(2).Height = 28;

            // ── Project Info ──
            ws.Row(3).Height = 8;
            ws.Row(4).Height = 24;
            ws.Row(5).Height = 24;
            ws.Row(6).Height = 24;

            InfoRow(ws, 4, "Project Name",    data.ProjectName,    C_BG_MID);
            InfoRow(ws, 5, "Project Number", data.ProjectNumber,  C_BG_DARK);
            InfoRow(ws, 6, "Export Date",    data.ExportDate,     C_BG_MID);
            InfoRow(ws, 7, "Filter Level",   data.FilteredLevels, XLColor.FromHtml("#1C3D5A"));

            ws.Row(7).Height = 20;
            ws.Row(8).Height = 12;

            // ── Summary Table Header ──
            int r1 = 9;
            MergeStyle(ws.Range($"B{r1}:E{r1}"), C_BG_DARK, C_WHITE, 11, true, XLAlignmentHorizontalValues.Center);
            ws.Cell($"B{r1}").Value = "RINGKASAN MATERIAL";
            ws.Row(r1).Height = 26;

            int rh = r1 + 1;
            SetCell(ws.Cell($"B{rh}"), "KATEGORI",  C_BG_MID, C_WHITE, 10, true);
            SetCell(ws.Cell($"C{rh}"), "QTY TOTAL", C_BG_MID, C_WHITE, 10, true, XLAlignmentHorizontalValues.Center);
            SetCell(ws.Cell($"D{rh}"), "SHEET",     C_BG_MID, C_WHITE, 10, true, XLAlignmentHorizontalValues.Center);
            SetCell(ws.Cell($"E{rh}"), "STATUS",    C_BG_MID, C_WHITE, 10, true, XLAlignmentHorizontalValues.Center);
            ws.Row(rh).Height = 22;

            int row = rh + 1;

            void SummaryRow(string cat, int qty, string sheet, bool included, XLColor accent)
            {
                bool isOdd = (row - rh) % 2 == 0;
                XLColor bg = isOdd ? C_ROW_ODD : C_ROW_EVEN;

                var catCell = ws.Cell(row, 2);
                catCell.Value = cat;
                catCell.Style.Fill.BackgroundColor = bg;
                catCell.Style.Font.FontSize = 10;
                catCell.Style.Font.Bold = false;
                catCell.Style.Border.LeftBorder = XLBorderStyleValues.Thick;
                catCell.Style.Border.LeftBorderColor = accent;

                SetCell(ws.Cell(row, 3), qty > 0 ? qty.ToString("N0") + " pcs" : "-", bg, XLColor.FromHtml("#1A2B45"), 10, false, XLAlignmentHorizontalValues.Center);
                SetCell(ws.Cell(row, 4), included ? sheet : "-", bg, XLColor.FromHtml("#3B82F6"), 10, false, XLAlignmentHorizontalValues.Center);

                var status = ws.Cell(row, 5);
                status.Value = included && qty > 0 ? "✔ Included" : qty == 0 ? "⚠ No Data" : "— Skipped";
                status.Style.Fill.BackgroundColor = bg;
                status.Style.Font.FontSize = 10;
                status.Style.Font.Bold = true;
                status.Style.Font.FontColor = included && qty > 0
                    ? XLColor.FromHtml("#16A34A")
                    : qty == 0 ? XLColor.FromHtml("#D97706")
                    : XLColor.FromHtml("#6B7280");
                status.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                ApplyBorderRow(ws, row, 2, 5);
                ws.Row(row).Height = 22;
                row++;
            }

            SummaryRow("💡 Lighting Fixtures",   data.Lighting.Sum(x => x.Quantity),       "LIGHTING",       l,  C_LIGHT_H);
            SummaryRow("🔌 Receptacle / Outlet",  data.Receptacles.Sum(x => x.Quantity),    "RECEPTACLE",     r,  C_RECEP_H);
            SummaryRow("📦 Cable Tray",           data.CableTrays.Sum(x => x.Quantity),     "CABLE TRAY",     ct, C_CTRAY_H);
            SummaryRow("📢 Public Address",       data.PublicAddress.Sum(x => x.Quantity),  "PUBLIC ADDRESS", pa, C_PA_H);
            SummaryRow("🔔 Fire Alarm",           data.FireAlarms.Sum(x => x.Quantity),     "FIRE ALARM",     fa, C_FA_H);
            SummaryRow("🖧 Data / Network",       data.DataPoints.Sum(x => x.Quantity),     "DATA",           d,  C_DATA_H);

            // Total row
            int totalQty = data.Lighting.Sum(x => x.Quantity)
                         + data.Receptacles.Sum(x => x.Quantity)
                         + data.CableTrays.Sum(x => x.Quantity)
                         + data.PublicAddress.Sum(x => x.Quantity)
                         + data.FireAlarms.Sum(x => x.Quantity)
                         + data.DataPoints.Sum(x => x.Quantity);

            MergeStyle(ws.Range($"B{row}:B{row}"), C_BG_DARK, C_WHITE, 10, true);
            ws.Cell(row, 2).Value = "TOTAL KESELURUHAN";
            MergeStyle(ws.Range($"C{row}:E{row}"), C_ACCENT, C_BG_DARK, 10, true, XLAlignmentHorizontalValues.Center);
            ws.Cell(row, 3).Value = $"{totalQty:N0} pcs";
            ws.Row(row).Height = 24;

            // Footer
            ws.Row(row + 1).Height = 12;
            MergeStyle(ws.Range($"B{row+2}:E{row+2}"), XLColor.FromHtml("#F1F5F9"), XLColor.FromHtml("#6B7280"), 9, false, XLAlignmentHorizontalValues.Center);
            ws.Cell(row + 2, 2).Value = $"Generated by BOM Export Electrical Add-in • {data.ExportDate}";
            ws.Row(row + 2).Height = 18;

            ws.PageSetup.PageOrientation = XLPageOrientation.Portrait;
            ws.PageSetup.FitToPages(1, 0);
        }

        // ────────────────────────────────────────────────────────────────────
        //  LIGHTING SHEET
        // ────────────────────────────────────────────────────────────────────
        private static void BuildLightingSheet(IXLWorkbook wb, BOMResult data)
        {
            var ws = wb.Worksheets.Add("LIGHTING");
            ws.SheetView.ShowGridLines = false;

            double[] widths = { 4, 5, 35, 10, 12, 18, 18, 20, 10, 4 };
            for (int i = 0; i < widths.Length; i++) ws.Column(i + 1).Width = widths[i];

            int row = BuildCategoryHeader(ws, "💡 LIGHTING FIXTURES", C_LIGHT_H, data.ProjectName, data.ExportDate, data.FilteredLevels);

            string[] headers = { "NO.", "FAMILY TYPE / NAMA LAMPU", "QTY\n(pcs)", "WATT/UNIT\n(W)", "TOTAL WATT\n(W)", "CIRCUIT NUMBER", "PANEL", "ROOM / LOKASI", "LEVEL" };
            int[] colStart = { 2, 3, 4, 5, 6, 7, 8, 9, 10 };
            BuildTableHeader(ws, row, colStart, headers, C_LIGHT_H);
            row++;

            int no = 1;
            string? lastLevel = null;
            foreach (var item in data.Lighting)
            {
                if (item.Level != lastLevel)
                {
                    BuildLevelDivider(ws, row, 2, 10, item.Level, C_LIGHT_H);
                    row++; lastLevel = item.Level;
                }

                bool isOdd = no % 2 == 1;
                XLColor bg = isOdd ? C_ROW_ODD : C_ROW_EVEN;

                DataRow(ws, row, bg,
                    no.ToString(),
                    item.FamilyType,
                    item.Quantity.ToString(),
                    item.WattPerUnit > 0 ? item.WattPerUnit.ToString("F0") : "-",
                    item.TotalWatt   > 0 ? item.TotalWatt.ToString("F0")   : "-",
                    item.CircuitNumber,
                    item.PanelName,
                    $"{item.RoomName} ({item.CountInRoom} titik)",
                    item.Level);

                // Highlight watt kolom
                if (item.TotalWatt > 0)
                {
                    ws.Cell(row, 6).Style.Font.Bold = true;
                    ws.Cell(row, 6).Style.Font.FontColor = XLColor.FromHtml("#B45309");
                }

                ApplyBorderRow(ws, row, 2, 10);
                ws.Row(row).Height = 20;
                row++; no++;
            }

            // Total row
            BuildTotalRow(ws, row, 2, 10,
                $"TOTAL LIGHTING FIXTURES: {data.Lighting.Sum(x => x.Quantity):N0} pcs",
                $"Total Daya: {data.Lighting.Sum(x => x.TotalWatt):N0} W",
                C_LIGHT_H);

            BuildPageSetup(ws);
        }

        // ────────────────────────────────────────────────────────────────────
        //  RECEPTACLE SHEET
        // ────────────────────────────────────────────────────────────────────
        private static void BuildReceptacleSheet(IXLWorkbook wb, BOMResult data)
        {
            var ws = wb.Worksheets.Add("RECEPTACLE");
            ws.SheetView.ShowGridLines = false;

            double[] widths = { 4, 5, 35, 10, 12, 18, 18, 20, 10, 4 };
            for (int i = 0; i < widths.Length; i++) ws.Column(i + 1).Width = widths[i];

            int row = BuildCategoryHeader(ws, "🔌 RECEPTACLE / STOP KONTAK", C_RECEP_H, data.ProjectName, data.ExportDate, data.FilteredLevels);

            string[] headers = { "NO.", "FAMILY TYPE / NAMA", "QTY\n(pcs)", "WATT/UNIT\n(W)", "TOTAL WATT\n(W)", "CIRCUIT NUMBER", "PANEL", "ROOM / LOKASI", "LEVEL" };
            int[] colStart = { 2, 3, 4, 5, 6, 7, 8, 9, 10 };
            BuildTableHeader(ws, row, colStart, headers, C_RECEP_H);
            row++;

            int no = 1;
            string? lastLevel = null;
            foreach (var item in data.Receptacles)
            {
                if (item.Level != lastLevel)
                {
                    BuildLevelDivider(ws, row, 2, 10, item.Level, C_RECEP_H);
                    row++; lastLevel = item.Level;
                }

                bool isOdd = no % 2 == 1;
                XLColor bg = isOdd ? C_ROW_ODD : C_ROW_EVEN;

                DataRow(ws, row, bg,
                    no.ToString(), item.FamilyType,
                    item.Quantity.ToString(),
                    item.WattPerUnit > 0 ? item.WattPerUnit.ToString("F0") : "-",
                    item.TotalWatt   > 0 ? item.TotalWatt.ToString("F0")   : "-",
                    item.CircuitNumber, item.PanelName,
                    $"{item.RoomName} ({item.CountInRoom} titik)", item.Level);

                ApplyBorderRow(ws, row, 2, 10);
                ws.Row(row).Height = 20;
                row++; no++;
            }

            BuildTotalRow(ws, row, 2, 10,
                $"TOTAL RECEPTACLE: {data.Receptacles.Sum(x => x.Quantity):N0} pcs",
                $"Total Daya: {data.Receptacles.Sum(x => x.TotalWatt):N0} W",
                C_RECEP_H);

            BuildPageSetup(ws);
        }

        // ────────────────────────────────────────────────────────────────────
        //  CABLE TRAY SHEET
        // ────────────────────────────────────────────────────────────────────
        private static void BuildCableTraySheet(IXLWorkbook wb, BOMResult data)
        {
            var ws = wb.Worksheets.Add("CABLE TRAY");
            ws.SheetView.ShowGridLines = false;

            double[] widths = { 4, 5, 35, 10, 18, 18, 20, 18, 4 };
            for (int i = 0; i < widths.Length; i++) ws.Column(i + 1).Width = widths[i];

            int row = BuildCategoryHeader(ws, "📦 CABLE TRAY", C_CTRAY_H, data.ProjectName, data.ExportDate, data.FilteredLevels);

            string[] headers = { "NO.", "TYPE NAME", "QTY\n(pcs)", "DIMENSI\n(W x H mm)", "LEVEL", "WORKSET", "TOTAL PANJANG\n(m)" };
            int[] colStart = { 2, 3, 4, 5, 6, 7, 8 };
            BuildTableHeader(ws, row, colStart, headers, C_CTRAY_H);
            row++;

            int no = 1;
            string? lastLevel = null;
            foreach (var item in data.CableTrays)
            {
                if (item.Level != lastLevel)
                {
                    BuildLevelDivider(ws, row, 2, 8, item.Level, C_CTRAY_H);
                    row++; lastLevel = item.Level;
                }

                bool isOdd = no % 2 == 1;
                XLColor bg = isOdd ? C_ROW_ODD : C_ROW_EVEN;

                DataRow(ws, row, bg,
                    no.ToString(), item.TypeName,
                    item.Quantity.ToString(),
                    item.SizeLabel,
                    item.Level, item.Workset,
                    item.TotalLength.ToString("F2") + " m");

                ApplyBorderRow(ws, row, 2, 8);
                ws.Row(row).Height = 20;
                row++; no++;
            }

            BuildTotalRow(ws, row, 2, 8,
                $"TOTAL CABLE TRAY: {data.CableTrays.Sum(x => x.Quantity):N0} pcs",
                $"Total Panjang: {data.CableTrays.Sum(x => x.TotalLength):N2} m",
                C_CTRAY_H);

            BuildPageSetup(ws);
        }

        // ────────────────────────────────────────────────────────────────────
        //  PUBLIC ADDRESS SHEET
        // ────────────────────────────────────────────────────────────────────
        private static void BuildPASheet(IXLWorkbook wb, BOMResult data)
        {
            var ws = wb.Worksheets.Add("PUBLIC ADDRESS");
            ws.SheetView.ShowGridLines = false;

            double[] widths = { 4, 5, 35, 10, 12, 18, 20, 10, 4 };
            for (int i = 0; i < widths.Length; i++) ws.Column(i + 1).Width = widths[i];

            int row = BuildCategoryHeader(ws, "📢 PUBLIC ADDRESS SYSTEM", C_PA_H, data.ProjectName, data.ExportDate, data.FilteredLevels);

            string[] headers = { "NO.", "FAMILY TYPE / NAMA", "QTY\n(pcs)", "WATT/UNIT\n(W)", "TOTAL WATT\n(W)", "ROOM / LOKASI", "LEVEL" };
            int[] colStart = { 2, 3, 4, 5, 6, 7, 8 };
            BuildTableHeader(ws, row, colStart, headers, C_PA_H);
            row++;

            int no = 1;
            string? lastLevel = null;
            foreach (var item in data.PublicAddress)
            {
                if (item.Level != lastLevel)
                {
                    BuildLevelDivider(ws, row, 2, 8, item.Level, C_PA_H);
                    row++; lastLevel = item.Level;
                }

                bool isOdd = no % 2 == 1;
                DataRow(ws, row, isOdd ? C_ROW_ODD : C_ROW_EVEN,
                    no.ToString(), item.FamilyType,
                    item.Quantity.ToString(),
                    item.WattPerUnit > 0 ? item.WattPerUnit.ToString("F0") : "-",
                    item.TotalWatt   > 0 ? item.TotalWatt.ToString("F0")   : "-",
                    $"{item.RoomName} ({item.CountInRoom} titik)", item.Level);

                ApplyBorderRow(ws, row, 2, 8);
                ws.Row(row).Height = 20;
                row++; no++;
            }

            BuildTotalRow(ws, row, 2, 8,
                $"TOTAL PA DEVICES: {data.PublicAddress.Sum(x => x.Quantity):N0} pcs",
                $"Total Daya: {data.PublicAddress.Sum(x => x.TotalWatt):N0} W",
                C_PA_H);

            BuildPageSetup(ws);
        }

        // ────────────────────────────────────────────────────────────────────
        //  FIRE ALARM SHEET
        // ────────────────────────────────────────────────────────────────────
        private static void BuildFireAlarmSheet(IXLWorkbook wb, BOMResult data)
        {
            var ws = wb.Worksheets.Add("FIRE ALARM");
            ws.SheetView.ShowGridLines = false;

            double[] widths = { 4, 5, 35, 10, 20, 10, 4 };
            for (int i = 0; i < widths.Length; i++) ws.Column(i + 1).Width = widths[i];

            int row = BuildCategoryHeader(ws, "🔔 FIRE ALARM SYSTEM", C_FA_H, data.ProjectName, data.ExportDate, data.FilteredLevels);

            string[] headers = { "NO.", "FAMILY TYPE / NAMA", "QTY\n(pcs)", "ROOM / LOKASI", "LEVEL" };
            int[] colStart = { 2, 3, 4, 5, 6 };
            BuildTableHeader(ws, row, colStart, headers, C_FA_H);
            row++;

            int no = 1;
            string? lastLevel = null;
            foreach (var item in data.FireAlarms)
            {
                if (item.Level != lastLevel)
                {
                    BuildLevelDivider(ws, row, 2, 6, item.Level, C_FA_H);
                    row++; lastLevel = item.Level;
                }

                DataRow(ws, row, no % 2 == 1 ? C_ROW_ODD : C_ROW_EVEN,
                    no.ToString(), item.FamilyType,
                    item.Quantity.ToString(),
                    $"{item.RoomName} ({item.CountInRoom} titik)", item.Level);

                ApplyBorderRow(ws, row, 2, 6);
                ws.Row(row).Height = 20;
                row++; no++;
            }

            BuildTotalRow(ws, row, 2, 6,
                $"TOTAL FIRE ALARM DEVICES: {data.FireAlarms.Sum(x => x.Quantity):N0} pcs",
                "", C_FA_H);

            BuildPageSetup(ws);
        }

        // ────────────────────────────────────────────────────────────────────
        //  DATA SHEET
        // ────────────────────────────────────────────────────────────────────
        private static void BuildDataSheet(IXLWorkbook wb, BOMResult data)
        {
            var ws = wb.Worksheets.Add("DATA");
            ws.SheetView.ShowGridLines = false;

            double[] widths = { 4, 5, 35, 10, 20, 10, 4 };
            for (int i = 0; i < widths.Length; i++) ws.Column(i + 1).Width = widths[i];

            int row = BuildCategoryHeader(ws, "🖧 DATA / NETWORK POINT", C_DATA_H, data.ProjectName, data.ExportDate, data.FilteredLevels);

            string[] headers = { "NO.", "FAMILY TYPE / NAMA", "QTY\n(pcs)", "ROOM / LOKASI", "LEVEL" };
            int[] colStart = { 2, 3, 4, 5, 6 };
            BuildTableHeader(ws, row, colStart, headers, C_DATA_H);
            row++;

            int no = 1;
            string? lastLevel = null;
            foreach (var item in data.DataPoints)
            {
                if (item.Level != lastLevel)
                {
                    BuildLevelDivider(ws, row, 2, 6, item.Level, C_DATA_H);
                    row++; lastLevel = item.Level;
                }

                DataRow(ws, row, no % 2 == 1 ? C_ROW_ODD : C_ROW_EVEN,
                    no.ToString(), item.FamilyType,
                    item.Quantity.ToString(),
                    $"{item.RoomName} ({item.CountInRoom} titik)", item.Level);

                ApplyBorderRow(ws, row, 2, 6);
                ws.Row(row).Height = 20;
                row++; no++;
            }

            BuildTotalRow(ws, row, 2, 6,
                $"TOTAL DATA POINTS: {data.DataPoints.Sum(x => x.Quantity):N0} pcs",
                "", C_DATA_H);

            BuildPageSetup(ws);
        }

        // ────────────────────────────────────────────────────────────────────
        //  SHARED BUILDERS
        // ────────────────────────────────────────────────────────────────────

        private static int BuildCategoryHeader(IXLWorksheet ws, string title, XLColor accent,
            string project, string date, string filteredLevels = "Semua Level")
        {
            // Banner
            ws.Range(1, 1, 1, 11).Merge();
            ws.Cell(1, 1).Value = title;
            ws.Cell(1, 1).Style.Fill.BackgroundColor = C_BG_DARK;
            ws.Cell(1, 1).Style.Font.FontColor = C_WHITE;
            ws.Cell(1, 1).Style.Font.FontSize = 18;
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Cell(1, 1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(1).Height = 42;

            // Accent stripe
            ws.Range(2, 1, 2, 11).Merge();
            ws.Cell(2, 1).Style.Fill.BackgroundColor = accent;
            ws.Row(2).Height = 5;

            // Project & date info
            MergeStyle(ws.Range("B3:F3"), XLColor.FromHtml("#EFF6FF"), XLColor.FromHtml("#1A2B45"), 10, false);
            ws.Cell("B3").Value = $"Project: {project}";
            MergeStyle(ws.Range("G3:J3"), XLColor.FromHtml("#EFF6FF"), XLColor.FromHtml("#6B7280"), 9, false, XLAlignmentHorizontalValues.Right);
            ws.Cell("G3").Value = $"Export: {date}";
            ws.Row(3).Height = 20;

            // Level filter info
            bool allLevels = filteredLevels == "Semua Level";
            MergeStyle(ws.Range("B4:J4"),
                allLevels ? XLColor.FromHtml("#F0FDF4") : XLColor.FromHtml("#FEF9C3"),
                allLevels ? XLColor.FromHtml("#166534") : XLColor.FromHtml("#713F12"),
                9, false);
            ws.Cell("B4").Value = allLevels
                ? "🌐  Filter Level: Semua Level"
                : $"🔍  Filter Level: {filteredLevels}";
            ws.Cell("B4").Style.Alignment.Indent = 1;
            ws.Row(4).Height = 16;

            ws.Row(4).Height = 8;
            return 5;
        }

        private static void BuildTableHeader(IXLWorksheet ws, int row, int[] cols, string[] headers, XLColor accent)
        {
            ws.Row(row).Height = 36;
            for (int i = 0; i < cols.Length; i++)
            {
                var cell = ws.Cell(row, cols[i]);
                cell.Value = headers[i];
                cell.Style.Fill.BackgroundColor = accent;
                cell.Style.Font.FontColor = C_WHITE;
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontSize = 9;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Alignment.WrapText = true;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = C_WHITE;
            }
        }

        private static void BuildLevelDivider(IXLWorksheet ws, int row, int colFrom, int colTo, string level, XLColor accent)
        {
            ws.Range(row, colFrom, row, colTo).Merge();
            var cell = ws.Cell(row, colFrom);
            cell.Value = $"  ▶  {level}";
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A5F");
            cell.Style.Font.FontColor = XLColor.FromHtml("#FCD34D");
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontSize = 9;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(row).Height = 18;
        }

        private static void DataRow(IXLWorksheet ws, int row, XLColor bg, params string[] values)
        {
            int[] cols = { 2, 3, 4, 5, 6, 7, 8, 9, 10 };
            for (int i = 0; i < values.Length && i < cols.Length; i++)
            {
                var cell = ws.Cell(row, cols[i]);
                cell.Value = values[i];
                cell.Style.Fill.BackgroundColor = bg;
                cell.Style.Font.FontSize = 9;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                if (i == 0) { cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; cell.Style.Font.FontColor = XLColor.FromHtml("#6B7280"); }
                if (i == 2) { cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; cell.Style.Font.Bold = true; }
                if (i >= 3 && i <= 4) cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }
        }

        private static void BuildTotalRow(IXLWorksheet ws, int row, int colFrom, int colTo,
            string label, string subLabel, XLColor accent)
        {
            ws.Row(row).Height = 8;
            row++;

            ws.Range(row, colFrom, row, colTo - 1).Merge();
            var cell = ws.Cell(row, colFrom);
            cell.Value = label;
            cell.Style.Fill.BackgroundColor = accent;
            cell.Style.Font.FontColor = C_WHITE;
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontSize = 10;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Cell(row, colTo).Style.Fill.BackgroundColor = accent;

            if (!string.IsNullOrEmpty(subLabel))
            {
                row++;
                ws.Range(row, colFrom, row, colTo).Merge();
                var sub = ws.Cell(row, colFrom);
                sub.Value = subLabel;
                sub.Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF3C7");
                sub.Style.Font.FontColor = XLColor.FromHtml("#92400E");
                sub.Style.Font.Bold = true;
                sub.Style.Font.FontSize = 10;
                sub.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            }

            ws.Row(row).Height = 24;
        }

        // ── Styling Helpers ──────────────────────────────────────────────────

        private static void MergeStyle(IXLRange range, XLColor bg, XLColor fg, int fontSize = 10,
            bool bold = false, XLAlignmentHorizontalValues align = XLAlignmentHorizontalValues.Left)
        {
            range.Merge();
            range.Style.Fill.BackgroundColor = bg;
            range.Style.Font.FontColor = fg;
            range.Style.Font.FontSize = fontSize;
            range.Style.Font.Bold = bold;
            range.Style.Alignment.Horizontal = align;
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        private static void SetCell(IXLCell cell, object value, XLColor bg, XLColor fg,
            int fontSize = 10, bool bold = false,
            XLAlignmentHorizontalValues align = XLAlignmentHorizontalValues.Left)
        {
            cell.Value = value?.ToString() ?? "";
            cell.Style.Fill.BackgroundColor = bg;
            cell.Style.Font.FontColor = fg;
            cell.Style.Font.FontSize = fontSize;
            cell.Style.Font.Bold = bold;
            cell.Style.Alignment.Horizontal = align;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        private static void InfoRow(IXLWorksheet ws, int row, string label, string value, XLColor bg)
        {
            ws.Range(row, 2, row, 3).Merge();
            SetCell(ws.Cell(row, 2), label, bg, XLColor.FromHtml("#FCD34D"), 10, true);
            ws.Cell(row, 2).Style.Alignment.Indent = 1;

            ws.Range(row, 4, row, 5).Merge();
            SetCell(ws.Cell(row, 4), value, XLColor.FromHtml("#F8FAFC"), XLColor.FromHtml("#1E293B"), 10);
            ws.Cell(row, 4).Style.Alignment.Indent = 1;
        }

        private static void ApplyBorderRow(IXLWorksheet ws, int row, int colFrom, int colTo)
        {
            ws.Range(row, colFrom, row, colTo).Style.Border.OutsideBorder = XLBorderStyleValues.Hair;
            ws.Range(row, colFrom, row, colTo).Style.Border.OutsideBorderColor = C_BORDER;
            ws.Range(row, colFrom, row, colTo).Style.Border.InsideBorder = XLBorderStyleValues.Hair;
            ws.Range(row, colFrom, row, colTo).Style.Border.InsideBorderColor = C_BORDER;
        }

        private static void BuildPageSetup(IXLWorksheet ws)
        {
            ws.PageSetup.PageOrientation = XLPageOrientation.Landscape;
            ws.PageSetup.PaperSize = XLPaperSize.A3Paper;
            ws.PageSetup.FitToPages(1, 0);
            ws.PageSetup.SetRowsToRepeatAtTop(1, 5);
        }
    }
}
