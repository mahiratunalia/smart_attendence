import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  Hash, 
  CheckCircle, 
  Clock, 
  Loader2,
  Camera,
  Keyboard,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Lecture {
  _id: string;
  title: string;
  course_id: {
    _id: string;
    name: string;
    code: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
}

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [classroomCode, setClassroomCode] = useState('');
  const [qrData, setQrData] = useState('');
  const [activeMethod, setActiveMethod] = useState<'code' | 'qr' | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    if (user) {
      fetchTodayLectures();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const fetchTodayLectures = async () => {
    setLoading(true);
    try {
      const result = await api.getLectures();
      
      if (result.success && result.data) {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        const todayLectures = result.data.filter((lecture: any) => {
          const lectureDate = lecture.date ? format(new Date(lecture.date), 'yyyy-MM-dd') : null;
          return lectureDate === todayStr;
        });
        
        setLectures(todayLectures);
      } else {
        setLectures([]);
      }
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast.error('Failed to load lectures');
      setLectures([]);
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setScannerError(null);
      
      // First, request camera permissions explicitly
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (permError: any) {
        if (permError.name === 'NotAllowedError') {
          setScannerError('Camera permission denied. Please allow camera access in your browser settings.');
        } else {
          setScannerError('Camera not available. ' + permError.message);
        }
        return;
      }

      setScannerActive(true);

      const scanner = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = scanner;

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log('📷 QR Code scanned:', decodedText);
          setQrData(decodedText);
          toast.success('QR code scanned successfully!');
          stopScanner();
        },
        (errorMessage) => {
          // Ignore frequent scanning errors
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      let errorMsg = 'Failed to start camera.';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please click the camera icon in your browser\'s address bar and allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is already in use by another application.';
      } else {
        errorMsg = err.message || errorMsg;
      }
      
      setScannerError(errorMsg);
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setScannerActive(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleMarkByCode = async () => {
    if (!classroomCode || classroomCode.length !== 4) {
      toast.error('Please enter a valid 4-digit code');
      return;
    }

    if (lectures.length === 0) {
      toast.error('No active lectures found');
      return;
    }

    const lectureId = selectedLecture || lectures[0]?._id;
    if (!lectureId) {
      toast.error('No lecture selected');
      return;
    }

    setMarking(true);
    try {
      const result = await api.markAttendanceSecure({
        lectureId: lectureId,
        code: classroomCode,
        markedBy: 'code'
      });

      if (result.success) {
        toast.success(result.message || 'Attendance marked successfully! ✓');
        setClassroomCode('');
        setActiveMethod(null);
        setSelectedLecture(null);
      } else {
        toast.error(result.message || 'Failed to mark attendance');
      }
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setMarking(false);
    }
  };

  const handleMarkByQR = async () => {
    if (!qrData) {
      toast.error('Please scan a QR code first');
      return;
    }

    setMarking(true);
    try {
      let qrToken = qrData;
      try {
        const parsed = JSON.parse(qrData);
        qrToken = parsed.token || parsed.qrToken || qrData;
      } catch {
        // Not JSON, use as-is
      }

      const result = await api.markAttendanceSecure({
        lectureId: lectures[0]?._id || '',
        qrToken: qrToken,
        markedBy: 'qr'
      });

      if (result.success) {
        toast.success(result.message || 'Attendance marked successfully! ✓');
        setQrData('');
        setActiveMethod(null);
      } else {
        toast.error(result.message || 'Failed to mark attendance');
      }
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold gradient-text">Mark Attendance</h1>
        <p className="text-muted-foreground mt-1">
          Choose a method to mark your attendance
        </p>
      </div>

      {/* Method Selection */}
      {activeMethod === null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card 
            className="glass-card cursor-pointer hover:shadow-lg transition-all group"
            onClick={() => {
              if (lectures.length === 0) {
                toast.error('No active lectures available. Please check back later.');
                return;
              }
              setActiveMethod('code');
            }}
          >
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Keyboard className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">Enter Classroom Code</h3>
              <p className="text-muted-foreground">
                Enter the 4-digit code displayed on the classroom screen
              </p>
            </CardContent>
          </Card>

          <Card 
            className="glass-card cursor-pointer hover:shadow-lg transition-all group"
            onClick={() => {
              if (lectures.length === 0) {
                toast.error('No active lectures available. Please check back later.');
                return;
              }
              setActiveMethod('qr');
            }}
          >
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl gradient-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <QrCode className="w-10 h-10 text-secondary-foreground" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">QR Scanner</h3>
              <p className="text-muted-foreground">
                Scan the QR code displayed on the classroom screen
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Classroom Code Entry */}
      {activeMethod === 'code' && (
        <Card className="glass-card max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Enter Classroom Code
            </CardTitle>
            <CardDescription>
              Enter the 4-digit code shown on the projector
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {lectures.length > 1 && (
              <div className="space-y-2">
                <Label>Select Lecture</Label>
                <select
                  value={selectedLecture || ''}
                  onChange={(e) => setSelectedLecture(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background"
                >
                  <option value="">Select a lecture</option>
                  {lectures.map((lecture) => (
                    <option key={lecture._id} value={lecture._id}>
                      {lecture.course_id?.code} - {lecture.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Classroom Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={classroomCode}
                onChange={(e) => setClassroomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                className="text-center text-3xl tracking-widest font-bold"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveMethod(null);
                  setClassroomCode('');
                  setSelectedLecture(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkByCode}
                disabled={marking || classroomCode.length !== 4 || lectures.length === 0}
                className="flex-1 gradient-primary"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Attendance
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Scanner */}
      {activeMethod === 'qr' && (
        <Card className="glass-card max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              QR Scanner
            </CardTitle>
            <CardDescription>
              Point your camera at the QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Permission Instructions */}
            {scannerError && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive mb-2">Camera Access Required</p>
                    <p className="text-sm text-muted-foreground mb-3">{scannerError}</p>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p className="font-semibold">How to enable camera:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Click the camera icon 🎥 in your browser's address bar</li>
                        <li>Select "Allow" or "Always allow"</li>
                        <li>Click "Retry Camera" button below</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <div 
                id={qrCodeRegionId} 
                className="rounded-lg overflow-hidden border-2 border-border"
                style={{ 
                  minHeight: scannerActive ? '300px' : '0px',
                  display: scannerActive ? 'block' : 'none'
                }}
              />
              
              {!scannerActive && !scannerError && (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                  <div className="text-center p-8">
                    <QrCode className="w-24 h-24 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Ready to scan QR codes
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Make sure to allow camera access when prompted
                    </p>
                  </div>
                </div>
              )}

              {scannerActive && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopScanner}
                  className="absolute top-2 right-2 z-10"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Stop Camera
                </Button>
              )}
            </div>

            {/* Camera Start/Retry Button */}
            {!scannerActive && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={startScanner}
              >
                <Camera className="w-4 h-4 mr-2" />
                {scannerError ? 'Retry Camera' : 'Start Camera Scan'}
              </Button>
            )}

            {qrData && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm font-medium text-success flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  QR Code Detected
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{qrData}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="manualQr">Or paste QR data manually</Label>
              <Input
                id="manualQr"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Paste QR code data here"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveMethod(null);
                  setQrData('');
                  stopScanner();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkByQR}
                disabled={marking || !qrData}
                className="flex-1 gradient-primary"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Attendance
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Lectures */}
      <div className="mt-8">
        <h2 className="font-heading text-2xl font-bold mb-4">Today's Lectures</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : lectures.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-semibold mb-2">No lectures scheduled for today</p>
              <p className="text-sm text-muted-foreground">
                Check back later or contact your instructor
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {lectures.map((lecture) => (
              <Card key={lecture._id} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {lecture.course_id?.name || 'Unknown Course'}
                        </h3>
                        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          {lecture.course_id?.code || 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{lecture.title}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {lecture.startTime} - {lecture.endTime}
                        </div>
                        {lecture.location && (
                          <span className="text-xs">{lecture.location}</span>
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
