using System.Collections.Generic;

namespace BOMExport.Models
{
    public class LightingItem
    {
        public string FamilyType   { get; set; } = "";
        public int    Quantity     { get; set; }
        public double WattPerUnit  { get; set; }
        public double TotalWatt    => Quantity * WattPerUnit;
        public string Level        { get; set; } = "";
        public string CircuitNumber{ get; set; } = "-";
        public string PanelName    { get; set; } = "-";
        public string RoomName     { get; set; } = "-";
        public int    CountInRoom  { get; set; }
    }

    public class ReceptacleItem
    {
        public string FamilyType   { get; set; } = "";
        public int    Quantity     { get; set; }
        public double WattPerUnit  { get; set; }
        public double TotalWatt    => Quantity * WattPerUnit;
        public string Level        { get; set; } = "";
        public string CircuitNumber{ get; set; } = "-";
        public string PanelName    { get; set; } = "-";
        public string RoomName     { get; set; } = "-";
        public int    CountInRoom  { get; set; }
    }

    public class CableTrayItem
    {
        public string TypeName  { get; set; } = "";
        public int    Quantity  { get; set; }
        public string Width     { get; set; } = "";
        public string Height    { get; set; } = "";
        public string SizeLabel => $"{Width} x {Height}";
        public string Level     { get; set; } = "";
        public string Workset   { get; set; } = "";
        public double TotalLength{ get; set; }
    }

    public class PublicAddressItem
    {
        public string FamilyType  { get; set; } = "";
        public int    Quantity    { get; set; }
        public double WattPerUnit { get; set; }
        public double TotalWatt   => Quantity * WattPerUnit;
        public string Level       { get; set; } = "";
        public string RoomName    { get; set; } = "-";
        public int    CountInRoom { get; set; }
    }

    public class FireAlarmItem
    {
        public string FamilyType  { get; set; } = "";
        public int    Quantity    { get; set; }
        public string Level       { get; set; } = "";
        public string RoomName    { get; set; } = "-";
        public int    CountInRoom { get; set; }
    }

    public class DataItem
    {
        public string FamilyType  { get; set; } = "";
        public int    Quantity    { get; set; }
        public string Level       { get; set; } = "";
        public string RoomName    { get; set; } = "-";
        public int    CountInRoom { get; set; }
    }

    public class BOMResult
    {
        public List<LightingItem>      Lighting      { get; set; } = new();
        public List<ReceptacleItem>    Receptacles   { get; set; } = new();
        public List<CableTrayItem>     CableTrays    { get; set; } = new();
        public List<PublicAddressItem> PublicAddress { get; set; } = new();
        public List<FireAlarmItem>     FireAlarms    { get; set; } = new();
        public List<DataItem>          DataPoints    { get; set; } = new();
        public string                  ProjectName    { get; set; } = "";
        public string                  ProjectNumber  { get; set; } = "";
        public string                  ExportDate     { get; set; } = "";
        public string                  FilteredLevels { get; set; } = "Semua Level";
    }
}
