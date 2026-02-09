import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PrintableReport, { type PrintableReportData } from "./PrintableReport";
import { format } from "date-fns";
import { DateRange } from "./DateRangePicker";

interface ExportButtonsProps {
  data: PrintableReportData;
  dateRange: DateRange;
  activeTab: string;
}

export function generateCSV(data: PrintableReportData, activeTab: string): string {
  let csvContent = "";
  const formatCurrency = (val: number) => val.toFixed(3);

  if (activeTab === "overview" || activeTab === "summary") {
    csvContent += "Sales Summary Report\n";
    csvContent += `Period,${format(new Date(), "MMM dd, yyyy")}\n\n`;
    csvContent += "Metric,Value\n";
    csvContent += `Total Revenue,${formatCurrency(data.salesSummary.gross_revenue)} OMR\n`;
    csvContent += `Total Orders,${data.salesSummary.total_orders}\n`;
    csvContent += `Average Order Value,${formatCurrency(data.salesSummary.avg_order_value)} OMR\n`;
    csvContent += `Dine-In Orders,${data.salesSummary.dine_in_orders}\n`;
    csvContent += `Dine-In Revenue,${formatCurrency(data.salesSummary.dine_in_revenue)} OMR\n`;
    csvContent += `Takeaway Orders,${data.salesSummary.takeaway_orders}\n`;
    csvContent += `Takeaway Revenue,${formatCurrency(data.salesSummary.takeaway_revenue)} OMR\n`;
  }

  if (activeTab === "sales") {
    csvContent += "Daily Sales Report\n\n";
    csvContent += "Date,Revenue (OMR),Orders\n";
    data.dailySales.forEach((day) => {
      csvContent += `${day.date},${formatCurrency(day.revenue)},${day.orders}\n`;
    });

    csvContent += "\nHourly Sales Report\n\n";
    csvContent += "Hour,Revenue (OMR),Orders\n";
    data.hourlySales.filter(h => h.orders > 0).forEach((hour) => {
      const hourLabel = hour.hour === 0 ? "12 AM" : hour.hour === 12 ? "12 PM" : hour.hour < 12 ? `${hour.hour} AM` : `${hour.hour - 12} PM`;
      csvContent += `${hourLabel},${formatCurrency(hour.revenue)},${hour.orders}\n`;
    });

    csvContent += "\nCategory Sales Report\n\n";
    csvContent += "Category,Quantity,Revenue (OMR)\n";
    data.categorySales.forEach((cat) => {
      csvContent += `${cat.category},${cat.quantity},${formatCurrency(cat.revenue)}\n`;
    });
  }

  if (activeTab === "payments") {
    csvContent += "Payment Method Report\n\n";
    csvContent += "Method,Transactions,Amount (OMR)\n";
    data.paymentBreakdown.forEach((payment) => {
      csvContent += `${payment.method},${payment.count},${formatCurrency(payment.amount)}\n`;
    });
  }

  if (activeTab === "items") {
    csvContent += "Item Sales Report\n\n";
    csvContent += "Item Name,Category,Quantity Sold,Avg Price (OMR),Revenue (OMR)\n";
    data.itemSalesDetails.forEach((item) => {
      csvContent += `"${item.name}","${item.category}",${item.quantity},${formatCurrency(item.avg_price)},${formatCurrency(item.revenue)}\n`;
    });
    
    const totalQty = data.itemSalesDetails.reduce((sum, i) => sum + i.quantity, 0);
    const totalRev = data.itemSalesDetails.reduce((sum, i) => sum + i.revenue, 0);
    csvContent += `"TOTAL","",${totalQty},-,${formatCurrency(totalRev)}\n`;
  }

  if (activeTab === "discounts" && data.discountReport) {
    csvContent += "Discount Report\n\n";
    csvContent += "Summary\n";
    csvContent += `Total Discount Given,${formatCurrency(data.discountReport.totalDiscount)} OMR\n`;
    csvContent += `Orders with Discount,${data.discountReport.orderCount}\n\n`;
    
    csvContent += "Daily Discounts\n";
    csvContent += "Date,Discount (OMR),Order Count\n";
    data.discountReport.dailyDiscounts.forEach((day) => {
      csvContent += `${day.date},${formatCurrency(day.total_discount)},${day.order_count}\n`;
    });
    
    csvContent += "\nOrder-wise Details\n";
    csvContent += "Order #,Date,Original Amt (OMR),Discount (OMR),Final Amt (OMR),Staff\n";
    data.discountReport.discountDetails.forEach((item) => {
      csvContent += `"${item.order_number}",${item.date},${formatCurrency(item.original_total)},${formatCurrency(item.discount_amount)},${formatCurrency(item.final_total)},"${item.staff_name}"\n`;
    });
    
    csvContent += `"TOTAL",,,,${formatCurrency(data.discountReport.totalDiscount)},\n`;
  }

  if (activeTab === "foc" && (data as any).focReport) {
    const focReport = (data as any).focReport;
    csvContent += "FOC (Free of Cost) Report\n\n";
    csvContent += "Summary\n";
    csvContent += `Total FOC Value,${formatCurrency(focReport.totalFOCValue)} OMR\n`;
    csvContent += `FOC Orders,${focReport.focCount}\n`;
    csvContent += `Unique Dancers,${focReport.dancerSummary.length}\n\n`;
    
    csvContent += "By Dancer\n";
    csvContent += "Dancer,Orders,Total Value (OMR)\n";
    focReport.dancerSummary.forEach((d: any) => {
      csvContent += `"${d.dancer}",${d.count},${formatCurrency(d.value)}\n`;
    });
    
    csvContent += "\nOrder Details\n";
    csvContent += "Order #,Date,Dancer,Items,Value (OMR),Staff\n";
    focReport.focDetails.forEach((item: any) => {
      csvContent += `"${item.order_number}",${item.date},"${item.dancer_name}","${item.items.join('; ')}",${formatCurrency(item.total_value)},"${item.staff_name}"\n`;
    });
  }

  return csvContent;
}

export default function ExportButtons({ data, dateRange, activeTab }: ExportButtonsProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Report-${activeTab}-${format(dateRange.from, "yyyyMMdd")}-${format(dateRange.to, "yyyyMMdd")}`,
  });

  const handleCSVExport = () => {
    const csvContent = generateCSV(data, activeTab);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${activeTab}-${format(dateRange.from, "yyyyMMdd")}-${format(dateRange.to, "yyyyMMdd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50 bg-popover">
          <DropdownMenuItem onClick={handleCSVExport}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handlePrint()}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF (Print)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden printable report */}
      <div className="hidden">
        <PrintableReport
          ref={reportRef}
          data={data}
          dateRange={dateRange}
          activeTab={activeTab}
        />
      </div>
    </>
  );
}
