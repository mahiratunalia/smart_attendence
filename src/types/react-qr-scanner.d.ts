declare module 'react-qr-scanner' {
  import { Component } from 'react';

  interface QrScannerProps {
    delay?: number;
    onError: (error: any) => void;
    onScan: (data: any) => void;
    style?: React.CSSProperties;
    className?: string;
    constraints?: MediaStreamConstraints;
  }

  export default class QrScanner extends Component<QrScannerProps> {}
}
