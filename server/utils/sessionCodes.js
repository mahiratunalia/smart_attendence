export function generateClassroomCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }
  
  export function generateQrPayload({ lectureId, code, exp }) {
    // Keep it simple: JSON string
    return JSON.stringify({ lectureId, code, exp });
  }
  