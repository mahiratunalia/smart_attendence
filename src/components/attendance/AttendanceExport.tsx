import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

interface AttendanceExportProps {
  courseId: string;
  courseName: string;
  courseCode: string;
}

interface AttendanceRecord {
  student_name: string;
  student_email: string;
  student_id: string | null;
  lecture_date: string;
  status: string;
  marked_at: string;
  marked_by: string;
}

const AttendanceExport: React.FC<AttendanceExportProps> = ({ courseId, courseName, courseCode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const fetchAttendanceData = async (): Promise<AttendanceRecord[]> => {
    // First get all lectures for this course
    const { data: lectures, error: lecturesError } = await supabase
      .from('lectures')
      .select('id, date')
      .eq('course_id', courseId)
      .order('date', { ascending: true });

    if (lecturesError) throw lecturesError;

    if (!lectures || lectures.length === 0) {
      return [];
    }

    // Get attendance records for these lectures
    const { data: records, error: recordsError } = await supabase
      .from('attendance_records')
      .select(`
        status,
        marked_at,
        marked_by,
        lecture_id,
        profiles:student_id (
          name,
          email,
          student_id
        )
      `)
      .in('lecture_id', lectures.map(l => l.id));

    if (recordsError) throw recordsError;

    // Map to flat structure
    const flatRecords: AttendanceRecord[] = (records || []).map(record => {
      const profile = record.profiles as any;
      const lecture = lectures.find(l => l.id === record.lecture_id);
      
      return {
        student_name: profile?.name || 'Unknown',
        student_email: profile?.email || 'Unknown',
        student_id: profile?.student_id || 'N/A',
        lecture_date: lecture?.date || 'Unknown',
        status: record.status,
        marked_at: record.marked_at || '',
        marked_by: record.marked_by
      };
    });

    return flatRecords.sort((a, b) => 
      new Date(a.lecture_date).getTime() - new Date(b.lecture_date).getTime()
    );
  };

  const exportToCSV = (data: AttendanceRecord[]) => {
    const headers = ['Student Name', 'Student Email', 'Student ID', 'Lecture Date', 'Status', 'Marked At', 'Marked By'];
    const rows = data.map(record => [
      record.student_name,
      record.student_email,
      record.student_id || 'N/A',
      record.lecture_date,
      record.status,
      record.marked_at ? new Date(record.marked_at).toLocaleString() : 'N/A',
      record.marked_by
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${courseCode}_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = (data: AttendanceRecord[]) => {
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    // Group by date for better organization
    const groupedByDate = data.reduce((acc, record) => {
      if (!acc[record.lecture_date]) {
        acc[record.lecture_date] = [];
      }
      acc[record.lecture_date].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${courseName}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #7c3aed;
          }
          .header h1 {
            color: #7c3aed;
            margin: 0 0 10px 0;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .date-section {
            margin-bottom: 25px;
          }
          .date-header {
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background: #f8f9fa;
            font-weight: 600;
            color: #555;
          }
          .status-present {
            color: #16a34a;
            font-weight: 500;
          }
          .status-late {
            color: #ca8a04;
            font-weight: 500;
          }
          .status-absent {
            color: #dc2626;
            font-weight: 500;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #888;
            font-size: 12px;
          }
          @media print {
            body { margin: 20px; }
            .date-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${courseName}</h1>
          <p><strong>Course Code:</strong> ${courseCode}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        
        ${Object.entries(groupedByDate).map(([date, records]) => `
          <div class="date-section">
            <div class="date-header">
              <strong>Lecture Date:</strong> ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Status</th>
                  <th>Marked By</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${records.map(record => `
                  <tr>
                    <td>${record.student_name}</td>
                    <td>${record.student_id || 'N/A'}</td>
                    <td class="status-${record.status}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</td>
                    <td>${record.marked_by}</td>
                    <td>${record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
        
        <div class="footer">
          <p>Attendance Report generated by Smart Attendance System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const data = await fetchAttendanceData();
      
      if (data.length === 0) {
        toast.error('No attendance records found for this course');
        return;
      }

      if (format === 'csv') {
        exportToCSV(data);
        toast.success('CSV exported successfully');
      } else {
        exportToPDF(data);
        toast.success('PDF report generated');
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Attendance Report</DialogTitle>
          <DialogDescription>
            Download attendance records for {courseCode}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as 'csv' | 'pdf')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV Spreadsheet
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF Report (Print)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {format === 'csv' 
                ? 'CSV format is ideal for further analysis in Excel or Google Sheets.'
                : 'PDF format creates a printable report with formatted attendance records.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceExport;