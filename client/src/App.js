import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/attendance`);
        setAttendanceRecords(response.data.data);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };

    fetchAttendance();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="title">Welcome to the Smart Attendance System</h1>
        <p className="subtitle">Track, manage, and improve student attendance with ease!</p>
      </header>

      <section className="attendance">
        <h2>Attendance Records</h2>
        <ul>
          {attendanceRecords.map((record) => (
            <li key={record._id}>
              {record.studentId.name} - {record.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;