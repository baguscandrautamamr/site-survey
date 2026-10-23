using Autodesk.Revit.UI;
using System.Reflection;
using System.Windows.Media.Imaging;
using System;

namespace BOMExport
{
    public class App : IExternalApplication
    {
        public Result OnStartup(UIControlledApplication app)
        {
            RibbonPanel panel = app.CreateRibbonPanel("BOM Electrical");

            string assemblyPath = Assembly.GetExecutingAssembly().Location;

            var btnData = new PushButtonData(
                "BOMExport",
                "Export\nBOM",
                assemblyPath,
                "BOMExport.ExportCommand")
            {
                ToolTip = "Export Bill of Materials listrik ke Excel",
                LongDescription = "Mengekspor semua data material electrical (Lighting, Receptacle, Cable Tray, PA, Fire Alarm, Data) ke file Excel dengan format profesional.",
            };

            try
            {
                string imgPath = System.IO.Path.Combine(
                    System.IO.Path.GetDirectoryName(assemblyPath)!, "Resources", "icon_bom.png");
                if (System.IO.File.Exists(imgPath))
                {
                    btnData.LargeImage = new BitmapImage(new Uri(imgPath));
                }
            }
            catch { /* icon opsional */ }

            panel.AddItem(btnData);
            return Result.Succeeded;
        }

        public Result OnShutdown(UIControlledApplication app) => Result.Succeeded;
    }
}
