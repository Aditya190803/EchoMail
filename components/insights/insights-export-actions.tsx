import Link from "next/link";

import { ChevronDown, Download, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InsightsExportActionsProps {
  isExporting: boolean;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function InsightsExportActions({
  isExporting,
  onExportCSV,
  onExportPDF,
}: InsightsExportActionsProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Report"}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button asChild className="shadow-sm">
        <Link href="/compose">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Link>
      </Button>
    </>
  );
}
