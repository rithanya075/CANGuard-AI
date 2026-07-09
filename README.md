# CANGuard-AI

AI-Powered CAN Bus Intrusion Detection System for Automotive Cybersecurity

CANGuard-AI is a full-stack automotive cybersecurity platform that monitors CAN Bus traffic, detects malicious activities, and provides a real-time dashboard for security monitoring. The system identifies replay attacks, CAN ID spoofing, and flooding attacks while maintaining traffic logs and security alerts for analysis.

The project demonstrates how modern cybersecurity techniques can be applied to in-vehicle networks using Python, Flask, React, TypeScript, and SQLite.

---

## Live Demo

**Frontend**

https://canguard-ai-1.onrender.com

**Backend API**

https://canguard-ai-i8sv.onrender.com/api/health

**GitHub Repository**

https://github.com/rithanya075/CANGuard-AI

---

## Features

- Real-time CAN Bus traffic monitoring
- Replay attack detection
- CAN ID spoofing detection
- Flood attack detection
- Real-time IDS dashboard
- Alert logging and visualization
- Threat Intelligence module
- Traffic Analysis dashboard
- Hardware Status monitoring
- SQLite database integration
- RESTful Flask APIs
- AI-assisted threat diagnostics with fallback support
- Responsive React dashboard

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Python
- Flask
- Flask-CORS

### Database

- SQLite

### Deployment

- Render
- GitHub

### Languages

- Python
- TypeScript
- JavaScript
- SQL

---

## System Architecture

```
                    CAN Bus Traffic
                           │
                           ▼
                Intrusion Detection Engine
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
     ▼                     ▼                     ▼
 Replay Detection    Spoof Detection    Flood Detection
     │                     │                     │
     └─────────────────────┼─────────────────────┘
                           │
                           ▼
                    SQLite Database
                           │
                           ▼
                    Flask REST API
                           │
                           ▼
                  React Web Dashboard
                           │
                           ▼
                  Security Administrator
```

---

## Project Structure

```
CANGuard-AI
│
├── arduino/
│   ├── CAN communication sketches
│   └── MCP2515 interface code
│
├── dashboard/
│   ├── Flask backend
│   ├── REST APIs
│   ├── HTML templates
│   └── Static resources
│
├── frontend/
│   ├── React application
│   ├── TypeScript components
│   ├── Vite configuration
│   └── AI integration
│
├── ids/
│   ├── Detection engine
│   ├── Authentication module
│   ├── Alert generation
│   ├── Logging
│   └── Simulation engine
│
├── logs/
│   ├── SQLite database
│   └── Alert logs
│
└── requirements.txt
```

---

## Detection Capabilities

### Replay Attack Detection

Detects duplicated CAN messages transmitted within abnormal timing windows.

### CAN ID Spoofing Detection

Identifies unauthorized ECUs transmitting forged CAN frames using authentication validation.

### Flood Attack Detection

Detects high-frequency CAN traffic intended to overload legitimate vehicle communication.

---

## Dashboard Modules

- IDS Statistics
- Threat Intelligence
- Traffic Analysis
- Hardware Status
- System Settings

---

## REST API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Service health check |
| `/api/stats` | IDS statistics |
| `/api/alerts` | Alert history |
| `/api/traffic` | Traffic logs |
| `/api/dashboard` | Dashboard summary |

---

## Installation

Clone the repository

```bash
git clone https://github.com/rithanya075/CANGuard-AI.git
```

Move into the project

```bash
cd CANGuard-AI
```

Install Python dependencies

```bash
pip install -r requirements.txt
```

Run the Flask backend

```bash
cd dashboard
python app.py
```

Install frontend dependencies

```bash
cd frontend
npm install
```

Run the frontend

```bash
npm run dev
```

---

## Deployment

Frontend is deployed using **Render**.

Backend is deployed using **Render Web Service**.

Source code is hosted on **GitHub**.

---

## Future Enhancements

- Live CAN Bus hardware integration
- Machine learning-based anomaly detection
- WebSocket-based live monitoring
- Multi-vehicle fleet monitoring
- User authentication
- Cloud database support
- Docker containerization
- Kubernetes deployment

---


## Project Highlights

- Full-stack web application
- Real-time cybersecurity dashboard
- Cloud deployment on Render
- RESTful API architecture
- Modular IDS engine
- SQLite-based event logging
- Automotive cybersecurity use case
- Resume-ready deployment

---

## Author

**Rithanya S**

B.Tech Cyber Security

GitHub

https://github.com/rithanya075

---

## License

This project is intended for educational, research, and demonstration purposes in automotive cybersecurity.
