using Autodesk.Revit.DB;
using Autodesk.Revit.DB.Electrical;
using BOMExport.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace BOMExport.Core
{
    public static class RevitDataExtractor
    {
        /// <summary>Ambil semua nama level yang ada di model, diurutkan dari bawah ke atas.</summary>
        public static List<string> GetAllLevelNames(Document doc)
        {
            return new FilteredElementCollector(doc)
                .OfClass(typeof(Level))
                .Cast<Level>()
                .OrderBy(l => l.Elevation)
                .Select(l => l.Name)
                .ToList();
        }

        /// <param name="levelFilter">Null = semua level; isi HashSet = hanya level yang dipilih.</param>
        public static BOMResult Extract(Document doc, HashSet<string>? levelFilter = null)
        {
            var result = new BOMResult
            {
                ProjectName    = doc.ProjectInformation?.Name ?? "Unknown Project",
                ProjectNumber  = doc.ProjectInformation?.Number ?? "-",
                ExportDate     = DateTime.Now.ToString("dd MMMM yyyy, HH:mm"),
                FilteredLevels = levelFilter == null ? "Semua Level"
                               : string.Join(", ", levelFilter.OrderBy(x => x))
            };

            result.Lighting      = ExtractLighting(doc, levelFilter);
            result.Receptacles   = ExtractReceptacles(doc, levelFilter);
            result.CableTrays    = ExtractCableTrays(doc, levelFilter);
            result.PublicAddress = ExtractPublicAddress(doc, levelFilter);
            result.FireAlarms    = ExtractFireAlarms(doc, levelFilter);
            result.DataPoints    = ExtractData(doc, levelFilter);

            return result;
        }

        private static bool PassLevel(string elementLevel, HashSet<string>? filter)
            => filter == null || filter.Contains(elementLevel);

        // ── LIGHTING ──────────────────────────────────────────────────────────
        private static List<LightingItem> ExtractLighting(Document doc, HashSet<string>? lf)
        {
            var elements = new FilteredElementCollector(doc)
                .OfCategory(BuiltInCategory.OST_LightingFixtures)
                .WhereElementIsNotElementType()
                .ToElements()
                .Where(e => PassLevel(GetLevelName(e, doc), lf))
                .ToList();

            return GroupElectricalElements(elements, doc)
                .Select(g => new LightingItem
                {
                    FamilyType    = g.Key.TypeName,
                    Quantity      = g.Count(),
                    WattPerUnit   = GetApparentLoad(g.First()),
                    Level         = g.Key.Level,
                    CircuitNumber = g.Key.CircuitNumber,
                    PanelName     = g.Key.PanelName,
                    RoomName      = g.Key.RoomName,
                    CountInRoom   = g.Count()
                })
                .OrderBy(x => x.Level).ThenBy(x => x.RoomName).ThenBy(x => x.FamilyType)
                .ToList();
        }

        // ── RECEPTACLE ────────────────────────────────────────────────────────
        private static List<ReceptacleItem> ExtractReceptacles(Document doc, HashSet<string>? lf)
        {
            var elements = new FilteredElementCollector(doc)
                .OfCategory(BuiltInCategory.OST_ElectricalFixtures)
                .WhereElementIsNotElementType()
                .ToElements()
                .Where(e => PassLevel(GetLevelName(e, doc), lf))
                .ToList();

            return GroupElectricalElements(elements, doc)
                .Select(g => new ReceptacleItem
                {
                    FamilyType    = g.Key.TypeName,
                    Quantity      = g.Count(),
                    WattPerUnit   = GetApparentLoad(g.First()),
                    Level         = g.Key.Level,
                    CircuitNumber = g.Key.CircuitNumber,
                    PanelName     = g.Key.PanelName,
                    RoomName      = g.Key.RoomName,
                    CountInRoom   = g.Count()
                })
                .OrderBy(x => x.Level).ThenBy(x => x.RoomName).ThenBy(x => x.FamilyType)
                .ToList();
        }

        // ── CABLE TRAY ────────────────────────────────────────────────────────
        private static List<CableTrayItem> ExtractCableTrays(Document doc, HashSet<string>? lf)
        {
            var elements = new FilteredElementCollector(doc)
                .OfCategory(BuiltInCategory.OST_CableTray)
                .WhereElementIsNotElementType()
                .ToElements()
                .Where(e => PassLevel(GetLevelName(e, doc), lf))
                .ToList();

            var worksetTable = doc.IsWorkshared ? doc.GetWorksetTable() : null;

            var grouped = elements
                .GroupBy(e =>
                {
                    string typeName = (doc.GetElement(e.GetTypeId()) as ElementType)?.Name ?? "Unknown";
                    string level    = GetLevelName(e, doc);
                    string workset  = worksetTable != null
                        ? worksetTable.GetWorkset(e.WorksetId).Name
                        : "Main Model";
                    string width    = FormatMM(e.get_Parameter(BuiltInParameter.RBS_CABLETRAY_WIDTH_PARAM)?.AsDouble() ?? 0);
                    string height   = FormatMM(e.get_Parameter(BuiltInParameter.RBS_CABLETRAY_HEIGHT_PARAM)?.AsDouble() ?? 0);
                    return (typeName, level, workset, width, height);
                });

            return grouped.Select(g => new CableTrayItem
            {
                TypeName    = g.Key.typeName,
                Quantity    = g.Count(),
                Width       = g.Key.width,
                Height      = g.Key.height,
                Level       = g.Key.level,
                Workset     = g.Key.workset,
                TotalLength = g.Sum(e =>
                    UnitUtils.ConvertFromInternalUnits(
                        e.get_Parameter(BuiltInParameter.CURVE_ELEM_LENGTH)?.AsDouble() ?? 0,
                        UnitTypeId.Meters))
            })
            .OrderBy(x => x.Level).ThenBy(x => x.TypeName).ThenBy(x => x.SizeLabel)
            .ToList();
        }

        // ── PUBLIC ADDRESS ────────────────────────────────────────────────────
        private static List<PublicAddressItem> ExtractPublicAddress(Document doc, HashSet<string>? lf)
        {
            var elements = new FilteredElementCollector(doc)
                .OfCategory(BuiltInCategory.OST_CommunicationDevices)
                .WhereElementIsNotElementType()
                .ToElements()
                .Where(e => IsPublicAddress(e, doc) && PassLevel(GetLevelName(e, doc), lf))
                .ToList();

            return GroupByTypeLevel(elements, doc)
                .Select(g => new PublicAddressItem
                {
                    FamilyType  = g.Key.TypeName,
                    Quantity    = g.Count(),
                    WattPerUnit = GetApparentLoad(g.First()),
                    Level       = g.Key.Level,
                    RoomName    = g.Key.RoomName,
                    CountInRoom = g.Count()
                })
                .OrderBy(x => x.Level).ThenBy(x => x.RoomName).ThenBy(x => x.FamilyType)
                .ToList();
        }

        // ── FIRE ALARM ────────────────────────────────────────────────────────
        private static List<FireAlarmItem> ExtractFireAlarms(Document doc, HashSet<string>? lf)
        {
            var elements = new FilteredElementCollector(doc)
                .OfCategory(BuiltInCategory.OST_FireAlarmDevices)
                .WhereElementIsNotElementType()
                .ToElements()
                .Where(e => PassLevel(GetLevelName(e, doc), lf))
                .ToList();

            return GroupByTypeLevel(elements, doc)
                .Select(g => new FireAlarmItem
                {
                    FamilyType  = g.Key.TypeName,
                    Quantity    = g.Count(),
                    Level       = g.Key.Level,
                    RoomName    = g.Key.RoomName,
                    CountInRoom = g.Count()
                })
                .OrderBy(x => x.Level).ThenBy(x => x.RoomName).ThenBy(x => x.FamilyType)
                .ToList();
        }

        // ── DATA ──────────────────────────────────────────────────────────────
        private static List<DataItem> ExtractData(Document doc, HashSet<string>? lf)
        {
            var elements = new FilteredElementCollector(doc)
                .OfCategory(BuiltInCategory.OST_DataDevices)
                .WhereElementIsNotElementType()
                .ToElements()
                .Where(e => PassLevel(GetLevelName(e, doc), lf))
                .ToList();

            return GroupByTypeLevel(elements, doc)
                .Select(g => new DataItem
                {
                    FamilyType  = g.Key.TypeName,
                    Quantity    = g.Count(),
                    Level       = g.Key.Level,
                    RoomName    = g.Key.RoomName,
                    CountInRoom = g.Count()
                })
                .OrderBy(x => x.Level).ThenBy(x => x.RoomName).ThenBy(x => x.FamilyType)
                .ToList();
        }

        // ── HELPERS ───────────────────────────────────────────────────────────

        private record ElecGroupKey(string TypeName, string Level, string CircuitNumber, string PanelName, string RoomName);
        private record BasicGroupKey(string TypeName, string Level, string RoomName);

        private static IEnumerable<IGrouping<ElecGroupKey, Element>> GroupElectricalElements(
            IList<Element> elements, Document doc)
        {
            return elements.GroupBy(e => new ElecGroupKey(
                TypeName:      GetTypeName(e, doc),
                Level:         GetLevelName(e, doc),
                CircuitNumber: GetParamString(e, BuiltInParameter.RBS_ELEC_CIRCUIT_NUMBER),
                PanelName:     GetParamString(e, BuiltInParameter.RBS_ELEC_CIRCUIT_PANEL_NAME),
                RoomName:      GetRoomName(e, doc)));
        }

        private static IEnumerable<IGrouping<BasicGroupKey, Element>> GroupByTypeLevel(
            IEnumerable<Element> elements, Document doc)
        {
            return elements.GroupBy(e => new BasicGroupKey(
                TypeName: GetTypeName(e, doc),
                Level:    GetLevelName(e, doc),
                RoomName: GetRoomName(e, doc)));
        }

        private static string GetTypeName(Element e, Document doc)
        {
            var type = doc.GetElement(e.GetTypeId()) as ElementType;
            return type != null ? $"{type.FamilyName} - {type.Name}" : e.Name;
        }

        private static string GetLevelName(Element e, Document doc)
        {
            if (e.LevelId != ElementId.InvalidElementId)
            {
                var level = doc.GetElement(e.LevelId) as Level;
                return level?.Name ?? "No Level";
            }
            return GetParamString(e, BuiltInParameter.FAMILY_LEVEL_PARAM) is string s && s != "-" ? s : "No Level";
        }

        private static string GetRoomName(Element e, Document doc)
        {
            if (e is FamilyInstance fi && fi.Room != null)
                return fi.Room.Name;

            var roomParam = e.get_Parameter(BuiltInParameter.RBS_ROOM_NAME);
            if (roomParam != null && !string.IsNullOrEmpty(roomParam.AsString()))
                return roomParam.AsString()!;

            // Fallback: lookup room by location
            if (e.Location is LocationPoint lp)
            {
                var phase = doc.GetElement(e.CreatedPhaseId) as Phase;
                if (e is FamilyInstance fi2)
                {
                    var room = fi2.get_Room(phase ?? doc.GetElement(
                        new FilteredElementCollector(doc)
                        .OfClass(typeof(Phase)).FirstElementId()) as Phase);
                    if (room != null) return room.Name;
                }
            }
            return "-";
        }

        private static string GetParamString(Element e, BuiltInParameter bip)
        {
            var p = e.get_Parameter(bip);
            if (p == null) return "-";
            return p.StorageType switch
            {
                StorageType.String  => string.IsNullOrWhiteSpace(p.AsString()) ? "-" : p.AsString()!,
                StorageType.Integer => p.AsInteger().ToString(),
                StorageType.Double  => p.AsDouble().ToString("F2"),
                _                   => "-"
            };
        }

        private static double GetApparentLoad(Element e)
        {
            // Coba beberapa parameter watt
            var bips = new[]
            {
                BuiltInParameter.RBS_ELEC_APPARENT_LOAD,
                BuiltInParameter.RBS_ELEC_POWER_FACTOR_STATE,
            };
            foreach (var bip in bips)
            {
                var p = e.get_Parameter(bip);
                if (p?.StorageType == StorageType.Double && p.AsDouble() > 0)
                    return UnitUtils.ConvertFromInternalUnits(p.AsDouble(), UnitTypeId.Watts);
            }

            // Coba parameter custom "Watt" atau "Power"
            foreach (Parameter p in e.Parameters)
            {
                string pName = p.Definition.Name.ToLower();
                if ((pName.Contains("watt") || pName.Contains("power") || pName.Contains("daya"))
                    && p.StorageType == StorageType.Double && p.AsDouble() > 0)
                {
                    try { return UnitUtils.ConvertFromInternalUnits(p.AsDouble(), UnitTypeId.Watts); }
                    catch { return p.AsDouble(); }
                }
            }
            return 0;
        }

        private static bool IsPublicAddress(Element e, Document doc)
        {
            string typeName = GetTypeName(e, doc).ToLower();
            return typeName.Contains("pa") || typeName.Contains("speaker") ||
                   typeName.Contains("public address") || typeName.Contains("horn") ||
                   typeName.Contains("toa") || typeName.Contains("audio");
        }

        private static string FormatMM(double internalValue)
        {
            double mm = UnitUtils.ConvertFromInternalUnits(internalValue, UnitTypeId.Millimeters);
            return $"{(int)mm}";
        }
    }
}
